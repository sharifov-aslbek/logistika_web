import { useState, useEffect, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import { apiGetAdminUsers, apiPatchAdminUserStatus, apiPatchAdminUserPassword } from '@/services/AdminUserService'
import type { ColumnDef } from '@tanstack/react-table'
import { HiOutlineLockClosed, HiOutlineX } from 'react-icons/hi'

const getRoleInfo = (roleId: number) => {
    switch (roleId) {
        case 0:
            return { label: 'Foydalanuvchi', class: 'bg-gray-100 text-gray-600' }
        case 10:
            return { label: 'Ishchi', class: 'bg-blue-100 text-blue-600' }
        case 20:
            return { label: 'Filial Direktori', class: 'bg-yellow-100 text-yellow-600' }
        case 30:
            return { label: 'Tashkilot Direktori', class: 'bg-indigo-100 text-indigo-600' }
        case 40:
            return { label: 'Admin', class: 'bg-red-100 text-red-600' }
        case 50:
            return { label: 'Super Admin', class: 'bg-red-100 text-red-600' }
        default:
            return { label: "Noma'lum", class: 'bg-gray-100 text-gray-500' }
    }
}

const AdminUsers = () => {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [resetPassModal, setResetPassModal] = useState<any | null>(null)
    const [newPassword, setNewPassword] = useState('')

    // 1. Добавляем состояние для пагинации
    const [tableData, setTableData] = useState({
        pageIndex: 1,
        pageSize: 10,
        total: 0,
    })

    // 2. Добавляем зависимости в useEffect, чтобы данные обновлялись при смене страницы
    useEffect(() => {
        fetchData()
    }, [tableData.pageIndex, tableData.pageSize])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Передаем динамические параметры
            const response: any = await apiGetAdminUsers({ 
                PageSize: tableData.pageSize, 
                PageIndex: tableData.pageIndex 
            })
            
            setData(response?.data?.items || response?.items || response?.data || [])
            
            // Обновляем общее количество записей (total) из ответа бэкенда
            setTableData((prev) => ({
                ...prev,
                total: response?.data?.totalCount || response?.totalCount || response?.data?.length || 0,
            }))
        } catch (error) {
            console.error('Foydalanuvchilarni yuklashda xatolik', error)
        } finally {
            setLoading(false)
        }
    }

    // 3. Функции-обработчики для таблицы
    const onPaginationChange = (page: number) => {
        setTableData((prev) => ({ ...prev, pageIndex: page }))
    }

    const onSelectChange = (value: number) => {
        setTableData((prev) => ({ ...prev, pageSize: value, pageIndex: 1 }))
    }

    // Изменение статуса пользователя
    const toggleStatus = async (user: any) => {
        try {
            await apiPatchAdminUserStatus(user.id, { isActive: !user.isActive })
            fetchData() // Обновляем таблицу после смены статуса
        } catch (error) {
            console.error('Holatni o\'zgartirishda xatolik', error)
            alert('Holatni o\'zgartirib bo\'lmadi')
        }
    }

    // Сброс пароля
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resetPassModal || !newPassword) return
        
        try {
            await apiPatchAdminUserPassword(resetPassModal.id, { newPassword })
            setResetPassModal(null)
            setNewPassword('')
            alert('Parol muvaffaqiyatli tiklandi!')
        } catch (error) {
            console.error('Parolni tiklashda xatolik', error)
            alert('Parolni tiklashda xatolik yuz berdi')
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
                header: 'Telefon',
                accessorKey: 'phone',
                cell: (props) => <span className="font-medium text-gray-800">{props.row.original.phone}</span>,
            },
            {
                header: 'F.I.SH',
                accessorKey: 'fullName',
                cell: (props) => <span className="font-medium">{props.row.original.fullName || '-'}</span>,
            },
            {
                header: 'JSHSHIR (PINFL)',
                accessorKey: 'pinfl',
                cell: (props) => <span className="font-mono text-gray-600">{props.row.original.pinfl || '-'}</span>,
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
                header: 'Rol',
                accessorKey: 'role',
                cell: (props) => {
                    const roleInfo = getRoleInfo(props.row.original.role)
                    return (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${roleInfo.class}`}>
                            {roleInfo.label}
                        </span>
                    )
                },
            },
            {
                header: 'Holat',
                accessorKey: 'isActive',
                cell: (props) => {
                    const isActive = props.row.original.isActive
                    return isActive ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                            Faol
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md">
                            Faol emas
                        </span>
                    )
                },
            },
            {
                header: 'Amallar',
                id: 'action',
                cell: (props) => {
                    const user = props.row.original
                    return (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => toggleStatus(user)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                                    user.isActive 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                                title={user.isActive ? 'Bloklash' : 'Faollashtirish'}
                            >
                                {user.isActive ? 'Bloklash' : 'Faollashtirish'}
                            </button>
                            
                            <button 
                                onClick={() => setResetPassModal(user)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                                title="Parolni tiklash"
                            >
                                <HiOutlineLockClosed className="text-sm" /> Tiklash
                            </button>
                        </div>
                    )
                },
            },
        ],
        []
    )

    return (
        <div className="flex flex-col p-5 gap-4 h-full relative">
            <AdaptiveCard className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="mb-1">Barcha foydalanuvchilar</h3>
                        <p className="text-sm text-gray-500">Tizim foydalanuvchilarini boshqarish paneli</p>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    pagingData={tableData}
                    onPaginationChange={onPaginationChange}
                    onSelectChange={onSelectChange}
                />
            </AdaptiveCard>

            {/* Модальное окно сброса пароля */}
            {resetPassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">Parolni tiklash</h3>
                            <button onClick={() => {
                                setResetPassModal(null)
                                setNewPassword('')
                            }} className="text-gray-400 hover:text-gray-600">
                                <HiOutlineX className="text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div className="mb-2">
                                <p className="text-sm text-gray-500">Foydalanuvchi: <span className="font-medium text-gray-800">{resetPassModal.phone}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yangi parol</label>
                                <input 
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    required
                                    minLength={6}
                                    placeholder="Yangi parolni kiriting"
                                />
                            </div>
                            <div className="flex justify-end pt-4 space-x-3">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setResetPassModal(null)
                                        setNewPassword('')
                                    }} 
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                >
                                    Bekor qilish
                                </button>
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminUsers