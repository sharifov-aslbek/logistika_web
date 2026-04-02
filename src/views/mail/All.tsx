import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineRefresh,
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
import { useOrganizationStore } from '@/store/organizationStore'
import {
    ROLE_WORKER,
    ROLE_BRANCH_DIRECTOR,
    ROLE_ADMIN,
} from '@/constants/usertype.constant'

const { Tr, Th, Td, THead, TBody } = Table

// --- Types ---
type Option = { value: string | number; label: string }

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// =========================================================
// ✅ FIX: THIS COMPONENT WAS MISSING OR UNDEFINED
// =========================================================
const StatusTag = ({ row }: { row: any }) => {
    const tagBaseClass =
        'border-0 rounded-lg px-2 py-1 text-[11px] leading-4 text-center whitespace-normal break-words max-w-[260px]'

    if (!row.isSend) {
        return (
            <Tag className={`${tagBaseClass} bg-gray-100 text-gray-600`}>
                Qoralama
            </Tag>
        )
    }

    const performType = row.activePerform?.performType
    let label = "Ma'lumot yo'q"
    let className = `${tagBaseClass} bg-slate-100 text-slate-600`

    switch (performType) {
        case 'Delivered':
        case 'SuccessDelivered':
            label = 'Доставлен'
            className = `${tagBaseClass} bg-emerald-100 text-emerald-700`
            break
        case 'ReceiverDead':
            label = 'Олувчи вафот этган'
            className = `${tagBaseClass} bg-red-100 text-red-700`
            break
        case 'ReceiverNotLivesThere':
            label = 'Олувчи кўрсатилган манзилда яшамайди'
            className = `${tagBaseClass} bg-amber-100 text-amber-700`
            break
        case 'IncompleteAddress':
            label = 'Тўлиқ манзил кўрсатилмаган'
            className = `${tagBaseClass} bg-amber-100 text-amber-700`
            break
        case 'ReceiverRefused':
        case 'ReceiverRefuse':
            label = 'Олувчи қабул қилишдан бош тортди'
            className = `${tagBaseClass} bg-red-100 text-red-700`
            break
        case 'ReceiverNotAtHome':
        case 'NotAtHome':
            label = 'Уйда йўқ'
            className = `${tagBaseClass} bg-slate-100 text-slate-700`
            break
        case 'ReceiverDidntAppearOnNotice':
            label = 'Хабарнома қолдирилди олувчи келмади'
            className = `${tagBaseClass} bg-indigo-100 text-indigo-700`
            break
        case 'InvalidAddress':
            label = 'Манзил аниқланмади'
            className = `${tagBaseClass} bg-orange-100 text-orange-700`
            break
        case 'TryPerform':
            label = 'Попытка вручения'
            className = `${tagBaseClass} bg-blue-100 text-blue-700`
            break
        case 'OrganizationWithGivenAddressNotFound':
            label = 'Кўрсатилган манзилдан ташкилот топилмади'
            className = `${tagBaseClass} bg-orange-100 text-orange-700`
            break
    }

    return <Tag className={className}>{label}</Tag>
}

