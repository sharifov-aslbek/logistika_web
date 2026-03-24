import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlinePaperAirplane,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineDownload,
    HiCheckCircle,
    HiXCircle,
} from 'react-icons/hi'

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
import Tooltip from '@/components/ui/Tooltip'

import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'
import { useEImzoStore } from '@/store/eImzoStore'

import MissingSign from '../../components/shared/missingsign'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

const StatusTag = ({ row }: { row: any }) => {
    return (
        <Tag className="bg-amber-100 text-amber-600 border-0 rounded-full">
            Qoralama
        </Tag>
    )
}

const MailList = () => {
    const navigate = useNavigate()

    const { mails, isLoading, getAllMails, exportExcel, deleteMail } = useMailStore()
    const { init, loadKey, createPkcs7, error, loading: storeLoading } = useEImzoStore()

    const token = useAccountStore((state: any) => state.user?.token) ||
        (() => {
            try {
                return JSON.parse(localStorage.getItem('account-storage') || '{}')?.state?.user?.token
            } catch { return null }
        })()

    const [filterSender, setFilterSender] = useState('')
    const [filterDate, setFilterDate] = useState<Date | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [mailToSend, setMailToSend] = useState<any>(null)
    const [selectedCert, setSelectedCert] = useState<any>(null)
    const [isSending, setIsSending] = useState(false)

    const [bulkModalOpen, setBulkModalOpen] = useState(false)
    const [bulkResults, setBulkResults] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        isComplete: false,
    })
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [mailToDelete, setMailToDelete] = useState<any>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        init()
    }, [])

    const getHeaders = () => ({
        Authorization: `Bearer ${token}`,
        accept: '*/*',
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    })

    const formatDate = (date: Date | null) => date ? dayjs(date).format('YYYY-MM-DD') : undefined

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

    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            if (filterSender && !item.receiverName.toLowerCase().includes(filterSender.toLowerCase())) return false
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return item.uid?.toLowerCase().includes(query) || item.receiverName?.toLowerCase().includes(query)
            }
            return true
        })
    }, [mails, filterSender, searchQuery])

    const isAllSelected = filteredMails.length > 0 && selectedIds.length === filteredMails.length

    const handleSelectAll = () => {
        if (isAllSelected) setSelectedIds([])
        else setSelectedIds(filteredMails.map((m: any) => m.uid))
    }

    const handleSelectRow = (uid: string) => {
        setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
    }

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

    const openDeleteDialog = (row: any) => {
        setMailToDelete(row)
        setDeleteModalOpen(true)
    }

    const handleDeleteDraft = async () => {
        if (!mailToDelete?.uid) return
        setIsDeleting(true)
        try {
            const success = await deleteMail(mailToDelete.uid)
            if (success) {
                setSelectedIds((prev) => prev.filter((id) => id !== mailToDelete.uid))
                setDeleteModalOpen(false)
                setMailToDelete(null)
                toast.push(<Notification type="success">Hujjat muvaffaqiyatli o&apos;chirildi</Notification>)
            } else {
                toast.push(<Notification type="danger">O&apos;chirishda xatolik yuz berdi</Notification>)
            }
        } finally {
            setIsDeleting(false)
        }
    }

    const processSingleDocument = async (uid: string, keyId: string) => {
        try {
            const hashRes = await axios.get(`${BASE_URL}/mail/hash/${uid}`, { headers: getHeaders() })
            const hash = hashRes.data.hash
            if (!hash) throw new Error("Hash topilmadi")
            const signature = await createPkcs7(keyId, hash)
            if (!signature) throw new Error("Imzolab bo'lmadi")
            await axios.post(`${BASE_URL}/mail/sign/${uid}`, { signature }, { headers: getHeaders() })
            return true
        } catch (error) {
            return false
        }
    }

    const confirmSend = async () => {
        if (!selectedCert) return
        setIsSending(true)
        try {
            const keyId = await loadKey(selectedCert)
            if (mailToSend) {
                const success = await processSingleDocument(mailToSend.uid, keyId)
                if (success) {
                    toast.push(<Notification type="success">Hujjat yuborildi</Notification>)
                    setSendModalOpen(false)
                    fetchData()
                } else {
                    toast.push(<Notification type="danger">Xatolik yuz berdi</Notification>)
                }
            } else {
                setSendModalOpen(false)
                startBulkProcessing(keyId)
            }
        } catch (error: any) {
            toast.push(<Notification type="danger">Imzolashda xatolik</Notification>)
        } finally {
            setIsSending(false)
        }
    }

    const startBulkProcessing = async (activeKeyId: string) => {
        setBulkModalOpen(true)
        setBulkResults({ total: selectedIds.length, processed: 0, success: 0, failed: 0, isComplete: false })
        let sCount = 0
        let fCount = 0
        for (let i = 0; i < selectedIds.length; i++) {
            const success = await processSingleDocument(selectedIds[i], activeKeyId)
            if (success) sCount++
            else fCount++
            setBulkResults(prev => ({ ...prev, processed: i + 1, success: sCount, failed: fCount }))
        }
        setBulkResults(prev => ({ ...prev, isComplete: true }))
        fetchData()
    }

    return (
        <div className="p-4">
            <Card className="mb-4 border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
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
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button variant="solid" color="emerald-600" size="sm" icon={<HiOutlinePaperAirplane className="rotate-90" />} onClick={handleBulkSendClick}>
                                Yuborish ({selectedIds.length})
                            </Button>
                        )}
                        <Button variant="twoTone" color="blue-600" size="sm" icon={<HiOutlineDownload />} loading={isExporting} onClick={handleExportExcel}>Excel</Button>
                        <Button variant="solid" size="sm" icon={<HiOutlinePlus />} onClick={() => navigate('/mail/create-pdf')}>Yangi hujjat</Button>
                    </div>
                </div>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th className="w-[50px] text-center">
                                <input type="checkbox" className="cursor-pointer h-4 w-4 rounded border-gray-300" checked={isAllSelected} onChange={handleSelectAll} />
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
                            <Tr><Td colSpan={7} className="text-center py-10"><Spinner size="40px" /></Td></Tr>
                        ) : filteredMails.length === 0 ? (
                            <Tr><Td colSpan={7} className="text-center py-6 text-gray-500">Ma'lumot topilmadi</Td></Tr>
                        ) : (
                            filteredMails.map((row: any) => (
                                <Tr key={row.uid} className={selectedIds.includes(row.uid) ? 'bg-blue-50' : ''}>
                                    <Td className="text-center">
                                        <input type="checkbox" className="cursor-pointer h-4 w-4 rounded border-gray-300" checked={selectedIds.includes(row.uid)} onChange={() => handleSelectRow(row.uid)} />
                                    </Td>
                                    <Td className="font-mono text-xs w-[120px]">{row.uid}</Td>
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
                                            <Tooltip title="O'chirish">
                                                <Button size="xs" variant="twoTone" color="red-600" icon={<HiOutlineTrash />} onClick={() => openDeleteDialog(row)} />
                                            </Tooltip>
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            <Dialog isOpen={sendModalOpen} onClose={() => setSendModalOpen(false)} title="Hujjatni yuborish" width={500}>
                <div className="pt-4">
                    {error === 'AGENT_NOT_FOUND' ? (
                        <div className="flex flex-col items-center text-center p-4">
                            <HiXCircle className="text-red-500 text-5xl mb-4" />
                            <h3 className="text-lg font-bold">E-IMZO topilmadi</h3>
                            <p className="text-gray-500 text-sm mt-2 mb-6">Imzolash uchun kompyuteringizda E-IMZO moduli yoniq bo'lishi shart.</p>
                            <div className="flex flex-col gap-3 w-full">
                                <Button block variant="solid" color="blue-600" onClick={() => window.open('https://e-imzo.uz/help/install')}>Dasturni yuklash</Button>
                                <Button block variant="plain" onClick={() => init()} loading={storeLoading}>Qayta tekshirish</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <p className="text-gray-600 text-sm italic">{mailToSend ? `ID: ${mailToSend.uid}` : `${selectedIds.length} ta hujjat`}</p>
                            <MissingSign onSignClicked={setSelectedCert} disabled={isSending} />
                            <Button block variant="solid" size="lg" loading={isSending || storeLoading} disabled={!selectedCert} onClick={confirmSend}>
                                {mailToSend ? 'Yuborish' : 'Barchasini yuborish'}
                            </Button>
                        </div>
                    )}
                </div>
            </Dialog>

            <Dialog isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Qoralamani o'chirish" width={420}>
                <div className="mt-4">
                    <p className="text-gray-600 mb-2">
                        Haqiqatan ham <strong>{mailToDelete?.receiverName || mailToDelete?.uid}</strong> qoralamasini o&apos;chirmoqchimisiz?
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Bu amal mail yozuvini va unga bog&apos;langan PDF faylni o&apos;chiradi. Amalni ortga qaytarib bo&apos;lmaydi.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="plain" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
                            Bekor qilish
                        </Button>
                        <Button variant="solid" color="red-600" onClick={handleDeleteDraft} loading={isDeleting}>
                            Ha, o&apos;chirish
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog isOpen={bulkModalOpen} onClose={() => bulkResults.isComplete && setBulkModalOpen(false)} title="Natija" width={500} closable={bulkResults.isComplete}>
                <div className="flex flex-col gap-4 py-4 items-center text-center">
                    {!bulkResults.isComplete ? (
                        <div className="flex flex-col items-center">
                            <Spinner size="40px" className="mb-4" />
                            <p className="text-gray-500">{bulkResults.processed} / {bulkResults.total}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <HiCheckCircle className="text-emerald-500 text-5xl mb-4" />
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{bulkResults.success}</div>
                                    <div className="text-sm">Muvaffaqiyatli</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{bulkResults.failed}</div>
                                    <div className="text-sm">Xato</div>
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
