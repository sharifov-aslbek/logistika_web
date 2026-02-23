import { useState, useEffect } from 'react'
import { useOrganizationStore } from '@/store/organizationStore'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { HiPlus, HiPencilAlt } from 'react-icons/hi'

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

const BranchWorkers = () => {
    // 1. Get Branch Data from Store
    // We reuse the fetchMyBranch action we created earlier.
    // myBranch is an array, so we take the first item.
    const { myBranch, fetchMyBranch } = useOrganizationStore()
    const currentBranch = myBranch?.[0] || null

    // --- State ---
    const [workers, setWorkers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // --- Create Modal State ---
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createForm, setCreateForm] = useState({
        pinfl: '',
        phone: '',
        password: '',
    })

    // --- Permission Modal State ---
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [selectedWorker, setSelectedWorker] = useState<any>(null)
    const [isPermissionActionLoading, setIsPermissionActionLoading] =
        useState(false)

    // --- API: Fetch Workers ---
    const fetchWorkers = async () => {
        setIsLoading(true)
        try {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/user/get-workers`, {
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) throw new Error()
            const data = await response.json()
            setWorkers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Ishchilarni yuklab bo'lmadi
                </Notification>,
            )
        } finally {
            setIsLoading(false)
        }
    }

    // --- API: Create Worker ---
    const handleCreateWorker = async () => {
        if (!createForm.pinfl || !createForm.phone || !createForm.password) {
            toast.push(
                <Notification type="warning" title="Diqqat">
                    Barcha maydonlarni to'ldiring
                </Notification>,
            )
            return
        }

        if (!currentBranch) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Filial ma'lumotlari topilmadi. Sahifani yangilang.
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
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    pinfl: createForm.pinfl,
                    phone: createForm.phone,
                    password: createForm.password,
                    // Auto-assign to current branch and org
                    branchPermissionIds: [currentBranch.id],
                    organizationId: currentBranch.organizationId,
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
            setCreateForm({ pinfl: '', phone: '', password: '' })
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

    // --- API: Manage Permissions (Grant/Revoke) ---
    const handleBranchPermission = async (action: 'grant' | 'revoke') => {
        if (!selectedWorker || !currentBranch) return

        setIsPermissionActionLoading(true)
        try {
            const token = getToken()
            // Endpoint specific for Branch Director
            const endpoint =
                action === 'grant'
                    ? '/permission/branch/grant'
                    : '/permission/branch/revoke'

            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    workerId: selectedWorker.id,
                    branchId: currentBranch.id,
                }),
            })

            if (!response.ok) throw new Error()

            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    {action === 'grant'
                        ? 'Ruxsat berildi'
                        : 'Ruxsat bekor qilindi'}
                </Notification>,
            )
            setShowPermissionModal(false)
            fetchWorkers()
        } catch (error: any) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Amaliyotda xatolik yuz berdi
                </Notification>,
            )
        } finally {
            setIsPermissionActionLoading(false)
        }
    }

    const openPermissionModal = (row: any) => {
        setSelectedWorker(row)
        setShowPermissionModal(true)
    }

    // --- Helper: Role Info ---
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

    // --- Lifecycle ---
    useEffect(() => {
        fetchMyBranch() // Load branch info
        fetchWorkers() // Load workers
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
                                <Th>Amallar</Th>
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

            {/* --- CREATE MODAL --- */}
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

                        {/* Branch Info Display */}
                        {currentBranch && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                                Quyidagi filial uchun yaratilmoqda:{' '}
                                <span className="font-bold text-gray-800">
                                    {currentBranch.name}
                                </span>{' '}
                                (ID: {currentBranch.id})
                            </div>
                        )}
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

            {/* --- PERMISSION MODAL --- */}
            <Dialog
                isOpen={showPermissionModal}
                onClose={() => setShowPermissionModal(false)}
                onRequestClose={() => setShowPermissionModal(false)}
            >
                <div className="p-6 min-w-[500px]">
                    <h4 className="text-lg font-bold mb-4">
                        Filialga kirishni boshqarish
                    </h4>

                    <div className="mb-6">
                        <p className="text-gray-500 mb-4">
                            Ishchi:{' '}
                            <span className="font-bold text-gray-800 dark:text-white">
                                {selectedWorker?.fullName}
                            </span>
                        </p>

                        {currentBranch ? (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    Joriy filial doirasi:
                                </p>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-lg text-gray-800 dark:text-white">
                                        {currentBranch.name}
                                    </span>
                                    <Tag className="bg-white border text-xs">
                                        ID: {currentBranch.id}
                                    </Tag>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Filial direktori sifatida siz faqat ushbu
                                    filial uchun ruxsatlarni boshqarishingiz
                                    mumkin.
                                </p>
                            </div>
                        ) : (
                            <div className="text-red-500 text-sm">
                                Xatolik: Filial ma'lumotlari yuklanmadi.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                        <Button onClick={() => setShowPermissionModal(false)}>
                            Yopish
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                variant="plain"
                                color="red-600"
                                className="text-red-600 hover:bg-red-50"
                                loading={isPermissionActionLoading}
                                onClick={() => handleBranchPermission('revoke')}
                            >
                                Ruxsatni bekor qilish
                            </Button>

                            <Button
                                variant="solid"
                                color="green-600"
                                loading={isPermissionActionLoading}
                                onClick={() => handleBranchPermission('grant')}
                            >
                                Ruxsat berish
                            </Button>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default BranchWorkers
