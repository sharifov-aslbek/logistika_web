import { useState, useEffect, useMemo } from 'react'
import { HiOutlinePencilAlt, HiOutlineUserGroup, HiCheck } from 'react-icons/hi'

// UI Components
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Select from '@/components/ui/Select'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'

// Stores
import { useOrganizationStore } from '@/store/organizationStore'
import { useSignerStore } from '@/store/signerStore'
import { useAccountStore } from '@/store/accountStore'

const { Tr, Th, Td, THead, TBody } = Table
const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

const Signers = () => {
    // --- Stores ---
    const {
        organizationBranches,
        fetchMyOrganizationBranches,
        // ✨ Added for Branch Director
        myBranch,
        fetchMyBranch,
        // ✨ Added for Organization context (if needed)
        myOrganizations,
        fetchMyOrganizations,
        isLoading: isOrgLoading,
    } = useOrganizationStore()

    const {
        fetchBranchSigners,
        setBranchSigners,
        isLoading: isSignerLoading,
    } = useSignerStore()

    // Access token from correct path
    const token = useAccountStore((state) => state.user?.token)

    // --- State ---
    const [workersOptions, setWorkersOptions] = useState<any[]>([])
    const [selectedBranch, setSelectedBranch] = useState<any>(null)
    const [modalOpen, setModalOpen] = useState(false)

    // Form State
    const [selectedSignerIds, setSelectedSignerIds] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // --- 1. Load Data (Adaptive for Role) ---
    useEffect(() => {
        // Fetch data for all roles to ensure store is populated
        fetchMyOrganizationBranches() // For Org Directors
        fetchMyBranch() // For Branch Directors
        fetchMyOrganizations() // For Organization Info
        fetchWorkersList()
    }, [])

    // --- 2. Compute Branches to Display ---
    const branchesList = useMemo(() => {
        // 1. If Organization Branches exist (Org Director), show them
        if (organizationBranches && organizationBranches.length > 0) {
            return organizationBranches
        }
        // 2. If MyBranch exists (Branch Director), show it as a list
        if (myBranch) {
            // Check if it's already an array or a single object
            return Array.isArray(myBranch) ? myBranch : [myBranch]
        }
        return []
    }, [organizationBranches, myBranch])

    // --- 3. Helper: Fetch All Workers ---
    const fetchWorkersList = async () => {
        let authToken = token
        if (!authToken) {
            try {
                const storageData = localStorage.getItem('account-storage')
                if (storageData) {
                    const parsedData = JSON.parse(storageData)
                    authToken = parsedData?.state?.user?.token
                }
            } catch (e) {
                console.error(e)
            }
        }

        try {
            const response = await fetch(`${BASE_URL}/user/get-workers`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    Authorization: `Bearer ${authToken}`,
                },
            })
            const data = await response.json()
            if (Array.isArray(data)) {
                const options = data.map((w: any) => ({
                    value: w.id,
                    label: `${w.fullName} (${w.pinfl})`,
                }))
                setWorkersOptions(options)
            }
        } catch (error) {
            console.error('Failed to load workers', error)
        }
    }

    // --- 4. Handlers ---

    const openManageModal = async (branch: any) => {
        setSelectedBranch(branch)
        setModalOpen(true)
        setSelectedSignerIds([])

        const currentSigners = await fetchBranchSigners(branch.id)

        // Extract IDs
        // Handling potentially different response structures (id vs userId)
        const ids = currentSigners.map((s: any) => s.id || s.userId)
        setSelectedSignerIds(ids)
    }

    const handleSave = async () => {
        if (!selectedBranch) return

        setIsSubmitting(true)
        try {
            const success = await setBranchSigners(
                selectedBranch.id,
                selectedSignerIds,
            )

            if (success) {
                toast.push(
                    <Notification type="success" title="Muvaffaqiyatli">
                        Imzolovchilar yangilandi
                    </Notification>,
                )
                setModalOpen(false)
            } else {
                toast.push(
                    <Notification type="danger">
                        Xatolik yuz berdi
                    </Notification>,
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const onSelectChange = (options: any) => {
        const ids = options ? options.map((opt: any) => opt.value) : []
        setSelectedSignerIds(ids)
    }

    return (
        <div className="h-full p-4">
            <Card className="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <HiOutlineUserGroup className="text-indigo-600" />
                        Imzolovchilarni biriktirish
                    </h3>
                </div>

                <Loading loading={isOrgLoading}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Filial Nomi</Th>
                                <Th>Manzil</Th>
                                <Th className="text-right">Amallar</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {branchesList.length > 0 ? (
                                branchesList.map((branch: any) => (
                                    <Tr key={branch.id}>
                                        <Td className="w-[50px]">
                                            {branch.id}
                                        </Td>
                                        <Td>
                                            <span className="font-bold text-gray-700 dark:text-gray-200">
                                                {branch.name}
                                            </span>
                                        </Td>
                                        <Td className="text-sm text-gray-500">
                                            {branch.address || "Manzil yo'q"}
                                        </Td>
                                        <Td className="text-right">
                                            <Button
                                                size="sm"
                                                variant="twoTone"
                                                icon={<HiOutlinePencilAlt />}
                                                onClick={() =>
                                                    openManageModal(branch)
                                                }
                                            >
                                                Imzolovchilar
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td
                                        colSpan={4}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        Filiallar topilmadi
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </Loading>
            </Card>

            {/* --- MODAL --- */}
            <Dialog
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`Imzolovchilar: ${selectedBranch?.name}`}
                width={500}
            >
                <div className="flex flex-col gap-6 mt-4">
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm border border-blue-100">
                        Ushbu filialdan chiqadigan xatlarni kimlar tasdiqlashi
                        kerakligini tanlang.
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Xodimlar ro'yxati
                        </label>
                        {isSignerLoading ? (
                            <div className="py-2 text-center text-gray-400">
                                Yuklanmoqda...
                            </div>
                        ) : (
                            <Select
                                isMulti
                                isClearable={false}
                                placeholder="Xodimlarni tanlang..."
                                options={workersOptions}
                                value={workersOptions.filter((opt) =>
                                    selectedSignerIds.includes(opt.value),
                                )}
                                onChange={onSelectChange}
                            />
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                            Tanlangan xodimlar xatni "Imzolash va Yuborish"
                            huquqiga ega bo'lishadi.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="plain"
                            onClick={() => setModalOpen(false)}
                        >
                            Bekor qilish
                        </Button>
                        <Button
                            variant="solid"
                            icon={<HiCheck />}
                            loading={isSubmitting}
                            onClick={handleSave}
                        >
                            Saqlash
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default Signers
