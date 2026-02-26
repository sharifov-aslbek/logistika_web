import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAccountStore } from '@/store/accountStore'
import type { CommonProps } from '@/@types/common'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
    passwordHint?: string | React.ReactNode
}

// Validation Schema (Uzbek)
const validationSchema = z.object({
    phone: z.string().min(1, 'Telefon raqami kiritilishi shart'),
    password: z.string().min(1, 'Parol kiritilishi shart'),
})

type SignInFormSchema = z.infer<typeof validationSchema>

const SignInForm = (props: SignInFormProps) => {
    const { disableSubmit = false, className, setMessage } = props
    const navigate = useNavigate()

    // 1. Get Store Actions
    const login = useAccountStore((state) => state.login)
    const isLoading = useAccountStore((state) => state.isLoading)

    // 2. Setup Form
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormSchema>({
        resolver: zodResolver(validationSchema),
    })

    // 3. Success Handler
    const onSignIn = async (values: SignInFormSchema) => {
        console.log('✅ Form Submitted:', values)

        if (disableSubmit) {
            console.warn('⛔ Submit disabled by prop')
            return
        }

        setMessage?.('')

        try {
            console.log('🚀 Calling API...')
            const success = await login({
                phone: values.phone,
                password: values.password,
            })
            console.log('📡 API Result:', success)

            if (success) {
                navigate('/')
            } else {
                throw new Error('Login failed')
            }
        } catch (error: any) {
            console.error('❌ Login Error:', error)
            const backendMessage =
                error.response?.data?.message || 'Kirishda xatolik yuz berdi'
            setMessage?.(backendMessage)
        }
    }

    // 4. Error Handler
    const onError = (errors: any) => {
        console.log('⚠️ Validation Failed:', errors)
    }

    // Using Standard HTML elements with Tailwind classes
    return (
        <div className={className}>
            <form
                onSubmit={handleSubmit(onSignIn, onError)}
                className="flex flex-col gap-5"
            >
                {/* Phone Input */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">
                        Telefon raqami
                    </label>
                    <input
                        {...register('phone')}
                        placeholder="+998..."
                        className={`
                            w-full p-3 border rounded-lg outline-none transition-all
                            ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700'}
                        `}
                    />
                    {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.phone.message}
                        </p>
                    )}
                </div>

                {/* Password Input */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">
                        Parol
                    </label>
                    <input
                        {...register('password')}
                        type="password"
                        placeholder="Parol"
                        className={`
                            w-full p-3 border rounded-lg outline-none transition-all
                            ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700'}
                        `}
                    />
                    {errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`
                        w-full py-3 px-4 rounded-lg font-bold text-white transition-all
                        ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
                    `}
                >
                    {isLoading ? 'Kirilmoqda...' : 'Kirish'}
                </button>
            </form>
        </div>
    )
}

export default SignInForm
