import { useState, useEffect, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import { apiGetAdminOrganizations, apiPutAdminOrganization } from '@/services/AdminOrganizationService'
import type { ColumnDef } from '@tanstack/react-table'
import { HiOutlinePencil, HiOutlineX } from 'react-icons/hi'

const AdminOrganizations = () => {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editModal, setEditModal] = useState<any | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const response: any = await apiGetAdminOrganizations({ PageSize: 50, PageIndex: 1 })
            setData(response?.data?.items || response?.items || response?.data || [])
        } catch (error) {
            console.error('Ошибка при загрузке организаций', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editModal) return
        try {
            await apiPutAdminOrganization(editModal.id, editModal)
            setEditModal(null)
            fetchData() // Обновляем таблицу после сохранения
        } catch (error) {
            console.error('Ошибка при сохранении', error)
            alert('Ошибка при сохранении данных организации')
        }
    }

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                header: 'ID',
                accessorKey: 'id',
                cell: (props) => <span className="text-gray-500">#{props.row.original.id}</span>,
            },
            {
                header: 'Qisqa ismi',
                accessorKey: 'shortName',
                cell: (props) => <span className="font-medium">{props.row.original.shortName || '-'}</span>,
            },
            {
                header: 'To\'liq ismi',
                accessorKey: 'fullName',
                cell: (props) => (
                    <div className="max-w-[250px] truncate" title={props.row.original.fullName}>
                        {props.row.original.fullName || '-'}
                    </div>
                ),
            },
            {
                header: 'INN',
                accessorKey: 'inn',
                cell: (props) => <span className="font-mono text-gray-600">{props.row.original.inn || '-'}</span>,
            },
            {
                header: 'Manzil',
                accessorKey: 'address',
                cell: (props) => (
                    <div className="max-w-[200px] truncate" title={props.row.original.address}>
                        {props.row.original.address || '-'}
                    </div>
                ),
            },
            {
                header: 'Holat',
                accessorKey: 'status',
                cell: (props) => {
                    const status = props.row.original.status || 'Active'
                    return (
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {status}
                        </span>
                    )
                },
            },
            // {
            //     header: 'Amallar',
            //     id: 'action',
            //     cell: (props) => (
            //         <button 
            //             onClick={() => setEditModal(props.row.original)}
            //             className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            //             title="Редактировать"
            //         >
            //             <HiOutlinePencil className="text-lg" />
            //         </button>
            //     ),
            // },
        ],
        []
    )

    return (
        <>
            <AdaptiveCard className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="mb-1">Barcha tashkilotlar</h3>
                        <p className="text-sm text-gray-500">Ro'yxatdan o'tgan tashkilotlar ro'yxati (Tashkilotlar)</p>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    pagingData={{
                        total: data.length,
                        pageIndex: 1,
                        pageSize: data.length > 0 ? data.length : 10,
                    }}
                />
            </AdaptiveCard>

            {/* Модальное окно редактирования */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">Tashkilotni tahrirlash</h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                <HiOutlineX className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qisqa ismi</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.shortName || ''} 
                                    onChange={e => setEditModal({...editModal, shortName: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To'liq ismi</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.fullName || ''} 
                                    onChange={e => setEditModal({...editModal, fullName: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.inn || ''} 
                                    onChange={e => setEditModal({...editModal, inn: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.address || ''} 
                                    onChange={e => setEditModal({...editModal, address: e.target.value})} 
                                />
                            </div>
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Bekor qilish</button>
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminOrganizations