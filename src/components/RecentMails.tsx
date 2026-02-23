import { useCallback } from 'react'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import type { RecentMail } from '../types'

type RecentMailsProps = {
    data: RecentMail[]
}

const { Tr, Td, TBody, THead, Th } = Table

const columnHelper = createColumnHelper<RecentMail>()

const columns = [
    columnHelper.accessor('id', {
        header: 'ID',
        cell: (props) => (
            <span className="font-semibold">#{props.getValue()}</span>
        ),
    }),
    columnHelper.accessor('receiverName', {
        header: 'Qabul qiluvchi', // Receiver -> Qabul qiluvchi
        cell: (props) => (
            <span className="font-medium text-gray-900 dark:text-gray-100">
                {props.getValue()}
            </span>
        ),
    }),
    columnHelper.accessor('status', {
        header: 'Holati', // Status -> Holati
        cell: (props) => {
            const status = props.getValue()
            let badgeClass = 'bg-gray-500'
            let textClass = 'text-gray-500'
            let statusText = status // Standart holat uchun

            if (status === 'Success') {
                badgeClass = 'bg-emerald-500'
                textClass = 'text-emerald-500'
                statusText = 'Yuborilgan' // Success -> Yuborilgan
            } else if (status === 'Null') {
                badgeClass = 'bg-slate-400'
                textClass = 'text-slate-400'
                statusText = 'Yuborilmagan' // Null -> Yuborilmagan
            }

            return (
                <div className="flex items-center">
                    <Badge className={badgeClass} />
                    <span className={`ml-2 font-bold ${textClass}`}>
                        {statusText}
                    </span>
                </div>
            )
        },
    }),
    columnHelper.accessor('date', {
        header: 'Sana', // Date -> Sana
        cell: (props) => {
            return (
                <span>
                    {dayjs(props.getValue()).format('DD/MM/YYYY HH:mm')}
                </span>
            )
        },
    }),
]

const RecentMails = ({ data = [] }: RecentMailsProps) => {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h4>Oxirgi xatlar</h4> {/* Recent Mails -> Oxirgi xatlar */}
            </div>
            <Table>
                <THead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <Tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <Th key={header.id} colSpan={header.colSpan}>
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                    )}
                                </Th>
                            ))}
                        </Tr>
                    ))}
                </THead>
                <TBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <Tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <Td key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </Td>
                                ))}
                            </Tr>
                        ))
                    ) : (
                        <Tr>
                            <Td
                                colSpan={columns.length}
                                className="text-center"
                            >
                                Ma'lumot topilmadi
                            </Td>
                        </Tr>
                    )}
                </TBody>
            </Table>
        </Card>
    )
}

export default RecentMails
