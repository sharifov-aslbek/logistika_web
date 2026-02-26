import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const commonRoute: Routes = [
    {
        key: 'landing',
        path: '/',
        component: lazy(() => import('@/views/landingpage')), // Point this to your new file
        authority: [], // Empty array means no specific role required
        meta: {
            layout: 'blank', // This hides the dashboard sidebar/header
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
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
