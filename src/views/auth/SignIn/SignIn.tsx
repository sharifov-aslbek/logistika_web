import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignInForm from './components/SignInForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'

type SignInProps = {
    signUpUrl?: string
    disableSubmit?: boolean
}

export const SignInBase = ({
    signUpUrl = '/sign-up',
    disableSubmit,
}: SignInProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const mode = useThemeStore((state) => state.mode)

    return (
        <>
            <div className="mb-8 flex justify-center">
                <Logo
                    type="streamline"
                    mode={mode}
                    imgClass="mx-auto"
                    logoWidth={100}
                />
            </div>

            <div className="mb-8 text-center">
                <h3 className="mb-1">Tizimga kirish</h3>
                <p className="font-semibold heading-text text-gray-500">
                    Kirish uchun ma'lumotlaringizni kiriting
                </p>
            </div>

            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}

            {/* FIX: Explicitly force disableSubmit to false */}
            <SignInForm disableSubmit={false} setMessage={setMessage} />

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
        </>
    )
}

const SignIn = () => {
    return <SignInBase />
}

export default SignIn
