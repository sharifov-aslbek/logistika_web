import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Alert from '@/components/ui/Alert'
import Switcher from '@/components/ui/Switcher'
import { HiOutlineCloudUpload, HiOutlineDownload } from 'react-icons/hi'
import RegistryOrganizationBranchFields from './RegistryOrganizationBranchFields'
import { EXCEL_ACCEPT, type Option } from './createRegistry.utils'

type TemplateOption = {
    value: string
    label: string
}

type RegistryFormValues = {
    templateName: string
    readTemplateFromExcel: boolean
    file: File | null
    organizationId: number | null
    branchId: number | null
}

type Props = {
    role: number
    showBranchSelection: boolean
    values: RegistryFormValues
    setFieldValue: (field: string, value: any) => void
    orgOptions: Option[]
    branchOptions: Option[]
    isSubmitting: boolean
    templateOptions: TemplateOption[]
    isTemplatesLoading: boolean
    uploadLabel: string
    uploadDescription: string
    uploadNote: string
    uploadedFiles: File[]
    validationErrors: string[]
    validationErrorRowsCount?: number
    validateRegistryFile: (newFiles: FileList | null) => string | true
    onValidationErrorsDownload?: () => void
    onFileChange: (files: File[]) => void
    onFileRemove: () => void
    onCancel: () => void
}

const RegistryFormSection = ({
    role,
    showBranchSelection,
    values,
    setFieldValue,
    orgOptions,
    branchOptions,
    isSubmitting,
    templateOptions,
    isTemplatesLoading,
    uploadLabel,
    uploadDescription,
    uploadNote,
    uploadedFiles,
    validationErrors,
    validationErrorRowsCount = 0,
    validateRegistryFile,
    onValidationErrorsDownload,
    onFileChange,
    onFileRemove,
    onCancel,
}: Props) => {
    return (
        <div className="flex flex-col gap-6">
            <RegistryOrganizationBranchFields
                showBranchSelection={showBranchSelection}
                role={role}
                values={values}
                setFieldValue={setFieldValue}
                orgOptions={orgOptions}
                branchOptions={branchOptions}
                isSubmitting={isSubmitting}
            />

            <FormItem
                label="Shablon turi"
                invalid={
                    !values.readTemplateFromExcel &&
                    !values.templateName &&
                    isSubmitting
                }
                errorMessage="Shablon tanlash shart"
            >
                <Select
                    className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    options={templateOptions}
                    isLoading={isTemplatesLoading}
                    isDisabled={values.readTemplateFromExcel}
                    placeholder={
                        values.readTemplateFromExcel
                            ? "Excel ichidagi shablon nomi o'qiladi"
                            : isTemplatesLoading
                            ? 'Yuklanmoqda...'
                            : 'Shablonni tanlang...'
                    }
                    value={
                        templateOptions.find(
                            (option) => option.value === values.templateName,
                        ) || null
                    }
                    onChange={(option: any) =>
                        setFieldValue('templateName', option?.value || '')
                    }
                />
                <div className="mt-5 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                    <Switcher
                        checked={values.readTemplateFromExcel}
                        onChange={(checked) =>
                            setFieldValue('readTemplateFromExcel', checked)
                        }
                    />
                    <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Shablon excel ichidan o'qilsin
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Har bir qatordagi `shablon_name` qiymati mavjud
                            shablonlar bilan solishtiriladi
                        </div>
                    </div>
                </div>
            </FormItem>

            <FormItem
                label={uploadLabel}
                invalid={!values.file && isSubmitting}
                errorMessage="Fayl yuklash shart"
            >
                <Upload
                    accept={EXCEL_ACCEPT}
                    beforeUpload={validateRegistryFile}
                    draggable
                    className="cursor-pointer border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    fileList={uploadedFiles}
                    multiple={false}
                    onChange={onFileChange}
                    onFileRemove={onFileRemove}
                    uploadLimit={1}
                >
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="mb-4 text-5xl text-indigo-500">
                            <HiOutlineCloudUpload />
                        </div>

                        <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                            {values.file ? (
                                <span className="font-bold text-emerald-500">
                                    {values.file.name} yuklandi
                                </span>
                            ) : (
                                'Faylni shu yerga tashlang yoki yuklang'
                            )}
                        </div>

                        <div className="mt-2 text-sm text-gray-400">
                            {uploadDescription}
                        </div>

                        <div className="mt-3 max-w-xl text-center text-xs font-medium text-amber-500 dark:text-amber-300">
                            {uploadNote}
                        </div>
                    </div>
                </Upload>
            </FormItem>

            {validationErrors.length > 0 && (
                <Alert
                    showIcon
                    className="mb-4"
                    type="danger"
                    title="Faylda xatoliklar mavjud"
                >
                    <div className="mt-2 max-h-40 overflow-y-auto pl-2 text-sm">
                        <ul className="list-disc space-y-1">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                    {onValidationErrorsDownload &&
                        validationErrorRowsCount > 0 && (
                            <div className="mt-4">
                                <Button
                                    type="button"
                                    size="sm"
                                    icon={<HiOutlineDownload />}
                                    onClick={onValidationErrorsDownload}
                                >
                                    Xato qatorlarni yuklab olish (
                                    {validationErrorRowsCount})
                                </Button>
                            </div>
                        )}
                </Alert>
            )}

            <div className="mt-2 flex justify-end gap-4">
                <Button
                    size="lg"
                    className="min-w-[120px]"
                    type="button"
                    disabled={isSubmitting}
                    onClick={onCancel}
                >
                    Bekor qilish
                </Button>

                <Button
                    variant="solid"
                    size="lg"
                    className="min-w-[180px]"
                    type="submit"
                    disabled={
                        isSubmitting ||
                        validationErrors.length > 0 ||
                        !values.file ||
                        (!values.readTemplateFromExcel && !values.templateName)
                    }
                >
                    Yaratish
                </Button>
            </div>
        </div>
    )
}

export default RegistryFormSection
