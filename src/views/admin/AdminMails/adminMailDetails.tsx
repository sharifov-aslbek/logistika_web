import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import { apiGetAdminMail } from '@/services/AdminMailService'
import AxiosBase from '@/services/axios/AxiosBase'
import { 
    HiOutlineArrowLeft, 
    HiOutlineCheckCircle, 
    HiOutlineRefresh, 
    HiOutlineDocumentText, 
    HiOutlineDownload 
} from 'react-icons/hi'

const AdminMailDetails = () => {
    const { uid } = useParams()
    const navigate = useNavigate()
    const [mailData, setMailData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    
    // Состояния для PDF
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
    const [pdfLoading, setPdfLoading] = useState(false)

    useEffect(() => {
        let objectUrl: string | null = null

        const loadData = async () => {
            if (uid) {
                // 1. Загружаем текстовые детали письма
                setLoading(true)
                try {
                    const res: any = await apiGetAdminMail(uid)
                    setMailData(res?.data || res || {})
                } catch (error) {
                    console.error('Ошибка при загрузке деталей письма', error)
                } finally {
                    setLoading(false)
                }

                // 2. Загружаем PDF файл
                setPdfLoading(true)
                try {
                    // Используем AxiosBase напрямую, чтобы получить blob (бинарный файл)
                    // Эндпоинт для скачивания из Swagger: /api/mail/{uid}/download
                    const pdfRes = await AxiosBase.get(`/mail/${uid}/download`, {
                        responseType: 'blob' 
                    })
                    
                    // Создаем локальную ссылку для отображения в iframe
                    objectUrl = URL.createObjectURL(pdfRes.data)
                    setPdfBlobUrl(objectUrl)
                } catch (error) {
                    console.error('Ошибка при загрузке PDF', error)
                } finally {
                    setPdfLoading(false)
                }
            }
        }

        loadData()

        // Очищаем память при закрытии страницы
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [uid])

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <HiOutlineRefresh className="text-4xl animate-spin mb-4 text-blue-500" />
                <p>Загрузка данных...</p>
            </div>
        )
    }

    if (!mailData) {
        return <div className="p-6 text-center text-red-500 font-medium border border-red-100 bg-red-50 rounded-xl">Письмо не найдено</div>
    }

    return (
        <AdaptiveCard>
            {/* Шапка */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"
                >
                    <HiOutlineArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="mb-0 text-xl font-bold text-gray-800">Xat tafsilotlari</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">UID: {mailData.uid}</p>
                </div>
            </div>

            {/* Информационный блок */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Qabul qiluvchi</p>
                    <p className="font-medium text-gray-800 text-lg">{mailData.receiverName || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Shablon</p>
                    <p className="font-medium text-gray-800 text-lg">{mailData.templateName || '-'}</p>
                </div>
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Yetkazib berish manzili</p>
                    <p className="font-medium text-gray-800">{mailData.receiverAddress || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Jo'natish holati</p>
                    <div>
                        {mailData.isSend ? (
                            <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                <HiOutlineCheckCircle className="text-lg mr-1.5" /> Yuborilgan
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                                <HiOutlineRefresh className="text-lg mr-1.5 animate-spin-slow" /> Yuborilmoqda
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Блок отображения PDF */}
            <div className="mt-8 border-t border-gray-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <HiOutlineDocumentText className="text-blue-500 text-2xl" />
                        Ilova qilingan hujjat (PDF)
                    </h4>
                    
                    {/* Кнопка скачивания появляется только если файл загрузился */}
                    {pdfBlobUrl && (
                        <a
                            href={pdfBlobUrl}
                            download={`Mail_${mailData?.uid?.substring(0, 8) || 'Document'}.pdf`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-semibold text-sm"
                        >
                            <HiOutlineDownload className="text-lg" />
                            Yuklab olish
                        </a>
                    )}
                </div>

                <div className="bg-gray-100 rounded-xl border border-gray-200 h-[600px] w-full flex items-center justify-center overflow-hidden shadow-inner">
                    {pdfLoading ? (
                        <div className="flex flex-col items-center text-gray-500">
                            <HiOutlineRefresh className="text-4xl animate-spin mb-3 text-blue-500" />
                            <span className="text-sm font-medium">Hujjat yuklanmoqda...</span>
                        </div>
                    ) : pdfBlobUrl ? (
                        <iframe
                            src={pdfBlobUrl}
                            className="w-full h-full border-0"
                            title="PDF Viewer"
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <HiOutlineDocumentText className="text-5xl mb-3 opacity-30" />
                            <span className="text-sm font-medium">PDF hujjat topilmadi</span>
                        </div>
                    )}
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default AdminMailDetails