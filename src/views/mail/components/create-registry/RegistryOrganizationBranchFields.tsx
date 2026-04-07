import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { ROLE_ADMIN } from '@/constants/usertype.constant'
import type { Option } from './createRegistry.utils'

type RegistryValues = {
    organizationId: number | null
    branchId: number | null
}

type Props = {
    showBranchSelection: boolean
    role: number
    values: RegistryValues
    setFieldValue: (field: string, value: number | null) => void
    orgOptions: Option[]
    branchOptions: Option[]
    isSubmitting: boolean
}

const RegistryOrganizationBranchFields = ({
    showBranchSelection,
    role,
    values,
    setFieldValue,
    orgOptions,
    branchOptions,
    isSubmitting,
}: Props) => {
    if (!showBranchSelection) {
        return null
    }

    return (
        <div
            className={
                role === ROLE_ADMIN
                    ? 'grid grid-cols-1 gap-6 md:grid-cols-2'
                    : 'grid grid-cols-1 gap-6'
            }
        >
            {role === ROLE_ADMIN && (
                <FormItem
                    label="Tashkilot"
                    invalid={isSubmitting && !values.organizationId}
                    errorMessage="Tashkilot tanlash shart"
                >
                    <Select
                        options={orgOptions}
                        placeholder="Tashkilotni tanlang"
                        value={
                            orgOptions.find(
                                (option) =>
                                    option.value === values.organizationId,
                            ) || null
                        }
                        onChange={(option: any) => {
                            setFieldValue(
                                'organizationId',
                                option?.value != null
                                    ? Number(option.value)
                                    : null,
                            )
                            setFieldValue('branchId', null)
                        }}
                        className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    />
                </FormItem>
            )}

            <FormItem
                label="Filial"
                invalid={isSubmitting && !values.branchId}
                errorMessage="Filial tanlash shart"
            >
                <Select
                    options={branchOptions}
                    placeholder="Filialni tanlang"
                    isDisabled={role === ROLE_ADMIN && !values.organizationId}
                    value={
                        branchOptions.find(
                            (option) => option.value === values.branchId,
                        ) || null
                    }
                    onChange={(option: any) =>
                        setFieldValue(
                            'branchId',
                            option?.value != null ? Number(option.value) : null,
                        )
                    }
                    className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                />
            </FormItem>
        </div>
    )
}

export default RegistryOrganizationBranchFields
