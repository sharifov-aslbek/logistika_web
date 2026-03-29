import { useState, useEffect, useMemo } from 'react'
import { Formik, Form, Field, FieldProps, useFormikContext } from 'formik'
import * as Yup from 'yup'
import axios from 'axios'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import {
    HiOutlineCloudUpload,
    HiOutlineTrash,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'
import { useOrganizationStore } from '@/store/organizationStore'

const ROLE_USER = 0
const ROLE_WORKER = 10
const ROLE_BRANCH_DIRECTOR = 20
const ROLE_ADMIN = 30
const EMPLOYEE_ROLES = [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN]

type Option = {
    value: number
    label: string
}

type SelectFormHelpers = {
    setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean,
    ) => void
    setFieldTouched: (
        field: string,
        isTouched?: boolean,
        shouldValidate?: boolean,
    ) => void
    setFieldError: (field: string, message: string | undefined) => void
}

type UploadFormHelpers = SelectFormHelpers

type LookupPreviewData = {
    name: string
    address: string
}

const AutoSelectOrganization = ({
    organizations,
    role,
}: {
    organizations: any[]
    role: number
}) => {
    const { values, setFieldValue, setFieldError } = useFormikContext<any>()

    useEffect(() => {
        if (
            EMPLOYEE_ROLES.includes(role) &&
            organizations.length > 0 &&
            (values.organizationId == null ||
                !organizations.some(
                    (organization) =>
                        Number(organization.id) === values.organizationId,
                ))
        ) {
            setFieldValue('organizationId', Number(organizations[0].id), false)
            setFieldError('organizationId', undefined)
        }
    }, [organizations, role, setFieldError, setFieldValue, values.organizationId])

    return null
}

const handleNumericSelectChange = (
    fieldName: string,
    option: any,
    helpers: SelectFormHelpers,
) => {
    const newValue =
        option?.value != null ? Number(option.value) : (null as number | null)

    helpers.setFieldValue(fieldName, newValue, true)
    helpers.setFieldTouched(fieldName, true, false)

    if (newValue !== null) {
        helpers.setFieldError(fieldName, undefined)
    }
}

const PdfUploadField = ({
    file,
    fileList,
    invalid,
    errorMessage,
    onChange,
    onRemove,
}: {
    file: File | null
    fileList: File[]
    invalid: boolean
    errorMessage?: string
    onChange: (files: File[]) => void
    onRemove: () => void
}) => {
    return (
        <FormItem
            label="Hujjat yuklash"
            invalid={invalid}
            errorMessage={errorMessage}
        >
            <Upload
                draggable
                accept=".pdf"
                fileList={fileList}
                multiple={false}
                showList={false}
                uploadLimit={1}
                className="border-2 border-dashed border-gray-300 transition-all rounded-xl p-8 hover:border-indigo-500 hover:bg-indigo-50 dark:border-gray-600 dark:hover:bg-gray-800"
                onChange={onChange}
            >
                <div className="flex flex-col items-center justify-center">
                    {!file ? (
                        <>
                            <div className="mb-4 rounded-full bg-indigo-100 p-4 text-5xl text-indigo-500">
                                <HiOutlineCloudUpload />
                            </div>
                            <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                Faylni tanlash yoki shu yerga tashlash
                            </div>
                            <div className="mt-2 text-sm text-gray-400">
                                Faqat PDF (maks. 10MB)
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="mb-4 text-6xl text-red-500">
                                <HiOutlineDocumentText />
                            </div>
                            <div className="mb-1 text-lg font-bold text-gray-800 dark:text-white">
                                {file.name}
                            </div>
                            <div className="mb-4 text-xs text-gray-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            <Button
                                size="sm"
                                variant="solid"
                                color="red-500"
                                icon={<HiOutlineTrash />}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onRemove()
                                }}
                            >
                                Faylni o'chirish
                            </Button>
                        </div>
                    )}
                </div>
            </Upload>
        </FormItem>
    )
}

