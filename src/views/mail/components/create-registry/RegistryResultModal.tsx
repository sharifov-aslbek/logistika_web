import Button from '@/components/ui/Button'
import type { RegistryApiResult } from './createRegistry.utils'

type Props = {
    isOpen: boolean
    apiResult: RegistryApiResult | null
    onClose: () => void
}

const RegistryResultModal = ({ isOpen, apiResult, onClose }: Props) => {
    if (!isOpen || !apiResult) {
        return null
    }

    const isError = apiResult.status === 'error'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
                <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        {isError ? 'Jarayon yakunlandi' : 'Qayta ishlash natijasi'}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div
                        className={
                            isError
                                ? 'mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/10 dark:text-red-400'
                                : 'mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-600 dark:bg-blue-900/10 dark:text-blue-400'
                        }
                    >
                        {apiResult.message}
                    </div>

                    <div className="mb-6 grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Jami
                            </div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {apiResult.totalProcessed}
                            </div>
                        </div>

                        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Muvaffaqiyatli
                            </div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {apiResult.successCount}
                            </div>
                        </div>

                        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Xatolik
                            </div>
                            <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                {apiResult.errorCount}
                            </div>
                        </div>
                    </div>

                    {apiResult.errorMessages.length > 0 && (
                        <div className="mt-4">
                            <div className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                Xatoliklar ro'yxati:
                            </div>

                            <ul className="list-disc space-y-1 rounded-lg bg-red-50 p-4 pl-5 text-sm text-red-600 dark:bg-red-900/10 dark:text-red-400">
                                {apiResult.errorMessages.map((message, index) => (
                                    <li key={index}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
                    <Button variant="solid" onClick={onClose}>
                        {isError ? 'Yopish' : "Yaratilganlarga o'tish"}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default RegistryResultModal
