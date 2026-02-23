import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
    HiOutlineIdentification,
    HiOutlineDownload,
} from 'react-icons/hi'
// ❌ REMOVED: import * as XLSX from 'xlsx'

import Table from '@/components/ui/Table'
const { Tr, Th, Td, THead, TBody } = Table

import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- Helper Component: Status Tag ---
const StatusTag = ({ row }: { row: any }) => {
    if (!row.isSend) {
        return (
            <Tag className="bg-gray-100 text-gray-600 border-0 rounded-full">
                Qoralama
            </Tag>
        )
    }

    if (row.activePerformId != null && row.activePerform != null) {
        const performType = row.activePerform.performType
        let label = ''
        let className = ''

        switch (performType) {
            case 'SuccessDelivered':
                label = 'Yetkazib berildi'
                className =
                    'bg-emerald-100 text-emerald-600 border-0 rounded-full'
                break
            case 'ReceiverDead':
                label = 'Qabul qiluvchi vafot etgan'
                className = 'bg-red-100 text-red-600 border-0 rounded-full'
                break
            case 'ReceiverNotLivesThere':
            case 'IncompleteAddress':
                label =
                    performType === 'IncompleteAddress'
                        ? "Manzil to'liq emas"
                        : 'Bu manzilda yashamaydi'
                className = 'bg-amber-100 text-amber-600 border-0 rounded-full'
                break
            case 'ReceiverRefuse':
                label = 'Rad etildi'
                className = 'bg-red-100 text-red-600 border-0 rounded-full'
                break
            default:
                label = "Ma'lumot yo'q"
                className = 'bg-gray-100 text-gray-500 border-0 rounded-full'
        }
        return <Tag className={className}>{label}</Tag>
    }

    return (
        <Tag className="bg-blue-100 text-blue-600 border-0 rounded-full">
            Yuborilgan
        </Tag>
    )
}

const SentMails = () => {
    const navigate = useNavigate()

    // Store
    // ✨ ADDED: exportExcel
    const { mails, isLoading, getAllMails, exportExcel } = useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)

    // --- State ---
    const [filterId, setFilterId] = useState('')
    const [filterName, setFilterName] = useState('')

    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)

    // ✨ ADDED: Export loading state
    const [isExporting, setIsExporting] = useState(false)

    // --- PDF Modal State ---
    const [pdfModalOpen, setPdfModalOpen] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [pdfTitle, setPdfTitle] = useState('')
    const [isPdfLoading, setIsPdfLoading] = useState(false)

    // --- Helpers ---
    const getHeaders = () => {
        let authToken = token

        if (!authToken) {
            try {
                const localData = localStorage.getItem('account-storage')
                if (localData) {
                    const parsed = JSON.parse(localData)
                    authToken =
                        parsed?.state?.user?.token ||
                        parsed?.state?.userProfile?.token
                }
            } catch (error) {
                console.error('Error reading token from localStorage', error)
            }
        }

        return {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken}`,
            accept: '*/*',
        }
    }

    const formatDate = (date: Date | null) => {
        return date ? dayjs(date).format('YYYY-MM-DD') : undefined
    }

    // --- ✨ API Excel Export (Sent Mails) ---
    const handleExportExcel = async () => {
        setIsExporting(true)
        try {
            // Use current date filters
            const start = formatDate(startDate)
            const end = formatDate(endDate)

            const blob = await exportExcel({
                startDate: start,
                endDate: end,
                isSend: true, // 🔒 FORCED: Always true for Sent Mails page
            })

            if (blob) {
                // Create download link
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `TezDoc_Yuborilganlar_${dayjs().format('DD_MM_YYYY_HH_mm')}.xlsx`
                document.body.appendChild(link)
                link.click()

                // Cleanup
                link.remove()
                window.URL.revokeObjectURL(url)

                toast.push(
                    <Notification type="success">
                        Fayl muvaffaqiyatli tayyorlandi
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

    // --- API Fetch ---
    const fetchData = async () => {
        await getAllMails({
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            isSend: true, // Always true for this page
        })
    }

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    // --- Client-Side Filtering (Visual Only) ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            if (filterId) {
                const id = item.uid?.toLowerCase() || ''
                if (!id.includes(filterId.toLowerCase().trim())) {
                    return false
                }
            }
            if (filterName) {
                const name = item.receiverName?.toLowerCase() || ''
                if (!name.includes(filterName.toLowerCase().trim())) {
                    return false
                }
            }
            return true
        })
    }, [mails, filterId, filterName])

    // --- Actions ---
    const openPdfViewer = async (row: any) => {
        setPdfTitle(`Hujjat: ${row.uid} - ${row.receiverName}`)
        setPdfModalOpen(true)
        setIsPdfLoading(true)
        setPdfUrl('')

        try {
            const url = `${BASE_URL}/mail/${row.uid}/download`
            const response = await axios.get(url, {
                responseType: 'blob',
                headers: getHeaders(),
            })
            const blob = new Blob([response.data], { type: 'application/pdf' })
            setPdfUrl(window.URL.createObjectURL(blob))
        } catch (error) {
            toast.push(
                <Notification type="danger">
                    PDF yuklashda xatolik
                </Notification>,
            )
            setPdfModalOpen(false)
        } finally {
            setIsPdfLoading(false)
        }
    }

    return (
        <div className="p-4">
            {/* --- Filter Card --- */}
            <Card className="mb-4 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Sana (dan)
                            </label>
                            <DatePicker
                                placeholder="Boshlanish"
                                value={startDate}
                                onChange={setStartDate}
                                size="sm"
                            />
                        </div>

                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Sana (gacha)
                            </label>
                            <DatePicker
                                placeholder="Tugash"
                                value={endDate}
                                onChange={setEndDate}
                                size="sm"
                            />
                        </div>

                        <div className="hidden lg:block h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                ID raqam
                            </label>
                            <Input
                                placeholder="ID bo'yicha..."
                                prefix={
                                    <HiOutlineIdentification className="text-lg" />
                                }
                                value={filterId}
                                onChange={(e) => setFilterId(e.target.value)}
                                size="sm"
                            />
                        </div>

                        <div className="w-full sm:w-56">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Qabul qiluvchi
                            </label>
                            <Input
                                placeholder="Ism bo'yicha..."
                                prefix={<HiOutlineSearch className="text-lg" />}
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {/* ✨ UPDATED EXCEL BUTTON */}
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
                            Yangi reestr
                        </Button>
                    </div>
                </div>
            </Card>

            {/* --- Data Table --- */}
            <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th>Fayl</Th>
                            <Th>ID</Th>
                            <Th>Qabul qiluvchi</Th>
                            <Th>Manzil</Th>
                            <Th>Sana</Th>
                            <Th>Holat</Th>
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
                                    <Td className="w-[60px]">
                                        <Button
                                            shape="circle"
                                            variant="plain"
                                            size="sm"
                                            className="text-red-500 hover:bg-red-50"
                                            icon={
                                                <HiOutlineDocumentText className="text-xl" />
                                            }
                                            onClick={() => openPdfViewer(row)}
                                        />
                                    </Td>
                                    <Td className="font-mono text-gray-500 w-[120px]">
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
                contentClassName="p-0"
                closable
                title={pdfTitle}
            >
                <div className="h-[75vh] w-full bg-gray-100 flex items-center justify-center rounded-b-lg overflow-hidden">
                    {isPdfLoading ? (
                        <Spinner size="lg" />
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            frameBorder="0"
                        />
                    ) : (
                        <div className="text-gray-400">PDF topilmadi</div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}

export default SentMails
