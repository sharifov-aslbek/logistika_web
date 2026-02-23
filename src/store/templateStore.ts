import { create } from 'zustand'
import axios from 'axios'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// Define types based on your JSON response
export interface Template {
    id: number
    name: string
    filePath: string
    createdOn: string
    organizationId?: number
}

interface TemplateStore {
    templates: Template[]
    isLoading: boolean
    getTemplates: () => Promise<void>
    createTemplate: (name: string, file: File) => Promise<boolean>
    updateTemplate: (
        id: number,
        name: string,
        file?: File | null,
    ) => Promise<boolean>
    deleteTemplate: (id: number) => Promise<boolean>
    // ✨ NEW: Add download definition
    downloadTemplate: (id: number, fileName: string) => Promise<void>
}

// Helper to get headers with token
const getHeaders = () => {
    const token = useAccountStore.getState().user?.token
    return {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true', // This bypasses the HTML page
    }
}

export const useTemplateStore = create<TemplateStore>((set) => ({
    templates: [],
    isLoading: false,

    getTemplates: async () => {
        set({ isLoading: true })
        try {
            const response = await axios.get(`${BASE_URL}/template`, {
                headers: getHeaders(),
            })
            set({ templates: response.data })
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    createTemplate: async (name, file) => {
        // ... (your existing create logic)
        set({ isLoading: true })
        try {
            const formData = new FormData()
            formData.append('Name', name)
            formData.append('File', file)
            await axios.post(`${BASE_URL}/template`, formData, {
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Error creating template:', error)
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    updateTemplate: async (id, name, file) => {
        // ... (your existing update logic)
        set({ isLoading: true })
        try {
            const formData = new FormData()
            formData.append('Name', name)
            if (file) formData.append('File', file)
            else formData.append('File', '')

            await axios.put(`${BASE_URL}/template/${id}`, formData, {
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Error updating template:', error)
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    deleteTemplate: async (id) => {
        // ... (your existing delete logic)
        set({ isLoading: true })
        try {
            await axios.delete(`${BASE_URL}/template/${id}`, {
                headers: getHeaders(),
            })
            return true
        } catch (error) {
            console.error('Error deleting template:', error)
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    // ✨ NEW: Download Function
    downloadTemplate: async (id, fileName) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/template/${id}/download`,
                {
                    headers: getHeaders(), // Sends the ngrok bypass header
                    responseType: 'blob', // IMPORTANT: Tells Axios to handle binary data
                },
            )

            // Create a virtual link to download the Blob
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url

            // Set filename (use specific name or fallback)
            link.setAttribute('download', fileName || `template_${id}.html`)

            document.body.appendChild(link)
            link.click()

            // Cleanup
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading template:', error)
        } finally {
            set({ isLoading: false })
        }
    },
}))
