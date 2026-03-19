import { create } from 'zustand'
import EImzoClient from '@/services/EImzoService'

interface EImzoState {
    certificates: any[]
    loading: boolean
    error: 'AGENT_NOT_FOUND' | 'API_KEY_ERROR' | 'NO_CERTS' | null
    isAgentReady: boolean

    // Actions
    init: () => Promise<void>
    loadCertificates: () => Promise<void>
    loadKey: (cert: any) => Promise<string>
    createPkcs7: (keyId: string, hash: string) => Promise<string>
    resetError: () => void
}

export const useEImzoStore = create<EImzoState>((set, get) => ({
    certificates: [],
    loading: false,
    error: null,
    isAgentReady: false,

    resetError: () => set({ error: null }),

    init: async () => {
        set({ loading: true, error: null, isAgentReady: false })
        try {
            // initHandshake handles the WebSocket connection
            const success = await EImzoClient.initHandshake()
            
            if (success) {
                set({ isAgentReady: true })
                await get().loadCertificates()
            } else {
                set({ error: 'API_KEY_ERROR', isAgentReady: false })
            }
        } catch (e) {
            console.error('E-IMZO Connection failed:', e)
            // This triggers if the WebSocket fails (127.0.0.1 not reachable)
            set({ error: 'AGENT_NOT_FOUND', isAgentReady: false })
        } finally {
            set({ loading: false })
        }
    },

    loadCertificates: async () => {
        try {
            const certs = await EImzoClient.loadAllCertificates()
            if (!certs || certs.length === 0) {
                set({ certificates: [], error: 'NO_CERTS' })
            } else {
                set({ certificates: certs, error: null })
            }
        } catch (e) {
            console.error('Failed to load certificates:', e)
            set({ error: 'AGENT_NOT_FOUND' })
        }
    },

    loadKey: async (cert: any) => {
        return await EImzoClient.loadKey(cert)
    },

    createPkcs7: async (keyId: string, hash: string) => {
        return await EImzoClient.createPkcs7(keyId, hash)
    },
}))