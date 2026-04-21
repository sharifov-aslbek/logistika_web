import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { Notification, toast } from '@/components/ui' // QO'SHILDI: Chiroyli bildirishnomalar uchun
import AxiosBase from '@/services/axios/AxiosBase'
import { apiGetAdminMails } from '@/services/AdminMailService'
import { useMailStore } from '@/store/mailStore'
import type { ColumnDef } from '@tanstack/react-table'
import { 
    HiOutlineCheckCircle, 
    HiOutlineRefresh, 
    HiOutlineDocumentText,
    HiOutlineXCircle,
    HiOutlineDownload,
    HiOutlineX
} from 'react-icons/hi'

const statusOptions = [
    { label: 'Barchasi', value: '' },
    { label: 'Yuborilgan', value: 'success' },
    { label: 'Yuborilmoqda', value: 'pending' },
    { label: 'Qoralama', value: 'draft' },
    { label: 'Xatolik', value: 'error' }
]

const AdminMailsList = () => {
    const navigate = useNavigate()
    const { exportExcel } = useMailStore()
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // 1. Sahifalash holati
    const [tableData, setTableData] = useState({
        pageIndex: 1,
        pageSize: 10,
        total: 0,
    })

    // 2. Filtrlash holati
    const [filterData, setFilterData] = useState({
        status: '',
        startDate: '',
        endDate: '',
        receiver: '',
        uid: '',
        regionId: null as number | null,
        areaId: null as number | null,
    })

    // 3. Viloyat va Tumanlar ro'yxati
    const [regions, setRegions] = useState<{label: string, value: number}[]>([])
    const [areas, setAreas] = useState<{label: string, value: number}[]>([])
    const [isAreasLoading, setIsAreasLoading] = useState(false)

    // 4. PDF Modal holati
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
    const [isPdfLoading, setIsPdfLoading] = useState(false)

    // --- API: Viloyatlarni yuklash ---
    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const res = await AxiosBase.get('/region')
                const regionData = res.data?.data || res.data?.items || res.data || []
                if (Array.isArray(regionData)) {
                    setRegions(regionData.map((r: any) => ({ 
                        label: r.name || r.nameUz || r.title || `Viloyat ${r.id}`, 
                        value: r.id 
                    })))
                }
            } catch (error) {
                console.error('Viloyatlarni yuklashda xatolik', error)
            }
        }
        fetchRegions()
    }, [])

    // --- API: Viloyat tanlanganda Tumanlarni yuklash ---
    useEffect(() => {
        if (filterData.regionId) {
            const fetchAreas = async () => {
                setIsAreasLoading(true)
                try {
                    const res = await AxiosBase.get(`/region/${filterData.regionId}/areas`)
                    const areaList = res.data?.data?.areas || res.data?.areas || (Array.isArray(res.data?.data) ? res.data?.data : [])
                    
                    if (Array.isArray(areaList)) {
                        setAreas(areaList.map((a: any) => ({ 
                            label: a.name || a.nameUz || a.title || `Tuman ${a.id}`, 
                            value: a.id 
                        })))
                    }
                } catch (error) {
                    console.error('Tumanlarni yuklashda xatolik', error)
                    setAreas([])
                } finally {
                    setIsAreasLoading(false)
                }
            }
            fetchAreas()
        } else {
            setAreas([])
            setFilterData(prev => ({ ...prev, areaId: null }))
        }
    }, [filterData.regionId])

    // --- API: Xatlarni yuklash ---
    const fetchMails = async () => {
        setLoading(true)
        try {
            const params: any = { 
                PageSize: tableData.pageSize, 
                PageIndex: tableData.pageIndex 
            }

            // HOLAT UCHUN:
            if (filterData.status) {
                params.status = filterData.status // Kichik harfda yuboramiz
                params.Status = filterData.status // Katta harfda ham yuboramiz
                
                // Backend isSend (boolean) kutayotgan bo'lishi mumkin
                if (filterData.status === 'success') {
                    params.isSend = true
                } else if (filterData.status === 'pending' || filterData.status === 'error' || filterData.status === 'draft') {
                    params.isSend = false
                }
            }
            
            if (filterData.startDate) params.StartDate = filterData.startDate
            if (filterData.endDate) params.EndDate = filterData.endDate
            if (filterData.receiver) params.Receiver = filterData.receiver
            
            // ID QIDIRISH UCHUN:
            if (filterData.uid) {
                params.searchQuery = filterData.uid
                params.search = filterData.uid 
            }
            
            if (filterData.regionId) params.RegionId = filterData.regionId
            if (filterData.areaId) params.AreaId = filterData.areaId

            const response: any = await apiGetAdminMails(params)
            
            setData(response?.data?.items || response?.items || response?.data || [])
            setTableData((prev) => ({
                ...prev,
                total: response?.data?.totalCount || response?.totalCount || response?.data?.length || 0,
            }))
        } catch (error) {
            console.error('Xatlarni yuklashda xatolik', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMails()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tableData.pageIndex, tableData.pageSize, filterData])

    const handlePreviewPdf = async (uid: string) => {
        setIsPdfLoading(true)
        try {
            const res = await AxiosBase.get(`/mail/${uid}/download`, { responseType: 'blob' })
            const url = URL.createObjectURL(res.data)
            setPreviewPdfUrl(url)
        } catch (error) {
            console.error('PDF yuklashda xatolik', error)
            // ALERT O'RNIGA NOTIFICATION
            toast.push(
                <Notification title="Xatolik" type="danger" duration={3000}>
                    Faylni yuklab bo'lmadi! Iltimos, qayta urinib ko'ring.
                </Notification>,
                { placement: 'top-center' }
            )
        } finally {
            setIsPdfLoading(false)
        }
    }

    const closePdfModal = () => {
        if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl)
        }
        setPreviewPdfUrl(null)
    }

    const handleExportExcel = async () => {
        try {
            const excelParams: any = {}
            
            if (filterData.status) {
                excelParams.status = filterData.status
                excelParams.Status = filterData.status
                if (filterData.status === 'success') excelParams.isSend = true
                else excelParams.isSend = false
            }
            if (filterData.receiver) excelParams.Receiver = filterData.receiver
            if (filterData.uid) {
                excelParams.searchQuery = filterData.uid
                excelParams.search = filterData.uid
            }
            if (filterData.regionId) excelParams.RegionId = filterData.regionId
            if (filterData.areaId) excelParams.AreaId = filterData.areaId
            if (filterData.startDate) excelParams.StartDate = filterData.startDate
            if (filterData.endDate) excelParams.EndDate = filterData.endDate

            const blob = await exportExcel(excelParams)
            
            if (blob) {
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Xatlar_Reestri_${new Date().toLocaleDateString()}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                a.remove()
            }
        } catch (e) {
            console.error("Excel yuklashda xatolik", e)
            // ALERT O'RNIGA NOTIFICATION
            toast.push(
                <Notification title="Xatolik" type="danger" duration={3000}>
                    Excel faylni shakllantirishda xatolik yuz berdi.
                </Notification>,
                { placement: 'top-center' }
            )
        }
    }

    const onPaginationChange = (page: number) => setTableData(prev => ({ ...prev, pageIndex: page }))
    const onSelectChange = (value: number) => setTableData(prev => ({ ...prev, pageSize: value, pageIndex: 1 }))
    const handleFilterChange = (key: string, value: any) => {
        setFilterData(prev => ({ ...prev, [key]: value }))
        setTableData(prev => ({ ...prev, pageIndex: 1 }))
    }

    const handleDateChange = (key: string, date: Date | null) => {
        if (date) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            handleFilterChange(key, `${year}-${month}-${day}`)
        } else {
            handleFilterChange(key, '')
        }
    }

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                header: 'FAYL',
                accessorKey: 'file',
                size: 50, // Узкая колонка
                cell: (props) => (
                    <div className="w-[30px]">
                        <button 
                            onClick={() => handlePreviewPdf(props.row.original.uid)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                            title="PDF ko'rish"
                        >
                            <HiOutlineDocumentText className="text-xl" />
                        </button>
                    </div>
                ),
            },
            {
                header: 'ID',
                accessorKey: 'uid',
                size: 40, // Узкая колонка
                cell: (props) => {
                    const uid = props.row.original.uid
                    return <div className="w-[40px] text-gray-500 font-mono text-xs uppercase" title={uid}>{uid?.substring(0, 8)}</div>
                },
            },
            {
                header: 'QABUL QILUVCHI',
                accessorKey: 'receiverName', 
                size: 350, // Широкая колонка
                cell: (props) => (
                    <div 
                        className="font-semibold text-blue-500 hover:text-blue-700 hover:underline cursor-pointer min-w-[200px] whitespace-normal break-words pr-4"
                        onClick={() => navigate(`/admin/mail/${props.row.original.uid}`)}
                    >
                        {props.row.original.receiverName || props.row.original.receiver || '-'}
                    </div>
                ),
            },
            {
                header: 'MANZIL',
                accessorKey: 'receiverAddress', 
                size: 550, // Широкая колонка
                cell: (props) => (
                    <div className="min-w-[550px] whitespace-normal break-words text-gray-500 text-sm" title={props.row.original.receiverAddress || props.row.original.address}>
                        {props.row.original.receiverAddress || props.row.original.address || '-'}
                    </div>
                ),
            },
            {
                header: 'SANA',
                accessorKey: 'createdAt',
                size: 120, // Обычная колонка
                cell: (props) => {
                    const dateStr = props.row.original.createdAt || props.row.original.date || '';
                    if (!dateStr) return <div className="w-[100px] text-gray-400">-</div>;
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return <div className="w-[100px] text-gray-600">{dateStr}</div>;
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return <div className="w-[100px] text-gray-500 font-medium">{`${day}.${month}.${year}`}</div>
                },
            },
            {
                header: 'HOLAT',
                accessorKey: 'isSend',
                size: 150, // Обычная колонка
                cell: (props) => {
                    const row = props.row.original;
                    const statusStr = (row.sendStatus || '').toLowerCase();
                    
                    let statusText = 'Qoralama';
                    let statusColor = 'text-gray-500';

                    if (statusStr === 'success' || row.isSend) {
                        statusText = 'Yuborilgan';
                        statusColor = 'text-green-600';
                    } else if (statusStr === 'pending' || statusStr === 'processing' || statusStr === 'sending' || statusStr === 'inqueue') {
                        statusText = 'Yuborilmoqda';
                        statusColor = 'text-yellow-600';
                    } else if (statusStr === 'failed' || statusStr === 'error') {
                        statusText = 'Xatolik';
                        statusColor = 'text-red-600';
                    }

                    return (
                        <div className={`w-[120px] text-sm font-medium ${statusColor}`}>
                            {statusText}
                        </div>
                    )
                },
            }
        ],
        [navigate]
    )

    return (
        <div className="flex flex-col gap-4 p-5 h-full relative">
            
            {/* 1. QIDIRUV VA FILTRLAR PANELI UCHUN ALOHIDA ADAPTIVECARD */}
            <AdaptiveCard>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* QATOR 1 */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Holat</label>
                        <Select 
                            size="sm"
                            options={statusOptions}
                            value={statusOptions.find(o => o.value === filterData.status)}
                            onChange={(opt: any) => handleFilterChange('status', opt ? opt.value : '')}
                            isClearable
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sana (Dan)</label>
                        <DatePicker 
                            size="sm"
                            placeholder="Sanadan"
                            value={filterData.startDate ? new Date(filterData.startDate) : null}
                            onChange={(date: Date | null) => handleDateChange('startDate', date)}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sana (Gacha)</label>
                        <DatePicker 
                            size="sm"
                            placeholder="Sanagacha"
                            value={filterData.endDate ? new Date(filterData.endDate) : null}
                            onChange={(date: Date | null) => handleDateChange('endDate', date)}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Viloyat</label>
                        <Select
                            size="sm"
                            placeholder="Viloyat"
                            options={regions}
                            value={regions.find(r => r.value === filterData.regionId) || null}
                            onChange={(opt: any) => {
                                handleFilterChange('regionId', opt ? opt.value : null)
                                handleFilterChange('areaId', null)
                            }}
                            isClearable
                        />
                    </div>

                    {/* QATOR 2 */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tuman</label>
                        <Select
                            size="sm"
                            placeholder="Tuman"
                            options={areas}
                            value={areas.find(a => a.value === filterData.areaId) || null}
                            onChange={(opt: any) => handleFilterChange('areaId', opt ? opt.value : null)}
                            isDisabled={!filterData.regionId}
                            isLoading={isAreasLoading}
                            isClearable
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Qabul qiluvchi</label>
                        <Input 
                            size="sm"
                            placeholder="Ism bo'yicha..." 
                            value={filterData.receiver}
                            onChange={(e) => handleFilterChange('receiver', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">ID Qidirish</label>
                        <Input 
                            size="sm"
                            placeholder="ID bo'yicha..." 
                            value={filterData.uid}
                            onChange={(e) => handleFilterChange('uid', e.target.value)}
                        />
                    </div>
                    
                    {/* TUGMALAR */}
                    <div className="flex flex-col gap-2 justify-end">
                        <button 
                            onClick={fetchMails} 
                            className="flex items-center justify-center gap-2 py-1.5 w-full bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition shadow-sm"
                        >
                            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} /> Yangilash
                        </button>
                        <button 
                            onClick={handleExportExcel} 
                            className="flex items-center justify-center gap-2 py-1.5 w-full bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition shadow-sm"
                        >
                            <HiOutlineDownload /> Excel
                        </button>
                    </div>
                </div>
            </AdaptiveCard>

            {/* 2. JADVAL UCHUN ALOHIDA ADAPTIVECARD */}
            <AdaptiveCard className="flex-1" bodyClass="h-full">
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    pagingData={tableData}
                    onPaginationChange={onPaginationChange}
                    onSelectChange={onSelectChange}
                />
            </AdaptiveCard>

            {/* PDF KO'RISH MODAL */}
            {(previewPdfUrl || isPdfLoading) && (
                <div className="fixed inset-0 z-[99] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-4 py-3 bg-gray-900 text-gray-300">
                            <div className="flex items-center gap-3 font-medium">
                                <HiOutlineDocumentText className="text-xl text-gray-400" />
                                Hujjatni ko'rish (Chop etish versiyasi)
                            </div>
                            <button 
                                onClick={closePdfModal} 
                                className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition"
                            >
                                <HiOutlineX className="text-xl" />
                            </button>
                        </div>
                        
                        {/* Modal Body / Iframe */}
                        <div className="flex-1 w-full bg-gray-100 flex items-center justify-center relative">
                            {isPdfLoading ? (
                                <div className="flex flex-col items-center text-gray-500">
                                    <HiOutlineRefresh className="text-4xl animate-spin mb-3 text-blue-500" />
                                    <span className="font-medium">Hujjat yuklanmoqda...</span>
                                </div>
                            ) : previewPdfUrl ? (
                                <iframe 
                                    src={previewPdfUrl} 
                                    className="w-full h-full border-0" 
                                    title="PDF Preview"
                                />
                            ) : null}
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminMailsList