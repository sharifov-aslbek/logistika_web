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

// --- COMMON SUBMENUS ---

// 1. Common Section: Mails & Documents
const commonMailGroup: NavigationTree = {
    key: 'mails-group',
    path: '',
    title: 'Xatlarni boshqarish',
    translateKey: '', // <-- Emptied so it uses the 'title' directly
    icon: 'mail',
    type: NAV_ITEM_TYPE_TITLE,
    authority: [],
    subMenu: [
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
            key: 'template',
            path: '/template',
            title: 'Shablon',
            translateKey: 'menu.template',
            icon: 'hi-outline-document-text',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [],
            subMenu: [],
        },
    ],
}

// 2. Common Section: Resources (Templates, Documentation)
const commonResourcesGroup: NavigationTree = {
    key: 'resources-group',
    path: '',
    title: 'Ma\'lumotnomalar',
    translateKey: '', // <-- Emptied so it uses the 'title' directly
    icon: 'document',
    type: NAV_ITEM_TYPE_TITLE,
    authority: [],
    subMenu: [
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
    ],
}

// --- ROLE SPECIFIC SUBMENUS ---

// Worker Specific Submenu
const workerGroup: NavigationTree = {
    key: 'worker-group',
    path: '',
    title: 'Ishchi paneli',
    translateKey: '', // <-- Emptied
    icon: 'briefcase', 
    type: NAV_ITEM_TYPE_TITLE,
    authority: [],
    subMenu: [
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
    ],
}

// Branch Director Specific Submenu
const branchGroup: NavigationTree = {
    key: 'branch-group',
    path: '',
    title: 'Filialni boshqarish',
    translateKey: '', // <-- Emptied
    icon: 'office', 
    type: NAV_ITEM_TYPE_TITLE,
    authority: [],
    subMenu: [
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
    ],
}

// Admin Specific Submenu
const adminGroup: NavigationTree = {
    key: 'admin-group',
    path: '',
    title: 'Boshqaruv paneli',
    translateKey: '', // <-- Emptied
    icon: 'shield',
    type: NAV_ITEM_TYPE_TITLE,
    authority: [],
    subMenu: [
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
    ],
}

// --- EXPORT CONFIGS ---

// 1. User Navigation (Role 0)
export const userNavigationConfig: NavigationTree[] = [
    commonMailGroup,
    commonResourcesGroup,
]

// 2. Worker Navigation (Role 10)
export const workerNavigationConfig: NavigationTree[] = [
    workerGroup,
    commonMailGroup,
    commonResourcesGroup,
]

// 3. Branch Director Navigation (Role 20)
export const branchNavigationConfig: NavigationTree[] = [
    branchGroup,
    commonMailGroup,
    commonResourcesGroup,
]

// 4. Admin / Organization Director Navigation (Role 30)
export const adminNavigationConfig: NavigationTree[] = [
    adminGroup,
    commonMailGroup,
    commonResourcesGroup,
]

// Helper to pick the right one
export const getNavigationByRole = (role: number | string) => {
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