import { useState, useEffect, useRef } from 'react'
import { Formik, Form } from 'formik'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { FormContainer } from '@/components/ui/Form'
import Tabs from '@/components/ui/Tabs'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useTemplateStore } from '@/store/templateStore'
import { useAccountStore } from '@/store/accountStore'
import { useOrganizationStore } from '@/store/organizationStore'
import { useRegistryProcessStore } from '@/store/registryProcessStore'
import {
    ROLE_WORKER,
    ROLE_BRANCH_DIRECTOR,
    ROLE_ADMIN,
} from '@/constants/usertype.constant'
import RegistryFormSection from './components/create-registry/RegistryFormSection'
import RegistryResultModal from './components/create-registry/RegistryResultModal'
import {
    type Option,
    type RegistryApiResult,
    buildValidationDownloadRows,
    createRegistryErrorResult,
    downloadValidationRowsExcel,
    getInternalRequiredHeaders,
    getExternalRequiredHeaders,
    isExcelFile,
    validateRegistryFile,
    validateInternalExcelData,
    validateExternalExcelData,
    transformInternalDataToApiFormat,
    transformExternalDataToApiFormat,
    readSheetWithHeaders,
} from './components/create-registry/createRegistry.utils'

const BRANCH_SELECT_ROLES = [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN]

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

    const userProfile = useAccountStore((state) => state.userProfile)
    const submitRegistryProcess = useRegistryProcessStore(
        (state) => state.submitRegistryProcess,
    )
    const role = Number(userProfile?.role || 0)
    const isAdminRole = role === ROLE_ADMIN
    const isWorkerRole = role === ROLE_WORKER
    const isBranchSelectionRole = BRANCH_SELECT_ROLES.includes(role)
    const isMountedRef = useRef(false)

    const [activeTab, setActiveTab] = useState('internal')

    const [internalExcelData, setInternalExcelData] = useState<any[]>([])
    const [internalValidationErrors, setInternalValidationErrors] = useState<
        string[]
    >([])
    const [internalValidationDownloadRows, setInternalValidationDownloadRows] =
        useState<Record<string, string>[]>([])
    const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[]>(
        [],
    )

    const [externalExcelData, setExternalExcelData] = useState<any[]>([])
    const [externalValidationErrors, setExternalValidationErrors] = useState<
        string[]
    >([])
    const [externalValidationDownloadRows, setExternalValidationDownloadRows] =
        useState<Record<string, string>[]>([])
    const [externalUploadedFiles, setExternalUploadedFiles] = useState<File[]>(
        [],
    )

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [apiResult, setApiResult] = useState<RegistryApiResult | null>(null)

    useEffect(() => {
        getTemplates()
    }, [getTemplates])

    useEffect(() => {
        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
        }
    }, [])

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

    const parseInternalExcelFile = (file: File) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            const data = event.target?.result

            if (!data) return

            const workbook = XLSX.read(data, {
                type: 'binary',
                cellText: true,
                cellDates: false,
                cellNF: true,
                dateNF: 'dd/mm/yyyy',
            })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const result = readSheetWithHeaders(
                worksheet,
                getInternalRequiredHeaders(),
            )

            if (result.error) {
                setInternalValidationErrors([result.error])
                setInternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        [],
                        true,
                    ),
                )
                return
            }

            const normalizedData = result.data

            if (normalizedData.length === 0) {
                setInternalValidationErrors([
                    "Excel faylda o'qiladigan ma'lumot topilmadi",
                ])
                setInternalValidationDownloadRows([])
                return
            }

            if (normalizedData.length > 500) {
                setInternalValidationErrors([
                    'Excel file contains more than 500 records. Maximum allowed is 500.',
                ])
                setInternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        [],
                        true,
                    ),
                )
                return
            }

            const validationResult = validateInternalExcelData(result.parsedRows)

            if (validationResult.errors.length > 0) {
                setInternalValidationErrors(validationResult.errors)
                setInternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        validationResult.issues,
                    ),
                )
                return
            }

            setInternalValidationDownloadRows([])
            setInternalExcelData(normalizedData)
        }

        reader.readAsBinaryString(file)
    }

    const parseExternalExcelFile = (file: File) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            const data = event.target?.result

            if (!data) return

            const workbook = XLSX.read(data, {
                type: 'binary',
                cellText: true,
                cellDates: false,
                cellNF: true,
                dateNF: 'dd/mm/yyyy',
            })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const result = readSheetWithHeaders(
                worksheet,
                getExternalRequiredHeaders(),
            )

            if (result.error) {
                setExternalValidationErrors([result.error])
                setExternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        [],
                        true,
                    ),
                )
                return
            }

            const normalizedData = result.data

            if (normalizedData.length === 0) {
                setExternalValidationErrors([
                    "Excel faylda o'qiladigan ma'lumot topilmadi",
                ])
                setExternalValidationDownloadRows([])
                return
            }

            if (normalizedData.length > 500) {
                setExternalValidationErrors([
                    'Excel file contains more than 500 records. Maximum allowed is 500.',
                ])
                setExternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        [],
                        true,
                    ),
                )
                return
            }

            const validationResult = validateExternalExcelData(result.parsedRows)

            if (validationResult.errors.length > 0) {
                setExternalValidationErrors(validationResult.errors)
                setExternalValidationDownloadRows(
                    buildValidationDownloadRows(
                        result.originalRows,
                        validationResult.issues,
                        validationResult.issues.length === 0,
                    ),
                )
                return
            }

            setExternalValidationDownloadRows([])
            setExternalExcelData(normalizedData)
        }

        reader.readAsBinaryString(file)
    }

    const handleInternalFileUpload = (files: File[], form: any) => {
        setInternalValidationErrors([])
        setInternalValidationDownloadRows([])
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
        setExternalValidationDownloadRows([])
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
        setInternalValidationDownloadRows([])
        form.setFieldValue('file', null)
    }

    const handleExternalFileRemove = (form: any) => {
        setExternalUploadedFiles([])
        setExternalExcelData([])
        setExternalValidationErrors([])
        setExternalValidationDownloadRows([])
        form.setFieldValue('file', null)
    }

    const createValidationExportFileName = (type: 'internal' | 'external') => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

        return `registry_validation_errors_${type}_${timestamp}.xlsx`
    }

    const handleValidationRowsDownload = (
        rows: Record<string, string>[],
        type: 'internal' | 'external',
    ) => {
        const downloaded = downloadValidationRowsExcel(
            rows,
            createValidationExportFileName(type),
        )

        toast.push(
            <Notification type={downloaded ? 'success' : 'warning'}>
                {downloaded
                    ? 'Xato qatorlar Excel faylga yuklab olindi'
                    : 'Yuklab olish uchun xato qatorlar topilmadi'}
            </Notification>,
        )
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
                 ...(isWorkerRole
                ? {
                      OrganizationId: Number(userProfile.workingOrganizationId) || 0,
                  }
                : {}),

        }

        try {
            const result = await submitRegistryProcess({
                type: 'internal',
                payload,
            })

            if (
                result.success &&
                result.result &&
                isMountedRef.current
            ) {
                setApiResult(result.result)
                setIsModalOpen(true)
            } else if (
                !result.success &&
                result.errorMessage &&
                isMountedRef.current
            ) {
                setApiResult(createRegistryErrorResult(result.errorMessage))
                setIsModalOpen(true)
            }
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false)
            }
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
                   ...(isWorkerRole
                ? {
                      OrganizationId: Number(userProfile.workingOrganizationId) || 0,
                  }
                : {}),
        }

        try {
            const result = await submitRegistryProcess({
                type: 'external',
                payload,
            })

            if (
                result.success &&
                result.result &&
                isMountedRef.current
            ) {
                setApiResult(result.result)
                setIsModalOpen(true)
            } else if (
                !result.success &&
                result.errorMessage &&
                isMountedRef.current
            ) {
                setApiResult(createRegistryErrorResult(result.errorMessage))
                setIsModalOpen(true)
            }
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false)
            }
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        if (apiResult?.status === 'success') {
            navigate('/mail/draftmails')
        }
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
                                    <RegistryFormSection
                                        role={role}
                                        showBranchSelection={
                                            isBranchSelectionRole
                                        }
                                        values={values}
                                        setFieldValue={setFieldValue}
                                        orgOptions={orgOptions}
                                        branchOptions={getAdminBranchOptions(
                                            values.organizationId,
                                        )}
                                        isSubmitting={isSubmitting}
                                        templateOptions={templateOptions}
                                        isTemplatesLoading={
                                            isTemplatesLoading
                                        }
                                        uploadLabel="Hujjat reyestri (Excel)"
                                        uploadDescription="Excel (.xlsx, .xls)"
                                        uploadNote="Majburiy Excel ustunlari: `receiver`, `address`, `region`, `area`."
                                        uploadedFiles={internalUploadedFiles}
                                        validationErrors={
                                            internalValidationErrors
                                        }
                                        validationErrorRowsCount={
                                            internalValidationDownloadRows.length
                                        }
                                        validateRegistryFile={
                                            validateRegistryFile
                                        }
                                        onValidationErrorsDownload={() =>
                                            handleValidationRowsDownload(
                                                internalValidationDownloadRows,
                                                'internal',
                                            )
                                        }
                                        onFileChange={(files) =>
                                            handleInternalFileUpload(
                                                files,
                                                {
                                                    setFieldValue,
                                                },
                                            )
                                        }
                                        onFileRemove={() =>
                                            handleInternalFileRemove({
                                                setFieldValue,
                                            })
                                        }
                                        onCancel={() => navigate(-1)}
                                    />
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
                                    <RegistryFormSection
                                        role={role}
                                        showBranchSelection={
                                            isBranchSelectionRole
                                        }
                                        values={values}
                                        setFieldValue={setFieldValue}
                                        orgOptions={orgOptions}
                                        branchOptions={getAdminBranchOptions(
                                            values.organizationId,
                                        )}
                                        isSubmitting={isSubmitting}
                                        templateOptions={templateOptions}
                                        isTemplatesLoading={
                                            isTemplatesLoading
                                        }
                                        uploadLabel="Pinfl / Inn reyestr (Excel)"
                                        uploadDescription="Excel ichida `pinfl` yoki `inn` va kerakli content ustunlari bo'lishi kerak"
                                        uploadNote="Majburiy Excel headerlari: `pinfl` yoki `inn`. `pinfl` 14 ta, `inn` 9 ta raqam bo'lishi kerak. Ikkalasi ham bo'lsa, birinchi turgan ustun qiymati olinadi."
                                        uploadedFiles={externalUploadedFiles}
                                        validationErrors={
                                            externalValidationErrors
                                        }
                                        validationErrorRowsCount={
                                            externalValidationDownloadRows.length
                                        }
                                        validateRegistryFile={
                                            validateRegistryFile
                                        }
                                        onValidationErrorsDownload={() =>
                                            handleValidationRowsDownload(
                                                externalValidationDownloadRows,
                                                'external',
                                            )
                                        }
                                        onFileChange={(files) =>
                                            handleExternalFileUpload(
                                                files,
                                                {
                                                    setFieldValue,
                                                },
                                            )
                                        }
                                        onFileRemove={() =>
                                            handleExternalFileRemove({
                                                setFieldValue,
                                            })
                                        }
                                        onCancel={() => navigate(-1)}
                                    />
                                </FormContainer>
                            </Form>
                        )}
                    </Formik>
                </Tabs.TabContent>
            </Tabs>

            <RegistryResultModal
                isOpen={isModalOpen}
                apiResult={apiResult}
                onClose={handleCloseModal}
            />
        </div>
    )
}

export default CreateRegistry
