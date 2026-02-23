import { create } from 'zustand'
import EImzoClient from '@/services/EImzoService'

interface EImzoState {
    certificates: any[]
    loading: boolean
    error: any

    // Actions
    init: () => Promise<void>
    loadCertificates: () => Promise<void>
    activateAndSign: (cert: any, hash: string) => Promise<string>
}

export const useEImzoStore = create<EImzoState>((set, get) => ({
    certificates: [],
    loading: false,
    error: null,

    init: async () => {
        set({ loading: true, error: null })
        try {
            const success = await EImzoClient.initHandshake()
            if (success) {
                await get().loadCertificates()
            } else {
                set({ error: 'E-IMZO API Key rejected' })
            }
        } catch (e) {
            console.error('E-IMZO Init Error:', e)
            set({ error: e })
        } finally {
            set({ loading: false })
        }
    },

    loadCertificates: async () => {
        try {
            const certs = await EImzoClient.loadAllCertificates()
            set({ certificates: certs })
        } catch (e) {
            console.error('Failed to load certificates:', e)
        }
    },

    activateAndSign: async (cert: any, hash: string) => {
        // 1. Load Key
        const keyId = await EImzoClient.loadKey(cert)

        // 2. Sign
        const signature = await EImzoClient.createPkcs7(keyId, hash)

        return signature
    },
}))
