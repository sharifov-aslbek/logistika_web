import { useState, useEffect } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Alert from '@/components/ui/Alert'
import { HiOutlineCloudUpload } from 'react-icons/hi'
import { Formik, Form, Field } from 'formik'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import axios from 'axios'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useNavigate } from 'react-router-dom'

// --- Stores ---
import { useTemplateStore } from '@/store/templateStore'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- Constants for Roles ---
const ROLE_WORKER = 10
const ROLE_BRANCH_DIRECTOR = 20
const ROLE_ADMIN = 30

// --- HELPER: Convert Excel Serial Date ---
const formatExcelDate = (serial: number | string) => {
    if (typeof serial === 'string') return serial
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = date.getFullYear()
    return `${d}.${m}.${y}`
}

const CreateRegistry = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    // --- Stores ---
    const {
        templates,
        getTemplates,
        isLoading: isTemplatesLoading,
    } = useTemplateStore()

    // Get Token and Profile to check Role
    const token = useAccountStore((state) => state.user?.token)
    const userProfile = useAccountStore((state) => state.userProfile)

    // Determine current role
    const role = Number(userProfile?.role || 0)

    // --- Local State ---
    const [excelData, setExcelData] = useState<any[]>([])
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // --- 1. Fetch Templates on Mount ---
    useEffect(() => {
        getTemplates()
    }, [])

    // Prepare options for Select
    const templateOptions = templates.map((t) => ({
        value: t.name,
        label: t.name,
    }))

    // --- 2. Validation Logic ---
    const validateExcelData = (data: any[]) => {
        const errors: string[] = []

        // Base required columns
        const requiredFields = ['receiver', 'address', 'region', 'area']

        // If role is 10, 20, or 30, 'branch_id' is mandatory
        if ([ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)) {
            requiredFields.push('branch_id')
        }

        data.forEach((row, index) => {
            const rowNumber = index + 2 // +2 because Excel starts at 1 and header is 1

            // Skip header-like rows
            if (row.receiver === 'Получатель' || row.receiver === 'Receiver')
                return

            // Check receiver existence
            if (!row.receiver) {
                errors.push(`Qator ${rowNumber}: "receiver" ustuni bo'sh`)
            }

            // Check missing columns
            const missingCols = requiredFields.filter((field) => {
                return row[field] == null || String(row[field]).trim() === ''
            })

            if (missingCols.length > 0) {
                errors.push(
                    `Qator ${rowNumber}: To'ldirilmagan ustunlar: ${missingCols.join(', ')}`,
                )
            }
        })
        return errors
    }

    // --- 3. Data Transformation ---
    const transformDataToApiFormat = (rawData: any[], templateName: string) => {
        const cleanRows = rawData.filter(
            (row) =>
                row.receiver !== 'Получатель' && row.receiver !== 'Receiver',
        )

        return cleanRows.map((row) => {
            // ✨ FIX: Destructure branch_id here so it is NOT included in "...rest" (content)
            const { receiver, address, region, area, branch_id, ...rest } = row

            // Process "rest" columns for Content JSON
            const contentObj: any = {}
            Object.keys(rest).forEach((key) => {
                let value = rest[key]
                // Handle Excel dates
                const dateKeys = [
                    'document_date',
                    'print_date',
                    'date_of_deposit',
                ]
                if (dateKeys.includes(key) && typeof value === 'number') {
                    value = formatExcelDate(value)
                }
                contentObj[key] = String(value)
            })

            // Return exact shape for /queue-mails endpoint
            const mailObject: any = {
                receiver: String(receiver),
                regionId: Number(region) || 0,
                areaId: Number(area) || 0,
                address: String(address),
                content: JSON.stringify(contentObj),
                templateName: templateName,

                // ✨ FIX: Map 'branch_id' to 'BranchId' at top level
                // Only include if it exists (which validation ensures for roles 10,20,30)
                BranchId: branch_id ? Number(branch_id) : 0,
            }

            return mailObject
        })
    }

    // --- 4. File Upload Handler ---
    const handleFileUpload = (files: File[], form: any) => {
        setValidationErrors([])
        setExcelData([])

        if (files && files.length > 0) {
            const file = files[0]
            form.setFieldValue('file', file)

            const reader = new FileReader()
            reader.onload = (e) => {
                const data = e.target?.result
                if (data) {
                    const workbook = XLSX.read(data, { type: 'binary' })
                    const sheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet)

                    const errors = validateExcelData(jsonData)

                    if (errors.length > 0) {
                        setValidationErrors(errors)
                    } else {
                        setExcelData(jsonData)
                    }
                }
            }
            reader.readAsBinaryString(file)
        }
    }

    // --- 5. API Submit Handler ---
    const handleSubmit = async (values: any) => {
        if (validationErrors.length > 0) return
        if (excelData.length === 0) {
            toast.push(
                <Notification type="warning">
                    Excel fayl ma'lumotlari bo'sh
                </Notification>,
            )
            return
        }

        setIsSubmitting(true)

        const payloadMails = transformDataToApiFormat(
            excelData,
            values.templateName,
        )

        const payload = {
            mails: payloadMails,
        }

        try {
            console.log('🚀 Sending Payload:', payload)

            const response = await axios.post(
                `${BASE_URL}/registry/queue-mails`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                        'Content-Type': 'application/json',
                    },
                },
            )

            if (response.status === 200 || response.status === 201) {
                toast.push(
                    <Notification type="success">
                        {payloadMails.length} ta xat navbatga qo'shildi!
                    </Notification>,
                )
                navigate('/mail/draftmails')
            }
        } catch (error: any) {
            console.error('API Error:', error)
            const errorMsg =
                error.response?.data?.message || 'Xatolik yuz berdi'
            toast.push(
                <Notification type="danger">Xatolik: {errorMsg}</Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full px-5 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {t('registry.title', 'Hujjat Reyestri Yaratish')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Ommaviy hujjat yaratish uchun formani to'ldiring
                </p>
            </div>

            <Formik
                initialValues={{
                    templateName: '',
                    description: '',
                    file: null,
                }}
                onSubmit={handleSubmit}
            >
                {({ values, setFieldValue }) => (
                    <Form>
                        <FormContainer>
                            <div className="flex flex-col gap-6">
                                {/* Template Select */}
                                <FormItem
                                    label="Shablon turi"
                                    invalid={
                                        !values.templateName && isSubmitting
                                    }
                                    errorMessage="Shablon tanlash shart"
                                >
                                    <Field name="templateName">
                                        {({ field, form }: any) => (
                                            <Select
                                                field={field}
                                                form={form}
                                                options={templateOptions}
                                                isLoading={isTemplatesLoading}
                                                placeholder={
                                                    isTemplatesLoading
                                                        ? 'Yuklanmoqda...'
                                                        : 'Shablonni tanlang...'
                                                }
                                                value={templateOptions.find(
                                                    (opt) =>
                                                        opt.value ===
                                                        values.templateName,
                                                )}
                                                onChange={(option: any) =>
                                                    form.setFieldValue(
                                                        field.name,
                                                        option?.value,
                                                    )
                                                }
                                            />
                                        )}
                                    </Field>
                                </FormItem>

                                {/* File Upload */}
                                <FormItem
                                    label="Hujjat reyestri (Excel)"
                                    invalid={!values.file && isSubmitting}
                                    errorMessage="Fayl yuklash shart"
                                >
                                    <Field name="file">
                                        {({ form }: any) => (
                                            <Upload
                                                draggable
                                                className="cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                onChange={(files) =>
                                                    handleFileUpload(
                                                        files,
                                                        form,
                                                    )
                                                }
                                            >
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <div className="mb-4 text-indigo-500 text-5xl">
                                                        <HiOutlineCloudUpload />
                                                    </div>
                                                    <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                                                        {values.file ? (
                                                            <span className="text-emerald-500 font-bold">
                                                                {
                                                                    values.file
                                                                        .name
                                                                }{' '}
                                                                yuklandi
                                                            </span>
                                                        ) : (
                                                            'Faylni shu yerga tashlang yoki yuklang'
                                                        )}
                                                    </div>
                                                    <div className="text-sm mt-2 text-gray-400">
                                                        Excel (.xlsx, .xls)
                                                    </div>
                                                </div>
                                            </Upload>
                                        )}
                                    </Field>
                                </FormItem>

                                {/* Validation Errors Alert */}
                                {validationErrors.length > 0 && (
                                    <Alert
                                        showIcon
                                        className="mb-4"
                                        type="danger"
                                        title="Faylda xatoliklar mavjud"
                                    >
                                        <div className="mt-2 max-h-40 overflow-y-auto pl-2 text-sm">
                                            <ul className="list-disc space-y-1">
                                                {validationErrors.map(
                                                    (err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    </Alert>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end gap-4 mt-2">
                                    <Button
                                        size="lg"
                                        className="min-w-[120px]"
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => navigate(-1)}
                                    >
                                        Bekor qilish
                                    </Button>
                                    <Button
                                        variant="solid"
                                        size="lg"
                                        className="min-w-[160px]"
                                        type="submit"
                                        loading={isSubmitting}
                                        disabled={
                                            validationErrors.length > 0 ||
                                            !values.file ||
                                            !values.templateName
                                        }
                                    >
                                        Yaratish
                                    </Button>
                                </div>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default CreateRegistry
