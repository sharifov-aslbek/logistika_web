import ApiService from './ApiService'

export async function apiGetAdminTemplates<T, U extends Record<string, unknown>>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/admin/template',
        method: 'get',
        params,
    })
}

export async function apiPutAdminTemplate<T>(id: number, data: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/template/${id}`,
        method: 'put',
        data,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export async function apiDeleteAdminTemplate<T>(id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/admin/template/${id}`,
        method: 'delete',
    })
}