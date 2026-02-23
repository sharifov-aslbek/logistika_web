import { useState } from 'react'
import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignUpForm from './components/SignUpForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'
import { HiArrowLeft } from 'react-icons/hi'

type SignUpProps = {
    disableSubmit?: boolean
    signInUrl?: string
}

export const SignUpBase = ({
    signInUrl = '/sign-in',
    disableSubmit,
}: SignUpProps) => {
    const [message, setMessage] = useTimeOutMessage()

    // Lift state up to control the "Back" button and Titles in this wrapper
    const [currentStep, setCurrentStep] = useState<
        'selection' | 'verification' | 'account'
    >('selection')

    const mode = useThemeStore((state) => state.mode)

    const handleResetFlow = () => {
        setCurrentStep('selection')
    }

    return (
        <div className="relative">
            {/* Back Button: Only show if not on the first step */}
            {currentStep !== 'selection' && (
                <button
                    onClick={handleResetFlow}
                    className="absolute top-0 left-0 -mt-2 -ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                >
                    <HiArrowLeft />
                </button>
            )}

            {/* LOGO: Added flex justify-center to ensure strict centering */}
            <div className="mb-8 flex justify-center">
                <Logo
                    type="streamline"
                    mode={mode}
                    imgClass="mx-auto"
                    logoWidth={120}
                />
            </div>

            {/* HEADER TEXT: Hidden on 'selection' step to avoid duplication */}
            {currentStep !== 'selection' && (
                <div className="mb-8 text-center">
                    <h3 className="mb-1">Ro'yxatdan o'tish</h3>
                    <p className="font-semibold heading-text">
                        Ma'lumotlaringizni to'ldiring
                    </p>
                </div>
            )}

            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}

            {/* FORM: We pass the step state down so the form can control the flow */}
            <SignUpForm
                disableSubmit={disableSubmit}
                setMessage={setMessage}
                // @ts-ignore - Ensure your SignUpForm props match these names
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
            />

            {currentStep === 'selection' && (
                <div className="mt-6 text-center">
                    <span>Akauntingiz bormi? </span>
                    <ActionLink
                        to={signInUrl}
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        Kirish
                    </ActionLink>
                </div>
            )}
        </div>
    )
}

const SignUp = () => {
    return <SignUpBase />
}

export default SignUp
