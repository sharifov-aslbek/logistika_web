import { useState, useEffect, useMemo, useRef } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Input from '@/components/ui/Input'
import { Notification, toast } from '@/components/ui'
import { apiGetAdminTemplates, apiPutAdminTemplate, apiDeleteAdminTemplate } from '@/services/AdminTemplateService'
import AxiosBase from '@/services/axios/AxiosBase'
import type { ColumnDef } from '@tanstack/react-table'
import { HiOutlinePencil, HiOutlineX, HiOutlineDownload, HiOutlineTrash, HiOutlineRefresh } from 'react-icons/hi'

const AdminTemplates = () => {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editModal, setEditModal] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Файл для загрузки
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [tableData, setTableData] = useState({
        pageIndex: 1,
        pageSize: 10,
        total: 0,
    })

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tableData.pageIndex, tableData.pageSize, searchTerm])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params: any = { 
                PageSize: tableData.pageSize, 
                PageIndex: tableData.pageIndex 
            }
            if (searchTerm) params.SearchTerm = searchTerm

            const response: any = await apiGetAdminTemplates(params)
            setData(response?.data?.items || response?.items || response?.data || [])
            setTableData((prev) => ({
                ...prev,
                total: response?.data?.totalCount || response?.totalCount || response?.data?.length || 0,
            }))
        } catch (error) {
            console.error('Shablonlarni yuklashda xatolik', error)
        } finally {
            setLoading(false)
        }
    }

    const onPaginationChange = (page: number) => setTableData((prev) => ({ ...prev, pageIndex: page }))
    const onSelectChange = (value: number) => setTableData((prev) => ({ ...prev, pageSize: value, pageIndex: 1 }))

    // Yuklab olish
    const handleDownload = async (id: number, name: string) => {
        try {
            const res = await AxiosBase.get(`/admin/template/${id}/download`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            
            // DOCX o'rniga HTML formatida saqlaymiz
            a.download = `${name || 'Template'}.html` 
            
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
        } catch (error) {
            toast.push(<Notification title="Xatolik" type="danger">Faylni yuklab bo'lmadi</Notification>, { placement: 'top-center' })
        }
    }

    // O'chirish
    const handleDelete = async (id: number) => {
        if (!window.confirm('Haqiqatan ham bu shablonni o\'chirmoqchimisiz?')) return
        try {
            await apiDeleteAdminTemplate(id)
            toast.push(<Notification title="Muvaffaqiyatli" type="success">Shablon o'chirildi</Notification>, { placement: 'top-center' })
            fetchData()
        } catch (error) {
            toast.push(<Notification title="Xatolik" type="danger">O'chirishda xatolik</Notification>, { placement: 'top-center' })
        }
    }

    // Tahrirlashni saqlash
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editModal) return
        try {
            const formData = new FormData()
            formData.append('Name', editModal.name)
            if (selectedFile) {
                formData.append('File', selectedFile)
            }

            await apiPutAdminTemplate(editModal.id, formData)
            
            toast.push(<Notification title="Muvaffaqiyatli" type="success">Shablon yangilandi</Notification>, { placement: 'top-center' })
            setEditModal(null)
            setSelectedFile(null)
            fetchData()
        } catch (error) {
            toast.push(<Notification title="Xatolik" type="danger">Saqlashda xatolik yuz berdi</Notification>, { placement: 'top-center' })
        }
    }

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                header: 'ID',
                accessorKey: 'id',
                size: 80,
                cell: (props) => <span className="text-gray-500">#{props.row.original.id}</span>,
            },
            {
                header: 'Nomi',
                accessorKey: 'name',
                cell: (props) => <span className="font-medium text-gray-800">{props.row.original.name || '-'}</span>,
            },
            {
                header: 'Tashkilot',
                accessorKey: 'organizationName',
                cell: (props) => (
                    <div className="max-w-[200px] truncate font-medium text-gray-600" title={props.row.original.organizationName}>
                        {props.row.original.organizationName || '-'}
                    </div>
                ),
            },
            {
                header: 'Tashkilot ID',
                accessorKey: 'organizationId',
                cell: (props) => <span className="font-mono text-gray-500">{props.row.original.organizationId || '-'}</span>,
            },
            {
                header: 'User ID',
                accessorKey: 'userId',
                cell: (props) => <span className="font-mono text-gray-500">{props.row.original.userId || '-'}</span>,
            },
            {
                header: 'Yaratilgan sana',
                accessorKey: 'createdOn',
                cell: (props) => {
                    const dateStr = props.row.original.createdOn;
                    if (!dateStr) return <span className="text-gray-400">-</span>;
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return <span className="text-gray-600">{dateStr}</span>;
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    return <span className="text-gray-600 text-sm">{`${day}.${month}.${year} ${hours}:${minutes}`}</span>;
                },
            },
            {
                header: 'Amallar',
                id: 'action',
                size: 150,
                cell: (props) => (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleDownload(props.row.original.id, props.row.original.name)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Yuklab olish"
                        >
                            <HiOutlineDownload className="text-lg" />
                        </button>
                        <button 
                            onClick={() => {
                                setEditModal({...props.row.original})
                                setSelectedFile(null)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Tahrirlash"
                        >
                            <HiOutlinePencil className="text-lg" />
                        </button>
                        <button 
                            onClick={() => handleDelete(props.row.original.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="O'chirish"
                        >
                            <HiOutlineTrash className="text-lg" />
                        </button>
                    </div>
                ),
            },
        ],
        []
    )

    return (
        <div className="flex flex-col p-5 gap-4 h-full relative">
            <AdaptiveCard className="h-full" bodyClass="h-full flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="mb-1 text-xl font-bold text-gray-800">Shablonlar (Templates)</h3>
                        <p className="text-sm text-gray-500">Tizimdagi barcha shablonlarni boshqarish</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input 
                            size="sm"
                            placeholder="Nomi bo'yicha qidirish..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <button 
                            onClick={fetchData} 
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                        >
                            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                    <DataTable
                        columns={columns}
                        data={data}
                        loading={loading}
                        pagingData={tableData}
                        onPaginationChange={onPaginationChange}
                        onSelectChange={onSelectChange}
                    />
                </div>
            </AdaptiveCard>

            {/* Tahrirlash Modali */}
            {editModal && (
                <div className="fixed inset-0 z-[99] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">Shablonni tahrirlash</h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                <HiOutlineX className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.name || ''} 
                                    onChange={e => setEditModal({...editModal, name: e.target.value})} 
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yangi fayl yuklash (ixtiyoriy)</label>
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Faqat faylni almashtirmoqchi bo'lsangiz yuklang</p>
                            </div>
                            
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Bekor qilish</button>
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminTemplates