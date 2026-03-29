import { useState, useEffect } from 'react'
import { Formik, Form, Field } from 'formik'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import axios from 'axios'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Alert from '@/components/ui/Alert'
import Tabs from '@/components/ui/Tabs'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { HiOutlineCloudUpload } from 'react-icons/hi'
import { useTemplateStore } from '@/store/templateStore'
import { useAccountStore } from '@/store/accountStore'
import { useOrganizationStore } from '@/store/organizationStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

const ROLE_WORKER = 10
const ROLE_BRANCH_DIRECTOR = 20
const ROLE_ADMIN = 30
const BRANCH_SELECT_ROLES = [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN]

const EXCEL_ACCEPT =
    '.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type Option = {
    value: number
    label: string
}

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

    pinfl_or_inn: 'pinfl_or_inn',
    pinflorinn: 'pinfl_or_inn',
    pinfl_inn: 'pinfl_or_inn',
    pinfl: 'pinfl',
    inn: 'inn',
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

const isMeaningfulValue = (value: unknown) => {
    return String(value ?? '').trim() !== ''
}

const getInternalRequiredHeaders = (role: number) => {
    return ['receiver', 'address', 'region', 'area']
}

const getExternalRequiredHeaders = (role: number) => {
    return []
}

const getNormalizedExternalIdentifiers = (row: Record<string, any>) => {
    const pinfl = String(row.pinfl ?? '').replace(/\D/g, '')
    const inn = String(row.inn ?? '').replace(/\D/g, '')
    const legacyPinflOrInn = String(row.pinfl_or_inn ?? '').replace(/\D/g, '')
    const orderedKeys = Object.keys(row).filter((key) =>
        ['pinfl', 'inn', 'pinfl_or_inn'].includes(key),
    )
    const preferredKey = orderedKeys[0] || 'pinfl_or_inn'

    return {
        pinfl,
        inn,
        preferredKey,
        pinflOrInn:
            preferredKey === 'pinfl'
                ? pinfl
                : preferredKey === 'inn'
                  ? inn
                  : legacyPinflOrInn,
    }
}

