import React, { useEffect } from 'react'
// --- Store ---
import { useMailStore } from '@/store/mailStore'
// --- Components ---
import Loading from '@/components/shared/Loading'
import MailOverview from '@/components/MailOverview'
import MailStatusChart from '@/components/MailStatusChart'
import RecentMails from '@/components/RecentMails'

const MailDashboard = () => {
    // 1. BEST PRACTICE: Select specific state pieces to prevent unnecessary re-renders
    const getDashboardStats = useMailStore((state) => state.getDashboardStats)
    const dashboardStats = useMailStore((state) => state.dashboardStats)
    const isLoading = useMailStore((state) => state.isLoading)

    // 2. Fetch on mount
    useEffect(() => {
        // Create a flag to prevent race conditions (optional but good practice)
        let isMounted = true

        const fetchDashboard = async () => {
            try {
                if (isMounted) await getDashboardStats()
            } catch (error) {
                console.error('Dashboard fetch failed:', error)
            }
        }

        fetchDashboard()

        return () => {
            isMounted = false
        }
    }, []) // Keep this EMPTY. Do NOT add getDashboardStats here.

    // 3. SAFETY CHECK: Ensure data structure exists before rendering
    // This prevents "Cannot read property of undefined" crashes
    const safeData = dashboardStats || {
        monthlyStats: [],
        yearlyStats: [],
        recentMails: [],
        mailStatusDistribution: [],
    }

    return (
        <Loading loading={isLoading}>
            {dashboardStats ? (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            {/* 4. PASS EMPTY ARRAYS AS FALLBACKS */}
                            <MailOverview
                                data={{
                                    monthlyStats: safeData.monthlyStats || [],
                                    yearlyStats: safeData.yearlyStats || [],
                                }}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <MailStatusChart
                                data={safeData.mailStatusDistribution || []}
                            />
                        </div>
                    </div>

                    <RecentMails data={safeData.recentMails || []} />
                </div>
            ) : (
                !isLoading && (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        Statistika ma'lumotlari topilmadi.
                        <br />
                        <span className="text-sm opacity-70">
                            Serverdan ma'lumot kelmadi.
                        </span>
                    </div>
                )
            )}
        </Loading>
    )
}

export default MailDashboard
