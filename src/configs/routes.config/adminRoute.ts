import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const adminRoute: Routes = [
    {
        key: 'admin.branches',
        path: '/admin/branches',
        component: lazy(() => import('@/views/admin/AdminBranches/adminBranches.tsx')),
        authority: [], // Здесь можно указать [ROLE_SUPER_ADMIN], если у вас есть строгая защита
    },
    {
        key: 'admin.mails.statistics',
        path: '/admin/mails/statistics',
        component: lazy(() => import('@/views/admin/AdminMailsStatistics/adminMailsStatistics.tsx')),
        authority: [], 
    },
    {
        key: 'admin.mail.all',
        path: '/admin/mail/all',
        component: lazy(() => import('@/views/admin/AdminMails/AdminMails.tsx')),
        authority: [], 
    },
    {
        key: 'admin.mail.details',
        path: '/admin/mail/:uid',
        component: lazy(() => import('@/views/admin/AdminMails/adminMailDetails.tsx')),
        authority: [], 
    },
    {
        key: 'admin.organizations',
        path: '/admin/organizations',
        component: lazy(() => import('@/views/admin/AdminOrganizations/adminOrganizations.tsx')),
        authority: [],
    },
    {
        key: 'admin.users',
        path: '/admin/users',
        component: lazy(() => import('@/views/admin/AdminUsers/adminUsers.tsx')),
        authority: [],
    }
]

export default adminRoute