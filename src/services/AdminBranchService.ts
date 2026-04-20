import ApiService from './ApiService'

export async function apiGetAdminBranches<T, U extends Record<string, unknown>>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/branch',
        method: 'get',
        params,
    })
}

export async function apiGetAdminBranch<T>(id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/branch/${id}`,
        method: 'get',
    })
}

export async function apiPutAdminBranch<T, U extends Record<string, unknown>>(id: number, data: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/branch/${id}`,
        method: 'put',
        data,
    })
}