import { create } from 'zustand'
import axios from 'axios'
import { useAccountStore } from './accountStore'
// Import Types if available, or just use 'any' if you want speed
import type { MailDashboardResponse } from '@/@types/dashboard'

// --- Configuration ---
const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- Helper: Get Token Safely ---
const getToken = () => {
    const state = useAccountStore.getState()
    let token = state.user?.token || state.userProfile?.token

    if (!token) {
        try {
            const storageKey = 'account-storage'
            const storedString = localStorage.getItem(storageKey)
            if (storedString) {
                const parsed = JSON.parse(storedString)
                token =
                    parsed.state?.user?.token ||
                    parsed.state?.userProfile?.token
            }
        } catch (error) {
            console.warn('Failed to parse token from local storage', error)
        }
    }
    return token || ''
}

// --- Helper: Get Auth Headers ---
const getAuthHeaders = () => {
    const token = getToken()
    return {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
        accept: '*/*',
    }
}

// --- Types ---
export type MailState = {
    isLoading: boolean
    mails: any[]
    totalMails: number
    currentMail: any | null
    dashboardStats: MailDashboardResponse | null

    // Actions
    createMail: (formData: FormData) => Promise<boolean>
    createRegistry: (formData: FormData) => Promise<boolean>
    getAllMails: (filters?: any) => Promise<void>
    getMailByUid: (uid: string) => void
    updateMail: (uid: string, payload: any) => Promise<boolean>
    deleteMail: (uid: string) => Promise<boolean>
    sendMail: (uid: string) => Promise<boolean>
    sendMailById: (id: string, uid: string) => Promise<boolean>
    fetchMailDetails: (uid: string) => Promise<any>
    downloadMailPdf: (uid: string) => Promise<string | null>
    downloadReceiptPdf: (uid: string) => Promise<string | null>

    // ✨ NEW: Excel Export Action
    exportExcel: (filters?: any) => Promise<Blob | null>

    // Dashboard Action
    getDashboardStats: () => Promise<void>
}

