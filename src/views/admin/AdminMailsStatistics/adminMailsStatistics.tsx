import { useState, useEffect } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import { apiGetAdminMailStatistics } from '@/services/AdminMailService'
import { HiOutlineRefresh } from 'react-icons/hi'

const AdminMailStatistics = () => {
    const [stats, setStats] = useState<any>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const statsRes: any = await apiGetAdminMailStatistics()
            setStats(statsRes?.data || statsRes || {})
        } catch (error) {
            console.error('Ошибка при загрузке статистики', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="mb-1">Xatlar statistikasi</h3>
                    <p className="text-sm text-gray-500">Global yuk tashish statistikasi</p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                >
                    <HiOutlineRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdaptiveCard>
                    <div className="p-2 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 font-medium">Barcha xatlar</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.total || 0}</h3>
                    </div>
                </AdaptiveCard>
                <AdaptiveCard>
                    <div className="p-2 border-l-4 border-green-500">
                        <p className="text-sm text-gray-500 font-medium">Yuborilgan xatlar</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.sent || 0}</h3>
                    </div>
                </AdaptiveCard>
                <AdaptiveCard>
                    <div className="p-2 border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500 font-medium">Kutilmoqda</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.pending || 0}</h3>
                    </div>
                </AdaptiveCard>
                <AdaptiveCard>
                    <div className="p-2 border-l-4 border-red-500">
                        <p className="text-sm text-gray-500 font-medium">Muvaffaqiyatsiz</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.failed || 0}</h3>
                    </div>
                </AdaptiveCard>
            </div>
        </div>
    )
}

export default AdminMailStatistics