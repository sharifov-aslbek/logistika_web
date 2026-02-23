import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { HiCheck } from 'react-icons/hi'

// API Base URL
const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://default-api.example.com/api'

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

const UnhandledWorkers = () => {
    // --- State ---
    const [workers, setWorkers] = useState<any[]>([])
    const [isLoadingTable, setIsLoadingTable] = useState(false)

    // --- Activate Modal State ---
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
    const [isActivating, setIsActivating] = useState(false)
    const [targetUserId, setTargetUserId] = useState<number | null>(null)
    const [activateForm, setActivateForm] = useState({
        phone: '',
        password: '',
    })

    // --- API: Fetch Pending Users ---
    const fetchPendingUsers = async () => {
        setIsLoadingTable(true)
        try {
            const token = getToken()
            const response = await fetch(
                `${BASE_URL}/user/pending-activation`,
                {
                    method: 'GET',
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        accept: '*/*',
                        Authorization: `Bearer ${token}`,
                    },
                },
            )
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
            setIsLoadingTable(false)
        }
    }

    // --- API: Activate User ---
    const handleActivateUser = async () => {
        if (!activateForm.phone || !activateForm.password) {
            toast.push(
                <Notification type="warning" title="Ogohlantirish">
                    Telefon va parol kiritilishi shart
                </Notification>,
            )
            return
        }
        if (!targetUserId) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Foydalanuvchi ID topilmadi
                </Notification>,
            )
            return
        }

        setIsActivating(true)
        try {
            const token = getToken()
            const response = await fetch(
                `${BASE_URL}/user/${targetUserId}/activate`,
                {
                    method: 'PATCH',
                    headers: {
                        accept: '*/*',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(activateForm),
                },
            )
            if (!response.ok) throw new Error()

            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Foydalanuvchi muvaffaqiyatli faollashtirildi!
                </Notification>,
            )

            setIsActivateModalOpen(false)
            fetchPendingUsers() // Refresh list
        } catch (error: any) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Faollashtirishda xatolik: {error.message || ''}
                </Notification>,
            )
        } finally {
            setIsActivating(false)
        }
    }

    // --- Handlers ---
    const openActivateModal = (row: any) => {
        setTargetUserId(row.id)
        setActivateForm({
            phone: row.phone || '',
            password: '',
        })
        setIsActivateModalOpen(true)
    }

    useEffect(() => {
        fetchPendingUsers()
    }, [])

    return (
        <div className="h-full">
            <Card className="h-full" bodyClass="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Biriktirilmagan ishchilar
                    </h3>
                </div>

                <Loading loading={isLoadingTable}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Ism</Th>
                                <Th>JSHSHIR</Th>
                                <Th>Telefon</Th>
                                <Th>Amallar</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {workers.length > 0 ? (
                                workers.map((worker) => (
                                    <Tr key={worker.id}>
                                        <Td>
                                            <span className="font-mono text-gray-500">
                                                {worker.id}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {worker.fullName}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="font-mono">
                                                {worker.pinfl}
                                            </span>
                                        </Td>
                                        <Td>
                                            {worker.phone ? (
                                                worker.phone
                                            ) : (
                                                <span className="text-gray-400 italic">
                                                    Telefon yo'q
                                                </span>
                                            )}
                                        </Td>
                                        <Td>
                                            <Button
                                                size="sm"
                                                variant="solid"
                                                color="green-600"
                                                icon={<HiCheck />}
                                                onClick={() =>
                                                    openActivateModal(worker)
                                                }
                                            >
                                                Faollashtirish
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td
                                        colSpan={5}
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

            {/* --- ACTIVATE MODAL --- */}
            <Dialog
                isOpen={isActivateModalOpen}
                onClose={() => setIsActivateModalOpen(false)}
                onRequestClose={() => setIsActivateModalOpen(false)}
            >
                <div className="p-6 min-w-[400px]">
                    <h4 className="text-lg font-bold mb-4">
                        Ishchini faollashtirish
                    </h4>

                    <p className="mb-4 text-gray-500">
                        Faollashtirilayotgan foydalanuvchi ID:{' '}
                        <span className="font-bold text-gray-700">
                            {targetUserId}
                        </span>
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">
                            Telefon
                        </label>
                        <Input
                            placeholder="masalan: 998901234567"
                            value={activateForm.phone}
                            onChange={(e) =>
                                setActivateForm({
                                    ...activateForm,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Parol
                        </label>
                        <Input
                            type="password"
                            placeholder="Yangi parol o'rnating"
                            value={activateForm.password}
                            onChange={(e) =>
                                setActivateForm({
                                    ...activateForm,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setIsActivateModalOpen(false)}>
                            Bekor qilish
                        </Button>
                        <Button
                            variant="solid"
                            loading={isActivating}
                            onClick={handleActivateUser}
                        >
                            Faollashtirish
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default UnhandledWorkers
