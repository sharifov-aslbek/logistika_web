import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import Badge from '@/components/ui/Badge'
import type { MailStatusDist } from '../types'

type MailStatusChartProps = {
    data?: MailStatusDist[]
}

const MailStatusChart = ({ data }: MailStatusChartProps) => {
    const safeData = Array.isArray(data) ? data : []

    // --- HELPER: Normalize Status Text ---
    // Converts 'success' -> 'Sent' and 'null' -> 'Not Sent'
    const formatStatusLabel = (status: string | null | undefined): string => {
        const lowerStatus = status?.toLowerCase() || 'null'

        if (lowerStatus === 'success') return 'Yuborilgan'
        if (lowerStatus === 'null') return 'Yuborilmagan'

        return status || "Noma'lum"
    }

    // --- HELPER: Get Color Based on Status ---
    // Returns Emerald for Sent, Slate for Not Sent, Rose for Error/Others
    const getStatusColor = (status: string | null | undefined): string => {
        const lowerStatus = status?.toLowerCase() || 'null'

        if (lowerStatus === 'success') return '#10B981' // Emerald-500
        if (lowerStatus === 'null') return '#64748B' // Slate-500
        return '#F43F5E' // Rose-500 (Default/Error)
    }

    // Prepare Series (Counts)
    const chartSeries = safeData.map((item) => item.count || 0)

    // Prepare Labels (using the new helper)
    const chartLabels = safeData.map((item) =>
        formatStatusLabel(item.statusName),
    )

    // Prepare Colors (using the new helper)
    const chartColors = safeData.map((item) => getStatusColor(item.statusName))

    if (safeData.length === 0) {
        return (
            <Card>
                <h4>Holat Taqsimoti</h4>
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                    Ma'lumot mavjud emas
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <h4>Holat Taqsimoti</h4>
            <div className="mt-6">
                <Chart
                    type="donut"
                    series={chartSeries}
                    height="250px"
                    customOptions={{
                        labels: chartLabels,
                        colors: chartColors,
                        plotOptions: {
                            pie: {
                                donut: {
                                    size: '65%',
                                    labels: {
                                        show: true,
                                        total: {
                                            show: true,
                                            label: 'Jami',
                                            formatter: function (w: any) {
                                                return w.globals.seriesTotals.reduce(
                                                    (a: any, b: any) => a + b,
                                                    0,
                                                )
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        legend: { show: false },
                    }}
                />
            </div>
            <div className="mt-6 flex flex-col gap-3">
                {safeData.map((item, index) => {
                    const displayName = formatStatusLabel(item.statusName)
                    const colorHex = getStatusColor(item.statusName)

                    return (
                        <div
                            key={index}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Badge
                                    // Use inline style to ensure badge matches chart exactly
                                    style={{ backgroundColor: colorHex }}
                                    className="border-0"
                                />
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    {displayName}
                                </span>
                            </div>
                            <span className="font-bold">{item.count}</span>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

export default MailStatusChart
