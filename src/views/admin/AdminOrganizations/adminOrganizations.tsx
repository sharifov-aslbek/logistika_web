import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { apiGetAdminOrganizations } from '@/services/AdminOrganizationService'
import { apiGetUserById } from '@/services/UserService'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { HiOutlineRefresh } from 'react-icons/hi'

const ACTIVE_WITH_TAX_STATUS =
    'Фаолият кўрсатаётган ва солиқ мажбуриятига эга'

type OrganizationStatusValue = typeof ACTIVE_WITH_TAX_STATUS | 'Active'

type StatusOption = {
    value: OrganizationStatusValue
    label: OrganizationStatusValue
}

type AdminOrganization = {
    id: number
    isYatt?: boolean
    fullName?: string
    shortName?: string
    status?: string
    inn?: string
    mfo?: string
    account?: string
    address?: string
    oked?: string
    accountant?: string
    directorId?: number | null
    directorPinfl?: string
    createdOn?: string
    branchesCount?: number
    workersCount?: number
    createdMailsCount?: number
    sentMailsCount?: number
    directorName?: string
}

type OrganizationListPayload = {
    items?: AdminOrganization[]
    totalCount?: number
}

type OrganizationListResponse = {
    data?: OrganizationListPayload | AdminOrganization[]
    items?: AdminOrganization[]
    totalCount?: number
}

type UserProfileResponse = {
    data?: {
        fullName?: string
    }
}

const statusOptions: StatusOption[] = [
    {
        value: ACTIVE_WITH_TAX_STATUS,
        label: ACTIVE_WITH_TAX_STATUS,
    },
    {
        value: 'Active',
        label: 'Active',
    },
]

const getOrganizationItems = (
    response: OrganizationListResponse,
): AdminOrganization[] => {
    if (Array.isArray(response?.data)) {
        return response.data
    }

    return response?.data?.items || response?.items || []
}

const getOrganizationTotal = (
    response: OrganizationListResponse,
    fallbackLength: number,
) => {
    if (Array.isArray(response?.data)) {
        return response.data.length
    }

    return (
        response?.data?.totalCount ||
        response?.totalCount ||
        response?.items?.length ||
        fallbackLength
    )
}