const readSheetWithHeaders = (
    worksheet: XLSX.WorkSheet,
    requiredHeaders: string[],
) => {
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

const RegistryOrganizationBranchFields = ({
    role,
    values,
    setFieldValue,
    orgOptions,
    branchOptions,
    isSubmitting,
}: any) => {
    if (!BRANCH_SELECT_ROLES.includes(role)) {
        return null
    }

    return (
        <div
            className={
                role === ROLE_ADMIN
                    ? 'grid grid-cols-1 gap-6 md:grid-cols-2'
                    : 'grid grid-cols-1 gap-6'
            }
        >
            {role === ROLE_ADMIN && (
                <FormItem
                    label="Tashkilot"
                    invalid={isSubmitting && !values.organizationId}
                    errorMessage="Tashkilot tanlash shart"
                >
                    <Select
                        options={orgOptions}
                        placeholder="Tashkilotni tanlang"
                        value={
                            orgOptions.find(
                                (option: Option) =>
                                    option.value === values.organizationId,
                            ) || null
                        }
                        onChange={(option: any) => {
                            setFieldValue(
                                'organizationId',
                                option?.value != null
                                    ? Number(option.value)
                                    : null,
                            )
                            setFieldValue('branchId', null)
                        }}
                        className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    />
                </FormItem>
            )}

            <FormItem
                label="Filial"
                invalid={isSubmitting && !values.branchId}
                errorMessage="Filial tanlash shart"
            >
                <Select
                    options={branchOptions}
                    placeholder="Filialni tanlang"
                    isDisabled={role === ROLE_ADMIN && !values.organizationId}
                    value={
                        branchOptions.find(
                            (option: Option) => option.value === values.branchId,
                        ) || null
                    }
                    onChange={(option: any) =>
                        setFieldValue(
                            'branchId',
                            option?.value != null ? Number(option.value) : null,
                        )
                    }
                    className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                />
            </FormItem>
        </div>
    )
}

const CreateRegistry = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const {
        templates,
        getTemplates,
        isLoading: isTemplatesLoading,
    } = useTemplateStore()

    const {
        myOrganizations,
        myBranches,
        organizationBranches,
        fetchMyOrganizations,
        fetchMyBranches,
        fetchMyOrganizationBranches,
    } = useOrganizationStore()

    const token = useAccountStore((state) => state.user?.token)
    const userProfile = useAccountStore((state) => state.userProfile)
    const role = Number(userProfile?.role || 0)
    const isAdminRole = role === ROLE_ADMIN
    const isBranchSelectionRole = BRANCH_SELECT_ROLES.includes(role)

    const [activeTab, setActiveTab] = useState('internal')

    const [internalExcelData, setInternalExcelData] = useState<any[]>([])
    const [internalValidationErrors, setInternalValidationErrors] = useState<
        string[]
    >([])
    const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[]>(
        [],
    )

    const [externalExcelData, setExternalExcelData] = useState<any[]>([])
    const [externalValidationErrors, setExternalValidationErrors] = useState<
        string[]
    >([])
    const [externalUploadedFiles, setExternalUploadedFiles] = useState<File[]>(
        [],
    )

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [apiResult, setApiResult] = useState<any>(null)

    useEffect(() => {
        getTemplates()
    }, [getTemplates])

    useEffect(() => {
        if (role === ROLE_WORKER || role === ROLE_BRANCH_DIRECTOR) {
            fetchMyBranches()
            return
        }

        if (isAdminRole) {
            fetchMyOrganizations()
            fetchMyOrganizationBranches()
        }
    }, [
        fetchMyBranches,
        fetchMyOrganizationBranches,
        fetchMyOrganizations,
        isAdminRole,
        role,
    ])

    const templateOptions = templates.map((template) => ({
        value: template.name,
        label: template.name,
    }))

    const orgOptions = myOrganizations.map((organization) => ({
        value: Number(organization.id),
        label: organization.fullName || organization.shortName,
    }))

    const getAdminBranchOptions = (organizationId: number | null) => {
        if (role === ROLE_WORKER || role === ROLE_BRANCH_DIRECTOR) {
            return myBranches.map((branch: any) => ({
                value: Number(branch.id),
                label: branch.name,
            }))
        }

        if (!organizationId) {
            return [] as Option[]
        }

        return organizationBranches
            .filter(
                (branch: any) =>
                    Number(branch.organizationId) === Number(organizationId),
            )
            .map((branch: any) => ({
                value: Number(branch.id),
                label: branch.name,
            }))
    }

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

    const validateInternalExcelData = (data: any[]) => {
        const errors: string[] = []
        const requiredFields = getInternalRequiredHeaders(role)

        data.forEach((row, index) => {
            const rowNumber = index + 3

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

    const validateExternalExcelData = (data: any[]) => {
        const errors: string[] = []
        const hasPinflHeader = data.some((row) =>
            Object.prototype.hasOwnProperty.call(row, 'pinfl'),
        )
        const hasInnHeader = data.some((row) =>
            Object.prototype.hasOwnProperty.call(row, 'inn'),
        )
        const hasLegacyHeader = data.some((row) =>
            Object.prototype.hasOwnProperty.call(row, 'pinfl_or_inn'),
        )

        if (!hasPinflHeader && !hasInnHeader && !hasLegacyHeader) {
            return [
                "Excel faylda `pinfl` yoki `inn` nomli header bo'lishi kerak",
            ]
        }

        data.forEach((row, index) => {
            const rowNumber = index + 3
            const { pinfl, inn, pinflOrInn, preferredKey } =
                getNormalizedExternalIdentifiers(row)

            if (!pinflOrInn) {
                errors.push(
                    `Qator ${rowNumber}: "${preferredKey}" ustuni bo'sh`,
                )
            }

            if (preferredKey === 'pinfl' && pinfl && pinfl.length !== 14) {
                errors.push(
                    `Qator ${rowNumber}: "pinfl" 14 ta raqam bo'lishi kerak`,
                )
            }

            if (preferredKey === 'inn' && inn && inn.length !== 9) {
                errors.push(
                    `Qator ${rowNumber}: "inn" 9 ta raqam bo'lishi kerak`,
                )
            }

            if (
                preferredKey === 'pinfl_or_inn' &&
                pinflOrInn &&
                pinflOrInn.length !== 9 &&
                pinflOrInn.length !== 14
            ) {
                errors.push(
                    `Qator ${rowNumber}: "pinfl_or_inn" 9 yoki 14 ta raqam bo'lishi kerak`,
                )
            }
        })

        return errors
    }

    const transformInternalDataToApiFormat = (
        rawData: any[],
        templateName: string,
        selectedBranchId?: number | null,
    ) => {
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
                BranchId: selectedBranchId
                    ? Number(selectedBranchId)
                    : branch_id
                      ? Number(branch_id)
                      : 0,
            }
        })
    }

    const transformExternalDataToApiFormat = (
        rawData: any[],
        templateName: string,
        selectedBranchId?: number | null,
    ) => {
        const cleanRows = rawData.filter((row) => {
            const { pinflOrInn } = getNormalizedExternalIdentifiers(row)

            return row && isMeaningfulValue(pinflOrInn)
        })

        return cleanRows.map((row) => {
            const { pinfl, inn, pinfl_or_inn, branch_id, ...rest } = row
            const contentObj: Record<string, string> = {}
            const normalizedIdentifiers = getNormalizedExternalIdentifiers(row)

            Object.keys(rest).forEach((key) => {
                contentObj[key] = String(rest[key] ?? '')
            })

            return {
                pinflOrInn: normalizedIdentifiers.pinflOrInn,
                templateName,
                content: JSON.stringify(contentObj),
                branchId: selectedBranchId
                    ? Number(selectedBranchId)
                    : branch_id
                      ? Number(branch_id)
                      : 0,
            }
        })
    }

    const mapApiResult = (response: any) => {
        const resultData = response.data?.data || {}

        return {
            message:
                response.data?.message ||
                'Amaliyot muvaffaqiyatli yakunlandi',
            totalProcessed: resultData.totalProcessed || 0,
            successCount: resultData.successCount || 0,
            errorCount: resultData.errorCount || 0,
            errorMessages: resultData.errorMessages || [],
        }
    }

    const parseInternalExcelFile = (file: File) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            const data = event.target?.result

            if (!data) return

            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const result = readSheetWithHeaders(
                worksheet,
                getInternalRequiredHeaders(role),
            )

            if (result.error) {
                setInternalValidationErrors([result.error])
                return
            }

            const normalizedData = result.data

            if (normalizedData.length === 0) {
                setInternalValidationErrors([
                    "Excel faylda o'qiladigan ma'lumot topilmadi",
                ])
                return
            }

            if (normalizedData.length > 200) {
                setInternalValidationErrors([
                    'Excel file contains more than 200 records. Maximum allowed is 200.',
                ])
                return
            }

            const errors = validateInternalExcelData(normalizedData)

            if (errors.length > 0) {
                setInternalValidationErrors(errors)
                return
            }

            setInternalExcelData(normalizedData)
        }

        reader.readAsBinaryString(file)
    }

    const parseExternalExcelFile = (file: File) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            const data = event.target?.result

            if (!data) return

            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const result = readSheetWithHeaders(
                worksheet,
                getExternalRequiredHeaders(role),
            )

            if (result.error) {
                setExternalValidationErrors([result.error])
                return
            }

            const normalizedData = result.data

            if (normalizedData.length === 0) {
                setExternalValidationErrors([
                    "Excel faylda o'qiladigan ma'lumot topilmadi",
                ])
                return
            }

            if (normalizedData.length > 200) {
                setExternalValidationErrors([
                    'Excel file contains more than 200 records. Maximum allowed is 200.',
                ])
                return
            }

            const errors = validateExternalExcelData(normalizedData)

            if (errors.length > 0) {
                setExternalValidationErrors(errors)
                return
            }

            setExternalExcelData(normalizedData)
        }

        reader.readAsBinaryString(file)
    }

    const handleInternalFileUpload = (files: File[], form: any) => {
        setInternalValidationErrors([])
        setInternalExcelData([])

        if (!files || files.length === 0) return

        const file = files[0]

        if (!isExcelFile(file)) {
            setInternalUploadedFiles([])
            form.setFieldValue('file', null)
            return
        }

        setInternalUploadedFiles([file])
        form.setFieldValue('file', file)
        parseInternalExcelFile(file)
    }

    const handleExternalFileUpload = (files: File[], form: any) => {
        setExternalValidationErrors([])
        setExternalExcelData([])

        if (!files || files.length === 0) return

        const file = files[0]

        if (!isExcelFile(file)) {
            setExternalUploadedFiles([])
            form.setFieldValue('file', null)
            return
        }

        setExternalUploadedFiles([file])
        form.setFieldValue('file', file)
        parseExternalExcelFile(file)
    }

    const handleInternalFileRemove = (form: any) => {
        setInternalUploadedFiles([])
        setInternalExcelData([])
        setInternalValidationErrors([])
        form.setFieldValue('file', null)
    }

    const handleExternalFileRemove = (form: any) => {
        setExternalUploadedFiles([])
        setExternalExcelData([])
        setExternalValidationErrors([])
        form.setFieldValue('file', null)
    }

    const handleInternalSubmit = async (values: any) => {
        if (internalValidationErrors.length > 0) return

        if (isAdminRole && !values.organizationId) {
            toast.push(
                <Notification type="warning">
                    Tashkilot tanlash shart
                </Notification>,
            )
            return
        }

        if (isBranchSelectionRole && !values.branchId) {
            toast.push(
                <Notification type="warning">
                    Filial tanlash shart
                </Notification>,
            )
            return
        }

        if (internalExcelData.length === 0) {
            toast.push(
                <Notification type="warning">
                    Excel fayl ma'lumotlari bo'sh
                </Notification>,
            )
            return
        }

        setIsSubmitting(true)

        const payload = {
            mails: transformInternalDataToApiFormat(
                internalExcelData,
                values.templateName,
                values.branchId,
            ),
            ...(isBranchSelectionRole
                ? {
                      BranchId: Number(values.branchId) || 0,
                  }
                : {}),
            ...(isAdminRole
                ? {
                      OrganizationId: Number(values.organizationId) || 0,
                  }
                : {}),
        }

        toast.push(
            <Notification type="info">
                Jo'natildi, yaratilmoqda. Tayyor bo'lgach sizga xabar beramiz.
            </Notification>,
        )

        try {
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
                setApiResult(mapApiResult(response))
                setIsModalOpen(true)
            }
        } catch (error: any) {
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

    const handleExternalSubmit = async (values: any) => {
        if (externalValidationErrors.length > 0) return

        if (isAdminRole && !values.organizationId) {
            toast.push(
                <Notification type="warning">
                    Tashkilot tanlash shart
                </Notification>,
            )
            return
        }

        if (isBranchSelectionRole && !values.branchId) {
            toast.push(
                <Notification type="warning">
                    Filial tanlash shart
                </Notification>,
            )
            return
        }

        if (externalExcelData.length === 0) {
            toast.push(
                <Notification type="warning">
                    Excel fayl ma'lumotlari bo'sh
                </Notification>,
            )
            return
        }

        setIsSubmitting(true)

        const payload = {
            mails: transformExternalDataToApiFormat(
                externalExcelData,
                values.templateName,
                values.branchId,
            ),
            ...(isBranchSelectionRole
                ? {
                      BranchId: Number(values.branchId) || 0,
                  }
                : {}),
            ...(isAdminRole
                ? {
                      OrganizationId: Number(values.organizationId) || 0,
                  }
                : {}),
        }

        try {
            const response = await axios.post(
                `${BASE_URL}/registry/process-mails/external`,
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
                setApiResult(mapApiResult(response))
                setIsModalOpen(true)
            }
        } catch (error: any) {
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
        <div className="relative w-full px-5 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {t('registry.title', 'Hujjat Reyestri Yaratish')}
                </h1>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                    Ommaviy hujjat yaratish uchun yaratish turini tanlang
                </p>
            </div>

            <Tabs
                value={activeTab}
                onChange={(value) => setActiveTab(String(value))}
                variant="underline"
                className="w-full"
            >
                <Tabs.TabList className="mb-6 border-b border-gray-100 dark:border-gray-700">
                    <Tabs.TabNav
                        value="internal"
                        className="px-1 py-3 text-sm font-semibold"
                    >
                        Reyestr yaratish
                    </Tabs.TabNav>
                    <Tabs.TabNav
                        value="external"
                        className="px-1 py-3 text-sm font-semibold"
                    >
                        Pinfl/Inn bo'yicha yaratish
                    </Tabs.TabNav>
                </Tabs.TabList>

                <Tabs.TabContent value="internal">
                    <Formik
                        initialValues={{
                            templateName: '',
                            file: null,
                            organizationId: null,
                            branchId: null,
                        }}
                        onSubmit={handleInternalSubmit}
                    >
                        {({ values, setFieldValue }) => (
                            <Form>
                                <FormContainer>
                                    <div className="flex flex-col gap-6">
                                        <RegistryOrganizationBranchFields
                                            role={role}
                                            values={values}
                                            setFieldValue={setFieldValue}
                                            orgOptions={orgOptions}
                                            branchOptions={getAdminBranchOptions(
                                                values.organizationId,
                                            )}
                                            isSubmitting={isSubmitting}
                                        />

                                        <FormItem
                                            label="Shablon turi"
                                            invalid={
                                                !values.templateName &&
                                                isSubmitting
                                            }
                                            errorMessage="Shablon tanlash shart"
                                        >
                                            <Field name="templateName">
                                                {({ field, form }: any) => (
                                                    <Select
                                                        field={field}
                                                        form={form}
                                                        className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                                                        options={
                                                            templateOptions
                                                        }
                                                        isLoading={
                                                            isTemplatesLoading
                                                        }
                                                        placeholder={
                                                            isTemplatesLoading
                                                                ? 'Yuklanmoqda...'
                                                                : 'Shablonni tanlang...'
                                                        }
                                                        value={templateOptions.find(
                                                            (option) =>
                                                                option.value ===
                                                                values.templateName,
                                                        )}
                                                        onChange={(
                                                            option: any,
                                                        ) =>
                                                            form.setFieldValue(
                                                                field.name,
                                                                option?.value ||
                                                                    '',
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
                                                        beforeUpload={
                                                            validateRegistryFile
                                                        }
                                                        draggable
                                                        className="cursor-pointer border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                                        fileList={
                                                            internalUploadedFiles
                                                        }
                                                        multiple={false}
                                                        onChange={(files) =>
                                                            handleInternalFileUpload(
                                                                files,
                                                                form,
                                                            )
                                                        }
                                                        onFileRemove={() =>
                                                            handleInternalFileRemove(
                                                                form,
                                                            )
                                                        }
                                                        uploadLimit={1}
                                                    >
                                                        <div className="flex flex-col items-center justify-center py-8">
                                                            <div className="mb-4 text-5xl text-indigo-500">
                                                                <HiOutlineCloudUpload />
                                                            </div>

                                                            <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                                                                {values.file ? (
                                                                    <span className="font-bold text-emerald-500">
                                                                        {
                                                                            values
                                                                                .file
                                                                                .name
                                                                        }{' '}
                                                                        yuklandi
                                                                    </span>
                                                                ) : (
                                                                    'Faylni shu yerga tashlang yoki yuklang'
                                                                )}
                                                            </div>

                                                            <div className="mt-2 text-sm text-gray-400">
                                                                Excel (.xlsx,
                                                                .xls)
                                                            </div>

                                                            <div className="mt-3 max-w-xl text-center text-xs font-medium text-amber-500 dark:text-amber-300">
                                                                Majburiy Excel
                                                                ustunlari:
                                                                `receiver`,
                                                                `address`,
                                                                `region`,
                                                                `area`.
                                                            </div>
                                                        </div>
                                                    </Upload>
                                                )}
                                            </Field>
                                        </FormItem>

                                        {internalValidationErrors.length > 0 && (
                                            <Alert
                                                showIcon
                                                className="mb-4"
                                                type="danger"
                                                title="Faylda xatoliklar mavjud"
                                            >
                                                <div className="mt-2 max-h-40 overflow-y-auto pl-2 text-sm">
                                                    <ul className="list-disc space-y-1">
                                                        {internalValidationErrors.map(
                                                            (error, index) => (
                                                                <li key={index}>
                                                                    {error}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            </Alert>
                                        )}

                                        <div className="mt-2 flex justify-end gap-4">
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
                                                    internalValidationErrors.length >
                                                        0 ||
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
                </Tabs.TabContent>

                <Tabs.TabContent value="external">
                    <Formik
                        initialValues={{
                            templateName: '',
                            file: null,
                            organizationId: null,
                            branchId: null,
                        }}
                        onSubmit={handleExternalSubmit}
                    >
                        {({ values, setFieldValue }) => (
                            <Form>
                                <FormContainer>
                                    <div className="flex flex-col gap-6">
                                        <RegistryOrganizationBranchFields
                                            role={role}
                                            values={values}
                                            setFieldValue={setFieldValue}
                                            orgOptions={orgOptions}
                                            branchOptions={getAdminBranchOptions(
                                                values.organizationId,
                                            )}
                                            isSubmitting={isSubmitting}
                                        />

                                        <FormItem
                                            label="Shablon turi"
                                            invalid={
                                                !values.templateName &&
                                                isSubmitting
                                            }
                                            errorMessage="Shablon tanlash shart"
                                        >
                                            <Field name="templateName">
                                                {({ field, form }: any) => (
                                                    <Select
                                                        field={field}
                                                        form={form}
                                                        className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                                                        options={
                                                            templateOptions
                                                        }
                                                        isLoading={
                                                            isTemplatesLoading
                                                        }
                                                        placeholder={
                                                            isTemplatesLoading
                                                                ? 'Yuklanmoqda...'
                                                                : 'Shablonni tanlang...'
                                                        }
                                                        value={templateOptions.find(
                                                            (option) =>
                                                                option.value ===
                                                                values.templateName,
                                                        )}
                                                        onChange={(
                                                            option: any,
                                                        ) =>
                                                            form.setFieldValue(
                                                                field.name,
                                                                option?.value ||
                                                                    '',
                                                            )
                                                        }
                                                    />
                                                )}
                                            </Field>
                                        </FormItem>

                                        <FormItem
                                            label="Pinfl / Inn reyestr (Excel)"
                                            invalid={!values.file && isSubmitting}
                                            errorMessage="Fayl yuklash shart"
                                        >
                                            <Field name="file">
                                                {({ form }: any) => (
                                                    <Upload
                                                        accept={EXCEL_ACCEPT}
                                                        beforeUpload={
                                                            validateRegistryFile
                                                        }
                                                        draggable
                                                        className="cursor-pointer border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                                        fileList={
                                                            externalUploadedFiles
                                                        }
                                                        multiple={false}
                                                        onChange={(files) =>
                                                            handleExternalFileUpload(
                                                                files,
                                                                form,
                                                            )
                                                        }
                                                        onFileRemove={() =>
                                                            handleExternalFileRemove(
                                                                form,
                                                            )
                                                        }
                                                        uploadLimit={1}
                                                    >
                                                        <div className="flex flex-col items-center justify-center py-8">
                                                            <div className="mb-4 text-5xl text-indigo-500">
                                                                <HiOutlineCloudUpload />
                                                            </div>

                                                            <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                                                                {values.file ? (
                                                                    <span className="font-bold text-emerald-500">
                                                                        {
                                                                            values
                                                                                .file
                                                                                .name
                                                                        }{' '}
                                                                        yuklandi
                                                                    </span>
                                                                ) : (
                                                                    'Faylni shu yerga tashlang yoki yuklang'
                                                                )}
                                                            </div>

                                                            <div className="mt-2 text-sm text-gray-400">
                                                                Excel ichida
                                                                `pinfl` yoki
                                                                `inn` va
                                                                kerakli
                                                                content
                                                                ustunlari
                                                                bo'lishi kerak
                                                            </div>

                                                            <div className="mt-3 max-w-xl text-center text-xs font-medium text-amber-500 dark:text-amber-300">
                                                                Majburiy Excel
                                                                headerlari:
                                                                `pinfl` yoki
                                                                `inn`.
                                                                `pinfl` 14 ta,
                                                                `inn` 9 ta
                                                                raqam bo'lishi
                                                                kerak. Ikkalasi
                                                                ham bo'lsa,
                                                                birinchi turgan
                                                                ustun qiymati
                                                                olinadi.
                                                            </div>
                                                        </div>
                                                    </Upload>
                                                )}
                                            </Field>
                                        </FormItem>

                                        {externalValidationErrors.length > 0 && (
                                            <Alert
                                                showIcon
                                                className="mb-4"
                                                type="danger"
                                                title="Faylda xatoliklar mavjud"
                                            >
                                                <div className="mt-2 max-h-40 overflow-y-auto pl-2 text-sm">
                                                    <ul className="list-disc space-y-1">
                                                        {externalValidationErrors.map(
                                                            (error, index) => (
                                                                <li key={index}>
                                                                    {error}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            </Alert>
                                        )}

                                        <div className="mt-2 flex justify-end gap-4">
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
                                                className="min-w-[180px]"
                                                type="submit"
                                                disabled={
                                                    isSubmitting ||
                                                    externalValidationErrors.length >
                                                        0 ||
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
                </Tabs.TabContent>
            </Tabs>

            {isModalOpen && apiResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                Qayta ishlash natijasi
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="mb-6 grid grid-cols-3 gap-4 text-center">
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Jami
                                    </div>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {apiResult.totalProcessed}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Muvaffaqiyatli
                                    </div>
                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {apiResult.successCount}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
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
                                        <div className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                            Xatoliklar ro'yxati:
                                        </div>

                                        <ul className="list-disc space-y-1 rounded-lg bg-red-50 p-4 pl-5 text-sm text-red-600 dark:bg-red-900/10 dark:text-red-400">
                                            {apiResult.errorMessages.map(
                                                (
                                                    message: string,
                                                    index: number,
                                                ) => (
                                                    <li key={index}>
                                                        {message}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </div>

                        <div className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
                            <Button
                                variant="solid"
                                onClick={handleCloseModal}
                            >
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
