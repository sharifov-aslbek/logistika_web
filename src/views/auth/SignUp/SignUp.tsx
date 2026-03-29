import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignUpForm from './components/SignUpForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'

type SignUpProps = {
    disableSubmit?: boolean
    signInUrl?: string
}

export const SignUpBase = ({
    signInUrl = '/sign-in',
    disableSubmit,
}: SignUpProps) => {
    const [message, setMessage] = useTimeOutMessage()
    const mode = useThemeStore((state) => state.mode)

    return (
        <div className="mx-auto w-full max-w-[680px] px-4 py-6">
            <div className="mb-8 flex justify-center">
                <Logo
                    type="streamline"
                    mode={mode}
                    imgClass="mx-auto"
                    logoWidth={118}
                />
            </div>

            <div className="mb-8 text-center">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                    Ro&apos;yxatdan o&apos;tish
                </h1>
                <p className="mt-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Rolni tanlang, E-IMZO bilan tasdiqlang va akkaunt yarating
                </p>
            </div>

            {/* <div className="mb-6 rounded-[28px] border border-[#dbe7ff] bg-[linear-gradient(135deg,rgba(71,133,255,0.14),rgba(255,255,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(71,133,255,0.75)] dark:border-blue-500/30 dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(15,23,42,0.9))]">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4785ff] text-white shadow-lg shadow-blue-500/25">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 15V3"></path>
                            <path d="m8 7 4-4 4 4"></path>
                            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 16.25"></path>
                            <path d="M8 16h8"></path>
                            <path d="M8 20h8"></path>
                        </svg>
                    </div>
                    <div>
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">
                            Yangi akkaunt E-IMZO bilan tasdiqlanadi
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Foydalanuvchi yoki direktor rolini tanlaysiz,
                            sertifikatni belgilaysiz va tizim sizni avtomatik
                            kirgizadi.
                        </p>
                    </div>
                </div>
            </div> */}

            {message && (
                <Alert showIcon className="mb-6" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}

            <SignUpForm
                disableSubmit={disableSubmit}
                setMessage={setMessage}
            />

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Akkauntingiz bormi? </span>
                <ActionLink
                    to={signInUrl}
                    className="heading-text font-bold text-blue-600 hover:text-blue-500"
                    themeColor={false}
                >
                    Kirish
                </ActionLink>
            </div>
        </div>
    )
}

const SignUp = () => {
    return <SignUpBase />
}

export default SignUp
