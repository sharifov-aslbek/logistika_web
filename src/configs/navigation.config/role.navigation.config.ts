import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_COLLAPSE,
} from '@/constants/navigation.constant'
import {
    ROLE_USER,
    ROLE_WORKER,
    ROLE_BRANCH_DIRECTOR,
    ROLE_ADMIN,
} from '@/constants/usertype.constant'
import type { NavigationTree } from '@/@types/navigation'

// Common items used by everyone (PDF, Registry, Documentation, Templates etc)
const commonMailItems: NavigationTree[] = [
    {
        key: 'template',
        path: '/template',
        title: 'Shablon',
        translateKey: 'menu.template',
        icon: 'hi-outline-document-text',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'mail-create-pdf',
        path: '/mail/create-pdf',
        title: 'PDF yaratish',
        translateKey: 'menu.createPdf',
        icon: 'hi-outline-document-add',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'mail-create-registry',
        path: '/mail/create-registry',
        title: 'Reyestr yaratish',
        translateKey: 'menu.createRegistry',
        icon: 'hi-outline-folder',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'created',
        path: '/mail/draftmails',
        title: 'Yaratilganlar',
        translateKey: 'menu.created',
        icon: 'hi-outline-check-circle',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'sent',
        path: '/mail/sentmails',
        title: 'Yuborilganlar',
        translateKey: 'menu.sent',
        icon: 'hi-outline-paper-airplane',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'all',
        path: '/mail/all',
        title: 'Barchasi',
        translateKey: 'menu.all',
        icon: 'hi-outline-collection',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'documentation',
        path: '/documentation',
        title: 'Dokumentatsiya',
        translateKey: 'menu.documentation',
        icon: 'hi-outline-book-open',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
]

// 1. User Navigation (Role 0)
export const userNavigationConfig: NavigationTree[] = [...commonMailItems]

// 2. Worker Navigation (Role 10)
export const workerNavigationConfig: NavigationTree[] = [
    {
        key: 'organization',
        path: '/worker/organization',
        title: 'Tashkilot',
        translateKey: 'menu.organization',
        icon: 'hi-outline-office-building',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'branches',
        path: '/worker/branches',
        title: 'Filiallar',
        translateKey: 'menu.branches',
        icon: 'hi-outline-template',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    ...commonMailItems,
]

// 3. Branch Director Navigation (Role 20)
export const branchNavigationConfig: NavigationTree[] = [
    {
        key: 'my-org',
        path: '/branch/myorg',
        title: 'Mening tashkilotim',
        translateKey: 'menu.myOrganization',
        icon: 'hi-outline-office-building',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'branches',
        path: '/branch/mybranch',
        title: 'Filiallar',
        translateKey: 'menu.branches',
        icon: 'hi-outline-template',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'branch-workers',
        path: '/branch/workers',
        title: 'Ishchilar',
        translateKey: 'menu.workers',
        icon: 'hi-outline-users',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    // --- YANGI: IMZOLOVCHILAR (BRANCH DIRECTOR) ---
    {
        key: 'signers',
        path: '/signers',
        title: 'Imzolovchilar',
        translateKey: 'menu.signers',
        icon: 'hi-outline-pencil-alt',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    ...commonMailItems,
]

// 4. Admin / Organization Director Navigation (Role 30)
export const adminNavigationConfig: NavigationTree[] = [
    {
        key: 'organization',
        path: '/organization/myorg',
        title: 'Tashkilot',
        translateKey: 'menu.organization',
        icon: 'hi-outline-office-building',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'branches',
        path: '/organization/organizationbranches',
        title: 'Filiallar',
        translateKey: 'menu.branches',
        icon: 'hi-outline-template',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'organization-workers',
        path: '/organization/workers',
        title: 'Ishchilar',
        translateKey: 'menu.workers',
        icon: 'hi-outline-users',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'unhandled-users',
        path: '/unhandled/users',
        title: 'Biriktirilmagan ishchilar',
        translateKey: 'menu.unhandledWorkers',
        icon: 'hi-outline-user-add',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    // --- YANGI: IMZOLOVCHILAR (ORGANIZATION DIRECTOR) ---
    {
        key: 'signers',
        path: '/signers',
        title: 'Imzolovchilar',
        translateKey: 'menu.signers',
        icon: 'hi-outline-pencil-alt',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    ...commonMailItems,
]

// Helper to pick the right one
export const getNavigationByRole = (role: number | string) => {
    // Convert string role to number if necessary
    const roleNum = Number(role)

    switch (roleNum) {
        case ROLE_ADMIN:
            return adminNavigationConfig
        case ROLE_BRANCH_DIRECTOR:
            return branchNavigationConfig
        case ROLE_WORKER:
            return workerNavigationConfig
        case ROLE_USER:
        default:
            return userNavigationConfig
    }
}
