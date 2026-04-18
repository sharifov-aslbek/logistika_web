import ApiService from './ApiService'

export async function apiGetAdminOrganizations<T, U extends Record<string, unknown>>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/organization',
        method: 'get',
        params,
    })
}

export async function apiGetAdminOrganization<T>(id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/organization/${id}`,
        method: 'get',
    })
}

export async function apiPutAdminOrganization<T, U extends Record<string, unknown>>(id: number, data: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/organization/${id}`,
        method: 'put',
        data,
    })
}