const PinflOrInnLookupPreview = ({ baseUrl }: { baseUrl: string }) => {
    const { values } = useFormikContext<any>()
    const [lookupData, setLookupData] = useState<LookupPreviewData | null>(null)
    const [isLookupLoading, setIsLookupLoading] = useState(false)
    const [lookupError, setLookupError] = useState('')

    const normalizedValue = String(values.pinflOrInn || '').replace(/\D/g, '')

    useEffect(() => {
        if (!normalizedValue) {
            setLookupData(null)
            setLookupError('')
            setIsLookupLoading(false)
            return
        }

        if (normalizedValue.length !== 9 && normalizedValue.length !== 14) {
            setLookupData(null)
            setLookupError('')
            setIsLookupLoading(false)
            return
        }

        const isPersonLookup = normalizedValue.length === 14
        const timeoutMs = isPersonLookup ? 500 : 1500
        const controller = new AbortController()

        const timer = window.setTimeout(async () => {
            setIsLookupLoading(true)
            setLookupError('')

            try {
                const endpoint = isPersonLookup ? 'person' : 'company'
                const response = await axios.get(
                    `${baseUrl}/integration/${endpoint}/${normalizedValue}`,
                    {
                        headers: {
                            accept: '*/*',
                            'ngrok-skip-browser-warning': 'true',
                        },
                        signal: controller.signal,
                    },
                )

                const responseData = response.data?.data

                if (response.data?.code === 200 && responseData) {
                    setLookupData({
                        name:
                            responseData.name ||
                            responseData.shortName ||
                            'Nomi topilmadi',
                        address: responseData.address || 'Manzil topilmadi',
                    })
                    return
                }

                setLookupData(null)
                setLookupError('Maʼlumot topilmadi')
            } catch (error: any) {
                if (error?.code === 'ERR_CANCELED') {
                    return
                }

                setLookupData(null)
                setLookupError('Maʼlumotni olishda xatolik yuz berdi')
            } finally {
                setIsLookupLoading(false)
            }
        }, timeoutMs)

        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [baseUrl, normalizedValue])

    if (!normalizedValue) {
        return null
    }

    if (isLookupLoading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                Maʼlumot qidirilmoqda...
            </div>
        )
    }

    if (lookupError) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                {lookupError}
            </div>
        )
    }

    if (!lookupData) {
        return null
    }

    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="text-sm font-semibold text-gray-800 dark:text-white">
                {lookupData.name}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                {lookupData.address}
            </div>
        </div>
    )
}

const OrganizationBranchFields = ({
    role,
    orgOptions,
    branchOptions,
    values,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    setFieldError,
}: any) => {
    if (!EMPLOYEE_ROLES.includes(role)) {
        return null
    }

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormItem
                label="Yuboruvchi Tashkilot"
                invalid={!!(errors.organizationId && touched.organizationId)}
                errorMessage={errors.organizationId as string}
            >
                <Select
                    options={orgOptions}
                    placeholder="Tashkilot..."
                    isDisabled={true}
                    value={
                        orgOptions.find(
                            (option: Option) =>
                                option.value === values.organizationId,
                        ) || null
                    }
                    onChange={(option: any) =>
                        handleNumericSelectChange('organizationId', option, {
                            setFieldValue,
                            setFieldTouched,
                            setFieldError,
                        })
                    }
                    className="shadow-sm"
                />
            </FormItem>

            <FormItem
                label="Yuboruvchi Filial"
                invalid={!!(errors.branchId && touched.branchId)}
                errorMessage={errors.branchId as string}
            >
                <Select
                    options={branchOptions}
                    placeholder="Filialni tanlang"
                    value={
                        branchOptions.find(
                            (option: Option) => option.value === values.branchId,
                        ) || null
                    }
                    onChange={(option: any) =>
                        handleNumericSelectChange('branchId', option, {
                            setFieldValue,
                            setFieldTouched,
                            setFieldError,
                        })
                    }
                    className="shadow-sm"
                />
            </FormItem>
        </div>
    )
}

