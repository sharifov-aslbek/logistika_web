import { useEffect } from 'react'
import { useOrganizationStore } from '@/store/organizationStore'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag' // Assuming you have a Tag component in Ecme
import Loading from '@/components/shared/Loading'

const { Tr, Th, Td, THead, TBody } = Table

const MyOrganizations = () => {
    // Connect to store
    const { myOrganizations, isLoading, fetchMyOrganizations } =
        useOrganizationStore()

    // Fetch data on mount (equivalent to onMounted)
    useEffect(() => {
        fetchMyOrganizations()
    }, [fetchMyOrganizations])

    return (
        <div className="h-full">
            <Card className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Mening tashkilotlarim
                    </h3>
                </div>

                <Loading loading={isLoading}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Tashkilot nomi</Th>
                                <Th>Qisqa nomi</Th>
                                <Th>Holati</Th>
                                <Th>Manzil</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {myOrganizations.length > 0 ? (
                                myOrganizations.map((org) => (
                                    <Tr key={org.id}>
                                        <Td>
                                            <span className="font-mono text-gray-500">
                                                {org.id}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {org.fullName}
                                            </span>
                                        </Td>
                                        <Td>{org.shortName || '-'}</Td>
                                        <Td>
                                            {/* Status Badge */}
                                            <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100 border-0 rounded px-2 py-1">
                                                {org.status}
                                            </Tag>
                                        </Td>
                                        <Td>
                                            <span className="text-sm text-gray-500">
                                                {org.address ||
                                                    "Manzil ko'rsatilmagan"}
                                            </span>
                                        </Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td
                                        colSpan={5}
                                        className="text-center py-10 text-gray-500"
                                    >
                                        Ma'lumotlar topilmadi
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </Loading>
            </Card>
        </div>
    )
}

export default MyOrganizations
