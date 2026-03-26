import { useState, useEffect } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
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

const EXCEL_ACCEPT =
    '.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const HEADER_ALIASES: Record<string, string> = {
    receiver: 'receiver',
    receiver_name: 'receiver',
    qabul_qiluvchi: 'receiver',
    oluvchi: 'receiver',
    получатель: 'receiver',

    address: 'address',
    receiver_address: 'address',
    manzil: 'address',
    адрес: 'address',

    region: 'region',
    region_id: 'region',
    viloyat: 'region',
    область: 'region',

    area: 'area',
    area_id: 'area',
    tuman: 'area',
    tuman_id: 'area',
    район: 'area',

    branch_id: 'branch_id',
    branchid: 'branch_id',
    branch_id_: 'branch_id',
    branch: 'branch_id',
    filial: 'branch_id',
    filial_id: 'branch_id',
}

const normalizeHeaderKey = (header: string) => {
    const normalized = String(header || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[()]/g, '')
        .replace(/__+/g, '_')

    return HEADER_ALIASES[normalized] || normalized
}

const getRequiredHeaders = (role: number) => {
    const requiredHeaders = ['receiver', 'address', 'region', 'area']

    if ([ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)) {
        requiredHeaders.push('branch_id')
    }

    return requiredHeaders
}

const isMeaningfulValue = (value: unknown) => {
    return String(value ?? '').trim() !== ''
}

/**
 * Excel format:
 * 1-qator -> english keys
 * 2-qator -> ruscha label (ignore)
 * 3-qator va past -> real data
 */
const readRegistrySheet = (worksheet: XLSX.WorkSheet, role: number) => {
    const requiredHeaders = getRequiredHeaders(role)

    const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: '',
    }) as any[][]

    if (!rows || rows.length < 3) {
        return {
            error: "Excel faylda kamida 3 qator bo'lishi kerak: 1-qator keylar, 2-qator label, 3-qator data.",
            data: [],
        }
    }

    // 1-qator = header
    const headerRow = rows[0] || []
    const normalizedHeaders = headerRow.map((cell) =>
        normalizeHeaderKey(String(cell || '')),
    )

    const missingHeaders = requiredHeaders.filter(
        (header) => !normalizedHeaders.includes(header),
    )

    if (missingHeaders.length > 0) {
        return {
            error: `Excel ustunlari topilmadi. Jadvalda quyidagi ustunlar bo'lishi kerak: ${requiredHeaders.join(', ')}. Topilmaganlar: ${missingHeaders.join(', ')}`,
            data: [],
        }
    }

    // 2-qator = ruscha label -> skip
    // 3-qator va keyingisi = data
    const dataRows = rows.slice(2)

    const mappedData = dataRows
        .map((row) => {
            const obj: Record<string, any> = {}

            normalizedHeaders.forEach((header, index) => {
                if (header) {
                    obj[header] = row?.[index] ?? ''
                }
            })

            return obj
        })
        .filter((row) =>
            Object.values(row).some((value) => isMeaningfulValue(value)),
        )

    return {
        error: null,
        data: mappedData,
    }
}

