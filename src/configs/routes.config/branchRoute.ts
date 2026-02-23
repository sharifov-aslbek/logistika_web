import { lazy } from 'react'
import { ADMIN, USER } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const branchRoute: Routes = [
    // --- Branch & Organization Routes ---
    // {
    //     key: 'branch.myorg',
    //     path: '/branch/myorg',
    //     component: lazy(() => import('@/views/branch/MyOrg')),
    //     authority: [ADMIN, USER],
    //     meta: {
    //         pageContainerType: 'contained',
    //     },
    // },
    // {
    //     key: 'branch.mybranch',
    //     path: '/branch/mybranch',
    //     component: lazy(() => import('@/views/branch/MyBranch')),
    //     authority: [ADMIN, USER],
    //     meta: {
    //         pageContainerType: 'contained',
    //     },
    // },
    // {
    //     key: 'branch.workers',
    //     path: '/branch/workers',
    //     component: lazy(() => import('@/views/branch/Workers')),
    //     authority: [ADMIN, USER],
    //     meta: {
    //         pageContainerType: 'contained',
    //     },
    // },

    // --- User Profile Route (Fixes your redirect issue) ---
    {
        key: 'dashboard.profile',
        path: '/dashboard/profile',
        // I am pointing this to 'Settings' as a default.
        // If you have a specific 'Profile.tsx', change the import path below.
        component: lazy(() => import('@/views/concepts/accounts/Settings')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'mail.createRegistry',
        path: '/mail/create-registry',
        component: lazy(() => import('@/views/mail/CreateRegistry')),
        authority: [],
    },
    {
        key: 'mail.createPdf',
        path: '/mail/create-pdf',
        component: lazy(() => import('@/views/mail/CreatePdf')),
        authority: [],
    },
    {
        key: 'mail.all',
        path: '/mail/all',
        component: lazy(() => import('@/views/mail/All')),
        authority: [],
    },
    {
        key: 'mail.sent',
        path: '/mail/sentmails',
        component: lazy(() => import('@/views/mail/Sent')),
        authority: [],
    },
    {
        key: 'mail.draft',
        path: '/mail/draftmails',
        component: lazy(() => import('@/views/mail/Draft')),
        authority: [],
    },
    {
        key: 'my.organizations',
        path: '/organization/myorg',
        component: lazy(
            () => import('@/views/organization/MyOrganizations/index'),
        ),
        authority: [],
    },
    {
        key: 'organization.branches',
        path: '/organization/organizationbranches',
        component: lazy(
            () => import('@/views/organization/OrganizationBranches'),
        ),
        authority: [],
    },
    {
        key: 'unhandled.users',
        path: '/unhandled/users',
        component: lazy(() => import('@/views/organization/Unhandled/index')),
        authority: [],
    },
    {
        key: 'organization.workers',
        path: '/organization/workers',
        component: lazy(() => import('@/views/organization/MyWorkers/index')),
        authority: [],
    },
    {
        key: 'branch.myorg',
        path: '/branch/myorg',
        component: lazy(() => import('@/views/branch/MyOrganization/index')),
        authority: [],
    },
    {
        key: 'org.branches',
        path: '/branch/mybranch',
        component: lazy(() => import('@/views/branch/MyBranch/index')),
        authority: [],
    },
    {
        key: 'worker.myorg',
        path: '/worker/organization',
        component: lazy(() => import('@/views/worker/MyOrganization/index')),
        authority: [],
    },
    {
        key: 'worker.mybranch',
        path: '/worker/branches',
        component: lazy(() => import('@/views/worker/MyBranch/index')),
        authority: [],
    },
    {
        key: 'organization.branch.worker',
        path: '/branch/workers',
        component: lazy(
            () => import('@/views/organization/BranchWorker/index'),
        ),
        authority: [],
    },
    {
        key: 'mail.viewer',
        path: '/mail/viewer/:id', // 👈 This :id captures the "16"
        component: lazy(() => import('@/views/mail/MailDetails')),
        authority: [],
    },
    {
        key: 'mail.edit',
        path: '/mail/edit/:id',
        component: lazy(() => import('@/views/mail/MailEdit')),
        authority: [],
    },
    {
        key: 'template.crud',
        path: '/template',
        component: lazy(() => import('@/views/template/TemplateList')),
        authority: [],
    },
    {
        key: 'signers',
        path: '/signers',
        component: lazy(() => import('@/views/signers/Signers')),
        authority: [],
    },
]

export default branchRoute
