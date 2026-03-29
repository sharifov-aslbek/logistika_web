import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HiOfficeBuilding, HiUserCircle } from 'react-icons/hi'
import { useAccountStore } from '@/store/accountStore'
import { useEImzoStore } from '@/store/eImzoStore'
import MissingSign from '@/components/shared/missingsign'
import type { CommonProps } from '@/@types/common'
import extractApiErrorMessage from '@/utils/extractApiErrorMessage'

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
}

type Role = 'user' | 'director'

type SignUpFormSchema = {
    phone: string
    password: string
    confirmPassword: string
}

const validationSchema = z
    .object({
        phone: z.string().min(1, 'Telefon raqami kiritilishi shart'),
        password: z.string().min(1, 'Parol kiritilishi shart'),
        confirmPassword: z
            .string()
            .min(1, 'Parolni tasdiqlash kiritilishi shart'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Parollar mos kelmadi',
        path: ['confirmPassword'],
    })

const REGISTER_SIGN_PAYLOAD: Record<Role, string> = {
    user: "TezDoc foydalanuvchi sifatida ro'yxatdan o'tish",
    director: "TezDoc direktor sifatida ro'yxatdan o'tish",
}

const roleContent: Record<Role, { title: string }> = {
    user: { title: 'Fuqaro' },
    director: { title: 'Tashkilot' },
}

const PasswordToggle = ({
    shown,
    onClick,
}: {
    shown: boolean
    onClick: () => void
}) => (
    <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        onClick={onClick}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {shown ? (
                <>
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </>
            ) : (
                <>
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                    <line x1="2" y1="2" x2="22" y2="22"></line>
                </>
            )}
        </svg>
    </button>
)

const SignUpForm = ({
    disableSubmit = false,
    className,
    setMessage,
}: SignUpFormProps) => {
    const navigate = useNavigate()
    const registerUser = useAccountStore((state) => state.registerUser)
    const registerDirector = useAccountStore((state) => state.registerDirector)
    const isLoading = useAccountStore((state) => state.isLoading)
    const { loadKey, createPkcs7, error: eimzoError } = useEImzoStore()

    const [role, setRole] = useState<Role>('user')
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isSigning, setIsSigning] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormSchema>({
        resolver: zodResolver(validationSchema),
    })

    // Cleaned up input classes matching the login form
    const inputClasses =
        'h-12 w-full rounded-xl bg-[#f4f5f7] px-4 text-base text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500'

    const isBusy = isLoading || isSigning

    const handleRoleSelect = (nextRole: Role) => {
        setRole(nextRole)
        setMessage?.('')
    }

    const onSubmit = async (values: SignUpFormSchema) => {
        if (disableSubmit) return

        if (!selectedCert) {
            setMessage?.("Ro'yxatdan o'tish uchun E-IMZO sertifikatini tanlang")
            return
        }

        setMessage?.('')
        setIsSigning(true)

        try {
            const keyId = await loadKey(selectedCert)
            const signature = await createPkcs7(
                keyId,
                REGISTER_SIGN_PAYLOAD[role],
            )

            const payload = {
                signature,
                phone: values.phone,
                password: values.password,
            }

            const success =
                role === 'director'
                    ? await registerDirector(payload)
                    : await registerUser(payload)

            if (!success) {
                throw new Error("Ro'yxatdan o'tish muvaffaqiyatsiz tugadi")
            }

            navigate('/dashboard/ecommerce')
        } catch (error: any) {
            const backendMessage = extractApiErrorMessage(
                error,
                (eimzoError === 'AGENT_NOT_FOUND'
                    ? 'E-IMZO agent topilmadi. Dasturni ishga tushiring.'
                    : "Ro'yxatdan o'tishda xatolik yuz berdi"),
            )

            setMessage?.(backendMessage)
        } finally {
            setIsSigning(false)
        }
    }

    return (
        <div className={className}>
            <div className="mb-8 flex items-center justify-center gap-10 border-b border-gray-200 dark:border-gray-700">
                {(['user', 'director'] as Role[]).map((item) => {
                    const active = role === item
                    const Icon = item === 'director' ? HiOfficeBuilding : HiUserCircle

                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => handleRoleSelect(item)}
                            className={`flex items-center gap-3 border-b-4 px-3 pb-4 pt-1 text-lg font-bold transition-all ${
                                active
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <Icon className="text-2xl" />
                            {roleContent[item].title}
                        </button>
                    )
                })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Certificate Section */}
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <span className="mr-1 text-red-500">*</span>
                        Sertifikat
                    </label>
                    <div className="w-full">
                        <MissingSign
                            disabled={isBusy}
                            onSignClicked={setSelectedCert}
                        />
                    </div>
                </div>

                {/* Phone Section */}
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <span className="mr-1 text-red-500">*</span>
                        Telefon raqami
                    </label>
                    <input
                        {...register('phone')}
                        placeholder="(--) --- -- --"
                        className={`${inputClasses} ${
                            errors.phone ? 'bg-red-50 ring-2 ring-red-500' : ''
                        }`}
                    />
                    {errors.phone && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.phone.message}
                        </p>
                    )}
                </div>

                {/* Passwords Section (Side-by-side on larger screens) */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                            <span className="mr-1 text-red-500">*</span>
                            Parol
                        </label>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Parol"
                                className={`${inputClasses} pr-12 ${
                                    errors.password ? 'bg-red-50 ring-2 ring-red-500' : ''
                                }`}
                            />
                            <PasswordToggle
                                shown={showPassword}
                                onClick={() => setShowPassword((prev) => !prev)}
                            />
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                            <span className="mr-1 text-red-500">*</span>
                            Tasdiqlang
                        </label>
                        <div className="relative">
                            <input
                                {...register('confirmPassword')}
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Tasdiqlang"
                                className={`${inputClasses} pr-12 ${
                                    errors.confirmPassword ? 'bg-red-50 ring-2 ring-red-500' : ''
                                }`}
                            />
                            <PasswordToggle
                                shown={showConfirmPassword}
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                            />
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isBusy}
                    className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-all ${
                        isBusy
                            ? 'cursor-not-allowed bg-[#4785ff]/70'
                            : 'bg-[#4785ff] hover:bg-blue-600 active:scale-[0.98]'
                    }`}
                >
                    {isSigning ? (
                        'Imzolanmoqda...'
                    ) : isLoading ? (
                        "Ro'yxatdan o'tkazilmoqda..."
                    ) : (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Ro&apos;yxatdan o&apos;tish
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}

export default SignUpForm
