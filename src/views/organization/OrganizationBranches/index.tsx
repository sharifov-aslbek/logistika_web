import { useEffect } from 'react'
import { useOrganizationStore } from '@/store/organizationStore'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag' // Assuming you have this component in Ecme
import Loading from '@/components/shared/Loading'

const { Tr, Th, Td, THead, TBody } = Table

const OrganizationBranches = () => {
    // 1. Connect to the store
    const { organizationBranches, isLoading, fetchMyOrganizationBranches } =
        useOrganizationStore()

    // 2. Fetch data on component mount
    useEffect(() => {
        fetchMyOrganizationBranches()
    }, [fetchMyOrganizationBranches])

    return (
        <div className="h-full">
            <Card className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Tashkilotim filiallari
                    </h3>
                </div>

                <Loading loading={isLoading}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Filial nomi</Th>
                                <Th>Kod</Th>
                                <Th>Tashkilot ID</Th>
                                <Th>Manzil</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {organizationBranches.length > 0 ? (
                                organizationBranches.map((branch: any) => (
                                    <Tr key={branch.id}>
                                        <Td>
                                            <span className="font-mono text-gray-500">
                                                {branch.id}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {branch.name}
                                            </span>
                                        </Td>
                                        <Td>{branch.code || '—'}</Td>
                                        <Td>
                                            <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-0 rounded px-2">
                                                {branch.organizationId}
                                            </Tag>
                                        </Td>
                                        <Td>
                                            <span className="text-sm text-gray-500">
                                                {branch.address ||
                                                    "Ko'rsatilmagan"}
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

export default OrganizationBranches
