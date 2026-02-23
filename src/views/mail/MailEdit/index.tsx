import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { HiSave, HiX } from 'react-icons/hi'
import axios from 'axios'

// API Configuration
const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://default-api.example.com/api'

// Helper to get token
const getToken = () => {
    let token = ''
    try {
        const storageData = localStorage.getItem('account-storage')
        if (storageData) {
            const parsedData = JSON.parse(storageData)
            token = parsedData?.state?.user?.token || ''
        }
    } catch (error) {
        console.error(error)
    }
    return token
}

const getHeaders = () => ({
    'ngrok-skip-browser-warning': 'true',
    Authorization: `Bearer ${getToken()}`,
    accept: '*/*',
})

const MailEdit = () => {
    const navigate = useNavigate()
    const { id } = useParams() // numericId ("2")
    const [searchParams] = useSearchParams()
    // Priority: uid from query -> id from path
    const uid = searchParams.get('uid') || id

    // Store
    const { updateMail } = useMailStore()

    // --- State ---
    const [loadingData, setLoadingData] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    const [regionOptions, setRegionOptions] = useState<any[]>([])
    const [areaOptions, setAreaOptions] = useState<any[]>([])

    // Form State
    const [form, setForm] = useState({
        recipient: '',
        address: '',
        region: null as number | null,
        area: null as number | null,
        pagesCount: 1,
    })

    // Computed validation
    const isValid = useMemo(() => !!form.recipient && !!form.address, [form])

    // --- API Fetchers ---
    const fetchRegions = async () => {
        setLoadingRegions(true)
        try {
            const { data } = await axios.get(`${BASE_URL}/region`, {
                headers: getHeaders(),
            })
            if (data.code === 200) {
                // Map for Select component: { value: id, label: name }
                setRegionOptions(
                    data.data.map((r: any) => ({ value: r.id, label: r.name })),
                )
            }
        } catch (error) {
            console.error('Error fetching regions:', error)
        } finally {
            setLoadingRegions(false)
        }
    }

    const fetchAreas = async (regionId: number) => {
        setLoadingAreas(true)
        setAreaOptions([]) // Clear previous
        try {
            const { data } = await axios.get(
                `${BASE_URL}/region/${regionId}/areas`,
                { headers: getHeaders() },
            )
            if (data.code === 200) {
                setAreaOptions(
                    data.data.areas.map((a: any) => ({
                        value: a.id,
                        label: a.name,
                    })),
                )
            }
        } catch (error) {
            console.error('Error fetching areas:', error)
        } finally {
            setLoadingAreas(false)
        }
    }

    const handleRegionChange = (option: any) => {
        const val = option ? option.value : null
        setForm((prev) => ({ ...prev, region: val, area: null })) // Reset area
        setAreaOptions([])
        if (val) fetchAreas(val)
    }

    // --- Main Load Logic ---
    useEffect(() => {
        const loadData = async () => {
            if (!uid) {
                toast.push(
                    <Notification type="danger" title="Xatolik">
                        Noto'g'ri parametrlar
                    </Notification>,
                )
                return
            }

            setLoadingData(true)
            try {
                // 1. Fetch Regions
                await fetchRegions()

                // 2. Fetch Mail Data
                const { data } = await axios.get(`${BASE_URL}/mail/${uid}`, {
                    headers: getHeaders(),
                })
                const mail = data // Adjust if data is wrapped in data.data

                // 3. Populate Form
                setForm((prev) => ({
                    ...prev,
                    recipient: mail.receiverName || '',
                    address: mail.receiverAddress || '',
                    pagesCount: mail.pagesCount || 1,
                    region: mail.regionId || null,
                    area: null, // Will set after fetching areas
                }))

                // 4. Handle Cascading Selects
                if (mail.regionId) {
                    await fetchAreas(mail.regionId)
                    setForm((prev) => ({ ...prev, area: mail.areaId || null }))
                }
            } catch (error) {
                console.error('Failed to load mail:', error)
                toast.push(
                    <Notification type="danger" title="Xatolik">
                        Ma'lumotlarni yuklab bo'lmadi
                    </Notification>,
                )
            } finally {
                setLoadingData(false)
            }
        }

        loadData()
        // eslint-disable-next-line
    }, [uid])

    // --- Submit ---
    const handleSubmit = async () => {
        if (!uid) return
        setIsSubmitting(true)

        const payload = {
            receiverName: form.recipient,
            receiverAddress: form.address,
            pagesCount: Number(form.pagesCount),
            regionId: Number(form.region || 0),
            areaId: Number(form.area || 0),
        }

        const success = await updateMail(uid, payload)

        if (success) {
            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Hujjat yangilandi
                </Notification>,
            )
            // Optional: navigate back after success
            // navigate(-1)
        } else {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Hujjatni yangilab bo'lmadi
                </Notification>,
            )
        }
        setIsSubmitting(false)
    }

    if (loadingData) return <Loading loading={true} />

    return (
        <div className="w-full">
            <Card>
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Hujjatni tahrirlash
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-mono text-xs">
                        ID: {uid}
                    </p>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Qabul qiluvchi
                        </label>
                        <Input
                            placeholder="To'liq ism yoki tashkilot nomini kiriting"
                            value={form.recipient}
                            onChange={(e) =>
                                setForm({ ...form, recipient: e.target.value })
                            }
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Manzil
                        </label>
                        <Input
                            placeholder="To'liq manzil (Ko'cha, Uy va h.k.)"
                            value={form.address}
                            onChange={(e) =>
                                setForm({ ...form, address: e.target.value })
                            }
                        />
                    </div>

                    {/* Region & District Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Viloyat
                            </label>
                            <Select
                                placeholder="Viloyatni tanlang"
                                options={regionOptions}
                                isLoading={loadingRegions}
                                value={regionOptions.find(
                                    (opt) => opt.value === form.region,
                                )}
                                onChange={handleRegionChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Tuman
                            </label>
                            <Select
                                placeholder="Tumanni tanlang"
                                options={areaOptions}
                                isLoading={loadingAreas}
                                isDisabled={!form.region}
                                value={areaOptions.find(
                                    (opt) => opt.value === form.area,
                                )}
                                onChange={(opt: any) =>
                                    setForm({
                                        ...form,
                                        area: opt ? opt.value : null,
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Pages Count */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Sahifalar soni
                        </label>
                        <Input
                            type="number"
                            min={1}
                            value={form.pagesCount}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    pagesCount: parseInt(e.target.value) || 1,
                                })
                            }
                            className="w-full md:w-1/3"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                        <Button
                            size="lg"
                            className="min-w-[120px]"
                            onClick={() => navigate(-1)}
                            icon={<HiX />}
                        >
                            Bekor qilish
                        </Button>
                        <Button
                            variant="solid"
                            size="lg"
                            className="min-w-[160px]"
                            disabled={!isValid || isSubmitting}
                            loading={isSubmitting}
                            onClick={handleSubmit}
                            icon={<HiSave />}
                        >
                            Saqlash
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default MailEdit
