import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axios from 'axios'

// 1. Setup API URL
const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

console.log('🔌 Store Loaded. API URL:', BASE_URL)

// 2. Constants
const publicApiConfig = {
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Added for Ngrok
    },
}

// --- Local Types ---
interface User {
    token: string
}

interface UserProfile {
    fullName: string
    phone: string
    address: string
    pinfl: string
    id: number
    role: string
}

interface LoginPayload {
    phone: string
    password: string
}

interface AccountState {
    user: User | null
    userProfile: UserProfile
    isLoading: boolean
    loginFailed: boolean

    // Actions
    login: (loginInfo: LoginPayload) => Promise<boolean>
    getProfile: () => Promise<void>
    logout: () => void
    getPersonByPinfl: (pinfl: string) => Promise<any>
    getCompanyByInn: (inn: string) => Promise<any>
    registerUser: (payload: any) => Promise<boolean>
    registerDirector: (payload: any) => Promise<boolean>

    // Helpers
    isAuthenticated: () => boolean
}

// 3. Create Store
export const useAccountStore = create<AccountState>()(
    persist(
        (set, get) => ({
            // --- Initial State ---
            user: null,
            isLoading: false,
            loginFailed: false,
            userProfile: {
                fullName: '',
                phone: '',
                address: '',
                pinfl: '',
                id: 0,
                role: '',
            },

            // --- Helpers ---
            isAuthenticated: () => !!get().user?.token,

            // --- Actions ---

            login: async (loginInfo) => {
                console.log('1️⃣ [Store] Login Action Called', loginInfo)

                set({ isLoading: true, loginFailed: false })

                try {
                    const url = `${BASE_URL}/auth/login`
                    console.log('2️⃣ [Store] POST request to:', url)

                    const response = await axios.post(
                        url,
                        loginInfo,
                        publicApiConfig,
                    )

                    console.log('3️⃣ [Store] Response:', response)
                    const data = response.data

                    if (data?.code === 200 && data?.data?.access_token) {
                        console.log('✅ [Store] Success! Token saved.')
                        set({ user: { token: data.data.access_token } })
                        return true
                    }

                    console.warn(
                        '⚠️ [Store] Login Failed (Code not 200):',
                        data,
                    )
                    set({ loginFailed: true })
                    return false
                } catch (error: any) {
                    console.error('❌ [Store] Request Failed:', error)
                    set({ loginFailed: true })
                    throw error
                } finally {
                    set({ isLoading: false })
                }
            },

            getProfile: async () => {
                const token = get().user?.token
                if (!token) return

                set({ isLoading: true })
                try {
                    const response = await axios.get(`${BASE_URL}/user/me`, {
                        headers: {
                            ...publicApiConfig.headers, // Includes ngrok header
                            Authorization: `Bearer ${token}`,
                        },
                    })
                    const res = response.data

                    if (res.code === 200 && res.data) {
                        set({
                            userProfile: {
                                fullName: res.data.fullName,
                                phone: res.data.phone,
                                address: res.data.address,
                                pinfl: res.data.pinfl,
                                id: res.data.id,
                                role: res.data.role,
                            },
                        })
                    }
                } catch (error: any) {
                    if (error.response && error.response.status === 401) {
                        get().logout()
                    }
                } finally {
                    set({ isLoading: false })
                }
            },

            getPersonByPinfl: async (pinfl) => {
                set({ isLoading: true })
                try {
                    const response = await axios.get(
                        `${BASE_URL}/integration/person/${pinfl}`,
                        publicApiConfig,
                    )
                    return response.data
                } finally {
                    set({ isLoading: false })
                }
            },

            getCompanyByInn: async (inn) => {
                set({ isLoading: true })
                try {
                    const response = await axios.get(
                        `${BASE_URL}/integration/company/${inn}`,
                        publicApiConfig,
                    )
                    return response.data
                } finally {
                    set({ isLoading: false })
                }
            },

            registerUser: async (payload) => {
                set({ isLoading: true })
                try {
                    const response = await axios.post(
                        `${BASE_URL}/auth/register/user`,
                        payload,
                        publicApiConfig,
                    )
                    if (response.data?.code === 200) {
                        return await get().login({
                            phone: payload.phone,
                            password: payload.password,
                        })
                    }
                    return false
                } catch (error) {
                    return false
                } finally {
                    set({ isLoading: false })
                }
            },

            registerDirector: async (payload) => {
                set({ isLoading: true })
                try {
                    const response = await axios.post(
                        `${BASE_URL}/auth/register/director`,
                        payload,
                        publicApiConfig,
                    )
                    if (response.data?.code === 200) {
                        return await get().login({
                            phone: payload.phone,
                            password: payload.password,
                        })
                    }
                    return false
                } catch (error) {
                    return false
                } finally {
                    set({ isLoading: false })
                }
            },

            logout: () => {
                // Clear both user token AND profile data
                set({
                    user: null,
                    userProfile: {
                        fullName: '',
                        phone: '',
                        address: '',
                        pinfl: '',
                        id: 0,
                        role: '',
                    },
                })
                localStorage.removeItem('account-storage')
            },
        }),
        {
            name: 'account-storage',
            storage: createJSONStorage(() => localStorage),

            // FIX: We now allow 'userProfile' to be saved to localStorage
            partialize: (state) => ({
                user: state.user,
                userProfile: state.userProfile,
            }),
        },
    ),
)