// =========================================================
// MAIN COMPONENT
// =========================================================
const MailList = () => {
    const navigate = useNavigate()

    // Store
    const { mails, totalMails, isLoading, getAllMails, exportExcel } =
        useMailStore()
    const userProfile = useAccountStore((state) => state.userProfile)
    const token = useAccountStore((state) => state.userProfile?.token)
    const {
        myOrganizations,
        myBranches,
        organizationBranches,
        fetchMyOrganizations,
        fetchMyBranches,
        fetchMyOrganizationBranches,
    } = useOrganizationStore()
    const role = Number(userProfile?.role || 0)
    const isBranchFilterRole = [
        ROLE_WORKER,
        ROLE_BRANCH_DIRECTOR,
        ROLE_ADMIN,
    ].includes(role)
    const isAdminRole = role === ROLE_ADMIN

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
    const [filterOrganization, setFilterOrganization] =
        useState<Option | null>(null)
    const [filterBranch, setFilterBranch] = useState<Option | null>(null)
    const [filterSender, setFilterSender] = useState('')
    const [debouncedFilterSender, setDebouncedFilterSender] = useState('')
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

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedFilterSender(filterSender.trim())
        }, 1500)

        return () => window.clearTimeout(timer)
    }, [filterSender])

    useEffect(() => {
        if (role === ROLE_WORKER || role === ROLE_BRANCH_DIRECTOR) {
            fetchMyBranches()
        } else if (role === ROLE_ADMIN) {
            fetchMyOrganizations()
            fetchMyOrganizationBranches()
        }
    }, [
        fetchMyBranches,
        fetchMyOrganizationBranches,
        fetchMyOrganizations,
        role,
    ])

    const organizationOptions = useMemo(
        () =>
            myOrganizations.map((organization: any) => ({
                value: Number(organization.id),
                label:
                    organization.fullName ||
                    organization.name ||
                    organization.shortName,
            })),
        [myOrganizations],
    )

    const branchOptions = useMemo(() => {
        if (role === ROLE_WORKER || role === ROLE_BRANCH_DIRECTOR) {
            return myBranches.map((branch: any) => ({
                value: Number(branch.id),
                label: branch.name,
            }))
        }

        if (role === ROLE_ADMIN) {
            return organizationBranches
                .filter(
                    (branch: any) =>
                        !filterOrganization?.value ||
                        Number(branch.organizationId) ===
                            Number(filterOrganization.value),
                )
                .map((branch: any) => ({
                    value: Number(branch.id),
                    label: branch.name,
                }))
        }

        return [] as Option[]
    }, [role, myBranches, organizationBranches, filterOrganization])

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
                organizationId: filterOrganization?.value,
                branchId: filterBranch?.value,
                receiver: debouncedFilterSender,
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
            organizationId: filterOrganization?.value,
            branchId: filterBranch?.value,
            receiver: debouncedFilterSender,
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
        filterOrganization,
        filterBranch,
        debouncedFilterSender,
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
            const matchesSearch =
                !searchQuery ||
                (item.uid?.toLowerCase() || '').includes(
                    searchQuery.toLowerCase().trim(),
                )
            return matchesSearch
        })
    }, [mails, searchQuery])

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
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-9 xl:grid-cols-3 2xl:grid-cols-4">
                            <div className="min-w-0">
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
                            <div className="min-w-0">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                    Sana (dan)
                                </label>
                                <DatePicker
                                    placeholder="Sanadan"
                                    value={filterStartDate}
                                    onChange={setFilterStartDate}
                                    inputFormat="YYYY-MM-DD"
                                    size="sm"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                    Sana (gacha)
                                </label>
                                <DatePicker
                                    placeholder="Sanagacha"
                                    value={filterEndDate}
                                    onChange={setFilterEndDate}
                                    inputFormat="YYYY-MM-DD"
                                    size="sm"
                                />
                            </div>
                            <div className="min-w-0">
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
                            <div className="min-w-0">
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

                            {isAdminRole && (
                                <div className="min-w-0">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                        Tashkilot
                                    </label>
                                    <Select
                                        placeholder="Tashkilot"
                                        options={organizationOptions}
                                        value={filterOrganization}
                                        onChange={(option) => {
                                            setFilterOrganization(option)
                                            setFilterBranch(null)
                                        }}
                                        size="sm"
                                    />
                                </div>
                            )}

                            {isBranchFilterRole && (
                                <div className="min-w-0">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                        Filial
                                    </label>
                                    <Select
                                        placeholder="Filial"
                                        options={branchOptions}
                                        value={filterBranch}
                                        onChange={setFilterBranch}
                                        size="sm"
                                    />
                                </div>
                            )}

                            <div className="min-w-0 xl:col-span-2">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                    Qabul qiluvchi
                                </label>
                                <Input
                                    placeholder="Ism bo'yicha"
                                    prefix={<HiOutlineFilter />}
                                    value={filterSender}
                                    onChange={(e) =>
                                        setFilterSender(e.target.value)
                                    }
                                    size="sm"
                                />
                            </div>
                            <div className="min-w-0 xl:col-span-2">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                    ID Qidirish
                                </label>
                                <Input
                                    placeholder="ID bo'yicha..."
                                    prefix={<HiOutlineSearch />}
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    size="sm"
                                />
                            </div>
                    </div>

                    <div className="xl:col-span-3">
                        <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                            <Button
                                variant="twoTone"
                                color="sky-600"
                                size="sm"
                                icon={<HiOutlineRefresh />}
                                loading={isLoading}
                                onClick={fetchData}
                                block
                            >
                                Yangilash
                            </Button>

                            <Button
                                variant="twoTone"
                                color="emerald-600"
                                size="sm"
                                icon={<HiOutlineDownload />}
                                loading={isExporting}
                                onClick={handleExportExcel}
                                block
                            >
                                Excel
                            </Button>

                            <div className="grid grid-cols-1 gap-2">
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<HiOutlinePlus />}
                                    onClick={() => navigate('/mail/create-pdf')}
                                    block
                                >
                                    Yangi hujjat
                                </Button>
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<HiOutlinePlus />}
                                    onClick={() => navigate('/mail/create-registry')}
                                    block
                                >
                                    Yangi reestr
                                </Button>
                            </div>
                        </div>
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
                                { value: 100, label: '100 / page' },
                                { value: 200, label: '200 / page' },
                                { value: 500, label: '500 / page' },
                            ].find((i) => i.value === pageSize)}
                            options={[
                                { value: 10, label: '10 / page' },
                                { value: 20, label: '20 / page' },
                                { value: 50, label: '50 / page' },
                                { value: 100, label: '100 / page' },
                                { value: 200, label: '200 / page' },
                                { value: 500, label: '500 / page' },
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
