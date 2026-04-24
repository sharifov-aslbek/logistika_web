import { useCallback, useEffect, useMemo, useState } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { apiGetAdminBranches } from '@/services/AdminBranchService'
import { apiGetAdminOrganizations } from '@/services/AdminOrganizationService'
import type { ColumnDef } from '@tanstack/react-table'
import { useSearchParams } from 'react-router-dom'
import { HiOutlineRefresh } from 'react-icons/hi'

type AdminBranch = {
    id: number
    name?: string
    code?: string
    address?: string
    directorPinfl?: string
    organizationId?: number | null
}

type AdminOrganizationOption = {
    id: number
    fullName?: string
    isYatt?: boolean
}

type BranchListPayload = {
    items?: AdminBranch[]
    totalCount?: number
}

type BranchListResponse = {
    data?: BranchListPayload | AdminBranch[]
    items?: AdminBranch[]
    totalCount?: number
}

type OrganizationListPayload = {
    items?: AdminOrganizationOption[]
    totalCount?: number
}

type OrganizationListResponse = {
    data?: OrganizationListPayload | AdminOrganizationOption[]
    items?: AdminOrganizationOption[]
    totalCount?: number
}

type OrganizationSelectOption = {
    value: number
    label: string
}

const getBranchItems = (response: BranchListResponse): AdminBranch[] => {
    if (Array.isArray(response?.data)) {
        return response.data
    }

    return response?.data?.items || response?.items || []
}

const getBranchTotal = (response: BranchListResponse, fallbackLength: number) => {
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

const getOrganizationItems = (
    response: OrganizationListResponse,
): AdminOrganizationOption[] => {
    if (Array.isArray(response?.data)) {
        return response.data
    }

    return response?.data?.items || response?.items || []
}

const parseOrganizationId = (value: string | null) => {
    if (!value) {
        return null
    }

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const AdminBranches = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const [data, setData] = useState<AdminBranch[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [organizationOptions, setOrganizationOptions] = useState<
        OrganizationSelectOption[]
    >([])
    const [organizationOptionsLoading, setOrganizationOptionsLoading] =
        useState(false)
    const [organizationIdFilter, setOrganizationIdFilter] = useState<
        number | null
    >(() => parseOrganizationId(searchParams.get('organizationId')))
    const [tableData, setTableData] = useState({
        pageIndex: 1,
        pageSize: 10,
        total: 0,
    })

    useEffect(() => {
        const urlOrganizationId = parseOrganizationId(
            searchParams.get('organizationId'),
        )

        setOrganizationIdFilter((prev) =>
            prev === urlOrganizationId ? prev : urlOrganizationId,
        )
    }, [searchParams])

    const fetchOrganizations = useCallback(async () => {
        setOrganizationOptionsLoading(true)
        try {
            const response =
                await apiGetAdminOrganizations<
                    OrganizationListResponse,
                    Record<string, number>
                >({
                    PageSize: 1000,
                    PageIndex: 1,
                })

            const items = getOrganizationItems(response)
            setOrganizationOptions(
                items
                    .filter((item) => item.id > 0 && !item.isYatt)
                    .map((item) => ({
                        value: item.id,
                        label: item.fullName || `Tashkilot #${item.id}`,
                    })),
            )
        } catch (error) {
            console.error('Tashkilotlar ro‘yxatini yuklashda xatolik', error)
            setOrganizationOptions([])
        } finally {
            setOrganizationOptionsLoading(false)
        }
    }, [])

    const fetchData = useCallback(async () => {
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

            if (organizationIdFilter) {
                params.OrganizationId = organizationIdFilter
            }

            const response =
                await apiGetAdminBranches<
                    BranchListResponse,
                    Record<string, string | number>
                >(params)

            const items = getBranchItems(response)
            setData(items)
            setTableData((prev) => ({
                ...prev,
                total: getBranchTotal(response, items.length),
            }))
        } catch (error) {
            console.error('Filiallarni yuklashda xatolik', error)
            setData([])
            setTableData((prev) => ({
                ...prev,
                total: 0,
            }))
        } finally {
            setLoading(false)
        }
    }, [organizationIdFilter, searchTerm, tableData.pageIndex, tableData.pageSize])

    useEffect(() => {
        fetchOrganizations()
    }, [fetchOrganizations])

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

    const organizationNameMap = useMemo(
        () =>
            Object.fromEntries(
                organizationOptions.map((option) => [option.value, option.label]),
            ) as Record<number, string>,
        [organizationOptions],
    )

    const columns = useMemo<ColumnDef<AdminBranch>[]>(
        () => [
            {
                header: 'ID',
                accessorKey: 'id',
                cell: (props) => (
                    <span className="text-gray-500">#{props.row.original.id}</span>
                ),
            },
            {
                header: 'Nomi',
                accessorKey: 'name',
                cell: (props) => (
                    <div
                        className="max-w-[260px] truncate font-medium"
                        title={props.row.original.name}
                    >
                        {props.row.original.name || '-'}
                    </div>
                ),
            },
            {
                header: 'Kod',
                accessorKey: 'code',
                size: 220,
                cell: (props) => (
                    <span className="inline-flex whitespace-nowrap rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                        {props.row.original.code || '-'}
                    </span>
                ),
            },
            {
                header: 'Organization ID',
                accessorKey: 'organizationId',
                cell: (props) => (
                    <span className="font-mono text-gray-600">
                        {props.row.original.organizationId || '-'}
                    </span>
                ),
            },
            {
                header: 'Organization name',
                id: 'organizationName',
                cell: (props) => {
                    const organizationId = props.row.original.organizationId
                    const organizationName = organizationId
                        ? organizationNameMap[organizationId]
                        : ''

                    return (
                        <div
                            className="max-w-[260px] truncate text-sm text-gray-500"
                            title={organizationName}
                        >
                            {organizationName || '-'}
                        </div>
                    )
                },
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
                header: 'Direktor PINFL',
                accessorKey: 'directorPinfl',
                cell: (props) => (
                    <span className="font-mono text-gray-600">
                        {props.row.original.directorPinfl || '-'}
                    </span>
                ),
            },
        ],
        [organizationNameMap],
    )

    const selectedOrganizationOption =
        organizationOptions.find(
            (option) => option.value === organizationIdFilter,
        ) || null

    return (
        <div className="relative flex h-full flex-col gap-4 p-5">
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="mb-1 text-xl font-bold text-gray-800">
                            Barcha filiallar
                        </h3>
                        <p className="text-sm text-gray-500">
                            Search term va organization bo&apos;yicha filiallarni
                            filtrlash
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px_auto]">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Search term
                            </label>
                            <Input
                                size="sm"
                                placeholder="Filial nomi yoki kod bo'yicha qidiring..."
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
                                Organization
                            </label>
                            <Select<OrganizationSelectOption, false>
                                isClearable
                                isSearchable
                                size="sm"
                                placeholder="Tashkilotni tanlang"
                                options={organizationOptions}
                                value={selectedOrganizationOption}
                                isLoading={organizationOptionsLoading}
                                onChange={(option) => {
                                    const nextOrganizationId = option?.value || null

                                    setOrganizationIdFilter(nextOrganizationId)
                                    setTableData((prev) => ({
                                        ...prev,
                                        pageIndex: 1,
                                    }))

                                    const nextParams = new URLSearchParams(
                                        searchParams,
                                    )

                                    if (nextOrganizationId) {
                                        nextParams.set(
                                            'organizationId',
                                            String(nextOrganizationId),
                                        )
                                    } else {
                                        nextParams.delete('organizationId')
                                    }

                                    setSearchParams(nextParams)
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

export default AdminBranches
