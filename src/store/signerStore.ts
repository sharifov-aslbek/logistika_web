import { create } from 'zustand'
import axios from 'axios'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

interface SignerStore {
    isLoading: boolean
    signers: any[] // List of current signers for a specific branch

    // Actions
    fetchBranchSigners: (branchId: number) => Promise<any[]>
    setBranchSigners: (branchId: number, userIds: number[]) => Promise<boolean>
}

const getToken = () => {
    const state = useAccountStore.getState()
    return state.user?.token || state.userProfile?.token || ''
}

const getHeaders = () => ({
    'ngrok-skip-browser-warning': 'true',
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
})

export const useSignerStore = create<SignerStore>((set) => ({
    isLoading: false,
    signers: [],

    // 1. Get Signers for a specific branch
    fetchBranchSigners: async (branchId: number) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/branch/${branchId}/signers`,
                { headers: getHeaders() },
            )
            // Assuming response structure is [ { userId: 1, fullName: "..." }, ... ]
            // Adjust based on actual response if it's wrapped in { data: ... }
            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || []
            set({ signers: data })
            return data
        } catch (error) {
            console.error('Error fetching signers:', error)
            return []
        } finally {
            set({ isLoading: false })
        }
    },

    // 2. Set (Create/Update) Signers
    setBranchSigners: async (branchId: number, userIds: number[]) => {
        set({ isLoading: true })
        try {
            await axios.post(
                `${BASE_URL}/branch/set-signers`,
                {
                    branchId: branchId,
                    userIds: userIds,
                },
                { headers: getHeaders() },
            )
            return true
        } catch (error) {
            console.error('Error setting signers:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },
}))
