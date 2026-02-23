import dashboardsRoute from './dashboardsRoute'
import conceptsRoute from './conceptsRoute'
import uiComponentsRoute from './uiComponentsRoute'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import branchRoute from './branchRoute'
// 👇 Check this path. If commonRoute.ts is in the same folder, use './commonRoute'
import commonRoute from './commonRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes: Routes = [
    ...dashboardsRoute,
    ...conceptsRoute,
    ...uiComponentsRoute,
    ...branchRoute,
    ...othersRoute,
]

// ✅ FIX: Use 'commonRoutes' (single s)
export const commonRoutes: Routes = [...commonRoute]
