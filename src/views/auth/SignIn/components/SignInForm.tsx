import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAccountStore } from '@/store/accountStore'
import { useEImzoStore } from '@/store/eImzoStore'
import Button from '@/components/ui/Button'
import MissingSign from '@/components/shared/missingsign'
import type { CommonProps } from '@/@types/common'
import extractApiErrorMessage from '@/utils/extractApiErrorMessage'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
    passwordHint?: string | React.ReactNode
    mode?: 'password' | 'eimzo'
    forgetPasswordUrl?: string
}

// Validatsiya sxemasi (o‘zbekcha)
const validationSchema = z.object({
    phone: z.string().min(1, 'Telefon raqami kiritilishi shart'),
    password: z.string().min(1, 'Parol kiritilishi shart'),
})

type SignInFormSchema = z.infer<typeof validationSchema>

const EIMZO_LOGIN_PAYLOAD = 'TezDoc E-IMZO orqali kirish'

const SignInForm = (props: SignInFormProps) => {
    const {
        disableSubmit = false,
        className,
        setMessage,
        mode = 'password',
        forgetPasswordUrl,
    } = props
    const navigate = useNavigate()
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isEimzoSubmitting, setIsEimzoSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // 1. Store actionlarini olish
    const login = useAccountStore((state) => state.login)
    const loginWithEimzo = useAccountStore((state) => state.loginWithEimzo)
    const isLoading = useAccountStore((state) => state.isLoading)
    const { loadKey, createPkcs7, error: eimzoError } = useEImzoStore()

    // 2. Formani sozlash
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormSchema>({
        resolver: zodResolver(validationSchema),
    })

    // 3. Muvaffaqiyatli kirish handleri
    const onSignIn = async (values: SignInFormSchema) => {
        if (disableSubmit) return
        setMessage?.('')

        try {
            const success = await login({
                phone: values.phone,
                password: values.password,
            })

            if (success) {
                navigate('/dashboard/ecommerce')
            } else {
                throw new Error("Kirish muvaffaqiyatsiz tugadi")
            }
        } catch (error: any) {
            const backendMessage = extractApiErrorMessage(
                error,
                'Kirishda xatolik yuz berdi',
            )
            setMessage?.(backendMessage)
        }
    }

    const onError = (errors: any) => {
        console.log('⚠️ Validatsiya muvaffaqiyatsiz:', errors)
    }

    const handleEimzoSignIn = async () => {
        if (disableSubmit) return

        if (!selectedCert) {
            setMessage?.('E-IMZO kalitini tanlang')
            return
        }

        setMessage?.('')
        setIsEimzoSubmitting(true)

        try {
            const keyId = await loadKey(selectedCert)
            const signature = await createPkcs7(keyId, EIMZO_LOGIN_PAYLOAD)
            const success = await loginWithEimzo({ signature })

            if (success) {
                navigate('/dashboard/ecommerce')
            } else {
                throw new Error("E-IMZO orqali kirish muvaffaqiyatsiz tugadi")
            }
        } catch (error: any) {
            const backendMessage = extractApiErrorMessage(
                error,
                (eimzoError === 'AGENT_NOT_FOUND'
                    ? 'E-IMZO agent topilmadi. Dasturni ishga tushiring.'
                    : 'E-IMZO orqali kirishda xatolik yuz berdi'),
            )
            setMessage?.(backendMessage)
        } finally {
            setIsEimzoSubmitting(false)
        }
    }

    // Input stillari
    const inputClasses =
        'h-12 w-full rounded-xl bg-[#f4f5f7] px-4 text-base text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500'

    return (
        <div className={className}>
            {mode === 'password' ? (
                <form
                    onSubmit={handleSubmit(onSignIn, onError)}
                    className="flex flex-col gap-5"
                >
                    {/* Telefon input */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-600 dark:text-gray-300">
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
                            <p className="mt-1.5 text-xs text-red-500">
                                {errors.phone.message}
                            </p>
                        )}
                    </div>

                    {/* Parol input */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                            <span className="mr-1 text-red-500">*</span>
                            Parol
                        </label>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Parolni kiriting"
                                className={`${inputClasses} pr-12 ${
                                    errors.password
                                        ? 'bg-red-50 ring-2 ring-red-500'
                                        : ''
                                }`}
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
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
                                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                                    <line x1="2" y1="2" x2="22" y2="22"></line>
                                </svg>
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Parolni unutish */}
                    {forgetPasswordUrl && (
                        <div className="-mt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => navigate(forgetPasswordUrl)}
                                className="text-sm font-semibold text-gray-500 underline decoration-gray-400 underline-offset-4 hover:text-blue-500 hover:decoration-blue-500"
                            >
                                Parolni unutdingizmi?
                            </button>
                        </div>
                    )}

                    {/* Kirish tugmasi */}
                    <button
                        type="submit"
                        disabled={isLoading || isEimzoSubmitting}
                        className={`
                            mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-all
                            ${
                                isLoading || isEimzoSubmitting
                                    ? 'cursor-not-allowed bg-[#4785ff]/70'
                                    : 'bg-[#4785ff] hover:bg-blue-600 active:scale-[0.98]'
                            }
                        `}
                    >
                        {isLoading ? (
                            'Kirilmoqda...'
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
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                    <polyline points="10 17 15 12 10 7"></polyline>
                                    <line x1="15" y1="12" x2="3" y2="12"></line>
                                </svg>
                                Kirish
                            </>
                        )}
                    </button>
                </form>
            ) : (
                <div className="flex flex-col gap-5">
                    {/* E-IMZO qismi */}
                    <div>
                        <div className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Sertifikat
                        </div>

                        <div className="w-full">
                            <MissingSign
                                disabled={isLoading || isEimzoSubmitting}
                                onSignClicked={setSelectedCert}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleEimzoSignIn}
                        disabled={isLoading || !selectedCert}
                        className={`
                            mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-all
                            ${
                                isLoading || !selectedCert
                                    ? 'cursor-not-allowed bg-[#4785ff]/70'
                                    : 'bg-[#4785ff] hover:bg-blue-600 active:scale-[0.98]'
                            }
                        `}
                    >
                        {isEimzoSubmitting ? (
                            'Tekshirilmoqda...'
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
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                    <polyline points="10 17 15 12 10 7"></polyline>
                                    <line x1="15" y1="12" x2="3" y2="12"></line>
                                </svg>
                                Kirish
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

export default SignInForm
