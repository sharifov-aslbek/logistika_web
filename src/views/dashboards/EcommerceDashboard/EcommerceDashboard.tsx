import React, { useEffect, useState } from 'react'
import { useMailStore } from '@/store/mailStore'
import { apiGetAdminMailStatistics } from '@/services/AdminMailService'
import Loading from '@/components/shared/Loading'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Chart from '@/components/shared/Chart'
import MailOverview from '@/components/MailOverview'
import MailStatusChart from '@/components/MailStatusChart'
import RecentMails from '@/components/RecentMails'
import {
    HiOutlineOfficeBuilding,
    HiOutlineMail,
    HiOutlineCheckCircle,
    HiOutlineRefresh
} from 'react-icons/hi'

type MailStatusDistributionItem = {
    count?: number
    statusName?: string | null
}

const EcommerceDashboard = () => {
    // 1. Zustand Store
    const getDashboardStats = useMailStore((state) => state.getDashboardStats)
    const dashboardStats = useMailStore((state) => state.dashboardStats)
    const isLoadingStore = useMailStore((state) => state.isLoading)

    // 2. Local State
    const [stats, setStats] = useState<any>({})
    const [isStatsLoading, setIsStatsLoading] = useState(false)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)

    // Проверяем роль (Super Admin или нет)
    useEffect(() => {
        try {
            const storageData = localStorage.getItem('account-storage')
            if (storageData) {
                const parsed = JSON.parse(storageData)
                const role = parsed?.state?.user?.role || parsed?.state?.userProfile?.role || 0
                const auths = parsed?.state?.user?.authority || parsed?.state?.userProfile?.authority || []
                
                if (role === 50 || role === 40 || auths.includes('Super Admin') || auths.includes('admin')) {
                    setIsSuperAdmin(true)
                }
            }
        } catch (error) {
            console.error('Role parse error:', error)
        }
    }, [])

    // Загрузка данных
    const fetchAllData = async () => {
        try {
            getDashboardStats() 
            
            if (isSuperAdmin) {
                setIsStatsLoading(true)
                const statsRes: any = await apiGetAdminMailStatistics()
                setStats(statsRes?.data?.data || statsRes?.data || statsRes || {})
            }
        } catch (error) {
            console.error('Dashboard ma\'lumotlarini yuklashda xatolik:', error)
        } finally {
            setIsStatsLoading(false)
        }
    }

    useEffect(() => {
        fetchAllData()
    }, [isSuperAdmin])

    const isLoading = isLoadingStore || isStatsLoading
    const safeData = dashboardStats || {}
    const overview = stats?.overview || {}
    const today = stats?.today || {}
    const charts = stats?.charts || {}
    const mailStatusDistribution: MailStatusDistributionItem[] = Array.isArray(safeData?.mailStatusDistribution)
        ? safeData.mailStatusDistribution
        : []

    const getMailCountByStatus = (status: 'success' | 'null') =>
        mailStatusDistribution.find(
            (item) => (item?.statusName?.toLowerCase() || 'null') === status,
        )?.count ?? 0

    const createdMailCount = getMailCountByStatus('null')
    const successSentMailCount = getMailCountByStatus('success')

    // Данные для админа
    const last7Days = charts.last7Days || []
    const topOrganizations = charts.topOrganizations || []
    const totalMails = overview.totalMails || 0;
    const sentMails = overview.sentMails || 0;
    const createdToday = today?.createdToday || 0;
    const sentToday = today?.sentToday || 0;

    // Функция для красивого форматирования даты с названием дня недели
    const formatChartDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString.substring(5); // Если ошибка, вернем как было
        const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        return `${date.getDate()} ${months[date.getMonth()]}, ${days[date.getDay()]}`; // Вывод: "13 Apr, Dushanba"
    };

    return (
        <Loading loading={isLoading}>
            <AdaptiveCard className="h-full">
                <div className="flex flex-col gap-6 h-full pb-2">
                    
                    {/* --- HEADER С КНОПКОЙ ОБНОВЛЕНИЯ --- */}
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="mb-1 text-xl font-bold text-gray-800">Asosiy Panel</h3>
                            <p className="text-sm text-gray-500">Tizimning umumiy statistikasi va holati</p>
                        </div>
                        <button
                            onClick={fetchAllData}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition shadow-sm"
                            title="Yangilash"
                        >
                            <HiOutlineRefresh className={`text-xl ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                        </button>
                    </div>

                    {isSuperAdmin ? (
                        /* ========================================= */
                        /* ИНТЕРФЕЙС SUPER ADMIN (Администратор)    */
                        /* ========================================= */
                        <div className="flex flex-col gap-6">
                            
                            {/* 1. ВЕРХНИЙ БЛОК: 4 КАРТОЧКИ СТАТИСТИКИ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <AdaptiveCard>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">Barcha xatlar</p>
                                            <h3 className="text-3xl font-bold text-gray-800">{totalMails}</h3>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                                            <HiOutlineMail />
                                        </div>
                                    </div>
                                </AdaptiveCard>

                                <AdaptiveCard>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">Yuborilgan xatlar</p>
                                            <h3 className="text-3xl font-bold text-gray-800">{sentMails}</h3>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-2xl">
                                            <HiOutlineCheckCircle />
                                        </div>
                                    </div>
                                </AdaptiveCard>

                                <AdaptiveCard>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">Bugun yaratilgan xatlar</p>
                                            <h3 className="text-3xl font-bold text-gray-800">{createdToday}</h3>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
                                            <HiOutlineMail />
                                        </div>
                                    </div>
                                </AdaptiveCard>

                                <AdaptiveCard>
                                    <div className="flex items-start justify-between">
                                             <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-2">Bugun yuborilgan xatlar</p>
                                            <h3 className="text-3xl font-bold text-gray-800">{sentToday}</h3>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-2xl">
                                            <HiOutlineCheckCircle />
                                        </div>
                                    </div>
                                </AdaptiveCard>
                            </div>

                            {/* 2. СРЕДНИЙ БЛОК: 2 ГРАФИКА (Сетка из 5 колонок: 60% на 40%) */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                
                                {/* Главный график: 3 из 5 колонок (60%) */}
                                <div className="lg:col-span-3">
                                    <MailOverview
                                        data={{
                                            monthlyStats: safeData.monthlyStats || safeData.timeline || [],
                                            yearlyStats: safeData.yearlyStats || [],
                                            createdMail: createdMailCount,
                                            successSentMail: successSentMailCount,
                                        }}
                                        isAdmin={true}
                                        hideStats={true}
                                    />
                                </div>

                                {/* График 7 дней: 2 из 5 колонок (40%) */}
                                <div className="lg:col-span-2">
                                    <AdaptiveCard className="h-full">
                                        <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-lg font-bold text-gray-800">So'nggi kunlar dinamikasi</h4>
                                    </div>
                                    {last7Days.length > 0 ? (
                                        <Chart
                                            type="area"
                                            series={[
                                                { name: 'Yaratilgan', data: last7Days.map((d: any) => d.created || 0) },
                                                { name: 'Yuborilgan', data: last7Days.map((d: any) => d.sent || 0) }
                                            ]}
                                            xAxis={last7Days.map((d: any) => formatChartDate(d.date))} 
                                            height="400px"
                                            customOptions={{
                                                colors: ['#3B82F6', '#10B981'], 
                                                    dataLabels: { enabled: false },
                                                    stroke: { curve: 'smooth', width: 2 },
                                                    fill: {
                                                        type: 'gradient',
                                                        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
                                                    },
                                                    legend: { show: true, position: 'bottom' }
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">Ma'lumot yo'q</div>
                                        )}
                                    </AdaptiveCard>
                                </div>
                            </div>

                            {/* 3. НИЖНИЙ БЛОК: Последние письма и Топ Организаций (60% на 40%) */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                
                                {/* Последние письма: 3 из 5 колонок (60%) */}
                                <div className="lg:col-span-3">
                                    <RecentMails data={safeData.recentMails || []} />
                                </div>

                                {/* Топ организаций: 2 из 5 колонок (40%) */}
                                <div className="lg:col-span-2">
                                    <AdaptiveCard className="h-full">
                                        <div className="flex items-center gap-2 mb-6">
                                            <HiOutlineOfficeBuilding className="text-2xl text-blue-500" />
                                            <h4 className="text-lg font-bold text-gray-800">Top tashkilotlar</h4>
                                        </div>
                                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                            {topOrganizations.length > 0 ? topOrganizations.map((org: any, idx: number) => {
                                                const percent = org.totalMails > 0 ? (org.sentMails / org.totalMails) * 100 : 0;
                                                return (
                                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
                                                        <p className="font-semibold text-gray-800 text-sm truncate" title={org.organizationName}>
                                                            {idx + 1}. {org.organizationName || 'Nomsiz tashkilot'}
                                                        </p>
                                                        <div className="flex justify-between text-xs mt-3 text-gray-500 font-medium">
                                                            <span>Jami: <b className="text-gray-700">{org.totalMails}</b></span>
                                                            <span>Yuborilgan: <b className="text-green-600">{org.sentMails}</b></span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                                            <div
                                                                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )
                                            }) : (
                                                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Reyting bo'sh</div>
                                            )}
                                        </div>
                                    </AdaptiveCard>
                                </div>
                            </div>

                        </div>
                    ) : (
                        /* ========================================= */
                        /* ИНТЕРФЕЙС ОБЫЧНОГО ЮЗЕРА                  */
                        /* ========================================= */
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3">
                                    <MailOverview
                                        data={{
                                            monthlyStats: safeData.monthlyStats || safeData.timeline || [],
                                            yearlyStats: safeData.yearlyStats || [],
                                            createdMail: createdMailCount,
                                            successSentMail: successSentMailCount,
                                        }}
                                        isAdmin={false}
                                        hideStats={false}
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <MailStatusChart data={safeData.mailStatusDistribution || []} />
                                </div>
                            </div>
                            <RecentMails data={safeData.recentMails || []} />
                        </div>
                    )}
                </div>
            </AdaptiveCard>
        </Loading>
    )
}

export default EcommerceDashboard
