import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormItem, Form } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAccountStore } from '@/store/accountStore'
import type { CommonProps } from '@/@types/common'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
    passwordHint?: string | React.ReactNode
}

const validationSchema = z.object({
    phone: z.string().min(1, 'Phone Number is required'),
    password: z.string().min(1, 'Password is required'),
})

type SignInFormSchema = z.infer<typeof validationSchema>

const SignInForm = (props: SignInFormProps) => {
    const { disableSubmit = false, className, setMessage } = props
    const navigate = useNavigate()

    // ---------------------------------------------------------
    // FIX 1: Use Selectors for Zustand (Standard Practice)
    // Destructuring directly often returns undefined in some setups
    // ---------------------------------------------------------
    const login = useAccountStore((state) => state.login)
    const isLoading = useAccountStore((state) => state.isLoading)

    const [isFailed, setIsFailed] = useState(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<SignInFormSchema>({
        resolver: zodResolver(validationSchema),
    })

    // This runs ONLY if Zod validation passes
    const onSignIn = async (values: SignInFormSchema) => {
        console.log('✅ Validation Passed. Submitting:', values)

        if (disableSubmit) return

        setMessage?.('')
        setIsFailed(false)

        try {
            const success = await login({
                phone: values.phone,
                password: values.password,
            })

            if (success) {
                navigate('/')
            } else {
                throw new Error('Login failed')
            }
        } catch (error: any) {
            console.error('❌ API Error:', error)
            const backendMessage =
                error.response?.data?.message ||
                'Phone or password is incorrect'
            setMessage?.(backendMessage)
            setIsFailed(true)
            setTimeout(() => setIsFailed(false), 1000)
        }
    }

    // ---------------------------------------------------------
    // FIX 2: Add this function to catch Validation Errors
    // ---------------------------------------------------------
    const onError = (errors: any) => {
        console.log('⚠️ Validation Failed:', errors)
    }

    return (
        <div className={`${className} ${isFailed ? 'animate-shake' : ''}`}>
            {/* FIX 3: Pass onError as the second argument.
               If validation fails, onSignIn is skipped and onError runs. 
            */}
            <Form onSubmit={handleSubmit(onSignIn, onError)}>
                <FormItem
                    label="Phone Number"
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
                    label="Password"
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
                                placeholder="Password"
                            />
                        )}
                    />
                </FormItem>

                <Button
                    block
                    loading={isLoading}
                    variant="solid"
                    type="submit"
                    className="mt-4"
                >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
            </Form>
        </div>
    )
}

export default SignInForm
