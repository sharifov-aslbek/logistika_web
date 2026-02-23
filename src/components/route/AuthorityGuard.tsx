import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccountStore } from '@/store/accountStore'

const AuthorityGuard = (props: PropsWithChildren) => {
    const { children } = props

    // 1. Check if token exists in the store (which comes from localStorage)
    const token = useAccountStore((state) => state.user?.token)

    // 2. Simple Logic: If token exists, allowed. If not, redirect to sign-in.
    if (!token) {
        return <Navigate to="/sign-in" replace />
    }

    // 3. Render the page (Ignore roles)
    return <>{children}</>
}

export default AuthorityGuard
