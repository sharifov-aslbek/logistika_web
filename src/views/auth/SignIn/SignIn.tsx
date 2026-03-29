import { useState } from 'react'
import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignInForm from './components/SignInForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'
import { HiKey, HiUserCircle } from 'react-icons/hi'

type SignInProps = {
    signUpUrl?: string
    disableSubmit?: boolean
    forgetPasswordUrl?: string
}

export const SignInBase = ({
    signUpUrl = '/sign-up',
    disableSubmit,
    forgetPasswordUrl,
}: SignInProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const mode = useThemeStore((state) => state.mode)
    const [activeTab, setActiveTab] = useState<'password' | 'eimzo'>(
        'password',
    )

    return (
        <div className="mx-auto w-full max-w-[620px] px-4 py-6">
            <div className="mb-8 flex justify-center">
                <Logo
                    type="streamline"
                    mode={mode}
                    imgClass="mx-auto"
                    logoWidth={118}
                />
            </div>

            <div className="mb-10 text-center">
                <h1 className="text-2xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                    Tizimga xush kelibsiz
                </h1>
                <p className="mt-4 text-lg sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Kerakli kirish usulini tanlang
                </p>
            </div>

            {message && (
                <Alert showIcon className="mb-6" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}

            <div className="mb-8 flex items-center justify-center gap-10 border-b border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => setActiveTab('password')}
                    className={`flex items-center gap-3 border-b-4 px-3 pb-4 pt-1 text-lg font-bold transition-all ${
                        activeTab === 'password'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-transparent text-gray-500 hover:text-blue-500'
                    }`}
                >
                    <HiUserCircle className="text-2xl" />
                    <span>Login / Parol</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('eimzo')}
                    className={`flex items-center gap-3 border-b-4 px-3 pb-4 pt-1 text-lg font-bold transition-all ${
                        activeTab === 'eimzo'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-transparent text-gray-500 hover:text-blue-500'
                    }`}
                >
                    <HiKey className="text-2xl" />
                    <span>E-IMZO</span>
                </button>
            </div>

            <SignInForm
                mode={activeTab}
                disableSubmit={disableSubmit ?? false}
                setMessage={setMessage}
                forgetPasswordUrl={forgetPasswordUrl}
            />

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Akkauntingiz yo'qmi? </span>
                <ActionLink
                    to={signUpUrl}
                    className="heading-text font-bold text-blue-600 hover:text-blue-500"
                    themeColor={false}
                >
                    Ro'yxatdan o'tish
                </ActionLink>
            </div>
        </div>
    )
}

const SignIn = () => {
    return <SignInBase />
}

export default SignIn
