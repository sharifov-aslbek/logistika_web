import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
// Ensure FormItem and Form are correctly imported from your UI library or use standard div/form
import { FormItem, FormContainer } from '@/components/ui/Form'
import Alert from '@/components/ui/Alert'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type { CommonProps } from '@/@types/common'
import { HiUser, HiOfficeBuilding, HiArrowLeft } from 'react-icons/hi'
import { useAccountStore } from '@/store/accountStore'

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
}

// --- Zod Schema for the FINAL step ---
type FinalStepSchema = {
    phone: string
    password: string
    confirmPassword: string
}

const finalStepSchema: ZodType<FinalStepSchema> = z
    .object({
        phone: z.string().min(1, 'Telefon raqami kiritilishi shart'),
        password: z.string().min(1, 'Parol kiritilishi shart'),
        confirmPassword: z.string().min(1, 'Parolni tasdiqlash shart'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Parollar mos kelmadi',
        path: ['confirmPassword'],
    })

// --- Types ---
type Role = 'citizen' | 'director' | null
type Step = 'selection' | 'verification' | 'account'

const SignUpForm = (props: SignUpFormProps) => {
    const { disableSubmit = false, className, setMessage } = props
    const navigate = useNavigate()

    // --- Store Hooks ---
    const {
        getPersonByPinfl,
        getCompanyByInn,
        registerUser,
        registerDirector,
    } = useAccountStore()

    // --- State Machine ---
    const [currentStep, setCurrentStep] = useState<Step>('selection')
    const [role, setRole] = useState<Role>(null)
    const [isLoading, setIsLoading] = useState(false) // Local loading for search buttons

    // --- Data Models ---
    const [citizenData, setCitizenData] = useState({
        pinfl: '',
        fullName: '',
        address: '',
    })
    const [directorData, setDirectorData] = useState({
        inn: '',
        companyName: '',
        directorName: '',
        directorPinflFromFile: '',
        userPinflInput: '',
    })

    // --- Form Hook ---
    const {
        handleSubmit,
        formState: { errors, isSubmitting },
        control,
        reset,
    } = useForm<FinalStepSchema>({
        resolver: zodResolver(finalStepSchema),
    })

    // --- Logic: Navigation ---
    const handleRoleSelect = (selectedRole: Role) => {
        setRole(selectedRole)
        setCurrentStep('verification')
        setMessage?.('')
    }

    const handleBack = () => {
        if (currentStep === 'account') {
            setCurrentStep('verification')
        } else {
            setCurrentStep('selection')
            setRole(null)
            setCitizenData({ pinfl: '', fullName: '', address: '' })
            setDirectorData({
                ...directorData,
                companyName: '',
                userPinflInput: '',
            })
            reset()
        }
        setMessage?.('')
    }

    // --- Logic: Citizen Check (Real API) ---
    const checkCitizenPinfl = async () => {
        if (citizenData.pinfl.length !== 14) {
            setMessage?.("JSHSHIR 14 ta raqamdan iborat bo'lishi kerak")
            return
        }
        setIsLoading(true)
        setMessage?.('')

        try {
            const res = await getPersonByPinfl(citizenData.pinfl)

            if (res && res.data) {
                setCitizenData((prev) => ({
                    ...prev,
                    fullName: res.data.name || res.fio || "Noma'lum",
                    address: res.data.address || 'Manzil topildi',
                }))
                setCurrentStep('account')
            } else {
                throw new Error('No data found')
            }
        } catch (error) {
            console.error(error)
            setMessage?.('Foydalanuvchi topilmadi yoki aloqa xatosi')
        } finally {
            setIsLoading(false)
        }
    }

    // --- Logic: Company Check (Real API) ---
    const checkCompanyInn = async () => {
        if (directorData.inn.length !== 9) {
            setMessage?.("STIR 9 ta raqamdan iborat bo'lishi kerak")
            return
        }
        setIsLoading(true)
        setMessage?.('')

        try {
            const res = await getCompanyByInn(directorData.inn)

            if (res && res.data) {
                setDirectorData((prev) => ({
                    ...prev,
                    companyName: res.data.name || "Noma'lum Tashkilot",
                    directorName: res.data.directorName || "Noma'lum Direktor",
                    directorPinflFromFile: res.data.directorPinfl || '',
                }))
            } else {
                throw new Error('Company not found')
            }
        } catch (error) {
            console.error(error)
            setMessage?.('Tashkilot topilmadi yoki aloqa xatosi')
        } finally {
            setIsLoading(false)
        }
    }

    const verifyDirectorPinfl = () => {
        if (
            directorData.userPinflInput !== directorData.directorPinflFromFile
        ) {
            setMessage?.("Direktor JSHSHIR ma'lumotlari mos kelmadi")
            return
        }
        setCurrentStep('account')
        setMessage?.('')
    }

    // --- Logic: Final Registration (Real API) ---
    const onFinalSubmit = async (values: FinalStepSchema) => {
        if (disableSubmit) return

        let success = false
        const { phone, password } = values

        try {
            if (role === 'citizen') {
                const payload = {
                    phone,
                    password,
                    pinfl: citizenData.pinfl,
                }
                success = await registerUser(payload)
            } else if (role === 'director') {
                const payload = {
                    phone,
                    password,
                    inn: directorData.inn,
                    pinfl: directorData.userPinflInput,
                }
                success = await registerDirector(payload)
            }

            if (success) {
                navigate('/dashboard')
            } else {
                setMessage?.("Ro'yxatdan o'tishda xatolik yuz berdi")
            }
        } catch (error: any) {
            const errorMsg =
                error.response?.data?.message || "Ro'yxatdan o'tishda xatolik"
            setMessage?.(errorMsg)
        }
    }

    // --- RENDERERS ---

    const renderRoleSelection = () => (
        <div className="flex flex-col gap-4">
            <div
                className="group border border-gray-200 hover:border-blue-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => handleRoleSelect('citizen')}
            >
                <div className="p-3 bg-blue-50 text-blue-500 rounded-full text-2xl">
                    <HiUser />
                </div>
                <div>
                    <div className="font-bold text-lg">Fuqaro</div>
                    <div className="text-gray-500 text-sm">
                        Jismoniy shaxs sifatida ro'yxatdan o'tish
                    </div>
                </div>
            </div>

            <div
                className="group border border-gray-200 hover:border-green-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => handleRoleSelect('director')}
            >
                <div className="p-3 bg-green-50 text-green-500 rounded-full text-2xl">
                    <HiOfficeBuilding />
                </div>
                <div>
                    <div className="font-bold text-lg">Tashkilot</div>
                    <div className="text-gray-500 text-sm">
                        Tashkilot direktori sifatida ro'yxatdan o'tish
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCitizenFlow = () => (
        <div className="flex flex-col gap-6">
            {/* Step 1: Verification */}
            <div>
                <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                    JSHSHIR (PINFL)
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="14 xonali raqamni kiriting"
                        value={citizenData.pinfl}
                        onChange={(e: any) =>
                            setCitizenData({
                                ...citizenData,
                                pinfl: e.target.value,
                            })
                        }
                        disabled={currentStep === 'account'}
                    />
                    <Button
                        variant="solid"
                        loading={isLoading}
                        onClick={checkCitizenPinfl}
                        disabled={currentStep === 'account'}
                        type="button"
                    >
                        Tekshirish
                    </Button>
                </div>
            </div>

            {/* Step 2: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in">
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                        <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                To'liq Ism
                            </span>
                            <div className="font-semibold">
                                {citizenData.fullName}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                Manzil
                            </span>
                            <div className="text-sm">{citizenData.address}</div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onFinalSubmit)}>
                        <FormContainer>
                            <FormItem
                                label="Telefon raqami"
                                invalid={Boolean(errors.phone)}
                                errorMessage={errors.phone?.message}
                            >
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="+998..."
                                            autoComplete="off"
                                        />
                                    )}
                                />
                            </FormItem>
                            <FormItem
                                label="Parol"
                                invalid={Boolean(errors.password)}
                                errorMessage={errors.password?.message}
                            >
                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="Parol yarating"
                                        />
                                    )}
                                />
                            </FormItem>
                            <FormItem
                                label="Parolni tasdiqlash"
                                invalid={Boolean(errors.confirmPassword)}
                                errorMessage={errors.confirmPassword?.message}
                            >
                                <Controller
                                    name="confirmPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="Parolni qayta kiriting"
                                        />
                                    )}
                                />
                            </FormItem>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                            >
                                Ro'yxatdan o'tishni yakunlash
                            </Button>
                        </FormContainer>
                    </form>
                </div>
            )}
        </div>
    )

    const renderDirectorFlow = () => (
        <div className="flex flex-col gap-6">
            {/* Step 1: Search Company */}
            <div>
                <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                    Tashkilot STIR (INN)
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="9 xonali raqamni kiriting"
                        value={directorData.inn}
                        onChange={(e: any) =>
                            setDirectorData({
                                ...directorData,
                                inn: e.target.value,
                            })
                        }
                        disabled={!!directorData.companyName}
                    />
                    <Button
                        variant="solid"
                        loading={isLoading}
                        onClick={checkCompanyInn}
                        disabled={!!directorData.companyName}
                        type="button"
                    >
                        Izlash
                    </Button>
                </div>
            </div>

            {/* Found Company Info */}
            {directorData.companyName && (
                <Alert type="info" title="Tashkilot topildi">
                    <div className="font-bold text-lg">
                        {directorData.companyName}
                    </div>
                    <div>Direktor: {directorData.directorName}</div>
                </Alert>
            )}

            {/* Step 2: Verify Director */}
            {directorData.companyName && currentStep === 'verification' && (
                <div className="animate-fade-in">
                    <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                        Direktor JSHSHIR (Tasdiqlash uchun)
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="JSHSHIR kiriting"
                            value={directorData.userPinflInput}
                            onChange={(e: any) =>
                                setDirectorData({
                                    ...directorData,
                                    userPinflInput: e.target.value,
                                })
                            }
                        />
                        <Button
                            variant="solid"
                            color="green-600"
                            onClick={verifyDirectorPinfl}
                            type="button"
                        >
                            Tasdiqlash
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in">
                    <form onSubmit={handleSubmit(onFinalSubmit)}>
                        <FormContainer>
                            <FormItem
                                label="Telefon raqami"
                                invalid={Boolean(errors.phone)}
                                errorMessage={errors.phone?.message}
                            >
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="+998..."
                                            autoComplete="off"
                                        />
                                    )}
                                />
                            </FormItem>
                            <FormItem
                                label="Parol"
                                invalid={Boolean(errors.password)}
                                errorMessage={errors.password?.message}
                            >
                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="Parol yarating"
                                        />
                                    )}
                                />
                            </FormItem>
                            <FormItem
                                label="Parolni tasdiqlash"
                                invalid={Boolean(errors.confirmPassword)}
                                errorMessage={errors.confirmPassword?.message}
                            >
                                <Controller
                                    name="confirmPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="Parolni qayta kiriting"
                                        />
                                    )}
                                />
                            </FormItem>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                            >
                                Ro'yxatdan o'tish
                            </Button>
                        </FormContainer>
                    </form>
                </div>
            )}
        </div>
    )

    return (
        <div className={className}>
            {/* Header: Back Button */}
            {currentStep !== 'selection' && (
                <div className="mb-6">
                    <Button
                        size="sm"
                        variant="plain"
                        icon={<HiArrowLeft />}
                        onClick={handleBack}
                    >
                        Orqaga
                    </Button>
                </div>
            )}

            {/* Dynamic Title */}
            <div className="mb-6">
                {currentStep === 'selection' && (
                    <h3 className="text-center">
                        Ro'yxatdan o'tish turini tanlang
                    </h3>
                )}
                {role === 'citizen' && currentStep !== 'selection' && (
                    <h3 className="text-center">
                        Fuqaro sifatida ro'yxatdan o'tish
                    </h3>
                )}
                {role === 'director' && currentStep !== 'selection' && (
                    <h3 className="text-center">
                        Tashkilot sifatida ro'yxatdan o'tish
                    </h3>
                )}
            </div>

            {/* Content Switch */}
            {currentStep === 'selection' && renderRoleSelection()}
            {role === 'citizen' && renderCitizenFlow()}
            {role === 'director' && renderDirectorFlow()}
        </div>
    )
}

export default SignUpForm
