import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

const adminRoute: Routes = [
    {
        key: 'admin.branches',
        path: '/admin/branches',
        component: lazy(() => import('@/views/admin/AdminBranches/adminBranches')),
        authority: [], // Здесь можно указать [ROLE_SUPER_ADMIN], если у вас есть строгая защита
    },
    {
        key: 'admin.mail.all',
        path: '/admin/mail/all',
        component: lazy(() => import('@/views/admin/AdminMails/adminMails')),
        authority: [], 
    },
    {
        key: 'admin.mail.details',
        path: '/admin/mail/:uid',
        component: lazy(() => import('@/views/admin/AdminMails/adminMailDetails')),
        authority: [], 
    },
    {
        key: 'admin.organizations',
        path: '/admin/organizations',
        component: lazy(() => import('@/views/admin/AdminOrganizations/adminOrganizations')),
        authority: [],
    },
    {
        key: 'admin.users',
        path: '/admin/users',
        component: lazy(() => import('@/views/admin/AdminUsers/adminUsers')),
        authority: [],
    },
    {
        key: 'admin.templates',
        path: '/admin/templates',
        component: lazy(() => import('@/views/admin/AdminTemplates/adminTemplate'))
    }
]

export default adminRoute