const AdminOrganizations = () => {
    const navigate = useNavigate()
    const [data, setData] = useState<AdminOrganization[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<
        OrganizationStatusValue | ''
    >('')
    const [tableData, setTableData] = useState({
        pageIndex: 1,
        pageSize: 10,
        total: 0,
    })

    const directorNameCacheRef = useRef<Record<number, string>>({})
    const requestIdRef = useRef(0)

    const getDirectorName = useCallback(
        async (directorId?: number | null) => {
            if (!directorId) {
                return '-'
            }

            const cachedName = directorNameCacheRef.current[directorId]
            if (cachedName) {
                return cachedName
            }

            try {
                const response =
                    await apiGetUserById<UserProfileResponse>(directorId)
                const fullName = response?.data?.fullName?.trim() || '-'
                directorNameCacheRef.current[directorId] = fullName
                return fullName
            } catch (error) {
                console.error(
                    `Direktor ma'lumotini olishda xatolik (userId: ${directorId})`,
                    error,
                )
                directorNameCacheRef.current[directorId] = '-'
                return '-'
            }
        },
        [],
    )

    const fetchData = useCallback(async () => {
        const currentRequestId = ++requestIdRef.current
        setLoading(true)

        try {
            const params: Record<string, string | number> = {
                PageSize: tableData.pageSize,
                PageIndex: tableData.pageIndex,
            }

            const trimmedSearchTerm = searchTerm.trim()
            if (trimmedSearchTerm) {
                params.SearchTerm = trimmedSearchTerm
            }

            if (statusFilter) {
                params.Status = statusFilter
            }

            const response =
                await apiGetAdminOrganizations<
                    OrganizationListResponse,
                    Record<string, string | number>
                >(params)

            const items = getOrganizationItems(response)
            const directorIds = Array.from(
                new Set(
                    items
                        .map((item) => item.directorId)
                        .filter(
                            (directorId): directorId is number =>
                                typeof directorId === 'number' && directorId > 0,
                        ),
                ),
            )

            const directorNameEntries = await Promise.all(
                directorIds.map(async (directorId) => {
                    const directorName = await getDirectorName(directorId)
                    return [directorId, directorName] as const
                }),
            )

            if (currentRequestId !== requestIdRef.current) {
                return
            }

            const directorNameMap = Object.fromEntries(directorNameEntries)
            const mappedItems = items.map((item) => ({
                ...item,
                directorName: item.directorId
                    ? directorNameMap[item.directorId] || '-'
                    : '-',
            }))

            setData(mappedItems)
            setTableData((prev) => ({
                ...prev,
                total: getOrganizationTotal(response, items.length),
            }))
        } catch (error) {
            console.error('Tashkilotlarni yuklashda xatolik', error)
            if (currentRequestId === requestIdRef.current) {
                setData([])
                setTableData((prev) => ({
                    ...prev,
                    total: 0,
                }))
            }
        } finally {
            if (currentRequestId === requestIdRef.current) {
                setLoading(false)
            }
        }
    }, [getDirectorName, searchTerm, statusFilter, tableData.pageIndex, tableData.pageSize])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchData()
        }, 350)

        return () => window.clearTimeout(timeoutId)
    }, [fetchData])

    const onPaginationChange = (page: number) => {
        setTableData((prev) => ({
            ...prev,
            pageIndex: page,
        }))
    }

    const onSelectChange = (value: number) => {
        setTableData((prev) => ({
            ...prev,
            pageIndex: 1,
            pageSize: value,
        }))
    }

    const columns = useMemo<ColumnDef<AdminOrganization>[]>(
        () =>
            [
            {
                header: 'ID',
                accessorKey: 'id',
                cell: (props) => (
                    <span className="text-gray-500">#{props.row.original.id}</span>
                ),
            },
            {
                header: "To'liq ismi",
                accessorKey: 'fullName',
                cell: (props) => (
                    <div
                        className="max-w-[280px] truncate font-medium"
                        title={props.row.original.fullName}
                    >
                        {props.row.original.fullName || '-'}
                    </div>
                ),
            },
            {
                header: 'INN',
                accessorKey: 'inn',
                cell: (props) => (
                    <span className="font-mono text-gray-600">
                        {props.row.original.inn || '-'}
                    </span>
                ),
            },
            {
                header: 'Direktor PINFL',
                accessorKey: 'directorPinfl',
                cell: (props) => (
                    <span className="font-mono text-gray-600">
                        {props.row.original.directorPinfl || '-'}
                    </span>
                ),
            },
            {
                header: 'Direktor ID',
                accessorKey: 'directorId',
                cell: (props) => (
                    <span className="font-mono text-gray-600">
                        {props.row.original.directorId || '-'}
                    </span>
                ),
            },
            {
                header: 'Direktor F.I.SH',
                accessorKey: 'directorName',
                cell: (props) => (
                    <div
                        className="max-w-[220px] truncate"
                        title={props.row.original.directorName}
                    >
                        {props.row.original.directorName || '-'}
                    </div>
                ),
            },
            {
                header: 'Holat',
                accessorKey: 'status',
                cell: (props) => {
                    const status = props.row.original.status || '-'
                    const statusClass =
                        status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : status === ACTIVE_WITH_TAX_STATUS
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'

                    return (
                        <span
                            className={`inline-flex max-w-[260px] rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                            title={status}
                        >
                            <span className="truncate">{status}</span>
                        </span>
                    )
                },
            },
            {
                header: 'Yaratilgan xatlar',
                accessorKey: 'createdMailsCount',
                cell: (props) => (
                    <span className="font-medium text-gray-700">
                        {props.row.original.createdMailsCount ?? 0}
                    </span>
                ),
            },
            {
                header: 'Yuborilgan xatlar',
                accessorKey: 'sentMailsCount',
                cell: (props) => (
                    <span className="font-medium text-gray-700">
                        {props.row.original.sentMailsCount ?? 0}
                    </span>
                ),
            },
            {
                header: 'Manzil',
                accessorKey: 'address',
                cell: (props) => (
                    <div
                        className="max-w-[260px] truncate"
                        title={props.row.original.address}
                    >
                        {props.row.original.address || '-'}
                    </div>
                ),
            },
            {
                header: 'Filiallar',
                id: 'branches',
                cell: (props) =>
                    props.row.original.isYatt ? null : (
                        <button
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                            onClick={() =>
                                navigate(
                                    `/admin/branches?organizationId=${props.row.original.id}`,
                                )
                            }
                        >
                            Filialarni ko&apos;rish
                        </button>
                    ),
            },
        ].map((column) => ({
            ...column,
            enableSorting: false,
        })),
        [navigate],
    )

    return (
        <div className="relative flex h-full flex-col gap-4 p-5">
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="mb-1 text-xl font-bold text-gray-800">
                            Barcha tashkilotlar
                        </h3>
                        <p className="text-sm text-gray-500">
                            Search term va status bo&apos;yicha tashkilotlarni
                            filtrlash
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px_auto]">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Search term
                            </label>
                            <Input
                                size="sm"
                                placeholder="Nomi yoki INN bo'yicha qidiring..."
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value)
                                    setTableData((prev) => ({
                                        ...prev,
                                        pageIndex: 1,
                                    }))
                                }}
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Status
                            </label>
                            <Select<StatusOption, false>
                                isClearable
                                size="sm"
                                placeholder="Status tanlang"
                                options={statusOptions}
                                value={
                                    statusOptions.find(
                                        (option) =>
                                            option.value === statusFilter,
                                    ) || null
                                }
                                isSearchable={false}
                                onChange={(option) => {
                                    setStatusFilter(option?.value || '')
                                    setTableData((prev) => ({
                                        ...prev,
                                        pageIndex: 1,
                                    }))
                                }}
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 lg:w-auto"
                                onClick={fetchData}
                            >
                                <HiOutlineRefresh
                                    className={loading ? 'animate-spin' : ''}
                                />
                                Yangilash
                            </button>
                        </div>
                    </div>
                </div>
            </AdaptiveCard>

            <AdaptiveCard className="flex-1" bodyClass="h-full">
                <DataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    noData={!loading && data.length === 0}
                    pagingData={tableData}
                    onPaginationChange={onPaginationChange}
                    onSelectChange={onSelectChange}
                /> 
            </AdaptiveCard>
        </div>
    )
}

export default AdminOrganizations
