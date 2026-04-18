import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import AxiosBase from '@/services/axios/AxiosBase'
import { apiGetAdminMails } from '@/services/AdminMailService'
import type { ColumnDef } from '@tanstack/react-table'
import { 
    HiOutlineCheckCircle, 
    HiOutlineRefresh, 
    HiOutlineEye, 
    HiOutlineDocumentText,
    HiOutlineXCircle
} from 'react-icons/hi'

const AdminMailsList = () => {
    const navigate = useNavigate()
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
        receiver: '',
        uid: '',
        regionId: null as number | null,
        areaId: null as number | null,
    })

    // 3. Viloyat va Tumanlar ro'yxati
    const [regions, setRegions] = useState<{label: string, value: number}[]>([])
    const [areas, setAreas] = useState<{label: string, value: number}[]>([])
    const [isAreasLoading, setIsAreasLoading] = useState(false)

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
                    
                    // ТУТ ИСПРАВЛЕНИЕ: берем массив areas из нужного места
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
            // Agar viloyat tozalanib tashlansa, tumanlarni ham tozalaymiz
            setAreas([])
            setFilterData(prev => ({ ...prev, areaId: null }))
        }
    }, [filterData.regionId])

    // --- API: Xatlarni yuklash (Debounce bilan) ---
    useEffect(() => {
        const fetchMails = async () => {
            setLoading(true)
            try {
                const params: any = { 
                    PageSize: tableData.pageSize, 
                    PageIndex: tableData.pageIndex 
                }

                // Filtr parametrlarini qo'shamiz
                if (filterData.receiver) params.Receiver = filterData.receiver
                if (filterData.uid) params.Uid = filterData.uid
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

        // Qidiruvda API ga ortiqcha so'rov tushmasligi uchun 500ms kutamiz (Debounce)
        const timeoutId = setTimeout(() => {
            fetchMails()
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [tableData.pageIndex, tableData.pageSize, filterData])

    // --- Handlers ---
    const onPaginationChange = (page: number) => {
        setTableData((prev) => ({ ...prev, pageIndex: page }))
    }

    const onSelectChange = (value: number) => {
        setTableData((prev) => ({ ...prev, pageSize: value, pageIndex: 1 }))
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilterData(prev => ({ ...prev, [key]: value }))
        setTableData(prev => ({ ...prev, pageIndex: 1 })) // Filtr o'zgarganda 1-sahifaga qaytamiz
    }

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                header: 'UID',
                accessorKey: 'uid',
                cell: (props) => {
                    const uid = props.row.original.uid
                    return <span className="text-gray-400 font-mono text-xs" title={uid}>{uid?.length > 8 ? `${uid.substring(0, 8)}...` : uid}</span>
                },
            },
            {
                header: 'Qabul qiluvchi',
                accessorKey: 'receiverName', 
                cell: (props) => <span className="font-medium text-gray-800">{props.row.original.receiverName || props.row.original.receiver || '-'}</span>,
            },
            {
                header: 'Manzil',
                accessorKey: 'receiverAddress', 
                cell: (props) => (
                    <div className="max-w-[250px] truncate text-gray-600" title={props.row.original.receiverAddress || props.row.original.address}>
                        {props.row.original.receiverAddress || props.row.original.address || '-'}
                    </div>
                ),
            },
            {
                header: 'Shablon',
                accessorKey: 'templateName',
                cell: (props) => (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                        {props.row.original.templateName || 'Belgilanmagan'}
                    </span>
                ),
            },
            {
                header: 'Holat',
                accessorKey: 'isSend',
                cell: (props) => {
                    const row = props.row.original;
                    const statusStr = (row.sendStatus || '').toLowerCase();
                    
                    let statusText = 'Yaratilgan';
                    let statusColor = 'bg-gray-100 text-gray-700';
                    let Icon = HiOutlineDocumentText;

                    if (statusStr === 'success' || row.isSend) {
                        statusText = 'Yuborilgan';
                        statusColor = 'bg-green-100 text-green-700';
                        Icon = HiOutlineCheckCircle;
                    } else if (statusStr === 'pending' || statusStr === 'processing' || statusStr === 'sending' || statusStr === 'inqueue') {
                        statusText = 'Yuborilmoqda';
                        statusColor = 'bg-yellow-100 text-yellow-700';
                        Icon = HiOutlineRefresh;
                    } else if (statusStr === 'failed' || statusStr === 'error') {
                        statusText = 'Xatolik';
                        statusColor = 'bg-red-100 text-red-700';
                        Icon = HiOutlineXCircle;
                    }

                    return (
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${statusColor}`}>
                            <Icon className={`text-base mr-1.5 ${statusText === 'Yuborilmoqda' ? 'animate-spin' : ''}`} /> 
                            {statusText}
                        </span>
                    )
                },
            },
            {
                header: 'Amallar',
                id: 'action',
                cell: (props) => (
                    <button 
                        onClick={() => navigate(`/admin/mail/${props.row.original.uid}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Batafsil ko'rish"
                    >
                        <HiOutlineEye className="text-lg" />
                    </button>
                ),
            },
        ],
        [navigate]
    )

    return (
        <AdaptiveCard className="h-full" bodyClass="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="mb-1 text-xl font-bold text-gray-800">Barcha xatlar</h3>
                    <p className="text-sm text-gray-500">Tizimdagi barcha xatlar reyestri va qidiruv</p>
                </div>
            </div>

            {/* QIDIRUV VA FILTRLAR PANELI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Qabul qiluvchi
                    </label>
                    <Input 
                        size="sm"
                        placeholder="Ism bo'yicha qidirish..." 
                        value={filterData.receiver}
                        onChange={(e) => handleFilterChange('receiver', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Qidirish
                    </label>
                    <Input 
                        size="sm"
                        placeholder="UID bo'yicha..." 
                        value={filterData.uid}
                        onChange={(e) => handleFilterChange('uid', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Viloyat
                    </label>
                    <Select
                        size="sm"
                        placeholder="Viloyatni tanlang"
                        options={regions}
                        value={regions.find(r => r.value === filterData.regionId) || null}
                        onChange={(opt: any) => {
                            handleFilterChange('regionId', opt ? opt.value : null)
                            handleFilterChange('areaId', null) // Viloyat o'zgarsa, tumanni tozalaymiz
                        }}
                        isClearable
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Tuman
                    </label>
                    <Select
                        size="sm"
                        placeholder="Tumanni tanlang"
                        options={areas}
                        value={areas.find(a => a.value === filterData.areaId) || null}
                        onChange={(opt: any) => handleFilterChange('areaId', opt ? opt.value : null)}
                        isDisabled={!filterData.regionId} // Viloyat tanlanmaguncha Tuman qulflangan bo'ladi
                        isLoading={isAreasLoading}
                        isClearable
                    />
                </div>
            </div>

            {/* JADVAL */}
            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                pagingData={tableData}
                onPaginationChange={onPaginationChange}
                onSelectChange={onSelectChange}
            />
        </AdaptiveCard>
    )
}

export default AdminMailsList