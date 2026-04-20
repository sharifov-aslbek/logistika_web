import ApiService from './ApiService'

export async function apiGetAdminUsers<T, U extends Record<string, unknown>>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/users',
        method: 'get',
        params,
    })
}

export async function apiGetAdminUser<T>(userId: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/users/${userId}`,
        method: 'get',
    })
}

export async function apiPatchAdminUserStatus<T, U extends Record<string, unknown>>(id: number, data: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/users/${id}/status`,
        method: 'patch',
        data,
    })
}

export async function apiPatchAdminUserPassword<T, U extends Record<string, unknown>>(id: number, data: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/users/${id}/reset-password`,
        method: 'patch',
        data,
    })
}