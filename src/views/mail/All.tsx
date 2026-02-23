import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
    HiOutlineDownload,
} from 'react-icons/hi'
import * as XLSX from 'xlsx'

import Table from '@/components/ui/Table'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Pagination from '@/components/ui/Pagination'
import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'

const { Tr, Th, Td, THead, TBody } = Table

// --- Types ---
type Option = { value: string | number; label: string }

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// =========================================================
// ✅ FIX: THIS COMPONENT WAS MISSING OR UNDEFINED
// =========================================================
const StatusTag = ({ row }: { row: any }) => {
    // 1. If Draft
    if (!row.isSend) {
        return (
            <Tag className="bg-gray-100 text-gray-600 border-0 rounded-full">
                Qoralama
            </Tag>
        )
    }

    // 2. If Sent, check delivery status
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
            case 'NotAtHome':
                label = "Uyda yo'q"
                className = 'bg-gray-100 text-gray-600 border-0 rounded-full'
                break
            default:
                label = 'Jarayonda'
                className = 'bg-blue-50 text-blue-500 border-0 rounded-full'
        }
        return <Tag className={className}>{label}</Tag>
    }

    // 3. Fallback (Sent but no perform status yet)
    return (
        <Tag className="bg-blue-100 text-blue-600 border-0 rounded-full">
            Yuborilgan
        </Tag>
    )
}