const CreateRegistry = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const {
        templates,
        getTemplates,
        isLoading: isTemplatesLoading,
    } = useTemplateStore()

    const token = useAccountStore((state) => state.user?.token)
    const userProfile = useAccountStore((state) => state.userProfile)

    const role = Number(userProfile?.role || 0)

    const [excelData, setExcelData] = useState<any[]>([])
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [apiResult, setApiResult] = useState<any>(null)

    const isExcelFile = (file: File) => {
        const fileName = file.name.toLowerCase()

        return (
            fileName.endsWith('.xlsx') ||
            fileName.endsWith('.xls') ||
            file.type === 'application/vnd.ms-excel' ||
            file.type ===
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    }

    const validateRegistryFile = (newFiles: FileList | null) => {
        if (!newFiles || newFiles.length === 0) {
            return 'Excel fayl tanlash shart'
        }

        if (newFiles.length > 1) {
            return 'Faqat bitta Excel fayl yuklash mumkin'
        }

        if (!isExcelFile(newFiles[0])) {
            return 'Faqat Excel (.xlsx, .xls) fayl yuklash mumkin'
        }

        return true
    }

    useEffect(() => {
        getTemplates()
    }, [getTemplates])

    const templateOptions = templates.map((template) => ({
        value: template.name,
        label: template.name,
    }))

    const validateExcelData = (data: any[]) => {
        const errors: string[] = []
        const requiredFields = getRequiredHeaders(role)

        data.forEach((row, index) => {
            const rowNumber = index + 3 // Excelda data 3-qatordan boshlanadi

            if (!row.receiver || String(row.receiver).trim() === '') {
                errors.push(`Qator ${rowNumber}: "receiver" ustuni bo'sh`)
            }

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

    const transformDataToApiFormat = (rawData: any[], templateName: string) => {
        const cleanRows = rawData.filter((row) => {
            return row && isMeaningfulValue(row.receiver)
        })

        return cleanRows.map((row) => {
            const { receiver, address, region, area, branch_id, ...rest } = row

            const contentObj: Record<string, string> = {}

            Object.keys(rest).forEach((key) => {
                contentObj[key] = String(rest[key] ?? '')
            })

            return {
                receiver: String(receiver ?? ''),
                regionId: Number(region) || 0,
                areaId: Number(area) || 0,
                address: String(address ?? ''),
                content: JSON.stringify(contentObj),
                templateName,
                BranchId: branch_id ? Number(branch_id) : 0,
            }
        })
    }

    const handleFileUpload = (files: File[], form: any) => {
        setValidationErrors([])
        setExcelData([])

        if (!files || files.length === 0) return

        const file = files[0]

        if (!isExcelFile(file)) {
            setUploadedFiles([])
            form.setFieldValue('file', null)
            return
        }

        setUploadedFiles([file])
        form.setFieldValue('file', file)

        const reader = new FileReader()

        reader.onload = (e) => {
            const data = e.target?.result

            if (!data) return

            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]

            const result = readRegistrySheet(worksheet, role)

            if (result.error) {
                setValidationErrors([result.error])
                return
            }

            const normalizedData = result.data

            if (normalizedData.length === 0) {
                setValidationErrors([
                    "Excel faylda o'qiladigan ma'lumot topilmadi",
                ])
                return
            }

            const requiredHeaders = getRequiredHeaders(role)
            const detectedHeaders = Object.keys(normalizedData[0] || {})
            const missingHeaders = requiredHeaders.filter(
                (header) => !detectedHeaders.includes(header),
            )

            if (missingHeaders.length > 0) {
                setValidationErrors([
                    `Excel ustunlari mos emas. Kerakli ustunlar: ${requiredHeaders.join(', ')}`,
                    `Topilmagan ustunlar: ${missingHeaders.join(', ')}`,
                ])
                return
            }

            if (normalizedData.length > 200) {
                setValidationErrors([
                    'Excel file contains more than 200 records. Maximum allowed is 200.',
                ])
                return
            }

            const errors = validateExcelData(normalizedData)

            if (errors.length > 0) {
                setValidationErrors(errors)
                return
            }

            setExcelData(normalizedData)
        }

        reader.readAsBinaryString(file)
    }

    const handleFileRemove = (form: any) => {
        setUploadedFiles([])
        setExcelData([])
        setValidationErrors([])
        form.setFieldValue('file', null)
    }

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

        const payload = {
            mails: transformDataToApiFormat(excelData, values.templateName),
        }

        toast.push(
            <Notification type="info">
                Jo'natildi, yaratilmoqda. Tayyor bo‘lgach sizga xabar beramiz.
            </Notification>,
        )

        try {
            console.log('🚀 Sending Payload:', payload)

            const response = await axios.post(
                `${BASE_URL}/registry/process-mails`,
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
                const resultData = response.data?.data || {}

                setApiResult({
                    message:
                        response.data?.message ||
                        'Amaliyot muvaffaqiyatli yakunlandi',
                    totalProcessed: resultData.totalProcessed || 0,
                    successCount: resultData.successCount || 0,
                    errorCount: resultData.errorCount || 0,
                    errorMessages: resultData.errorMessages || [],
                })

                setIsModalOpen(true)
            }
        } catch (error: any) {
            console.error('API Error:', error)

            const errorMsg =
                error.response?.data?.message || 'Xatolik yuz berdi'

            toast.push(
                <Notification type="danger">
                    Xatolik: {errorMsg}
                </Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        navigate('/mail/draftmails')
    }

    return (
        <div className="w-full px-5 py-10 relative">
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
                {({ values }) => (
                    <Form>
                        <FormContainer>
                            <div className="flex flex-col gap-6">
                                <FormItem
                                    label="Shablon turi"
                                    invalid={!values.templateName && isSubmitting}
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
                                                        option?.value || '',
                                                    )
                                                }
                                            />
                                        )}
                                    </Field>
                                </FormItem>

                                <FormItem
                                    label="Hujjat reyestri (Excel)"
                                    invalid={!values.file && isSubmitting}
                                    errorMessage="Fayl yuklash shart"
                                >
                                    <Field name="file">
                                        {({ form }: any) => (
                                            <Upload
                                                accept={EXCEL_ACCEPT}
                                                beforeUpload={validateRegistryFile}
                                                draggable
                                                className="cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                fileList={uploadedFiles}
                                                multiple={false}
                                                onChange={(files) =>
                                                    handleFileUpload(files, form)
                                                }
                                                onFileRemove={() =>
                                                    handleFileRemove(form)
                                                }
                                                uploadLimit={1}
                                            >
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <div className="mb-4 text-indigo-500 text-5xl">
                                                        <HiOutlineCloudUpload />
                                                    </div>

                                                    <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                                                        {values.file ? (
                                                            <span className="text-emerald-500 font-bold">
                                                                {values.file.name}{' '}
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
                                        disabled={
                                            isSubmitting ||
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

            {isModalOpen && apiResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                Qayta ishlash natijasi
                            </h2>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Jami
                                    </div>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {apiResult.totalProcessed}
                                    </div>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Muvaffaqiyatli
                                    </div>
                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {apiResult.successCount}
                                    </div>
                                </div>

                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Xatolik
                                    </div>
                                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                        {apiResult.errorCount}
                                    </div>
                                </div>
                            </div>

                            {apiResult.errorMessages &&
                                apiResult.errorMessages.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                                            Xatoliklar ro'yxati:
                                        </div>

                                        <ul className="list-disc pl-5 space-y-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg">
                                            {apiResult.errorMessages.map(
                                                (msg: string, idx: number) => (
                                                    <li key={idx}>{msg}</li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <Button variant="solid" onClick={handleCloseModal}>
                                Yaratilganlarga o'tish
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CreateRegistry