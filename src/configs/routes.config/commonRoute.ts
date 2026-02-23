import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const commonRoute: Routes = [
    {
        key: 'documentation',
        path: '/documentation',
        component: lazy(() => import('@/views/documentation/index')),
        authority: [],
        meta: {
            pageContainerType: 'gutterless', // Optional: Removes extra padding if your theme supports it
        },
    },
]

export default commonRoute
