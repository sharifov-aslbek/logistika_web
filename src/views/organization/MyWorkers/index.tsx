import { useState, useEffect, useMemo } from 'react'
import { useOrganizationStore } from '@/store/organizationStore'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { HiPlus, HiX, HiPencilAlt } from 'react-icons/hi'

// API Base URL
const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://default-api.example.com/api'

// Helper to get Token
const getToken = () => {
    let token = ''
    try {
        const storageData = localStorage.getItem('account-storage')
        if (storageData) {
            const parsedData = JSON.parse(storageData)
            token = parsedData?.state?.user?.token || ''
        }
    } catch (error) {
        console.error('Error parsing token:', error)
    }
    return token
}

const { Tr, Th, Td, THead, TBody } = Table

const MyWorkers = () => {
    // Store for Organization ID
    const { myOrganizations, fetchMyOrganizations } = useOrganizationStore()

    // --- State: Data ---
    const [workers, setWorkers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [branchOptions, setBranchOptions] = useState<
        { label: string; value: number }[]
    >([])

    // --- State: Create Modal ---
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createForm, setCreateForm] = useState({
        pinfl: '',
        phone: '',
        password: '',
        branchPermissionIds: [] as number[], // Array of IDs
    })

    // --- State: Permission Modal ---
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [selectedWorker, setSelectedWorker] = useState<any>(null)
    const [currentWorkerBranches, setCurrentWorkerBranches] = useState<any[]>(
        [],
    )
    const [loadingWorkerBranches, setLoadingWorkerBranches] = useState(false)
    const [selectedBranchToGrant, setSelectedBranchToGrant] = useState<
        number | null
    >(null)
    const [isGranting, setIsGranting] = useState(false)

    // --- Helpers ---
    const getRoleInfo = (roleId: number) => {
        switch (roleId) {
            case 0:
                return {
                    label: 'Foydalanuvchi',
                    class: 'bg-gray-100 text-gray-600',
                }
            case 10:
                return { label: 'Ishchi', class: 'bg-blue-100 text-blue-600' }
            case 20:
                return {
                    label: 'Filial Direktori',
                    class: 'bg-yellow-100 text-yellow-600',
                }
            case 30:
                return {
                    label: 'Tashkilot Direktori',
                    class: 'bg-indigo-100 text-indigo-600',
                }
            case 40:
                return { label: 'Admin', class: 'bg-red-100 text-red-600' }
            case 50:
                return {
                    label: 'Super Admin',
                    class: 'bg-red-100 text-red-600',
                }
            default:
                return { label: "Noma'lum", class: 'bg-gray-100 text-gray-500' }
        }
    }

    // --- Computed for Permissions ---
    const availableBranchesToGrant = useMemo(() => {
        const currentIds = currentWorkerBranches.map((b: any) => b.id)
        return branchOptions.filter(
            (option) => !currentIds.includes(option.value),
        )
    }, [branchOptions, currentWorkerBranches])

    // --- API Calls ---

    const fetchBranches = async () => {
        try {
            const token = getToken()
            const response = await fetch(
                `${BASE_URL}/branch/my-organization-branches`,
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        Authorization: `Bearer ${token}`,
                    },
                },
            )
            if (!response.ok) throw new Error()
            const data = await response.json()
            if (Array.isArray(data)) {
                setBranchOptions(
                    data.map((branch: any) => ({
                        label:
                            branch.name ||
                            branch.fullName ||
                            `Branch ${branch.id}`,
                        value: branch.id,
                    })),
                )
            }
        } catch (error) {
            console.error(error)
        }
    }

    const fetchWorkers = async () => {
        setIsLoading(true)
        try {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/user/get-workers`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true', // Added
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!response.ok) throw new Error()
            const data = await response.json()
            setWorkers(Array.isArray(data) ? data : [])
        } catch (error) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Ishchilarni yuklab bo'lmadi
                </Notification>,
            )
        } finally {
            setIsLoading(false)
        }
    }

    const fetchWorkerBranches = async (workerId: number) => {
        setLoadingWorkerBranches(true)
        setCurrentWorkerBranches([])
        try {
            const token = getToken()
            const response = await fetch(
                `${BASE_URL}/permission/my-worker_branches?workerId=${workerId}`,
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true', // Added
                        Authorization: `Bearer ${token}`,
                    },
                },
            )
            if (!response.ok) throw new Error()
            const data = await response.json()
            setCurrentWorkerBranches(Array.isArray(data) ? data : [])
        } catch (error) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Ruxsatlarni yuklab bo'lmadi
                </Notification>,
            )
        } finally {
            setLoadingWorkerBranches(false)
        }
    }

    // --- Actions ---

    const handleCreateWorker = async () => {
        if (!createForm.pinfl || !createForm.phone || !createForm.password) {
            toast.push(
                <Notification type="warning" title="Diqqat">
                    Barcha maydonlarni to'ldiring
                </Notification>,
            )
            return
        }
        if (createForm.branchPermissionIds.length === 0) {
            toast.push(
                <Notification type="warning" title="Diqqat">
                    Kamida bitta filial tanlang
                </Notification>,
            )
            return
        }

        const myOrg = myOrganizations?.[0]
        if (!myOrg?.id) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Tashkilot ma'lumotlari topilmadi
                </Notification>,
            )
            return
        }

        setIsSubmitting(true)
        try {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/user/create-worker`, {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true', // Added
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...createForm,
                    organizationId: myOrg.id,
                }),
            })
            if (!response.ok) throw new Error()

            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Ishchi yaratildi!
                </Notification>,
            )
            setShowCreateModal(false)
            fetchWorkers()
            // Reset form
            setCreateForm({
                pinfl: '',
                phone: '',
                password: '',
                branchPermissionIds: [],
            })
        } catch (error: any) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Yaratishda xatolik yuz berdi
                </Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGrantAccess = async () => {
        if (!selectedBranchToGrant || !selectedWorker) return
        setIsGranting(true)
        try {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/permission/org/grant`, {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true', // Added
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    workerId: selectedWorker.id,
                    branchId: selectedBranchToGrant,
                }),
            })
            if (!response.ok) throw new Error()
            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Ruxsat berildi
                </Notification>,
            )
            setSelectedBranchToGrant(null)
            await fetchWorkerBranches(selectedWorker.id)
        } catch (error: any) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Ruxsat berishda xatolik
                </Notification>,
            )
        } finally {
            setIsGranting(false)
        }
    }

    const handleRevokeAccess = async (branchId: number) => {
        if (!selectedWorker) return
        try {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/permission/org/revoke`, {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true', // Added
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    workerId: selectedWorker.id,
                    branchId: branchId,
                }),
            })
            if (!response.ok) throw new Error()
            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Ruxsat bekor qilindi
                </Notification>,
            )
            await fetchWorkerBranches(selectedWorker.id)
        } catch (error: any) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Bekor qilishda xatolik
                </Notification>,
            )
        }
    }

    const openPermissionModal = (row: any) => {
        setSelectedWorker(row)
        setSelectedBranchToGrant(null)
        setShowPermissionModal(true)
        fetchWorkerBranches(row.id)
    }

    // --- Lifecycle ---
    useEffect(() => {
        fetchBranches()
        fetchWorkers()
        fetchMyOrganizations() // Ensure we have org data
    }, [])

    return (
        <div className="h-full">
            <Card className="h-full" bodyClass="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Mening ishchilarim
                    </h3>
                    <Button
                        variant="solid"
                        onClick={() => setShowCreateModal(true)}
                        icon={<HiPlus />}
                    >
                        Ishchi yaratish
                    </Button>
                </div>

                <Loading loading={isLoading}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Ism</Th>
                                <Th>Telefon</Th>
                                <Th>JSHSHIR</Th>
                                <Th>Rol</Th>
                                <Th>Holat</Th>
                                <Th>Ruxsatlar</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {workers.length > 0 ? (
                                workers.map((worker) => {
                                    const roleInfo = getRoleInfo(worker.role)
                                    return (
                                        <Tr key={worker.id}>
                                            <Td>
                                                <span className="font-medium">
                                                    {worker.fullName}
                                                </span>
                                            </Td>
                                            <Td>
                                                {worker.phone || (
                                                    <span className="text-gray-400 italic">
                                                        Telefon yo'q
                                                    </span>
                                                )}
                                            </Td>
                                            <Td>
                                                <span className="font-mono">
                                                    {worker.pinfl}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${roleInfo.class}`}
                                                >
                                                    {roleInfo.label}
                                                </span>
                                            </Td>
                                            <Td>
                                                <Tag
                                                    className={
                                                        worker.isActive
                                                            ? 'text-green-600 bg-green-100'
                                                            : 'text-red-600 bg-red-100'
                                                    }
                                                >
                                                    {worker.isActive
                                                        ? 'Faol'
                                                        : 'Faol emas'}
                                                </Tag>
                                            </Td>
                                            <Td>
                                                <Button
                                                    size="sm"
                                                    variant="twoTone"
                                                    icon={<HiPencilAlt />}
                                                    onClick={() =>
                                                        openPermissionModal(
                                                            worker,
                                                        )
                                                    }
                                                >
                                                    Boshqarish
                                                </Button>
                                            </Td>
                                        </Tr>
                                    )
                                })
                            ) : (
                                <Tr>
                                    <Td
                                        colSpan={6}
                                        className="text-center py-10 text-gray-500"
                                    >
                                        Ma'lumotlar topilmadi
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </Loading>
            </Card>

            {/* --- CREATE WORKER MODAL --- */}
            <Dialog
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <div className="p-6 min-w-[500px]">
                    <h4 className="text-lg font-bold mb-6">
                        Yangi ishchi yaratish
                    </h4>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                JSHSHIR (PINFL)
                            </label>
                            <Input
                                placeholder="masalan: 51402056610143"
                                value={createForm.pinfl}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        pinfl: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Telefon
                            </label>
                            <Input
                                placeholder="masalan: 998903319822"
                                value={createForm.phone}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        phone: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Parol
                            </label>
                            <Input
                                type="password"
                                placeholder="Parol"
                                value={createForm.password}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        password: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Filiallar
                            </label>
                            {/* Assuming Select component handles multiple. If not, standard select multiple */}
                            <Select
                                isMulti
                                placeholder="Filiallarni tanlang"
                                options={branchOptions}
                                value={branchOptions.filter((opt) =>
                                    createForm.branchPermissionIds.includes(
                                        opt.value,
                                    ),
                                )}
                                onChange={(selected: any) => {
                                    setCreateForm({
                                        ...createForm,
                                        branchPermissionIds: selected
                                            ? selected.map((s: any) => s.value)
                                            : [],
                                    })
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-8">
                        <Button onClick={() => setShowCreateModal(false)}>
                            Bekor qilish
                        </Button>
                        <Button
                            variant="solid"
                            loading={isSubmitting}
                            onClick={handleCreateWorker}
                        >
                            Yaratish
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* --- MANAGE PERMISSIONS MODAL --- */}
            <Dialog
                isOpen={showPermissionModal}
                onClose={() => setShowPermissionModal(false)}
                onRequestClose={() => setShowPermissionModal(false)}
            >
                <div className="p-6 min-w-[500px]">
                    <h4 className="text-lg font-bold mb-2">
                        Filialga kirishni boshqarish
                    </h4>

                    <div className="mb-6">
                        <p className="text-gray-500 mb-2">
                            Ishchi:{' '}
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                {selectedWorker?.fullName}
                            </span>
                        </p>

                        <h5 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">
                            Joriy faol filiallar:
                        </h5>
                        {loadingWorkerBranches ? (
                            <div className="text-sm text-gray-400">
                                Yuklanmoqda...
                            </div>
                        ) : currentWorkerBranches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {currentWorkerBranches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-sm"
                                    >
                                        <span>{branch.name}</span>
                                        <button
                                            onClick={() =>
                                                handleRevokeAccess(branch.id)
                                            }
                                            className="hover:text-red-600 ml-1"
                                            title="O'chirish"
                                        >
                                            <HiX />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 italic">
                                Faol filiallar topilmadi.
                            </div>
                        )}
                    </div>

                    <hr className="my-4 border-gray-200" />

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Yangi filialga ruxsat berish
                        </label>
                        <Select
                            placeholder="Qo'shish uchun filialni tanlang"
                            options={availableBranchesToGrant}
                            value={availableBranchesToGrant.find(
                                (opt) => opt.value === selectedBranchToGrant,
                            )}
                            onChange={(opt: any) =>
                                setSelectedBranchToGrant(opt ? opt.value : null)
                            }
                            isDisabled={availableBranchesToGrant.length === 0}
                        />
                        {availableBranchesToGrant.length === 0 &&
                            !loadingWorkerBranches && (
                                <div className="text-xs text-green-600 mt-1">
                                    Bu ishchi barcha filiallarga ruxsatga ega.
                                </div>
                            )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setShowPermissionModal(false)}>
                            Yopish
                        </Button>
                        <Button
                            variant="solid"
                            color="green-600"
                            loading={isGranting}
                            disabled={!selectedBranchToGrant}
                            onClick={handleGrantAccess}
                        >
                            Ruxsat berish
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default MyWorkers
