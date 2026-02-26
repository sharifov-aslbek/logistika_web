import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const authRoute: Routes = [
    {
        key: 'signIn',
        path: `/sign-in`,
        // Ensure this path is correct!
        component: lazy(() => import('@/views/auth/Login')),
        authority: [],
    },
    {
        key: 'signUp',
        path: `/sign-up`,
        component: lazy(() => import('@/views/auth-demo/SignUpDemoSplit')),
        authority: [],
    },
    // ... rest of your routes
]

export default authRoute
