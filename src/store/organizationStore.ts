import { create } from 'zustand'
import axios from 'axios'

const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://default-api.example.com/api'

export interface Organization {
    id: number
    fullName: string
    shortName: string
    status: string
    address: string
}

interface OrganizationState {
    isLoading: boolean
    myOrganizations: Organization[]
    myBranches: any[]
    organizationBranches: any[]
    myBranch: any[] // New State for the single branch

    // Actions
    fetchMyOrganizations: () => Promise<void>
    fetchMyOrganizationBranches: () => Promise<void>
    fetchMyBranches: () => Promise<void>
    fetchMyBranch: () => Promise<void> // New Action
}

// Helper to get token
const getAuthHeaders = () => {
    let token = ''
    try {
        const storageData = localStorage.getItem('account-storage')
        if (storageData) {
            const parsedData = JSON.parse(storageData)
            token = parsedData?.state?.user?.token || ''
        }
    } catch (error) {
        console.error('Error parsing auth token from storage:', error)
    }

    return {
        Authorization: `Bearer ${token}`,
        accept: '*/*',
        'ngrok-skip-browser-warning': 'true',
    }
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
    isLoading: false,
    myOrganizations: [],
    myBranches: [],
    organizationBranches: [],
    myBranch: [],

    fetchMyOrganizations: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/organization/my-organizations`,
                { headers: getAuthHeaders() },
            )
            if (response.data && Array.isArray(response.data)) {
                set({ myOrganizations: response.data })
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error)
            set({ myOrganizations: [] })
        } finally {
            set({ isLoading: false })
        }
    },

    fetchMyOrganizationBranches: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/branch/my-organization-branches`,
                { headers: getAuthHeaders() },
            )
            if (response.data && Array.isArray(response.data)) {
                set({ organizationBranches: response.data })
            }
        } catch (error) {
            console.error('Failed to fetch organization branches:', error)
            set({ organizationBranches: [] })
        } finally {
            set({ isLoading: false })
        }
    },

    fetchMyBranches: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/permission/my-branches`,
                { headers: getAuthHeaders() },
            )
            if (response.data && Array.isArray(response.data)) {
                set({ myBranches: response.data })
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error)
            set({ myBranches: [] })
        } finally {
            set({ isLoading: false })
        }
    },

    // New Action for Single Branch
    fetchMyBranch: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(`${BASE_URL}/branch/my-branch`, {
                headers: getAuthHeaders(),
            })
            // The API returns a single object, we wrap it in an array for the table
            if (response.data && response.data.id) {
                set({ myBranch: [response.data] })
            } else {
                set({ myBranch: [] })
            }
        } catch (error) {
            console.error('Failed to fetch my branch:', error)
            set({ myBranch: [] })
        } finally {
            set({ isLoading: false })
        }
    },
}))