// --- Store Implementation ---
export const useMailStore = create<MailState>((set, get) => ({
    isLoading: false,
    mails: [],
    totalMails: 0,
    currentMail: null,
    dashboardStats: null,

    // 1. Create Mail
    createMail: async (formData: FormData) => {
        set({ isLoading: true })
        try {
            await axios.post(`${BASE_URL}/mail`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Create Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 2. Create Registry
    createRegistry: async (formData: FormData) => {
        set({ isLoading: true })
        try {
            await axios.post(`${BASE_URL}/mail/registry`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Create Registry Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 3. Get All Mails
    getAllMails: async (filters = {}) => {
        set({ isLoading: true })
        try {
            const queryParams: Record<string, any> = {
                PageSize: filters.pageSize || 10,
                PageIndex: filters.pageIndex || 1,
            }

            // Optional Filters
            if (filters.startDate) queryParams.StartDate = filters.startDate
            if (filters.endDate) queryParams.EndDate = filters.endDate
            if (typeof filters.isSend === 'boolean')
                queryParams.IsSend = filters.isSend

            // ID Filters
            if (filters.regionId > 0) queryParams.RegionId = filters.regionId
            if (filters.areaId > 0) queryParams.AreaId = filters.areaId
            if (filters.organizationId > 0)
                queryParams.OrganizationId = filters.organizationId
            if (filters.branchId > 0) queryParams.BranchId = filters.branchId
            if (filters.creatorUserId > 0)
                queryParams.CreatorUserId = filters.creatorUserId
            if (filters.senderUserId > 0)
                queryParams.SenderUserId = filters.senderUserId

            const response = await axios.get(`${BASE_URL}/mail/all`, {
                headers: getAuthHeaders(),
                params: queryParams,
            })

            const responseData = response.data

            if (responseData && Array.isArray(responseData)) {
                set({ mails: responseData, totalMails: responseData.length })
            } else if (responseData?.data && Array.isArray(responseData.data)) {
                set({
                    mails: responseData.data,
                    totalMails:
                        responseData.totalCount || responseData.total || 0,
                })
            } else {
                set({ mails: [], totalMails: 0 })
            }
        } catch (error) {
            console.error('Get All Mails Error:', error)
            set({ mails: [], totalMails: 0 })
        } finally {
            set({ isLoading: false })
        }
    },

    // 4. Get Single Mail Local
    getMailByUid: (uid: string) => {
        const { mails } = get()
        if (mails.length > 0) {
            const found = mails.find((m: any) => m.uid === uid) || null
            set({ currentMail: found })
        }
    },

    // 5. Update Mail
    updateMail: async (uid: string, payload: any) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/update/${uid}`
            const bodyData = {
                receiverName: payload.receiverName,
                receiverAddress: payload.receiverAddress,
                pagesCount: Number(payload.pagesCount || 1),
                regionId: Number(payload.regionId || 0),
                areaId: Number(payload.areaId || 0),
            }
            await axios.patch(url, bodyData, { headers: getAuthHeaders() })
            return true
        } catch (error) {
            console.error('Update Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 6. Delete Mail
    deleteMail: async (uid: string) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/${uid}`
            await axios.delete(url, { headers: getAuthHeaders() })
            const currentMails = get().mails
            set({ mails: currentMails.filter((m) => m.uid !== uid) })
            return true
        } catch (error) {
            console.error('Delete Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 7. Send Mail
    sendMail: async (uid: string) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/send/${uid}`
            await axios.patch(url, {}, { headers: getAuthHeaders() })
            return true
        } catch (error) {
            console.error('Send Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 8. Send Mail By ID
    sendMailById: async (id: string, uid: string) => {
        return await get().sendMail(uid)
    },

    // 9. Fetch Details
    fetchMailDetails: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(`${BASE_URL}/mail/${uid}`, {
                headers: getAuthHeaders(),
            })
            return response.data
        } catch (error) {
            console.error('Failed to fetch mail details:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },

    // 10. Download PDF
    downloadMailPdf: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/mail/${uid}/download`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                },
            )
            const blob = new Blob([response.data], { type: 'application/pdf' })
            return window.URL.createObjectURL(blob)
        } catch (error) {
            console.error('Download PDF Error:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },

    // 11. Download Receipt
    downloadReceiptPdf: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/perform/receipt/${uid}`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                },
            )
            const blob = new Blob([response.data], { type: 'application/pdf' })
            return window.URL.createObjectURL(blob)
        } catch (error) {
            console.error('Download Receipt Error:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },

    // ✨ 12. Export Excel (NEW)
    exportExcel: async (filters = {}) => {
        // Note: We deliberately do NOT set global isLoading to true to avoid full page spinner
        try {
            const queryParams: Record<string, any> = {}

            // Map filters exactly like getAllMails, but exclude PageIndex/PageSize
            if (filters.startDate) queryParams.StartDate = filters.startDate
            if (filters.endDate) queryParams.EndDate = filters.endDate
            if (typeof filters.isSend === 'boolean')
                queryParams.IsSend = filters.isSend

            if (filters.regionId > 0) queryParams.RegionId = filters.regionId
            if (filters.areaId > 0) queryParams.AreaId = filters.areaId
            if (filters.organizationId > 0)
                queryParams.OrganizationId = filters.organizationId
            if (filters.branchId > 0) queryParams.BranchId = filters.branchId
            if (filters.creatorUserId > 0)
                queryParams.CreatorUserId = filters.creatorUserId
            if (filters.senderUserId > 0)
                queryParams.SenderUserId = filters.senderUserId

            const response = await axios.get(`${BASE_URL}/mail/export-excel`, {
                headers: getAuthHeaders(),
                params: queryParams,
                responseType: 'blob', // IMPORTANT: Handle binary data
            })

            return response.data // Returns the Blob
        } catch (error) {
            console.error('Export Excel Error:', error)
            return null
        }
    },

    // 13. Dashboard Stats
    getDashboardStats: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/statistics/dashboard`,
                {
                    headers: getAuthHeaders(),
                },
            )
            set({ dashboardStats: response.data.data })
        } catch (error) {
            console.error('Get Dashboard Error:', error)
        } finally {
            set({ isLoading: false })
        }
    },
}))
