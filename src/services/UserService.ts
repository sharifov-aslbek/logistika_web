import ApiService from './ApiService'

export async function apiGetUserById<T>(userId: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/user',
        method: 'get',
        params: {
            userId,
        },
    })
}
