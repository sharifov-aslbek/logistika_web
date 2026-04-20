import ApiService from './ApiService'

export async function apiGetAdminMailStatistics<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/mail/statistics',
        method: 'get',
    })
}

export async function apiGetAdminMails<T, U extends Record<string, unknown>>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/mail/all',
        method: 'get',
        params,
    })
}

export async function apiGetAdminMail<T>(uid: string) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/mail/${uid}`,
        method: 'get',
    })
}