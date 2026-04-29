import { create } from 'zustand'
import axios from 'axios'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { PLACEMENT } from '@/components/ui/utils/constants'
import { useAccountStore } from './accountStore'
import { mapApiResult, type RegistryApiResult } from '@/views/mail/components/create-registry/createRegistry.utils'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

type RegistryProcessType = 'internal' | 'external'
type RegistryProcessStatus = 'pending' | 'success' | 'error'

type RegistryProcessJob = {
    id: string
    type: RegistryProcessType
    status: RegistryProcessStatus
    createdAt: string
    toastId?: string
    result?: RegistryApiResult
    errorMessage?: string
}

type SubmitRegistryProcessParams = {
    type: RegistryProcessType
    payload: Record<string, any>
}

type SubmitRegistryProcessResult = {
    success: boolean
    jobId: string
    result?: RegistryApiResult
    errorMessage?: string
}

type RegistryProcessStore = {
    jobs: RegistryProcessJob[]
    submitRegistryProcess: (
        params: SubmitRegistryProcessParams,
    ) => Promise<SubmitRegistryProcessResult>
    removeJob: (jobId: string) => void
}

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

const getHeaders = () => {
    const token = getToken()

    return {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        accept: '*/*',
    }
}

const getJobTitle = (type: RegistryProcessType) => {
    return type === 'external'
        ? "Pinfl/Inn bo'yicha reyestr yaratish"
        : 'Reyestr yaratish'
}

const resolveToastId = async (
    key: string | undefined | Promise<string | undefined>,
) => {
    if (typeof key === 'string' || !key) {
        return key
    }

    return (await key) || undefined
}

const pushPendingNotification = async (type: RegistryProcessType) => {
    return resolveToastId(
        toast.push(
            <Notification
                title={`${getJobTitle(type)} davom etmoqda`}
                type="info"
                closable
                duration={0}
            >
                So&apos;rov yuborildi. Jarayon fon rejimida davom etadi.
                Tayyor bo&apos;lgach holati shu yerda ko&apos;rinadi.
            </Notification>,
            {
                placement: PLACEMENT.TOP_END,
            },
        ),
    )
}

const pushSuccessNotification = async (
    type: RegistryProcessType,
    result: RegistryApiResult,
) => {
    return resolveToastId(
        toast.push(
            <Notification
                title={`${getJobTitle(type)} yakunlandi`}
                type="success"
                closable
                duration={0}
            >
                Muvaffaqiyatli: {result.successCount}, xatolik:{' '}
                {result.errorCount}
            </Notification>,
            {
                placement: PLACEMENT.TOP_END,
            },
        ),
    )
}

const pushErrorNotification = async (
    type: RegistryProcessType,
    errorMessage: string,
) => {
    return resolveToastId(
        toast.push(
            <Notification
                title={`${getJobTitle(type)} xatolik bilan tugadi`}
                type="danger"
                closable
                duration={0}
            >
                {errorMessage}
            </Notification>,
            {
                placement: PLACEMENT.TOP_END,
            },
        ),
    )
}

export const useRegistryProcessStore = create<RegistryProcessStore>((set, get) => ({
    jobs: [],

    submitRegistryProcess: async ({
        type,
        payload,
    }) => {
        const jobId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const endpoint =
            type === 'external'
                ? '/registry/process-mails/external'
                : '/registry/process-mails'

        set((state) => ({
            jobs: [
                ...state.jobs,
                {
                    id: jobId,
                    type,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                },
            ],
        }))

        const pendingToastId = await pushPendingNotification(type)

        if (pendingToastId) {
            set((state) => ({
                jobs: state.jobs.map((job) =>
                    job.id === jobId
                        ? {
                              ...job,
                              toastId: pendingToastId,
                          }
                        : job,
                ),
            }))
        }

        try {
            const response = await axios.post(`${BASE_URL}${endpoint}`, payload, {
                headers: getHeaders(),
            })

            if (response.status !== 200) {
                throw {
                    response: {
                        data: {
                            message:
                                response.data?.message ||
                                `Kutilmagan status kod: ${response.status}`,
                        },
                    },
                }
            }

            const result = mapApiResult(response)
            const currentJob = get().jobs.find((job) => job.id === jobId)

            if (currentJob?.toastId) {
                toast.remove(currentJob.toastId)
            }

            set((state) => ({
                jobs: state.jobs.map((job) =>
                    job.id === jobId
                        ? {
                              ...job,
                              status: 'success',
                              result,
                              toastId: undefined,
                          }
                        : job,
                ),
            }))

            await pushSuccessNotification(type, result)

            return {
                success: true,
                jobId,
                result,
            }
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.message || 'Xatolik yuz berdi'
            const currentJob = get().jobs.find((job) => job.id === jobId)

            if (currentJob?.toastId) {
                toast.remove(currentJob.toastId)
            }

            set((state) => ({
                jobs: state.jobs.map((job) =>
                    job.id === jobId
                        ? {
                              ...job,
                              status: 'error',
                              errorMessage,
                              toastId: undefined,
                          }
                        : job,
                ),
            }))

            await pushErrorNotification(type, errorMessage)

            return {
                success: false,
                jobId,
                errorMessage,
            }
        }
    },

    removeJob: (jobId) =>
        set((state) => ({
            jobs: state.jobs.filter((job) => job.id !== jobId),
        })),
}))
