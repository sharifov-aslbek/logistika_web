import { useState } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Chart from '@/components/shared/Chart'
import { TbMail } from 'react-icons/tb'

type MailOverviewProps = {
    // Making data optional to prevent crashes if parent passes undefined
    data?: {
        monthlyStats?: any[]
        yearlyStats?: any[]
    }
}

type Period = 'monthly' | 'yearly'

const options: { value: Period; label: string }[] = [
    { value: 'monthly', label: 'Bu oy' },
    { value: 'yearly', label: 'Bu yil' },
]

const MailOverview = ({ data }: MailOverviewProps) => {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly')

    const formatStatusLabel = (status: string | null | undefined): string => {
        const lowerStatus = status?.toLowerCase() || 'null'

        if (lowerStatus === 'success') return 'Yuborilgan'
        if (lowerStatus === 'null') return 'Yuborilmagan'

        return status || "Noma'lum"
    }

    // --- FIX: Add Safety Defaults (|| []) ---
    // If data is undefined, these default to empty arrays preventing the "reduce" error
    const monthlyStats = data?.monthlyStats || []
    const yearlyStats = data?.yearlyStats || []

    const currentStats =
        selectedPeriod === 'monthly' ? monthlyStats : yearlyStats

    const sentCount = currentStats.reduce((acc: number, item: any) => {
        return item?.statusName?.toLowerCase() === 'success'
            ? acc + (item.count || item.value || 0)
            : acc
    }, 0)
    const unsentCount = currentStats.reduce((acc: number, item: any) => {
        return (item?.statusName?.toLowerCase() || 'null') === 'null'
            ? acc + (item.count || item.value || 0)
            : acc
    }, 0)

    // Prepare Chart Data safely
    const chartData = {
        series: [
            {
                name: 'Xatlar',
                data: currentStats.map(
                    (item: any) => item.count || item.value || 0,
                ),
            },
        ],
        xAxis: currentStats.map((item: any) =>
            formatStatusLabel(item.statusName || item.label || item.date || ''),
        ),
    }

    return (
        <Card>
            <div className="flex items-center justify-between">
                <h4>Xatlar Statistikasi</h4>
                <Select
                    className="w-[140px]"
                    size="sm"
                    placeholder="Vaqtni tanlang"
                    value={options.find((opt) => opt.value === selectedPeriod)}
                    options={options}
                    isSearchable={false}
                    onChange={(option) => {
                        if (option?.value) {
                            setSelectedPeriod(option.value as Period)
                        }
                    }}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl p-3 bg-gray-50 dark:bg-gray-700/50 mt-4">
                {/* Sent Count Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="mb-2 text-sm font-semibold text-gray-500">
                            Yuborilganlar
                        </div>
                        <h3 className="text-2xl font-bold">{sentCount}</h3>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 bg-green-100 text-green-600 rounded-full text-2xl">
                        <TbMail />
                    </div>
                </div>

                {/* Unsent Count Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="mb-2 text-sm font-semibold text-gray-500">
                            Yuborilmaganlar
                        </div>
                        <h3 className="text-2xl font-bold">{unsentCount}</h3>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 bg-slate-100 text-slate-600 rounded-full text-2xl">
                        <TbMail />
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <Chart
                    type="area"
                    series={chartData.series}
                    xAxis={chartData.xAxis}
                    height="350px"
                    customOptions={{
                        legend: { show: false },
                        colors: ['#6366f1'], // Indigo color
                        fill: {
                            type: 'gradient',
                            gradient: {
                                shadeIntensity: 1,
                                opacityFrom: 0.7,
                                opacityTo: 0.3,
                                stops: [0, 90, 100],
                            },
                        },
                        dataLabels: { enabled: false },
                        stroke: { curve: 'smooth', width: 2 },
                    }}
                />
            </div>
        </Card>
    )
}

export default MailOverview
