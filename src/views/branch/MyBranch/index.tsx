import { useEffect } from 'react'
import { useOrganizationStore } from '@/store/organizationStore'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'

const { Tr, Th, Td, THead, TBody } = Table

const MyBranch = () => {
    // Connect to store
    const { myBranch, isLoading, fetchMyBranch } = useOrganizationStore()

    // Fetch data on mount
    useEffect(() => {
        fetchMyBranch()
    }, [fetchMyBranch])

    return (
        <div className="h-full">
            <Card className="h-full" bodyClass="h-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Mening filialim
                    </h3>
                </div>

                <Loading loading={isLoading}>
                    <Table>
                        <THead>
                            <Tr>
                                <Th className="w-[70px]">ID</Th>
                                <Th>Filial nomi</Th>
                                <Th className="w-[80px]">Kod</Th>
                                <Th className="w-[150px]">Tashkilot ID</Th>
                                <Th>Manzil</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {myBranch.length > 0 ? (
                                myBranch.map((branch: any) => (
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
                                            <Tag className="bg-gray-100 text-gray-600 border-0 rounded">
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

export default MyBranch
