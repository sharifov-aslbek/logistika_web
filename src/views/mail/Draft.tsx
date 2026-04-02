import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlinePaperAirplane,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineDownload,
    HiOutlineRefresh,
    HiCheckCircle,
    HiXCircle,
} from 'react-icons/hi'

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
import Tooltip from '@/components/ui/Tooltip'
import Pagination from '@/components/ui/Pagination'

import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'
import { useEImzoStore } from '@/store/eImzoStore'
import { useOrganizationStore } from '@/store/organizationStore'
import {
    ROLE_WORKER,
    ROLE_BRANCH_DIRECTOR,
    ROLE_ADMIN,
} from '@/constants/usertype.constant'

import MissingSign from '../../components/shared/missingsign'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'
type Option = { value: string | number; label: string }

const StatusTag = ({ row }: { row: any }) => {
    return (
        <Tag className="bg-amber-100 text-amber-600 border-0 rounded-full">
            Qoralama
        </Tag>
    )
}

const MailList = () => {
    const navigate = useNavigate()

    const { mails, totalMails, isLoading, getAllMails, exportExcel, deleteMail } = useMailStore()
    const userProfile = useAccountStore((state: any) => state.userProfile)
    const { init, loadKey, createPkcs7, error, loading: storeLoading } = useEImzoStore()
    const {
        myOrganizations,
        myBranches,
        organizationBranches,
        fetchMyOrganizations,
        fetchMyBranches,
        fetchMyOrganizationBranches,
    } = useOrganizationStore()
    const role = Number(userProfile?.role || 0)
    const isBranchFilterRole = [ROLE_WORKER, ROLE_BRANCH_DIRECTOR, ROLE_ADMIN].includes(role)
    const isAdminRole = role === ROLE_ADMIN

    const token = useAccountStore((state: any) => state.user?.token) ||
        (() => {
            try {
                return JSON.parse(localStorage.getItem('account-storage') || '{}')?.state?.user?.token
            } catch {
                return null
            }
        })()

    const [filterSender, setFilterSender] = useState('')
    const [filterDate, setFilterDate] = useState<Date | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [isExporting, setIsExporting] = useState(false)
    const [filterRegion, setFilterRegion] = useState<Option | null>(null)
    const [filterArea, setFilterArea] = useState<Option | null>(null)
    const [filterOrganization, setFilterOrganization] = useState<Option | null>(null)
    const [filterBranch, setFilterBranch] = useState<Option | null>(null)
    const [regionOptions, setRegionOptions] = useState<Option[]>([])
    const [areaOptions, setAreaOptions] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)
    const [debouncedFilterSender, setDebouncedFilterSender] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [mailToSend, setMailToSend] = useState<any>(null)
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isSending, setIsSending] = useState(false)

    const [bulkModalOpen, setBulkModalOpen] = useState(false)
    const [bulkActionType, setBulkActionType] = useState<'send' | 'delete'>('send')
    const [bulkResults, setBulkResults] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        isComplete: false,
    })
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [mailToDelete, setMailToDelete] = useState<any>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        console.log('[MailList] component mounted')
        console.log('[MailList] token:', token)

        const runInit = async () => {
            try {
                console.log('[MailList] init started')
                const result = await init()
                console.log('[MailList] init result:', result)
            } catch (err) {
                console.error('[MailList] init error:', err)
            }
        }

        runInit()
    }, [])

    useEffect(() => {
        console.log('[MailList] mails changed:', mails)
        console.log('[MailList] totalMails:', totalMails)
        console.log('[MailList] isLoading:', isLoading)
    }, [mails, totalMails, isLoading])

    useEffect(() => {
        console.log('[MailList] selectedCert changed:', selectedCert)
    }, [selectedCert])

    useEffect(() => {
        console.log('[MailList] E-IMZO error changed:', error)
        console.log('[MailList] storeLoading changed:', storeLoading)
    }, [error, storeLoading])

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
                console.error('[fetchRegions] error:', error)
            } finally {
                setLoadingRegions(false)
            }
        }

        fetchRegions()
    }, [])

    const getHeaders = () => {
        const headers = {
            Authorization: `Bearer ${token}`,
            accept: '*/*',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        }

        console.log('[getHeaders] headers:', headers)
        return headers
    }

    const formatDate = (date: Date | null) => {
        const formatted = date ? dayjs(date).format('YYYY-MM-DD') : undefined
        console.log('[formatDate] input:', date, 'output:', formatted)
        return formatted
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedFilterSender(filterSender.trim())
        }, 1500)

        return () => window.clearTimeout(timer)
    }, [filterSender])

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
                console.error('[handleRegionChange] error:', error)
            } finally {
                setLoadingAreas(false)
            }
        }
    }

    const fetchData = async () => {
        const dateStr = formatDate(filterDate)

        console.log('[fetchData] started with:', {
            pageIndex,
            pageSize,
            filterDate,
            dateStr,
            filterRegion,
            filterArea,
            filterOrganization,
            filterBranch,
            debouncedFilterSender,
        })

        try {
            const result = await getAllMails({
                pageIndex,
                pageSize,
                startDate: dateStr,
                endDate: dateStr,
                isSend: false,
                regionId: filterRegion?.value,
                areaId: filterArea?.value,
                organizationId: filterOrganization?.value,
                branchId: filterBranch?.value,
                receiver: debouncedFilterSender,
            })

            console.log('[fetchData] getAllMails result:', result)
            setSelectedIds([])
            console.log('[fetchData] selectedIds reset')
        } catch (err) {
            console.error('[fetchData] error:', err)
        }
    }

    useEffect(() => {
        console.log('[useEffect fetchData] triggered:', {
            filterDate,
            pageIndex,
            pageSize,
            filterRegion,
            filterArea,
            filterOrganization,
            filterBranch,
            debouncedFilterSender,
        })
        fetchData()
    }, [filterDate, pageIndex, pageSize, filterRegion, filterArea, filterOrganization, filterBranch, debouncedFilterSender])

    const onPaginationChange = (page: number) => {
        console.log('[onPaginationChange] page:', page)
        setPageIndex(page)
    }

    const onSelectChange = (value: number) => {
        console.log('[onSelectChange] value:', value)
        setPageSize(value)
        setPageIndex(1)
    }

    const filteredMails = useMemo(() => {
        console.log('[filteredMails] recompute started')
        console.log('[filteredMails] mails:', mails)
        console.log('[filteredMails] filterSender:', filterSender)
        console.log('[filteredMails] searchQuery:', searchQuery)

        if (!mails) {
            console.log('[filteredMails] mails is falsy, returning []')
            return []
        }

        const result = mails.filter((item: any) => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return item.uid?.toLowerCase().includes(query)
            }

            return true
        })

        console.log('[filteredMails] result:', result)
        return result
    }, [mails, searchQuery])

    const isAllSelected = filteredMails.length > 0 && selectedIds.length === filteredMails.length

    const handleSelectAll = () => {
        console.log('[handleSelectAll] before:', {
            isAllSelected,
            selectedIds,
            filteredMails,
        })

        if (isAllSelected) {
            setSelectedIds([])
            console.log('[handleSelectAll] all unselected')
        } else {
            const ids = filteredMails.map((m: any) => m.uid)
            setSelectedIds(ids)
            console.log('[handleSelectAll] selected all ids:', ids)
        }
    }

    const handleSelectRow = (uid: string) => {
        console.log('[handleSelectRow] clicked uid:', uid)

        setSelectedIds((prev) => {
            const next = prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
            console.log('[handleSelectRow] prev:', prev)
            console.log('[handleSelectRow] next:', next)
            return next
        })
    }

    const handleExportExcel = async () => {
        console.log('[handleExportExcel] started')
        setIsExporting(true)

        try {
            const dateStr = formatDate(filterDate)
            console.log('[handleExportExcel] dateStr:', dateStr)

            const blob = await exportExcel({
                startDate: dateStr,
                endDate: dateStr,
                isSend: false,
                regionId: filterRegion?.value,
                areaId: filterArea?.value,
                organizationId: filterOrganization?.value,
                branchId: filterBranch?.value,
                receiver: debouncedFilterSender,
            })

            console.log('[handleExportExcel] blob:', blob)

            if (blob) {
                const url = window.URL.createObjectURL(blob)
                console.log('[handleExportExcel] download url:', url)

                const link = document.createElement('a')
                link.href = url
                link.download = `TezDoc_Qoralamalar.xlsx`

                document.body.appendChild(link)
                link.click()
                link.remove()

                toast.push(<Notification type="success">Excel yuklandi</Notification>)
            } else {
                console.warn('[handleExportExcel] blob is empty')
            }
        } catch (error) {
            console.error('[handleExportExcel] error:', error)
            toast.push(<Notification type="danger">Xatolik</Notification>)
        } finally {
            setIsExporting(false)
            console.log('[handleExportExcel] finished')
        }
    }

    const handleSingleSendClick = (row: any) => {
        console.log('[handleSingleSendClick] row:', row)
        setMailToSend(row)
        setSelectedCert(null)
        setSendModalOpen(true)
    }

    const handleBulkSendClick = () => {
        console.log('[handleBulkSendClick] selectedIds:', selectedIds)
        setMailToSend(null)
        setSelectedCert(null)
        setSendModalOpen(true)
    }

    const handleBulkDeleteClick = () => {
        console.log('[handleBulkDeleteClick] selectedIds:', selectedIds)
        setBulkDeleteModalOpen(true)
    }

    const openDeleteDialog = (row: any) => {
        console.log('[openDeleteDialog] row:', row)
        setMailToDelete(row)
        setDeleteModalOpen(true)
    }

    const handleDeleteDraft = async () => {
        console.log('[handleDeleteDraft] mailToDelete:', mailToDelete)

        if (!mailToDelete?.uid) {
            console.warn('[handleDeleteDraft] no uid found')
            return
        }

        setIsDeleting(true)

        try {
            const success = await deleteMail(mailToDelete.uid)
            console.log('[handleDeleteDraft] deleteMail result:', success)

            if (success) {
                setDeleteModalOpen(false)
                setMailToDelete(null)
                await fetchData()
                toast.push(<Notification type="success">Hujjat muvaffaqiyatli o&apos;chirildi</Notification>)
            } else {
                toast.push(<Notification type="danger">O&apos;chirishda xatolik yuz berdi</Notification>)
            }
        } catch (err) {
            console.error('[handleDeleteDraft] error:', err)
        } finally {
            setIsDeleting(false)
            console.log('[handleDeleteDraft] finished')
        }
    }

    const processSingleDocument = async (uid: string, keyId: string) => {
        console.log('[processSingleDocument] started', { uid, keyId })

        try {
            const hashRes = await axios.get(`${BASE_URL}/mail/hash/${uid}`, {
                headers: getHeaders(),
            })

            console.log('[processSingleDocument] hashRes:', hashRes)
            console.log('[processSingleDocument] hashRes.data:', hashRes?.data)

            const hash = hashRes?.data?.hash
            console.log('[processSingleDocument] hash:', hash)

            if (!hash) throw new Error("Hash topilmadi")

            const signature = await createPkcs7(keyId, hash)
            console.log('[processSingleDocument] signature:', signature)

            if (!signature) throw new Error("Imzolab bo'lmadi")

            const signRes = await axios.post(
                `${BASE_URL}/mail/sign/${uid}`,
                { signature },
                { headers: getHeaders() },
            )

            console.log('[processSingleDocument] signRes:', signRes)
            console.log('[processSingleDocument] success uid:', uid)

            return true
        } catch (error) {
            console.error('[processSingleDocument] error uid:', uid, error)
            return false
        }
    }

    const confirmSend = async () => {
        console.log('[confirmSend] started')
        console.log('[confirmSend] selectedCert:', selectedCert)
        console.log('[confirmSend] mailToSend:', mailToSend)
        console.log('[confirmSend] selectedIds:', selectedIds)

        if (!selectedCert) {
            console.warn('[confirmSend] selectedCert is null')
            return
        }

        setIsSending(true)

        try {
            const keyId = await loadKey(selectedCert)
            console.log('[confirmSend] loadKey result keyId:', keyId)

            if (mailToSend) {
                console.log('[confirmSend] single send mode for uid:', mailToSend.uid)

                const success = await processSingleDocument(mailToSend.uid, keyId)
                console.log('[confirmSend] single send result:', success)

                if (success) {
                    toast.push(<Notification type="success">Hujjat yuborildi</Notification>)
                    setSendModalOpen(false)
                    fetchData()
                } else {
                    toast.push(<Notification type="danger">Xatolik yuz berdi</Notification>)
                }
            } else {
                console.log('[confirmSend] bulk mode started')
                setSendModalOpen(false)
                startBulkProcessing(keyId)
            }
        } catch (error: any) {
            console.error('[confirmSend] error:', error)
            toast.push(<Notification type="danger">Imzolashda xatolik</Notification>)
        } finally {
            setIsSending(false)
            console.log('[confirmSend] finished')
        }
    }

    const startBulkProcessing = async (activeKeyId: string) => {
        console.log('[startBulkProcessing] activeKeyId:', activeKeyId)
        console.log('[startBulkProcessing] selectedIds:', selectedIds)

        setBulkActionType('send')
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

        for (let i = 0; i < selectedIds.length; i++) {
            const uid = selectedIds[i]
            console.log('[startBulkProcessing] processing:', { index: i, uid })

            const success = await processSingleDocument(uid, activeKeyId)

            if (success) sCount++
            else fCount++

            console.log('[startBulkProcessing] progress:', {
                processed: i + 1,
                success: sCount,
                failed: fCount,
            })

            setBulkResults((prev) => ({
                ...prev,
                processed: i + 1,
                success: sCount,
                failed: fCount,
            }))
        }

        setBulkResults((prev) => ({ ...prev, isComplete: true }))
        console.log('[startBulkProcessing] completed')
        fetchData()
    }

    const startBulkDeleteProcessing = async () => {
        const idsToDelete = [...selectedIds]
        console.log('[startBulkDeleteProcessing] idsToDelete:', idsToDelete)

        if (idsToDelete.length === 0) {
            console.warn('[startBulkDeleteProcessing] no ids to delete')
            return
        }

        setBulkDeleteModalOpen(false)
        setBulkActionType('delete')
        setBulkModalOpen(true)
        setBulkResults({
            total: idsToDelete.length,
            processed: 0,
            success: 0,
            failed: 0,
            isComplete: false,
        })

        let sCount = 0
        let fCount = 0

        for (let i = 0; i < idsToDelete.length; i++) {
            const uid = idsToDelete[i]
            console.log('[startBulkDeleteProcessing] deleting uid:', uid)

            const success = await deleteMail(uid)
            console.log('[startBulkDeleteProcessing] delete result:', { uid, success })

            if (success) {
                sCount++
                setSelectedIds((prev) => prev.filter((id) => id !== uid))
            } else {
                fCount++
            }

            setBulkResults((prev) => ({
                ...prev,
                processed: i + 1,
                success: sCount,
                failed: fCount,
            }))
        }

        setBulkResults((prev) => ({ ...prev, isComplete: true }))
        console.log('[startBulkDeleteProcessing] completed')
        await fetchData()
    }

    return (
        <div className="p-4">
            <Card className="mb-4 border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Sana</label>
                            <DatePicker value={filterDate} onChange={setFilterDate} size="sm" placeholder="Sanani tanlang" inputFormat="YYYY-MM-DD" />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Qabul qiluvchi</label>
                            <Input
                                prefix={<HiOutlineFilter />}
                                value={filterSender}
                                onChange={(e) => {
                                    console.log('[filterSender] value:', e.target.value)
                                    setFilterSender(e.target.value)
                                }}
                                size="sm"
                                placeholder="Ism bo'yicha"
                            />
                        </div>
                        <div className="w-full sm:w-64">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Qidirish</label>
                            <Input
                                prefix={<HiOutlineSearch />}
                                value={searchQuery}
                                onChange={(e) => {
                                    console.log('[searchQuery] value:', e.target.value)
                                    setSearchQuery(e.target.value)
                                }}
                                size="sm"
                                placeholder="ID bo'yicha..."
                            />
                        </div>
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Viloyat</label>
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
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Tuman</label>
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
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Tashkilot</label>
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
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Filial</label>
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
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                variant="solid"
                                color="emerald-600"
                                size="sm"
                                icon={<HiOutlinePaperAirplane className="rotate-90" />}
                                onClick={handleBulkSendClick}
                            >
                                Yuborish ({selectedIds.length})
                            </Button>
                        )}
                        {selectedIds.length > 0 && (
                            <Button
                                variant="solid"
                                color="red-600"
                                size="sm"
                                icon={<HiOutlineTrash />}
                                onClick={handleBulkDeleteClick}
                            >
                                O'chirish ({selectedIds.length})
                            </Button>
                        )}
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
                            color="blue-600"
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
                            onClick={() => {
                                console.log('[navigate] /mail/create-pdf')
                                navigate('/mail/create-pdf')
                            }}
                        >
                            Yangi hujjat
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th className="w-[50px] text-center">
                                <input
                                    type="checkbox"
                                    className="cursor-pointer h-4 w-4 rounded border-gray-300"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                />
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
                                <Td colSpan={7} className="text-center py-10">
                                    <Spinner size="40px" />
                                </Td>
                            </Tr>
                        ) : filteredMails.length === 0 ? (
                            <Tr>
                                <Td colSpan={7} className="text-center py-6 text-gray-500">
                                    Ma'lumot topilmadi
                                </Td>
                            </Tr>
                        ) : (
                            filteredMails.map((row: any) => (
                                <Tr key={row.uid} className={selectedIds.includes(row.uid) ? 'bg-blue-50' : ''}>
                                    <Td className="text-center">
                                        <input
                                            type="checkbox"
                                            className="cursor-pointer h-4 w-4 rounded border-gray-300"
                                            checked={selectedIds.includes(row.uid)}
                                            onChange={() => handleSelectRow(row.uid)}
                                        />
                                    </Td>
                                    <Td className="font-mono text-xs w-[120px]">{row.uid}</Td>
                                    <Td>
                                        <span
                                            className="font-medium text-blue-600 hover:underline cursor-pointer"
                                            onClick={() => {
                                                console.log('[navigate] viewer uid:', row.uid)
                                                navigate(`/mail/viewer/${row.uid}`)
                                            }}
                                        >
                                            {row.receiverName}
                                        </span>
                                    </Td>
                                    <Td className="text-xs">{row.receiverAddress}</Td>
                                    <Td className="text-xs">{dayjs(row.createdAt).format('DD.MM.YYYY')}</Td>
                                    <Td><StatusTag row={row} /></Td>
                                    <Td>
                                        <div className="flex gap-2">
                                            <Tooltip title="Yuborish">
                                                <Button
                                                    size="xs"
                                                    variant="twoTone"
                                                    color="emerald-500"
                                                    icon={<HiOutlinePaperAirplane className="rotate-90" />}
                                                    onClick={() => handleSingleSendClick(row)}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Tahrirlash">
                                                <Button
                                                    size="xs"
                                                    variant="twoTone"
                                                    icon={<HiOutlinePencil />}
                                                    onClick={() => {
                                                        console.log('[navigate] edit uid:', row.uid)
                                                        navigate(`/mail/edit/${row.uid}`)
                                                    }}
                                                />
                                            </Tooltip>
                                            <Tooltip title="O'chirish">
                                                <Button
                                                    size="xs"
                                                    variant="twoTone"
                                                    color="red-600"
                                                    icon={<HiOutlineTrash />}
                                                    onClick={() => openDeleteDialog(row)}
                                                />
                                            </Tooltip>
                                        </div>
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
                            onChange={(option) => onSelectChange(option?.value || 10)}
                        />
                    </div>
                </div>
            </Card>

            <Dialog
                isOpen={sendModalOpen}
                onClose={() => {
                    console.log('[Dialog] sendModal close')
                    setSendModalOpen(false)
                }}
                title="Hujjatni yuborish"
                width={500}
            >
                <div className="pt-4">
                    {error === 'AGENT_NOT_FOUND' ? (
                        <div className="flex flex-col items-center text-center p-4">
                            <HiXCircle className="text-red-500 text-5xl mb-4" />
                            <h3 className="text-lg font-bold">E-IMZO topilmadi</h3>
                            <p className="text-gray-500 text-sm mt-2 mb-6">
                                Imzolash uchun kompyuteringizda E-IMZO moduli yoniq bo'lishi shart.
                            </p>
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    block
                                    variant="solid"
                                    color="blue-600"
                                    onClick={() => {
                                        console.log('[E-IMZO] open install page')
                                        window.open('https://e-imzo.uz/help/install')
                                    }}
                                >
                                    Dasturni yuklash
                                </Button>
                                <Button
                                    block
                                    variant="plain"
                                    onClick={async () => {
                                        try {
                                            console.log('[E-IMZO] manual init started')
                                            const result = await init()
                                            console.log('[E-IMZO] manual init result:', result)
                                        } catch (err) {
                                            console.error('[E-IMZO] manual init error:', err)
                                        }
                                    }}
                                    loading={storeLoading}
                                >
                                    Qayta tekshirish
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <p className="text-gray-600 text-sm italic">
                                {mailToSend ? `ID: ${mailToSend.uid}` : `${selectedIds.length} ta hujjat`}
                            </p>

                            <MissingSign
                                onSignClicked={(cert: any) => {
                                    console.log('[MissingSign] selected cert:', cert)
                                    setSelectedCert(cert)
                                }}
                                disabled={isSending}
                            />

                            <Button
                                block
                                variant="solid"
                                size="lg"
                                loading={isSending || storeLoading}
                                disabled={!selectedCert}
                                onClick={confirmSend}
                            >
                                {mailToSend ? 'Yuborish' : 'Barchasini yuborish'}
                            </Button>
                        </div>
                    )}
                </div>
            </Dialog>

            <Dialog
                isOpen={deleteModalOpen}
                onClose={() => {
                    console.log('[Dialog] deleteModal close')
                    setDeleteModalOpen(false)
                }}
                title="Qoralamani o'chirish"
                width={420}
            >
                <div className="mt-4">
                    <p className="text-gray-600 mb-2">
                        Haqiqatan ham <strong>{mailToDelete?.receiverName || mailToDelete?.uid}</strong> qoralamasini o&apos;chirmoqchimisiz?
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Bu amal mail yozuvini va unga bog&apos;langan PDF faylni o&apos;chiradi. Amalni ortga qaytarib bo&apos;lmaydi.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="plain"
                            onClick={() => {
                                console.log('[deleteModal] cancel clicked')
                                setDeleteModalOpen(false)
                            }}
                            disabled={isDeleting}
                        >
                            Bekor qilish
                        </Button>
                        <Button variant="solid" color="red-600" onClick={handleDeleteDraft} loading={isDeleting}>
                            Ha, o&apos;chirish
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog
                isOpen={bulkDeleteModalOpen}
                onClose={() => {
                    console.log('[Dialog] bulkDeleteModal close')
                    setBulkDeleteModalOpen(false)
                }}
                title="Qoralamalarni o'chirish"
                width={420}
            >
                <div className="mt-4">
                    <p className="text-gray-600 mb-2">
                        Haqiqatan ham <strong>{selectedIds.length} ta</strong> qoralamani o&apos;chirmoqchimisiz?
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Bu amal tanlangan mail yozuvlari va ularga bog&apos;langan PDF fayllarni o&apos;chiradi. Amalni ortga qaytarib bo&apos;lmaydi.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="plain"
                            onClick={() => {
                                console.log('[bulkDeleteModal] cancel clicked')
                                setBulkDeleteModalOpen(false)
                            }}
                        >
                            Bekor qilish
                        </Button>
                        <Button variant="solid" color="red-600" onClick={startBulkDeleteProcessing}>
                            Ha, barchasini o&apos;chirish
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog
                isOpen={bulkModalOpen}
                onClose={() => {
                    console.log('[Dialog] bulkModal close attempt, isComplete:', bulkResults.isComplete)
                    bulkResults.isComplete && setBulkModalOpen(false)
                }}
                title={bulkActionType === 'delete' ? "O'chirish natijasi" : 'Natija'}
                width={500}
                closable={bulkResults.isComplete}
            >
                <div className="flex flex-col gap-4 py-4 items-center text-center">
                    {!bulkResults.isComplete ? (
                        <div className="flex flex-col items-center">
                            <Spinner size="40px" className="mb-4" />
                            <p className="text-gray-500">
                                {bulkResults.processed} / {bulkResults.total}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <HiCheckCircle className="text-emerald-500 text-5xl mb-4" />
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{bulkResults.success}</div>
                                    <div className="text-sm">{bulkActionType === 'delete' ? "O'chirildi" : 'Muvaffaqiyatli'}</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{bulkResults.failed}</div>
                                    <div className="text-sm">Xato</div>
                                </div>
                            </div>
                            <Button
                                className="mt-6 w-full"
                                variant="solid"
                                onClick={() => {
                                    console.log('[bulkModal] close button clicked')
                                    setBulkModalOpen(false)
                                    setSelectedIds([])
                                }}
                            >
                                Yopish
                            </Button>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}

export default MailList