// =========================================================
// MAIN COMPONENT
// =========================================================
const MailList = () => {
    const navigate = useNavigate()

    // Store
    const { mails, totalMails, isLoading, getAllMails, exportExcel } =
        useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)

    // --- State ---
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [isExporting, setIsExporting] = useState(false)

    // Filters
    const [filterStatus, setFilterStatus] = useState<Option | null>(null)
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
    const [filterRegion, setFilterRegion] = useState<Option | null>(null)
    const [filterArea, setFilterArea] = useState<Option | null>(null)
    const [filterSender, setFilterSender] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // Options
    const [regionOptions, setRegionOptions] = useState<Option[]>([])
    const [areaOptions, setAreaOptions] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    // Modal
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
                console.error(error)
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

    // --- EXCEL EXPORT ---
    const handleExportExcel = async () => {
        setIsExporting(true)
        try {
            let isSend: boolean | undefined
            if (filterStatus?.value === 'sent') isSend = true
            if (filterStatus?.value === 'draft') isSend = false

            const blob = await exportExcel({
                startDate: formatDate(filterStartDate),
                endDate: formatDate(filterEndDate),
                isSend,
                regionId: filterRegion?.value,
                areaId: filterArea?.value,
            })

            if (blob) {
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `TezDoc_Report_${dayjs().format('DD_MM_YYYY_HH_mm')}.xlsx`
                document.body.appendChild(link)
                link.click()
                link.remove()
                window.URL.revokeObjectURL(url)
                toast.push(
                    <Notification type="success">
                        Excel fayl yuklandi
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
                <Notification type="danger">Xatolik yuz berdi</Notification>,
            )
        } finally {
            setIsExporting(false)
        }
    }

    // --- LOAD REGIONS ---
    useEffect(() => {
        const fetchRegions = async () => {
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })
                if (response.data?.code === 200) {
                    setRegionOptions(
                        response.data.data.map((r: any) => ({
                            value: r.id,
                            label: r.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingRegions(false)
            }
        }
        fetchRegions()
    }, [])

    const handleRegionChange = async (option: Option | null) => {
        setFilterRegion(option)
        setFilterArea(null)
        setAreaOptions([])
        if (option?.value) {
            setLoadingAreas(true)
            try {
                const response = await axios.get(
                    `${BASE_URL}/region/${option.value}/areas`,
                    { headers: getHeaders() },
                )
                if (response.data?.code === 200) {
                    setAreaOptions(
                        response.data.data.areas.map((a: any) => ({
                            value: a.id,
                            label: a.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingAreas(false)
            }
        }
    }

    // --- FETCH DATA ---
    const fetchData = async () => {
        let isSend: boolean | undefined
        if (filterStatus?.value === 'sent') isSend = true
        if (filterStatus?.value === 'draft') isSend = false

        await getAllMails({
            pageIndex,
            pageSize,
            startDate: formatDate(filterStartDate),
            endDate: formatDate(filterEndDate),
            isSend,
            regionId: filterRegion?.value,
            areaId: filterArea?.value,
        })
    }

    useEffect(() => {
        fetchData()
    }, [
        pageIndex,
        pageSize,
        filterStatus,
        filterStartDate,
        filterEndDate,
        filterRegion,
        filterArea,
    ])

    const onPaginationChange = (page: number) => setPageIndex(page)
    const onSelectChange = (value: number) => {
        setPageSize(value)
        setPageIndex(1)
    }

    // --- MEMOIZED FILTER ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            const matchesSender =
                !filterSender ||
                item.receiverName
                    .toLowerCase()
                    .includes(filterSender.toLowerCase())
            const matchesSearch =
                !searchQuery ||
                (item.uid?.toLowerCase() || '').includes(
                    searchQuery.toLowerCase().trim(),
                )
            return matchesSender && matchesSearch
        })
    }, [mails, filterSender, searchQuery])

    // --- PDF VIEWER ---
    const openPdfViewer = async (row: any) => {
        setPdfTitle(`Hujjat: ${row.uid} - ${row.receiverName}`)
        setPdfModalOpen(true)
        setIsPdfLoading(true)
        try {
            const response = await axios.get(
                `${BASE_URL}/mail/${row.uid}/download`,
                { responseType: 'blob', headers: getHeaders() },
            )
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
            <Card className="mb-6 border border-gray-200 shadow-sm rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Filters */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Holat
                        </label>
                        <Select
                            placeholder="Holat"
                            options={[
                                { label: 'Barchasi', value: 'all' },
                                { label: 'Yuborilgan', value: 'sent' },
                                { label: 'Qoralama', value: 'draft' },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            size="sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Sana (dan)
                        </label>
                        <DatePicker
                            placeholder="Sanadan"
                            value={filterStartDate}
                            onChange={setFilterStartDate}
                            size="sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Sana (gacha)
                        </label>
                        <DatePicker
                            placeholder="Sanagacha"
                            value={filterEndDate}
                            onChange={setFilterEndDate}
                            size="sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Viloyat
                        </label>
                        <Select
                            placeholder="Viloyat"
                            options={regionOptions}
                            isLoading={loadingRegions}
                            value={filterRegion}
                            onChange={handleRegionChange}
                            size="sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Tuman
                        </label>
                        <Select
                            placeholder="Tuman"
                            options={areaOptions}
                            isLoading={loadingAreas}
                            isDisabled={!filterRegion}
                            value={filterArea}
                            onChange={setFilterArea}
                            size="sm"
                        />
                    </div>

                    {/* Excel Button */}
                    <div className="flex items-end gap-2 justify-end lg:col-span-1">
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
                    </div>

                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Qabul qiluvchi
                        </label>
                        <Input
                            placeholder="Ism bo'yicha"
                            prefix={<HiOutlineFilter />}
                            value={filterSender}
                            onChange={(e) => setFilterSender(e.target.value)}
                            size="sm"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            ID Qidirish
                        </label>
                        <Input
                            placeholder="ID bo'yicha..."
                            prefix={<HiOutlineSearch />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="sm"
                        />
                    </div>
                    <div className="lg:col-span-2 flex items-end gap-2 justify-end">
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

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
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
                                    <Td>
                                        <Button
                                            shape="circle"
                                            variant="plain"
                                            size="sm"
                                            className="text-red-500"
                                            icon={<HiOutlineDocumentText />}
                                            onClick={() => openPdfViewer(row)}
                                        />
                                    </Td>
                                    <Td className="font-mono text-xs">
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
                                    {/* ✅ NO ERROR HERE NOW BECAUSE StatusTag IS DEFINED */}
                                    <Td>
                                        <StatusTag row={row} />
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>

                {/* Pagination */}
                <div className="p-4 flex items-center justify-between border-t border-gray-200">
                    <Pagination
                        pageSize={pageSize}
                        currentPage={pageIndex}
                        total={totalMails}
                        onChange={onPaginationChange}
                    />
                    <div className="w-32">
                        <Select
                            size="sm"
                            menuPlacement="top"
                            isSearchable={false}
                            value={[
                                { value: 10, label: '10 / page' },
                                { value: 20, label: '20 / page' },
                                { value: 50, label: '50 / page' },
                            ].find((i) => i.value === pageSize)}
                            options={[
                                { value: 10, label: '10 / page' },
                                { value: 20, label: '20 / page' },
                                { value: 50, label: '50 / page' },
                            ]}
                            onChange={(option) =>
                                onSelectChange(option?.value || 10)
                            }
                        />
                    </div>
                </div>
            </Card>

            <Dialog
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                width={1000}
                title={pdfTitle}
            >
                <div className="h-[70vh]">
                    {isPdfLoading ? (
                        <Spinner />
                    ) : (
                        <iframe src={pdfUrl} className="w-full h-full" />
                    )}
                </div>
            </Dialog>
        </div>
    )
}

export default MailList
