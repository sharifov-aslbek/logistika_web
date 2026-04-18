import { useState, useEffect, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import { apiGetAdminBranches, apiPutAdminBranch } from '@/services/AdminBranchService'
import type { ColumnDef } from '@tanstack/react-table'
import { HiOutlinePencil, HiOutlineX } from 'react-icons/hi'

const AdminBranches = () => {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editModal, setEditModal] = useState<any | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const response: any = await apiGetAdminBranches({ PageSize: 50, PageIndex: 1 })
            setData(response?.data?.items || response?.items || response?.data || [])
        } catch (error) {
            console.error('Ошибка при загрузке филиалов', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editModal) return
        try {
            await apiPutAdminBranch(editModal.id, editModal)
            setEditModal(null)
            fetchData() // Обновляем таблицу после сохранения
        } catch (error) {
            console.error('Ошибка при сохранении', error)
            alert('Ошибка при сохранении данных филиала')
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
                header: 'Nomi',
                accessorKey: 'name',
                cell: (props) => (
                    <div className="max-w-[250px] truncate font-medium" title={props.row.original.name}>
                        {props.row.original.name || '-'}
                    </div>
                ),
            },
            {
                header: 'Kod',
                accessorKey: 'code',
                cell: (props) => <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{props.row.original.code || '-'}</span>,
            },
            {
                header: 'Manzil',
                accessorKey: 'address',
                cell: (props) => (
                    <div className="max-w-[250px] truncate" title={props.row.original.address}>
                        {props.row.original.address || '-'}
                    </div>
                ),
            },
            {
                header: 'Direktor PINFL',
                accessorKey: 'directorPinfl',
                cell: (props) => <span className="font-mono text-gray-600">{props.row.original.directorPinfl || '-'}</span>,
            },
            {
                header: 'Amallar',
                id: 'action',
                cell: (props) => (
                    <button 
                        onClick={() => setEditModal(props.row.original)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Редактировать"
                    >
                        <HiOutlinePencil className="text-lg" />
                    </button>
                ),
            },
        ],
        []
    )

    return (
        <>
            <AdaptiveCard className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="mb-1">Barcha filiallar</h3>
                        <p className="text-sm text-gray-500">Tashkilotlar filiallarini boshqish</p>
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
                            <h3 className="text-lg font-semibold text-gray-800">Filialni tahrirlash</h3>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.code || ''} 
                                    onChange={e => setEditModal({...editModal, code: e.target.value})} 
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Direktor PINFL</label>
                                <input 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editModal.directorPinfl || ''} 
                                    onChange={e => setEditModal({...editModal, directorPinfl: e.target.value})} 
                                    maxLength={14}
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

export default AdminBranches