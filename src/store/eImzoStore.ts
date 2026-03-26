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

    resetError: () => {
        console.log('[EImzoStore.resetError] called')
        set({ error: null })
        console.log('[EImzoStore.resetError] error reset to null')
    },

    init: async () => {
        console.log('[EImzoStore.init] started')

        set({ loading: true, error: null, isAgentReady: false })
        console.log('[EImzoStore.init] state set:', {
            loading: true,
            error: null,
            isAgentReady: false,
        })

        try {
            console.log('[EImzoStore.init] calling EImzoClient.initHandshake()')
            const success = await EImzoClient.initHandshake()
            console.log('[EImzoStore.init] initHandshake result:', success)

            if (success) {
                console.log('[EImzoStore.init] handshake success')
                set({ isAgentReady: true })
                console.log('[EImzoStore.init] isAgentReady set to true')

                console.log('[EImzoStore.init] calling loadCertificates()')
                await get().loadCertificates()
                console.log('[EImzoStore.init] loadCertificates() finished')
            } else {
                console.warn('[EImzoStore.init] handshake returned false')
                set({ error: 'API_KEY_ERROR', isAgentReady: false })
                console.log('[EImzoStore.init] state set:', {
                    error: 'API_KEY_ERROR',
                    isAgentReady: false,
                })
            }
        } catch (e) {
            console.error('[EImzoStore.init] E-IMZO Connection failed:', e)
            set({ error: 'AGENT_NOT_FOUND', isAgentReady: false })
            console.log('[EImzoStore.init] state set:', {
                error: 'AGENT_NOT_FOUND',
                isAgentReady: false,
            })
        } finally {
            set({ loading: false })
            console.log('[EImzoStore.init] finished, loading set to false')
            console.log('[EImzoStore.init] final state snapshot:', get())
        }
    },

    loadCertificates: async () => {
        console.log('[EImzoStore.loadCertificates] started')

        try {
            console.log('[EImzoStore.loadCertificates] calling EImzoClient.loadAllCertificates()')
            const certs = await EImzoClient.loadAllCertificates()

            console.log('[EImzoStore.loadCertificates] raw certs:', certs)
            console.log('[EImzoStore.loadCertificates] Array.isArray(certs):', Array.isArray(certs))
            console.log('[EImzoStore.loadCertificates] certs length:', certs?.length)

            if (Array.isArray(certs)) {
                console.log(
                    '[EImzoStore.loadCertificates] certs preview:',
                    certs.map((item: any, index: number) => ({
                        index,
                        alias: item?.alias,
                        serialNumber: item?.serialNumber,
                        subjectName: item?.subjectName,
                        validFrom: item?.validFrom,
                        validTo: item?.validTo,
                        disk: item?.disk,
                        path: item?.path,
                        name: item?.name,
                    })),
                )
            } else {
                console.warn('[EImzoStore.loadCertificates] certs is not an array')
            }

            if (!certs || certs.length === 0) {
                console.warn('[EImzoStore.loadCertificates] no certificates found')
                set({ certificates: [], error: 'NO_CERTS' })
                console.log('[EImzoStore.loadCertificates] state set:', {
                    certificates: [],
                    error: 'NO_CERTS',
                })
            } else {
                console.log('[EImzoStore.loadCertificates] certificates found:', certs.length)
                set({ certificates: certs, error: null })
                console.log('[EImzoStore.loadCertificates] state updated successfully')
            }
        } catch (e) {
            console.error('[EImzoStore.loadCertificates] Failed to load certificates:', e)
            set({ error: 'AGENT_NOT_FOUND' })
            console.log('[EImzoStore.loadCertificates] state set:', {
                error: 'AGENT_NOT_FOUND',
            })
        } finally {
            console.log('[EImzoStore.loadCertificates] finished')
            console.log('[EImzoStore.loadCertificates] final state snapshot:', get())
        }
    },

    loadKey: async (cert: any) => {
        console.log('[EImzoStore.loadKey] started')
        console.log('[EImzoStore.loadKey] cert:', cert)
        console.log('[EImzoStore.loadKey] cert keys:', cert ? Object.keys(cert) : null)

        try {
            const result = await EImzoClient.loadKey(cert)
            console.log('[EImzoStore.loadKey] result keyId:', result)
            return result
        } catch (e) {
            console.error('[EImzoStore.loadKey] error:', e)
            throw e
        } finally {
            console.log('[EImzoStore.loadKey] finished')
        }
    },

    createPkcs7: async (keyId: string, hash: string) => {
        console.log('[EImzoStore.createPkcs7] started')
        console.log('[EImzoStore.createPkcs7] keyId:', keyId)
        console.log('[EImzoStore.createPkcs7] hash:', hash)

        try {
            const result = await EImzoClient.createPkcs7(keyId, hash)
            console.log('[EImzoStore.createPkcs7] result:', result)
            return result
        } catch (e) {
            console.error('[EImzoStore.createPkcs7] error:', e)
            throw e
        } finally {
            console.log('[EImzoStore.createPkcs7] finished')
        }
    },
}))