const CreatePdf = () => {
    const { createMail, createExternalMail, isLoading } = useMailStore()
    const userProfile = useAccountStore((state) => state.userProfile)
    const token = useAccountStore((state) => state.user?.token)
    const role = Number(userProfile?.role || 0)
    const isEmployeeRole = EMPLOYEE_ROLES.includes(role)

    const {
        myOrganizations,
        myBranches,
        organizationBranches,
        myBranch,
        fetchMyOrganizations,
        fetchMyBranches,
        fetchMyOrganizationBranches,
        fetchMyBranch,
    } = useOrganizationStore()

    const [activeTab, setActiveTab] = useState('internal')
    const [regions, setRegions] = useState<Option[]>([])
    const [areas, setAreas] = useState<Option[]>([])
    const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[]>(
        [],
    )
    const [externalUploadedFiles, setExternalUploadedFiles] = useState<File[]>(
        [],
    )
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    const BASE_URL =
        import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

    const internalValidationSchema = useMemo(
        () =>
            Yup.object().shape({
                recipient: Yup.string()
                    .trim()
                    .required('Qabul qiluvchi kiritilishi shart'),
                address: Yup.string()
                    .trim()
                    .required('Manzil kiritilishi shart'),
                region: Yup.number()
                    .nullable()
                    .typeError('Viloyat tanlanishi shart')
                    .required('Viloyat tanlanishi shart'),
                area: Yup.number()
                    .nullable()
                    .typeError('Tuman tanlanishi shart')
                    .required('Tuman tanlanishi shart'),
                file: Yup.mixed()
                    .nullable()
                    .required('Fayl yuklanishi shart'),
                organizationId: isEmployeeRole
                    ? Yup.number()
                          .nullable()
                          .typeError('Tashkilot tanlanishi shart')
                          .required('Tashkilot tanlanishi shart')
                    : Yup.mixed().notRequired(),
                branchId: isEmployeeRole
                    ? Yup.number()
                          .nullable()
                          .typeError('Filial tanlanishi shart')
                          .required('Filial tanlanishi shart')
                    : Yup.mixed().notRequired(),
                senderName: Yup.string().nullable(),
            }),
        [isEmployeeRole],
    )

    const externalValidationSchema = useMemo(
        () =>
            Yup.object().shape({
                pinflOrInn: Yup.string()
                    .trim()
                    .required('PINFL yoki INN kiritilishi shart'),
                file: Yup.mixed()
                    .nullable()
                    .required('Fayl yuklanishi shart'),
                organizationId: isEmployeeRole
                    ? Yup.number()
                          .nullable()
                          .typeError('Tashkilot tanlanishi shart')
                          .required('Tashkilot tanlanishi shart')
                    : Yup.mixed().notRequired(),
                branchId: isEmployeeRole
                    ? Yup.number()
                          .nullable()
                          .typeError('Filial tanlanishi shart')
                          .required('Filial tanlanishi shart')
                    : Yup.mixed().notRequired(),
            }),
        [isEmployeeRole],
    )

    const getHeaders = () => {
        let authToken = token
        if (!authToken) {
            try {
                const local = localStorage.getItem('account-storage')
                if (local) {
                    const parsed = JSON.parse(local)
                    authToken = parsed?.state?.user?.token
                }
            } catch (error) {
                console.error(error)
            }
        }

        return {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken}`,
            accept: '*/*',
        }
    }

    useEffect(() => {
        const initData = async () => {
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })

                if (response.data?.code === 200) {
                    setRegions(
                        response.data.data.map((region: any) => ({
                            value: Number(region.id),
                            label: region.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingRegions(false)
            }

            if (isEmployeeRole) {
                fetchMyOrganizations()

                if (role === ROLE_WORKER) {
                    fetchMyBranches()
                } else if (role === ROLE_BRANCH_DIRECTOR) {
                    fetchMyBranch()
                } else if (role === ROLE_ADMIN) {
                    fetchMyOrganizationBranches()
                }
            }
        }

        initData()
    }, [BASE_URL, isEmployeeRole, role])

    const fetchAreas = async (regionId: number) => {
        setLoadingAreas(true)
        try {
            const response = await axios.get(
                `${BASE_URL}/region/${regionId}/areas`,
                { headers: getHeaders() },
            )

            if (response.data?.code === 200) {
                setAreas(
                    response.data.data.areas.map((area: any) => ({
                        value: Number(area.id),
                        label: area.name,
                    })),
                )
            } else {
                setAreas([])
            }
        } catch (error) {
            console.error(error)
            setAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }

    const handlePdfFileChange = (
        files: File[],
        setUploadedFiles: (files: File[]) => void,
        helpers: UploadFormHelpers,
        fieldName = 'file',
    ) => {
        const file = files?.[0] || null

        setUploadedFiles(file ? [file] : [])
        helpers.setFieldValue(fieldName, file, true)
        helpers.setFieldTouched(fieldName, true, false)

        if (file) {
            helpers.setFieldError(fieldName, undefined)
        }
    }

    const handlePdfFileRemove = (
        setUploadedFiles: (files: File[]) => void,
        helpers: UploadFormHelpers,
        fieldName = 'file',
    ) => {
        setUploadedFiles([])
        helpers.setFieldValue(fieldName, null, true)
        helpers.setFieldTouched(fieldName, true, false)
    }

    const handleInternalSubmit = async (values: any, { resetForm }: any) => {
        const formData = new FormData()
        formData.append('ReceiverName', values.recipient)
        formData.append('ReceiverAddress', values.address)
        formData.append('PagesCount', '1')
        formData.append('RegionId', values.region?.toString() || '')
        formData.append('AreaId', values.area?.toString() || '')
        formData.append('PdfFile', values.file)

        if (isEmployeeRole) {
            formData.append(
                'OrganizationId',
                values.organizationId?.toString() || '',
            )
            formData.append('BranchId', values.branchId?.toString() || '')
        } else {
            formData.append('OrganizationId', '')
            formData.append('BranchId', '')
        }

        const success = await createMail(formData)

        if (success) {
            toast.push(
                <Notification title="Muvaffaqiyatli" type="success">
                    Hujjat muvaffaqiyatli yaratildi!
                </Notification>,
            )
            resetForm()
            setInternalUploadedFiles([])
            setAreas([])
            return
        }

        toast.push(
            <Notification title="Xatolik" type="danger">
                Hujjat yaratishda xatolik yuz berdi.
            </Notification>,
        )
    }

    const handleExternalSubmit = async (values: any, { resetForm }: any) => {
        if (!isEmployeeRole) {
            toast.push(
                <Notification title="Xatolik" type="danger">
                    Ushbu yuborish turi uchun tashkilot va filial kerak.
                </Notification>,
            )
            return
        }

        const formData = new FormData()
        formData.append('PinflOrInn', values.pinflOrInn)
        formData.append('OrganizationId', values.organizationId?.toString() || '')
        formData.append('BranchId', values.branchId?.toString() || '')
        formData.append('PdfFile', values.file)

        const success = await createExternalMail(formData)

        if (success) {
            toast.push(
                <Notification title="Muvaffaqiyatli" type="success">
                    Tashqi hujjat muvaffaqiyatli yuborildi!
                </Notification>,
            )
            resetForm()
            setExternalUploadedFiles([])
            return
        }

        toast.push(
            <Notification title="Xatolik" type="danger">
                Tashqi hujjat yuborishda xatolik yuz berdi.
            </Notification>,
        )
    }

    const orgOptions = useMemo(
        () =>
            myOrganizations.map((organization) => ({
                value: Number(organization.id),
                label: organization.fullName || organization.name,
            })),
        [myOrganizations],
    )

    const branchOptions = useMemo(() => {
        let sourceData: any[] = []

        if (role === ROLE_WORKER) {
            sourceData = myBranches
        } else if (role === ROLE_BRANCH_DIRECTOR) {
            sourceData = myBranch
                ? Array.isArray(myBranch)
                    ? myBranch
                    : [myBranch]
                : []
        } else if (role === ROLE_ADMIN) {
            sourceData = organizationBranches
        }

        return sourceData.map((branch) => ({
            value: Number(branch.id),
            label: branch.name,
        }))
    }, [role, myBranches, myBranch, organizationBranches])

    const inputClass =
        '!border !border-gray-300 !bg-white h-11 rounded-lg focus:!border-indigo-500 dark:!bg-gray-800 dark:!border-gray-600'

    return (
        <div className="flex w-full justify-center p-4">
            <div className="w-full max-w-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        PDF fayldan hujjat yaratish
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Kerakli yuborish turini tanlang va formani to'ldiring
                    </p>
                </div>

                <Card className="rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700">
                    <Tabs
                        value={activeTab}
                        onChange={(value) => setActiveTab(String(value))}
                        variant="underline"
                        className="w-full"
                    >
                        <Tabs.TabList className="border-b border-gray-100 px-6 pt-5 dark:border-gray-700">
                            <Tabs.TabNav
                                value="internal"
                                className="px-1 py-3 text-sm font-semibold"
                            >
                                Standart yuborish
                            </Tabs.TabNav>
                            <Tabs.TabNav
                                value="external"
                                className="px-1 py-3 text-sm font-semibold"
                            >
                                PINFL / INN orqali
                            </Tabs.TabNav>
                        </Tabs.TabList>

                        <div className="px-4 py-6 sm:px-6">
                            <Tabs.TabContent value="internal">
                                <Formik
                                    enableReinitialize={true}
                                    initialValues={{
                                        recipient: '',
                                        address: '',
                                        region: null,
                                        area: null,
                                        file: null,
                                        organizationId: null,
                                        branchId: null,
                                        senderName: userProfile?.fullName || '',
                                    }}
                                    validationSchema={internalValidationSchema}
                                    onSubmit={handleInternalSubmit}
                                >
                                    {({
                                        values,
                                        setFieldValue,
                                        setFieldTouched,
                                        setFieldError,
                                        resetForm,
                                        errors,
                                        touched,
                                    }) => (
                                        <Form>
                                            <FormContainer>
                                                <AutoSelectOrganization
                                                    organizations={
                                                        myOrganizations
                                                    }
                                                    role={role}
                                                />

                                                <div className="flex flex-col gap-6 p-2">
                                                    <OrganizationBranchFields
                                                        role={role}
                                                        orgOptions={orgOptions}
                                                        branchOptions={
                                                            branchOptions
                                                        }
                                                        values={values}
                                                        errors={errors}
                                                        touched={touched}
                                                        setFieldValue={
                                                            setFieldValue
                                                        }
                                                        setFieldTouched={
                                                            setFieldTouched
                                                        }
                                                        setFieldError={
                                                            setFieldError
                                                        }
                                                    />

                                                    {role === ROLE_USER && (
                                                        <FormItem
                                                            label="Yuboruvchi (Siz)"
                                                            invalid={!!(
                                                                errors.senderName &&
                                                                touched.senderName
                                                            )}
                                                            errorMessage={
                                                                errors.senderName as string
                                                            }
                                                        >
                                                            <Field name="senderName">
                                                                {({
                                                                    field,
                                                                }: FieldProps) => (
                                                                    <Input
                                                                        {...field}
                                                                        type="text"
                                                                        placeholder="Yuboruvchi ismi"
                                                                        className={
                                                                            inputClass
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        </FormItem>
                                                    )}

                                                    <FormItem
                                                        label="Qabul qiluvchi"
                                                        invalid={!!(
                                                            errors.recipient &&
                                                            touched.recipient
                                                        )}
                                                        errorMessage={
                                                            errors.recipient as string
                                                        }
                                                    >
                                                        <Field name="recipient">
                                                            {({
                                                                field,
                                                            }: FieldProps) => (
                                                                <Input
                                                                    {...field}
                                                                    type="text"
                                                                    placeholder="To'liq ism yoki tashkilot nomini kiriting"
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                />
                                                            )}
                                                        </Field>
                                                    </FormItem>

                                                    <FormItem
                                                        label="Manzil"
                                                        invalid={!!(
                                                            errors.address &&
                                                            touched.address
                                                        )}
                                                        errorMessage={
                                                            errors.address as string
                                                        }
                                                    >
                                                        <Field name="address">
                                                            {({
                                                                field,
                                                            }: FieldProps) => (
                                                                <Input
                                                                    {...field}
                                                                    type="text"
                                                                    placeholder="To'liq manzil (Ko'cha, Uy va h.k.)"
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                />
                                                            )}
                                                        </Field>
                                                    </FormItem>

                                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                        <FormItem
                                                            label="Viloyat"
                                                            invalid={!!(
                                                                errors.region &&
                                                                touched.region
                                                            )}
                                                            errorMessage={
                                                                errors.region as string
                                                            }
                                                        >
                                                            <Select
                                                                options={
                                                                    regions
                                                                }
                                                                placeholder="Viloyatni tanlang"
                                                                isLoading={
                                                                    loadingRegions
                                                                }
                                                                value={
                                                                    regions.find(
                                                                        (
                                                                            option,
                                                                        ) =>
                                                                            option.value ===
                                                                            values.region,
                                                                    ) || null
                                                                }
                                                                className="shadow-sm"
                                                                onChange={(
                                                                    option: any,
                                                                ) => {
                                                                    const regionValue =
                                                                        option?.value !=
                                                                        null
                                                                            ? Number(
                                                                                  option.value,
                                                                              )
                                                                            : null

                                                                    setFieldValue(
                                                                        'region',
                                                                        regionValue,
                                                                        true,
                                                                    )
                                                                    setFieldTouched(
                                                                        'region',
                                                                        true,
                                                                        false,
                                                                    )

                                                                    if (
                                                                        regionValue !==
                                                                        null
                                                                    ) {
                                                                        setFieldError(
                                                                            'region',
                                                                            undefined,
                                                                        )
                                                                        fetchAreas(
                                                                            regionValue,
                                                                        )
                                                                    } else {
                                                                        setAreas(
                                                                            [],
                                                                        )
                                                                    }

                                                                    setFieldValue(
                                                                        'area',
                                                                        null,
                                                                        false,
                                                                    )
                                                                    setFieldTouched(
                                                                        'area',
                                                                        false,
                                                                        false,
                                                                    )
                                                                }}
                                                            />
                                                        </FormItem>

                                                        <FormItem
                                                            label="Tuman"
                                                            invalid={!!(
                                                                errors.area &&
                                                                touched.area
                                                            )}
                                                            errorMessage={
                                                                errors.area as string
                                                            }
                                                        >
                                                            <Select
                                                                options={areas}
                                                                placeholder="Tumanni tanlang"
                                                                isLoading={
                                                                    loadingAreas
                                                                }
                                                                isDisabled={
                                                                    !values.region
                                                                }
                                                                value={
                                                                    areas.find(
                                                                        (
                                                                            option,
                                                                        ) =>
                                                                            option.value ===
                                                                            values.area,
                                                                    ) || null
                                                                }
                                                                className="shadow-sm"
                                                                onChange={(
                                                                    option: any,
                                                                ) =>
                                                                    handleNumericSelectChange(
                                                                        'area',
                                                                        option,
                                                                        {
                                                                            setFieldValue,
                                                                            setFieldTouched,
                                                                            setFieldError,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        </FormItem>
                                                    </div>

                                                    <PdfUploadField
                                                        file={values.file}
                                                        fileList={
                                                            internalUploadedFiles
                                                        }
                                                        invalid={!!(
                                                            errors.file &&
                                                            touched.file
                                                        )}
                                                        errorMessage={
                                                            errors.file as string
                                                        }
                                                        onChange={(files) =>
                                                            handlePdfFileChange(
                                                                files,
                                                                setInternalUploadedFiles,
                                                                {
                                                                    setFieldValue,
                                                                    setFieldTouched,
                                                                    setFieldError,
                                                                },
                                                            )
                                                        }
                                                        onRemove={() =>
                                                            handlePdfFileRemove(
                                                                setInternalUploadedFiles,
                                                                {
                                                                    setFieldValue,
                                                                    setFieldTouched,
                                                                    setFieldError,
                                                                },
                                                            )
                                                        }
                                                    />

                                                    <div className="mt-6 flex justify-end gap-4 border-t border-gray-100 pt-6 dark:border-gray-700">
                                                        <Button
                                                            size="md"
                                                            className="min-w-[120px]"
                                                            type="button"
                                                            onClick={() => {
                                                                resetForm()
                                                                setInternalUploadedFiles(
                                                                    [],
                                                                )
                                                                setAreas([])
                                                            }}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                        <Button
                                                            variant="solid"
                                                            size="md"
                                                            className="min-w-[150px] bg-indigo-600 hover:bg-indigo-700"
                                                            type="submit"
                                                            loading={
                                                                isLoading
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
                                    enableReinitialize={true}
                                    initialValues={{
                                        pinflOrInn: '',
                                        file: null,
                                        organizationId: null,
                                        branchId: null,
                                    }}
                                    validationSchema={externalValidationSchema}
                                    onSubmit={handleExternalSubmit}
                                >
                                    {({
                                        values,
                                        setFieldValue,
                                        setFieldTouched,
                                        setFieldError,
                                        resetForm,
                                        errors,
                                        touched,
                                    }) => (
                                        <Form>
                                            <FormContainer>
                                                <AutoSelectOrganization
                                                    organizations={
                                                        myOrganizations
                                                    }
                                                    role={role}
                                                />

                                                <div className="flex flex-col gap-6 p-2">
                                                    {isEmployeeRole ? (
                                                        <>
                                                            <OrganizationBranchFields
                                                                role={role}
                                                                orgOptions={
                                                                    orgOptions
                                                                }
                                                                branchOptions={
                                                                    branchOptions
                                                                }
                                                                values={
                                                                    values
                                                                }
                                                                errors={
                                                                    errors
                                                                }
                                                                touched={
                                                                    touched
                                                                }
                                                                setFieldValue={
                                                                    setFieldValue
                                                                }
                                                                setFieldTouched={
                                                                    setFieldTouched
                                                                }
                                                                setFieldError={
                                                                    setFieldError
                                                                }
                                                            />

                                                            <FormItem
                                                                label="PINFL yoki INN"
                                                                invalid={!!(
                                                                    errors.pinflOrInn &&
                                                                    touched.pinflOrInn
                                                                )}
                                                                errorMessage={
                                                                    errors.pinflOrInn as string
                                                                }
                                                            >
                                                                <Field name="pinflOrInn">
                                                                    {({
                                                                        field,
                                                                    }: FieldProps) => (
                                                                        <Input
                                                                            {...field}
                                                                            type="text"
                                                                            placeholder="PINFL yoki INN ni kiriting"
                                                                            className={
                                                                                inputClass
                                                                            }
                                                                        />
                                                                    )}
                                                                </Field>
                                                            </FormItem>

                                                            <PinflOrInnLookupPreview
                                                                baseUrl={
                                                                    BASE_URL
                                                                }
                                                            />

                                                            <PdfUploadField
                                                                file={
                                                                    values.file
                                                                }
                                                                fileList={
                                                                    externalUploadedFiles
                                                                }
                                                                invalid={!!(
                                                                    errors.file &&
                                                                    touched.file
                                                                )}
                                                                errorMessage={
                                                                    errors.file as string
                                                                }
                                                                onChange={(
                                                                    files,
                                                                ) =>
                                                                    handlePdfFileChange(
                                                                        files,
                                                                        setExternalUploadedFiles,
                                                                        {
                                                                            setFieldValue,
                                                                            setFieldTouched,
                                                                            setFieldError,
                                                                        },
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    handlePdfFileRemove(
                                                                        setExternalUploadedFiles,
                                                                        {
                                                                            setFieldValue,
                                                                            setFieldTouched,
                                                                            setFieldError,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        </>
                                                    ) : (
                                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                                                            Ushbu yuborish turi
                                                            uchun tashkilot va
                                                            filial ma'lumotlari
                                                            kerak. Hozirgi
                                                            rolingizda bu
                                                            ma'lumotlar mavjud
                                                            emas.
                                                        </div>
                                                    )}

                                                    <div className="mt-6 flex justify-end gap-4 border-t border-gray-100 pt-6 dark:border-gray-700">
                                                        <Button
                                                            size="md"
                                                            className="min-w-[120px]"
                                                            type="button"
                                                            onClick={() => {
                                                                resetForm()
                                                                setExternalUploadedFiles(
                                                                    [],
                                                                )
                                                            }}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                        <Button
                                                            variant="solid"
                                                            size="md"
                                                            className="min-w-[170px] bg-indigo-600 hover:bg-indigo-700"
                                                            type="submit"
                                                            loading={
                                                                isLoading
                                                            }
                                                            disabled={
                                                                !isEmployeeRole
                                                            }
                                                        >
                                                            Tashqi yuborish
                                                        </Button>
                                                    </div>
                                                </div>
                                            </FormContainer>
                                        </Form>
                                    )}
                                </Formik>
                            </Tabs.TabContent>
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    )
}

export default CreatePdf
