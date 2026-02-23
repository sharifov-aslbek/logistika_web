import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react' // 👈 Import Suspense manually
import { protectedRoutes, publicRoutes } from '@/configs/routes.config'
import { commonRoutes } from '@/configs/routes.config/routes.config'
import appConfig from '@/configs/app.config'
import AppRoute from './AppRoute'
import PublicRoute from './PublicRoute'
import AuthorityGuard from './AuthorityGuard'
import ProtectedRoute from './ProtectedRoute'

const { authenticatedEntryPath } = appConfig

const AllRoutes = () => {
    return (
        <Routes>
            {/* --- Public Routes --- */}
            {publicRoutes.map((route) => {
                if (!route) return null
                return (
                    <Route
                        key={route.key}
                        path={route.path}
                        element={
                            <PublicRoute
                                routeKey={route.key}
                                component={route.component}
                                {...route.meta}
                            />
                        }
                    />
                )
            })}

            {/* --- ✅ COMMON ROUTES (The Fix) --- */}
            {/* We bypass 'AppRoute' and render the component directly with Suspense. */}
            {/* This strips away any hidden Sidebar/Layout logic in AppRoute. */}
            {commonRoutes &&
                commonRoutes.map((route) => {
                    if (!route) return null
                    const Component = route.component // Assign to a capitalized variable
                    return (
                        <Route
                            key={route.key}
                            path={route.path}
                            element={
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Component />
                                </Suspense>
                            }
                        />
                    )
                })}

            {/* --- Protected Routes --- */}
            <Route path="/" element={<ProtectedRoute />}>
                <Route
                    path="/"
                    element={<Navigate replace to={authenticatedEntryPath} />}
                />

                {protectedRoutes.map((route, index) => {
                    if (!route) return null
                    return (
                        <Route
                            key={route.key + index}
                            path={route.path}
                            element={
                                <AuthorityGuard
                                    userAuthority={route.authority}
                                    authority={route.authority}
                                >
                                    <AppRoute
                                        routeKey={route.key}
                                        component={route.component}
                                        {...route.meta}
                                    />
                                </AuthorityGuard>
                            }
                        />
                    )
                })}

                <Route
                    path="*"
                    element={<Navigate replace to={authenticatedEntryPath} />}
                />
            </Route>
        </Routes>
    )
}

export default AllRoutes
