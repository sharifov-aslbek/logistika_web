import axios from 'axios'
import appConfig from '@/configs/app.config'
import type { AxiosError } from 'axios'

const AxiosBase = axios.create({
    timeout: 60000,
    baseURL: import.meta.env.VITE_BASE_URL || appConfig.apiPrefix,
})

AxiosBase.interceptors.request.use(
    (config) => {
        // 1. Пытаемся достать токен из account-storage
        let token = ''
        try {
            const storageData = localStorage.getItem('account-storage')
            if (storageData) {
                const parsedData = JSON.parse(storageData)
                // 2. Ищем токен по пути state -> user -> token
                token = parsedData?.state?.user?.token || parsedData?.state?.userProfile?.token || ''
            }
        } catch (error) {
            console.error('Ошибка при чтении токена из account-storage:', error)
        }

        // 3. Если токен успешно найден, прикрепляем его к заголовкам запроса
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

AxiosBase.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Опционально: можно добавить логику разлогинивания при 401 ошибке
        // if (error.response && error.response.status === 401) {
        //     localStorage.removeItem('account-storage')
        //     window.location.reload()
        // }
        return Promise.reject(error)
    }
)

export default AxiosBase