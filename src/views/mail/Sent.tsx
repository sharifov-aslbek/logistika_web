import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
    HiOutlineIdentification,
    HiOutlineDownload,
    HiOutlineRefresh,
} from 'react-icons/hi'
// ❌ REMOVED: import * as XLSX from 'xlsx'

import Table from '@/components/ui/Table'
const { Tr, Th, Td, THead, TBody } = Table

import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
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

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'
type Option = { value: string | number; label: string }

// --- Helper Component: Status Tag ---
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

const SentMails = () => {
    const navigate = useNavigate()

    // Store
    // ✨ ADDED: exportExcel
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
    const [filterId, setFilterId] = useState('')
    const [filterName, setFilterName] = useState('')

    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)
    const [filterRegion, setFilterRegion] = useState<Option | null>(null)
    const [filterArea, setFilterArea] = useState<Option | null>(null)
    const [filterOrganization, setFilterOrganization] =
        useState<Option | null>(null)
    const [filterBranch, setFilterBranch] = useState<Option | null>(null)
    const [regionOptions, setRegionOptions] = useState<Option[]>([])
    const [areaOptions, setAreaOptions] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)
    const [debouncedFilterName, setDebouncedFilterName] = useState('')

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

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedFilterName(filterName.trim())
        }, 1500)

        return () => window.clearTimeout(timer)
    }, [filterName])

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

    useEffect(() => {
        const fetchRegions = async () => {
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })
                if (response.data?.code === 200) {
                    setRegionOptions(
                        response.data.data.map((region: any) => ({
                            value: region.id,
                            label: region.name,
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
                        response.data.data.areas.map((area: any) => ({
                            value: area.id,
                            label: area.name,
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
                regionId: filterRegion?.value,
                areaId: filterArea?.value,
                organizationId: filterOrganization?.value,
                branchId: filterBranch?.value,
                receiver: debouncedFilterName,
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
            pageIndex,
            pageSize,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            isSend: true, // Always true for this page
            regionId: filterRegion?.value,
            areaId: filterArea?.value,
            organizationId: filterOrganization?.value,
            branchId: filterBranch?.value,
            receiver: debouncedFilterName,
        })
    }

    useEffect(() => {
        fetchData()
    }, [
        startDate,
        endDate,
        pageIndex,
        pageSize,
        filterRegion,
        filterArea,
        filterOrganization,
        filterBranch,
        debouncedFilterName,
    ])

    const onPaginationChange = (page: number) => setPageIndex(page)

    const onSelectChange = (value: number) => {
        setPageSize(value)
        setPageIndex(1)
    }

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
            return true
        })
    }, [mails, filterId])

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
                                inputFormat="YYYY-MM-DD"
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
                                inputFormat="YYYY-MM-DD"
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

                        <div className="w-full sm:w-40">
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

                        <div className="w-full sm:w-40">
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
                            <div className="w-full sm:w-48">
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
                            <div className="w-full sm:w-48">
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
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {/* ✨ UPDATED EXCEL BUTTON */}
                        <Button
                            variant="twoTone"
                            color="sky-600"
                            size="sm"
                            icon={<HiOutlineRefresh />}
                            loading={isLoading}
                            onClick={fetchData}
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
                            ].find((item) => item.value === pageSize)}
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
