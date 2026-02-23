import { useState, useEffect, useMemo } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Card from '@/components/ui/Card'
import {
    HiOutlineCloudUpload,
    HiOutlineTrash,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { Formik, Form, Field, FieldProps, useFormikContext } from 'formik'
import * as Yup from 'yup'
import axios from 'axios'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'
import { useOrganizationStore } from '@/store/organizationStore'

// --- Constants ---
const ROLE_USER = 0
const ROLE_WORKER = 10
const ROLE_BRANCH_DIRECTOR = 20
const ROLE_ADMIN = 30 // Organization Director

// --- Types ---
type Option = {
    value: number
    label: string
}

// --- Helper Component for Auto-Selection ---
// Selects the first organization automatically if available
const AutoSelectOrganization = ({
    organizations,
    role,
}: {
    organizations: any[]
    role: number
}) => {
    const { setFieldValue } = useFormikContext()

    useEffect(() => {
        // Run for Worker, Director, and Admin
        if (
            [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role) &&
            organizations.length > 0
        ) {
            setFieldValue('organizationId', organizations[0].id)
        }
    }, [organizations, role, setFieldValue])

    return null
}

const CreatePdf = () => {
    // --- Stores ---
    const { createMail, isLoading } = useMailStore()

    // Account Store
    const userProfile = useAccountStore((state) => state.userProfile)
    const token = useAccountStore((state) => state.user?.token)
    const role = Number(userProfile?.role || 0)

    // Organization Store
    const {
        myOrganizations,
        myBranches, // For Workers
        organizationBranches, // For Org Directors
        myBranch, // For Branch Directors
        fetchMyOrganizations,
        fetchMyBranches,
        fetchMyOrganizationBranches,
        fetchMyBranch,
    } = useOrganizationStore()

    // --- Local State ---
    const [regions, setRegions] = useState<Option[]>([])
    const [areas, setAreas] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    const BASE_URL =
        import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

    // --- Validation Schema ---
    const validationSchema = Yup.object().shape({
        recipient: Yup.string().required('Qabul qiluvchi kiritilishi shart'),
        address: Yup.string().required('Manzil kiritilishi shart'),
        region: Yup.number().required('Viloyat tanlanishi shart').nullable(),
        area: Yup.number().required('Tuman tanlanishi shart').nullable(),
        file: Yup.mixed().required('Fayl yuklanishi shart'),

        // Conditional Validation: Employees (Worker/Director/Admin)
        organizationId: [
            ROLE_WORKER,
            ROLE_BRANCH_DIRECTOR,
            ROLE_ADMIN,
        ].includes(role)
            ? Yup.number().required('Tashkilot tanlanishi shart').nullable()
            : Yup.mixed().notRequired(),
        branchId: [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)
            ? Yup.number().required('Filial tanlanishi shart').nullable()
            : Yup.mixed().notRequired(),

        // Validation: User (UI only)
        senderName: Yup.string().nullable(),
    })

    // --- Helpers ---
    const getHeaders = () => {
        let authToken = token
        if (!authToken) {
            try {
                const local = localStorage.getItem('account-storage')
                if (local) {
                    const parsed = JSON.parse(local)
                    authToken = parsed?.state?.user?.token
                }
            } catch (e) {
                console.error(e)
            }
        }
        return {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken}`,
            accept: '*/*',
        }
    }

    // --- Effects ---
    useEffect(() => {
        const initData = async () => {
            // 1. Fetch Regions
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })
                if (response.data?.code === 200) {
                    setRegions(
                        response.data.data.map((r: any) => ({
                            value: r.id,
                            label: r.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingRegions(false)
            }

            // 2. Fetch Organization Data based on Role
            if (
                [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)
            ) {
                // Everyone needs Organization info
                fetchMyOrganizations()

                // Fetch specific branch info
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
    }, [role])

    // Fetch Areas
    const fetchAreas = async (regionId: number) => {
        setLoadingAreas(true)
        try {
            const response = await axios.get(
                `${BASE_URL}/region/${regionId}/areas`,
                { headers: getHeaders() },
            )
            if (response.data?.code === 200) {
                setAreas(
                    response.data.data.areas.map((a: any) => ({
                        value: a.id,
                        label: a.name,
                    })),
                )
            } else {
                setAreas([])
            }
        } catch (error) {
            setAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }

    // --- Submit Handler ---
    const handleSubmit = async (values: any, { resetForm }: any) => {
        const formData = new FormData()
        formData.append('ReceiverName', values.recipient)
        formData.append('ReceiverAddress', values.address)
        formData.append('PagesCount', '1')
        formData.append('RegionId', values.region?.toString() || '')
        formData.append('AreaId', values.area?.toString() || '')
        formData.append('PdfFile', values.file)

        // Logic: Role Based Append
        if ([ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)) {
            formData.append(
                'OrganizationId',
                values.organizationId?.toString() || '',
            )
            formData.append('BranchId', values.branchId?.toString() || '')
        } else {
            // ROLE_USER (0)
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
            setAreas([])
        } else {
            toast.push(
                <Notification title="Xatolik" type="danger">
                    Hujjat yaratishda xatolik yuz berdi.
                </Notification>,
            )
        }
    }

    // --- Options Preparation ---
    const orgOptions = useMemo(() => {
        return myOrganizations.map((org) => ({
            value: org.id,
            label: org.fullName || org.name,
        }))
    }, [myOrganizations])

    // Dynamic Branch Options based on Role
    const branchOptions = useMemo(() => {
        let sourceData: any[] = []

        if (role === ROLE_WORKER) {
            sourceData = myBranches
        } else if (role === ROLE_BRANCH_DIRECTOR) {
            // Ensure single object is wrapped in array
            sourceData = myBranch
                ? Array.isArray(myBranch)
                    ? myBranch
                    : [myBranch]
                : []
        } else if (role === ROLE_ADMIN) {
            sourceData = organizationBranches
        }

        return sourceData.map((br) => ({
            value: br.id,
            label: br.name,
        }))
    }, [role, myBranches, myBranch, organizationBranches])

    const inputClass =
        '!border !border-gray-300 focus:!border-indigo-500 !bg-white dark:!bg-gray-800 dark:!border-gray-600 rounded-lg h-11'

    return (
        <div className="flex justify-center w-full p-4">
            <div className="w-full max-w-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        PDF fayldan hujjat yaratish
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Fayldan hujjat yaratish uchun quyidagi formani
                        to'ldiring
                    </p>
                </div>

                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 rounded-2xl">
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
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, setFieldValue, errors, touched }) => (
                            <Form>
                                <FormContainer>
                                    {/* Auto Select Logic Helper */}
                                    <AutoSelectOrganization
                                        organizations={myOrganizations}
                                        role={role}
                                    />

                                    <div className="flex flex-col gap-6 p-2">
                                        {/* --- 1.A. EMPLOYEES: Org & Branch Inputs --- */}
                                        {[
                                            ROLE_WORKER,
                                            ROLE_BRANCH_DIRECTOR,
                                            ROLE_ADMIN,
                                        ].includes(role) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormItem
                                                    label="Yuboruvchi Tashkilot"
                                                    invalid={
                                                        errors.organizationId &&
                                                        touched.organizationId
                                                    }
                                                    errorMessage={
                                                        errors.organizationId as string
                                                    }
                                                >
                                                    <Select
                                                        options={orgOptions}
                                                        placeholder="Tashkilot..."
                                                        isDisabled={true} // Auto-selected & Disabled
                                                        value={orgOptions.find(
                                                            (o) =>
                                                                o.value ===
                                                                values.organizationId,
                                                        )}
                                                        onChange={(opt: any) =>
                                                            setFieldValue(
                                                                'organizationId',
                                                                opt?.value ||
                                                                    null,
                                                            )
                                                        }
                                                        className="shadow-sm"
                                                    />
                                                </FormItem>

                                                <FormItem
                                                    label="Yuboruvchi Filial"
                                                    invalid={
                                                        errors.branchId &&
                                                        touched.branchId
                                                    }
                                                    errorMessage={
                                                        errors.branchId as string
                                                    }
                                                >
                                                    <Select
                                                        options={branchOptions}
                                                        placeholder="Filialni tanlang"
                                                        value={branchOptions.find(
                                                            (o) =>
                                                                o.value ===
                                                                values.branchId,
                                                        )}
                                                        onChange={(opt: any) =>
                                                            setFieldValue(
                                                                'branchId',
                                                                opt?.value ||
                                                                    null,
                                                            )
                                                        }
                                                        className="shadow-sm"
                                                    />
                                                </FormItem>
                                            </div>
                                        )}

                                        {/* --- 1.B. ROLE_USER: Sender Name Input --- */}
                                        {role === ROLE_USER && (
                                            <div className="w-full">
                                                <FormItem
                                                    label="Yuboruvchi (Siz)"
                                                    invalid={
                                                        errors.senderName &&
                                                        touched.senderName
                                                    }
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
                                            </div>
                                        )}

                                        {/* 2. RECIPIENT */}
                                        <FormItem
                                            label="Qabul qiluvchi"
                                            invalid={
                                                errors.recipient &&
                                                touched.recipient
                                            }
                                            errorMessage={
                                                errors.recipient as string
                                            }
                                        >
                                            <Field name="recipient">
                                                {({ field }: FieldProps) => (
                                                    <Input
                                                        {...field}
                                                        type="text"
                                                        placeholder="To'liq ism yoki tashkilot nomini kiriting"
                                                        className={inputClass}
                                                    />
                                                )}
                                            </Field>
                                        </FormItem>

                                        {/* 3. ADDRESS */}
                                        <FormItem
                                            label="Manzil"
                                            invalid={
                                                errors.address &&
                                                touched.address
                                            }
                                            errorMessage={
                                                errors.address as string
                                            }
                                        >
                                            <Field name="address">
                                                {({ field }: FieldProps) => (
                                                    <Input
                                                        {...field}
                                                        type="text"
                                                        placeholder="To'liq manzil (Ko'cha, Uy va h.k.)"
                                                        className={inputClass}
                                                    />
                                                )}
                                            </Field>
                                        </FormItem>

                                        {/* 4. REGION & AREA */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormItem
                                                label="Viloyat"
                                                invalid={
                                                    errors.region &&
                                                    touched.region
                                                }
                                                errorMessage={
                                                    errors.region as string
                                                }
                                            >
                                                <Select
                                                    options={regions}
                                                    placeholder="Viloyatni tanlang"
                                                    isLoading={loadingRegions}
                                                    value={regions.find(
                                                        (r) =>
                                                            r.value ===
                                                            values.region,
                                                    )}
                                                    className="shadow-sm"
                                                    onChange={(option: any) => {
                                                        setFieldValue(
                                                            'region',
                                                            option?.value ||
                                                                null,
                                                        )
                                                        setFieldValue(
                                                            'area',
                                                            null,
                                                        )
                                                        if (option?.value)
                                                            fetchAreas(
                                                                option.value,
                                                            )
                                                        else setAreas([])
                                                    }}
                                                />
                                            </FormItem>

                                            <FormItem
                                                label="Tuman"
                                                invalid={
                                                    errors.area && touched.area
                                                }
                                                errorMessage={
                                                    errors.area as string
                                                }
                                            >
                                                <Select
                                                    options={areas}
                                                    placeholder="Tumanni tanlang"
                                                    isLoading={loadingAreas}
                                                    isDisabled={!values.region}
                                                    value={areas.find(
                                                        (a) =>
                                                            a.value ===
                                                            values.area,
                                                    )}
                                                    className="shadow-sm"
                                                    onChange={(option: any) => {
                                                        setFieldValue(
                                                            'area',
                                                            option?.value ||
                                                                null,
                                                        )
                                                    }}
                                                />
                                            </FormItem>
                                        </div>

                                        {/* 5. FILE UPLOAD */}
                                        <FormItem
                                            label="Hujjat yuklash"
                                            invalid={
                                                errors.file && touched.file
                                            }
                                            errorMessage={errors.file as string}
                                        >
                                            <Upload
                                                draggable
                                                accept=".pdf"
                                                showList={false}
                                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all rounded-xl p-8"
                                                onChange={(files) => {
                                                    if (
                                                        files &&
                                                        files.length > 0
                                                    )
                                                        setFieldValue(
                                                            'file',
                                                            files[0],
                                                        )
                                                    else
                                                        setFieldValue(
                                                            'file',
                                                            null,
                                                        )
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center">
                                                    {!values.file ? (
                                                        <>
                                                            <div className="mb-4 text-indigo-500 text-5xl bg-indigo-100 p-4 rounded-full">
                                                                <HiOutlineCloudUpload />
                                                            </div>
                                                            <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                                Faylni tanlash
                                                                yoki shu yerga
                                                                tashlash
                                                            </div>
                                                            <div className="text-sm mt-2 text-gray-400">
                                                                Faqat PDF (maks.
                                                                10MB)
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center animate-fade-in">
                                                            <div className="mb-4 text-red-500 text-6xl">
                                                                <HiOutlineDocumentText />
                                                            </div>
                                                            <div className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                                                                {
                                                                    (
                                                                        values.file as File
                                                                    ).name
                                                                }
                                                            </div>
                                                            <div className="text-xs text-gray-400 mb-4">
                                                                {(
                                                                    (
                                                                        values.file as File
                                                                    ).size /
                                                                    1024 /
                                                                    1024
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
                                                                MB
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="solid"
                                                                color="red-500"
                                                                icon={
                                                                    <HiOutlineTrash />
                                                                }
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    setFieldValue(
                                                                        'file',
                                                                        null,
                                                                    )
                                                                }}
                                                            >
                                                                Faylni o'chirish
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Upload>
                                        </FormItem>

                                        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <Button
                                                size="md"
                                                className="min-w-[120px]"
                                                type="button"
                                                onClick={() => resetForm()}
                                            >
                                                Bekor qilish
                                            </Button>
                                            <Button
                                                variant="solid"
                                                size="md"
                                                className="min-w-[150px] bg-indigo-600 hover:bg-indigo-700"
                                                type="submit"
                                                loading={isLoading}
                                            >
                                                Yaratish
                                            </Button>
                                        </div>
                                    </div>
                                </FormContainer>
                            </Form>
                        )}
                    </Formik>
                </Card>
            </div>
        </div>
    )
}

export default CreatePdf
