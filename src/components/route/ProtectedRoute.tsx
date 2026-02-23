import { Navigate, Outlet, useLocation } from 'react-router-dom'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useAccountStore } from '@/store/accountStore' // <--- 1. Import your new store

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
    // 2. Use your store's authentication check instead of useAuth()
    const isAuthenticated = useAccountStore((state) => state.isAuthenticated())

    const location = useLocation()

    // 3. Fix the URL logic (location.pathname vs pathname)
    const getPathName =
        location.pathname === '/'
            ? ''
            : `?${REDIRECT_URL_KEY}=${location.pathname}`

    // 4. Check the boolean from your store
    if (!isAuthenticated) {
        return (
            <Navigate
                replace
                to={`${unAuthenticatedEntryPath}${getPathName}`}
            />
        )
    }

    return <Outlet />
}

export default ProtectedRoute
