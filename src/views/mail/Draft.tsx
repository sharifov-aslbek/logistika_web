import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlinePaperAirplane, // Send Icon
    HiOutlinePencil, // Edit Icon
    HiOutlineDownload, // Excel Icon
} from 'react-icons/hi'
// ❌ REMOVED: import * as XLSX from 'xlsx'

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
    // ✨ ADDED: exportExcel
    const { mails, isLoading, getAllMails, sendMail, exportExcel } =
        useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)
    const { activateAndSign } = useEImzoStore()

    // --- State ---
    const [filterSender, setFilterSender] = useState('')
    const [filterDate, setFilterDate] = useState<Date | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // ✨ ADDED: Export loading state
    const [isExporting, setIsExporting] = useState(false)

    // --- Modal States ---
    const [pdfModalOpen, setPdfModalOpen] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [pdfTitle, setPdfTitle] = useState('')
    const [isPdfLoading, setIsPdfLoading] = useState(false)

    // Send Modal
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [mailToSend, setMailToSend] = useState<any>(null)
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isSending, setIsSending] = useState(false)

    // --- Helpers ---
    const getHeaders = () => ({
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
        accept: '*/*',
    })

    const formatDate = (date: Date | null) => {
        return date ? dayjs(date).format('YYYY-MM-DD') : undefined
    }

    // --- 1. ✨ API Excel Export (Drafts) ---
    const handleExportExcel = async () => {
        setIsExporting(true)
        try {
            const dateStr = formatDate(filterDate)

            // Call the store action
            const blob = await exportExcel({
                startDate: dateStr,
                endDate: dateStr,
                isSend: false, // 🔒 FORCED: Always false for Drafts page
                // Note: Client-side text search (filterSender/searchQuery)
                // is usually not supported by simple API exports unless
                // the API has a 'search' param. We send what we can.
            })

            if (blob) {
                // Create download link
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `TezDoc_Qoralamalar_${dayjs().format('DD_MM_YYYY_HH_mm')}.xlsx`
                document.body.appendChild(link)
                link.click()

                // Cleanup
                link.remove()
                window.URL.revokeObjectURL(url)

                toast.push(
                    <Notification type="success">
                        Excel fayl muvaffaqiyatli yuklandi
                    </Notification>,
                )
            } else {
                toast.push(
                    <Notification type="warning">
                        Faylni yuklab bo'lmadi
                    </Notification>,
                )
            }
        } catch (error) {
            console.error(error)
            toast.push(
                <Notification type="danger">
                    Excel yuklashda xatolik
                </Notification>,
            )
        } finally {
            setIsExporting(false)
        }
    }

    // --- 2. Fetch Data (Drafts Only) ---
    const fetchData = async () => {
        const dateStr = formatDate(filterDate)
        await getAllMails({
            startDate: dateStr,
            endDate: dateStr,
            isSend: false, // Only Drafts
        })
    }

    useEffect(() => {
        fetchData()
    }, [filterDate])

    // --- 3. Filter Logic ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            if (
                filterSender &&
                !item.receiverName
                    .toLowerCase()
                    .includes(filterSender.toLowerCase())
            ) {
                return false
            }
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const titleMatch = item.uid?.toLowerCase().includes(query)
                const receiverMatch = item.receiverName
                    ?.toLowerCase()
                    .includes(query)
                if (!titleMatch && !receiverMatch) return false
            }
            return true
        })
    }, [mails, filterSender, searchQuery])

    // --- 4. Actions ---
    const openPdfViewer = async (row: any) => {
        setPdfTitle(`Hujjat: ${row.uid} - ${row.receiverName}`)
        setPdfModalOpen(true)
        setIsPdfLoading(true)
        setPdfUrl('')

        try {
            const mailId = row.id || 1
            const url = `${BASE_URL}/mail/${mailId}/download?uid=${row.uid}`

            const response = await axios.get(url, {
                responseType: 'blob',
                headers: getHeaders(),
            })
            const blob = new Blob([response.data], { type: 'application/pdf' })
            setPdfUrl(window.URL.createObjectURL(blob))
        } catch (error) {
            toast.push(
                <Notification type="danger">
                    PDF faylni yuklab bo'lmadi.
                </Notification>,
            )
            setPdfModalOpen(false)
        } finally {
            setIsPdfLoading(false)
        }
    }

    const handleSendClick = (row: any) => {
        setMailToSend(row)
        setSelectedCert(null)
        setSendModalOpen(true)
    }

    const confirmSend = async () => {
        if (!mailToSend) return
        if (!selectedCert) {
            toast.push(
                <Notification type="warning">
                    Iltimos, E-IMZO kalitini tanlang!
                </Notification>,
            )
            return
        }

        setIsSending(true)

        try {
            // NOTE: Ideally, fetch this hash from backend instead of hardcoding
            const hashData =
                'b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c'
            const signature = await activateAndSign(selectedCert, hashData)
            console.log('✅ Signature Generated:', signature)

            const success = await sendMail(mailToSend.uid)

            if (success) {
                toast.push(
                    <Notification type="success">
                        Muvaffaqiyatli yuborildi
                    </Notification>,
                )
                setSendModalOpen(false)
                fetchData()
            } else {
                toast.push(
                    <Notification type="danger">
                        Yuborishda xatolik
                    </Notification>,
                )
            }
        } catch (error: any) {
            toast.push(
                <Notification type="danger">
                    Xatolik: {error.message}
                </Notification>,
            )
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="p-4">
            <Card className="mb-4 border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Sana
                            </label>
                            <DatePicker
                                value={filterDate}
                                onChange={setFilterDate}
                                size="sm"
                                placeholder="Sanani tanlang"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Qabul qiluvchi
                            </label>
                            <Input
                                prefix={<HiOutlineFilter />}
                                value={filterSender}
                                onChange={(e) =>
                                    setFilterSender(e.target.value)
                                }
                                size="sm"
                                placeholder="Ism bo'yicha"
                            />
                        </div>
                        <div className="w-full sm:w-64">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Qidirish
                            </label>
                            <Input
                                prefix={<HiOutlineSearch />}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                size="sm"
                                placeholder="ID bo'yicha..."
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* ✨ UPDATED: Export Button */}
                        <Button
                            variant="twoTone"
                            color="emerald-600"
                            size="sm"
                            icon={<HiOutlineDownload />}
                            loading={isExporting}
                            onClick={handleExportExcel}
                        >
                            Excel
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            icon={<HiOutlinePlus />}
                            onClick={() => navigate('/mail/create-pdf')}
                        >
                            Yangi hujjat
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            icon={<HiOutlinePlus />}
                            onClick={() => navigate('/mail/create-registry')}
                        >
                            Yangi reyestr
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
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
                                <Td colSpan={6} className="text-center py-10">
                                    <Spinner size="40px" />
                                </Td>
                            </Tr>
                        ) : filteredMails.length === 0 ? (
                            <Tr>
                                <Td
                                    colSpan={6}
                                    className="text-center py-6 text-gray-500"
                                >
                                    Ma'lumot topilmadi
                                </Td>
                            </Tr>
                        ) : (
                            filteredMails.map((row: any) => (
                                <Tr key={row.uid}>
                                    <Td className="font-mono text-xs w-[120px]">
                                        {row.uid}
                                    </Td>
                                    <Td>
                                        <span
                                            className="font-medium text-blue-600 hover:underline cursor-pointer"
                                            onClick={() =>
                                                navigate(
                                                    `/mail/viewer/${row.uid}`,
                                                )
                                            }
                                        >
                                            {row.receiverName}
                                        </span>
                                    </Td>
                                    <Td className="text-xs">
                                        {row.receiverAddress}
                                    </Td>
                                    <Td className="text-xs">
                                        {dayjs(row.createdAt).format(
                                            'DD.MM.YYYY',
                                        )}
                                    </Td>
                                    <Td>
                                        <StatusTag row={row} />
                                    </Td>
                                    <Td>
                                        <div className="flex gap-2">
                                            <Tooltip title="Yuborish">
                                                <Button
                                                    size="xs"
                                                    variant="twoTone"
                                                    color="emerald-500"
                                                    icon={
                                                        <HiOutlinePaperAirplane className="rotate-90" />
                                                    }
                                                    onClick={() =>
                                                        handleSendClick(row)
                                                    }
                                                />
                                            </Tooltip>
                                            <Tooltip title="Tahrirlash">
                                                <Button
                                                    size="xs"
                                                    variant="twoTone"
                                                    icon={<HiOutlinePencil />}
                                                    onClick={() =>
                                                        navigate(
                                                            `/mail/edit/${row.uid}`,
                                                        )
                                                    }
                                                />
                                            </Tooltip>
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            <Dialog
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                width={1000}
                title={pdfTitle}
            >
                <div className="h-[75vh] w-full bg-gray-100 flex items-center justify-center rounded-b-lg">
                    {isPdfLoading ? (
                        <Spinner size="lg" />
                    ) : (
                        <iframe src={pdfUrl} className="w-full h-full" />
                    )}
                </div>
            </Dialog>

            <Dialog
                isOpen={sendModalOpen}
                onClose={() => setSendModalOpen(false)}
                title="Yuborishni tasdiqlash"
                width={500}
            >
                <div className="flex flex-col gap-6 pt-4">
                    <MissingSign
                        onSignClicked={setSelectedCert}
                        disabled={isSending}
                    />
                    <Button
                        block
                        variant="solid"
                        size="lg"
                        loading={isSending}
                        disabled={!selectedCert}
                        onClick={confirmSend}
                    >
                        Yuborish
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}

export default MailList
