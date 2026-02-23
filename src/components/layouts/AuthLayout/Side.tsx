import { cloneElement } from 'react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { CommonProps } from '@/@types/common'

// Import the Base components as you requested
import { SignInBase } from '@/views/auth/SignIn'
import { SignUpBase } from '@/views/auth/SignUp'

interface SplitProps extends CommonProps {
    content?: ReactNode
}

const Split = ({ children, content, ...rest }: SplitProps) => {
    // Get the current route
    const location = useLocation()
    const { pathname } = location

    return (
        <div className="grid lg:grid-cols-2 h-full p-6 bg-white dark:bg-gray-800">
            {/* --- LEFT SIDE: IMAGE --- */}
            <div className="bg-no-repeat bg-cover py-6 px-16 flex-col justify-center items-center hidden lg:flex bg-primary rounded-3xl">
                <div className="flex flex-col items-center gap-12">
                    <img
                        className="max-w-[450px] 2xl:max-w-[900px]"
                        src="/img/others/auth-split-img.png"
                        alt="Split Auth"
                    />
                    <div className="text-center max-w-[550px]">
                        <h1 className="text-neutral">
                            Xat yaratishning eng oson yo'li
                        </h1>
                        <p className="text-neutral opacity-80 mx-auto mt-8 font-semibold">
                            Xat Hippo.uz bilan loyihalarni boshqarishda qulaylikni his
                            eting. Ish jarayoningizni soddalashtiring va bizning
                            kuchli hamda tushunarli vositalarimiz yordamida
                            maqsadlaringizga samarali erishing.
                        </p>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDE: DYNAMIC CONTENT --- */}
            <div className="flex flex-col justify-center items-center ">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    {/* IF ROUTE IS /sign-in */}
                    {pathname.includes('sign-in') ? (
                        <div className="mb-8">
                            {/*<div className="mb-8">*/}
                            {/*    <h3 className="mb-1">Welcome back!</h3>*/}
                            {/*    <p>Please enter your credentials to sign in!</p>*/}
                            {/*</div>*/}
                            <SignInBase
                                disableSubmit={false}
                                signUpUrl="/sign-up"
                                forgetPasswordUrl="/forgot-password"
                            />
                        </div>
                    ) : /* ELSE IF ROUTE IS /sign-up */
                    pathname.includes('sign-up') ? (
                        <div className="mb-8">
                            {/*<div className="mb-8">*/}
                            {/*    <h3 className="mb-1">Sign Up</h3>*/}
                            {/*    <p>And lets get started with your free trial</p>*/}
                            {/*</div>*/}
                            <SignUpBase
                                disableSubmit={false}
                                signInUrl="/sign-in"
                            />
                        </div>
                    ) : (
                        /* ELSE (Default for other routes) */
                        <>
                            <div className="mb-8">{content}</div>
                            {children
                                ? cloneElement(children as React.ReactElement, {
                                      ...rest,
                                  })
                                : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Split
