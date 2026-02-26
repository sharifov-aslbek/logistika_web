import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlinePaperAirplane,
    HiOutlinePencil,
    HiOutlineDownload,
    HiCheckCircle,
    HiXCircle,
} from 'react-icons/hi'

// --- Table Imports ---
import Table from '@/components/ui/Table'
const { Tr, Th, Td, THead, TBody } = Table

// --- UI Components ---
import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Tooltip from '@/components/ui/Tooltip'

// --- Logic & Store ---
import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'
import { useEImzoStore } from '@/store/eImzoStore'

// --- Custom Components ---
import MissingSign from '../../components/shared/missingsign'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- Helper: Status Tag ---
const StatusTag = ({ row }: { row: any }) => {
    return (
        <Tag className="bg-amber-100 text-amber-600 border-0 rounded-full">
            Qoralama
        </Tag>
    )
}

const MailList = () => {
    const navigate = useNavigate()

    // --- Stores ---
    // Find the store section (around line 60-70) and replace with:
    const { mails, isLoading, getAllMails, exportExcel } = useMailStore()

// Corrected selectors for the E-IMZO store
    const loadKey = useEImzoStore((state) => state.loadKey)
    const createPkcs7 = useEImzoStore((state) => state.createPkcs7)

    // --- FIXED TOKEN RETRIEVAL ---
    const token = useAccountStore((state: any) => state.user?.token) ||
        (() => {
            try {
                return JSON.parse(localStorage.getItem('account-storage') || '{}')?.state?.user?.token
            } catch { return null }
        })()


    // --- State ---
    const [filterSender, setFilterSender] = useState('')
    const [filterDate, setFilterDate] = useState<Date | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    // --- Selection State ---
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // --- Send Modal States ---
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [mailToSend, setMailToSend] = useState<any>(null)
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isSending, setIsSending] = useState(false)

    // --- Bulk Result Modal ---
    const [bulkModalOpen, setBulkModalOpen] = useState(false)
    const [bulkResults, setBulkResults] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        isComplete: false,
    })

    // --- Helpers ---
    const getHeaders = () => {
        if (!token) console.warn("Token not found in storage!")

        return {
            Authorization: `Bearer ${token}`,
            accept: '*/*',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        }
    }

    const formatDate = (date: Date | null) => {
        return date ? dayjs(date).format('YYYY-MM-DD') : undefined
    }

    // --- 1. Fetch Data ---
    const fetchData = async () => {
        const dateStr = formatDate(filterDate)
        await getAllMails({
            startDate: dateStr,
            endDate: dateStr,
            isSend: false,
        })
        setSelectedIds([])
    }

    useEffect(() => {
        fetchData()
    }, [filterDate])

    // --- 2. Filter Logic ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            if (filterSender && !item.receiverName.toLowerCase().includes(filterSender.toLowerCase())) {
                return false
            }
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return item.uid?.toLowerCase().includes(query) || item.receiverName?.toLowerCase().includes(query)
            }
            return true
        })
    }, [mails, filterSender, searchQuery])

    // --- 3. Selection Handlers ---
    const isAllSelected = filteredMails.length > 0 && selectedIds.length === filteredMails.length

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredMails.map((m: any) => m.uid))
        }
    }

    const handleSelectRow = (uid: string) => {
        setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
    }

    // --- 4. Export ---
    const handleExportExcel = async () => {
        setIsExporting(true)
        try {
            const dateStr = formatDate(filterDate)
            const blob = await exportExcel({ startDate: dateStr, endDate: dateStr, isSend: false })
            if (blob) {
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `TezDoc_Qoralamalar.xlsx`
                document.body.appendChild(link)
                link.click()
                link.remove()
                toast.push(<Notification type="success">Excel yuklandi</Notification>)
            }
        } catch (error) {
            toast.push(<Notification type="danger">Xatolik</Notification>)
        } finally {
            setIsExporting(false)
        }
    }

    // --- 5. Modal Triggers ---
    const handleSingleSendClick = (row: any) => {
        setMailToSend(row)
        setSelectedCert(null)
        setSendModalOpen(true)
    }

    const handleBulkSendClick = () => {
        setMailToSend(null)
        setSelectedCert(null)
        setSendModalOpen(true)
    }

    // --- 6. CORE LOGIC: Fetch Hash -> Sign -> Send ---

    // Process a single mail document
    const processSingleDocument = async (uid: string, keyId: string) => {
        try {
            const hashRes = await axios.get(`${BASE_URL}/mail/hash/${uid}`, { headers: getHeaders() })
            const hash = hashRes.data.hash

            if (!hash) throw new Error("Hash topilmadi")

            // Calls the function we got from useEImzoStore
            const signature = await createPkcs7(keyId, hash)

            if (!signature) throw new Error("Imzolab bo'lmadi")

            await axios.post(
                `${BASE_URL}/mail/sign/${uid}`,
                { signature },
                { headers: getHeaders() }
            )

            return true
        } catch (error) {
            console.error(`Error processing UID ${uid}:`, error)
            return false
        }
    }

    const confirmSend = async () => {
        if (!selectedCert) {
            toast.push(<Notification type="warning">Kalit tanlanmadi</Notification>)
            return
        }

        setIsSending(true)

        try {
            // This line triggers the E-IMZO password prompt
            // Make sure it calls 'loadKey' exactly as defined in the store
            const keyId = await loadKey(selectedCert)

            if (mailToSend) {
                // --- Single Mode ---
                const success = await processSingleDocument(mailToSend.uid, keyId)
                if (success) {
                    toast.push(<Notification type="success">Hujjat imzolandi va yuborildi</Notification>)
                    setSendModalOpen(false)
                    fetchData()
                } else {
                    toast.push(<Notification type="danger">Xatolik yuz berdi</Notification>)
                }
            } else {
                // --- Bulk Mode ---
                setSendModalOpen(false)
                startBulkProcessing(keyId)
            }
        } catch (error: any) {
            toast.push(<Notification type="danger">Xatolik: {error.message || 'Imzolashda xatolik'}</Notification>)
        } finally {
            setIsSending(false)
        }
    }

    const startBulkProcessing = async (activeKeyId: string) => {
        setBulkModalOpen(true)
        setBulkResults({
            total: selectedIds.length,
            processed: 0,
            success: 0,
            failed: 0,
            isComplete: false,
        })

        let sCount = 0
        let fCount = 0

        // Loop through selected items sequentially
        for (let i = 0; i < selectedIds.length; i++) {
            const uid = selectedIds[i]
            const success = await processSingleDocument(uid, activeKeyId)

            if (success) sCount++
            else fCount++

            setBulkResults((prev) => ({
                ...prev,
                processed: i + 1,
                success: sCount,
                failed: fCount,
            }))
        }

        setBulkResults((prev) => ({ ...prev, isComplete: true }))
        fetchData()
    }

    return (
        <div className="p-4">
            <Card className="mb-4 border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Sana</label>
                            <DatePicker value={filterDate} onChange={setFilterDate} size="sm" placeholder="Sanani tanlang" />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Qabul qiluvchi</label>
                            <Input prefix={<HiOutlineFilter />} value={filterSender} onChange={(e) => setFilterSender(e.target.value)} size="sm" placeholder="Ism bo'yicha" />
                        </div>
                        <div className="w-full sm:w-64">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Qidirish</label>
                            <Input prefix={<HiOutlineSearch />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} size="sm" placeholder="ID bo'yicha..." />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button variant="solid" color="emerald-600" size="sm" icon={<HiOutlinePaperAirplane className="rotate-90" />} onClick={handleBulkSendClick} className="animate-fade-in">
                                Tanlanganlarni yuborish ({selectedIds.length})
                            </Button>
                        )}
                        <Button variant="twoTone" color="blue-600" size="sm" icon={<HiOutlineDownload />} loading={isExporting} onClick={handleExportExcel}>Excel</Button>
                        <Button variant="solid" size="sm" icon={<HiOutlinePlus />} onClick={() => navigate('/mail/create-pdf')}>Yangi hujjat</Button>
                        <Button variant="solid" size="sm" icon={<HiOutlinePlus />} onClick={() => navigate('/mail/create-registry')}>Yangi reyestr</Button>
                    </div>
                </div>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th className="w-[50px] text-center">
                                <input type="checkbox" className="cursor-pointer h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={isAllSelected} onChange={handleSelectAll} />
                            </Th>
                            <Th>ID</Th>
                            <Th>Qabul qiluvchi</Th>
                            <Th>Manzil</Th>
                            <Th>Sana</Th>
                            <Th>Holat</Th>
                            <Th>Amallar</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {isLoading ? (
                            <Tr>
                                <Td colSpan={7} className="text-center py-10"><Spinner size="40px" /></Td>
                            </Tr>
                        ) : filteredMails.length === 0 ? (
                            <Tr>
                                <Td colSpan={7} className="text-center py-6 text-gray-500">Ma'lumot topilmadi</Td>
                            </Tr>
                        ) : (
                            filteredMails.map((row: any) => (
                                <Tr key={row.uid} className={selectedIds.includes(row.uid) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                                    <Td className="text-center">
                                        <input type="checkbox" className="cursor-pointer h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={selectedIds.includes(row.uid)} onChange={() => handleSelectRow(row.uid)} />
                                    </Td>
                                    <Td className="font-mono text-xs w-[120px]">{row.uid}</Td>
                                    <Td>{row.receiverName}</Td>
                                    <Td className="text-xs">{row.receiverAddress}</Td>
                                    <Td className="text-xs">{dayjs(row.createdAt).format('DD.MM.YYYY')}</Td>
                                    <Td><StatusTag row={row} /></Td>
                                    <Td>
                                        <div className="flex gap-2">
                                            <Tooltip title="Yuborish">
                                                <Button size="xs" variant="twoTone" color="emerald-500" icon={<HiOutlinePaperAirplane className="rotate-90" />} onClick={() => handleSingleSendClick(row)} />
                                            </Tooltip>
                                            <Tooltip title="Tahrirlash">
                                                <Button size="xs" variant="twoTone" icon={<HiOutlinePencil />} onClick={() => navigate(`/mail/edit/${row.uid}`)} />
                                            </Tooltip>
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            {/* --- Signature Dialog --- */}
            <Dialog isOpen={sendModalOpen} onClose={() => setSendModalOpen(false)} title={mailToSend ? 'Hujjatni yuborish' : `Tanlanganlarni yuborish (${selectedIds.length})`} width={500}>
                <div className="flex flex-col gap-6 pt-4">
                    <p className="text-gray-600">
                        {mailToSend ? `Qabul qiluvchi: ${mailToSend.receiverName}` : `Jami tanlangan hujjatlar: ${selectedIds.length} ta`}
                    </p>
                    <MissingSign onSignClicked={setSelectedCert} disabled={isSending} />
                    <Button block variant="solid" size="lg" loading={isSending} disabled={!selectedCert} onClick={confirmSend}>
                        {mailToSend ? 'Yuborish' : 'Barchasini Yuborish'}
                    </Button>
                </div>
            </Dialog>

            {/* --- Bulk Process Result Dialog --- */}
            <Dialog isOpen={bulkModalOpen} onClose={() => bulkResults.isComplete && setBulkModalOpen(false)} title="Yuborish jarayoni" width={500} closable={bulkResults.isComplete}>
                <div className="flex flex-col gap-4 py-4 items-center text-center">
                    {!bulkResults.isComplete ? (
                        <div className="flex flex-col items-center">
                            <Spinner size="40px" className="mb-4" />
                            <h4 className="text-lg font-bold text-gray-700">Yuborilmoqda...</h4>
                            <p className="text-gray-500">{bulkResults.processed} / {bulkResults.total}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <div className="mb-4 text-emerald-500 text-5xl"><HiCheckCircle /></div>
                            <h4 className="text-xl font-bold mb-6">Jarayon yakunlandi</h4>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">{bulkResults.success}</div>
                                    <div className="text-sm text-green-700">Muvaffaqiyatli</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="text-2xl font-bold text-red-600">{bulkResults.failed}</div>
                                    <div className="text-sm text-red-700">Yuborilmadi</div>
                                </div>
                            </div>
                            <Button className="mt-6 w-full" variant="solid" onClick={() => { setBulkModalOpen(false); setSelectedIds([]) }}>Yopish</Button>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}

export default MailList