import { useState } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Chart from '@/components/shared/Chart'
import { TbMail, TbCheck } from 'react-icons/tb'

type MailStatItem = {
    count?: number
    value?: number
    statusName?: string | null
    label?: string
    date?: string
}

type MailOverviewProps = {
    data?: {
        monthlyStats?: MailStatItem[]
        yearlyStats?: MailStatItem[]
        createdMail?: number
        successSentMail?: number
    }
    isAdmin?: boolean
    totalMails?: number
    sentToday?: number
    hideStats?: boolean // <-- Добавили флаг для скрытия внутренних карточек
}

type Period = 'monthly' | 'yearly'

const options: { value: Period; label: string }[] = [
    { value: 'monthly', label: 'Bu oy' },
    { value: 'yearly', label: 'Bu yil' },
]



const MailOverview = ({ data, isAdmin = false, totalMails = 0, sentToday = 0, hideStats = false }: MailOverviewProps) => {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly')

    const formatStatusLabel = (status: string | null | undefined): string => {
        const lowerStatus = status?.toLowerCase() || 'null'

        if (lowerStatus === 'success') return 'Yuborilgan'
        if (lowerStatus === 'null') return 'Yuborilmagan'

        return status || "Noma'lum"
    }

    const monthlyStats = data?.monthlyStats || []
    const yearlyStats = data?.yearlyStats || []
    const createdMail = data?.createdMail ?? 0
    const successSentMail = data?.successSentMail ?? 0
    const currentStats = selectedPeriod === 'monthly' ? monthlyStats : yearlyStats

    const chartData = {
        series: [
            {
                name: 'Xatlar',
                data: currentStats.map(
                    (item: MailStatItem) => item.count || item.value || 0,
                ),
            },
        ],
        xAxis: currentStats.map((item: MailStatItem) =>
            formatStatusLabel(item.statusName || item.label || item.date || ''),
        ),
    }

    const stat1Value = isAdmin ? totalMails : createdMail
    const stat1Label = isAdmin ? 'Barcha xatlar' : 'Yuborilmaganlar';
    const stat1Color = isAdmin ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-100' : 'bg-green-100 text-green-600';
    const stat1Icon = isAdmin ? <TbMail /> : <TbMail />;

    const stat2Value = isAdmin ? sentToday : successSentMail;
    const stat2Label = isAdmin ? 'Bugun yuborilgan xatlar' : 'Yuborilgan';
    const stat2Color = isAdmin ? 'bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-100' : 'bg-slate-100 text-slate-600';
    const stat2Icon = isAdmin ? <TbCheck /> : <TbMail />;

    return (
        <Card className="h-full">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-800">Xatlar Statistikasi</h4>
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

            {/* Показываем карточки только если hideStats === false */}
            {!hideStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl p-3 bg-gray-50 dark:bg-gray-700/50 mt-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="mb-2 text-sm font-semibold text-gray-500">
                                {stat1Label}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{stat1Value}</h3>
                        </div>
                        <div className={`flex items-center justify-center h-12 w-12 rounded-full text-2xl ${stat1Color}`}>
                            {stat1Icon}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="mb-2 text-sm font-semibold text-gray-500">
                                {stat2Label}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{stat2Value}</h3>
                        </div>
                        <div className={`flex items-center justify-center h-12 w-12 rounded-full text-2xl ${stat2Color}`}>
                            {stat2Icon}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <Chart
                    type="area"
                    series={chartData.series}
                    xAxis={chartData.xAxis}
                    height="350px"
                    customOptions={{
                        legend: { show: false },
                        colors: ['#6366f1'],
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
