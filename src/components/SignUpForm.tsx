import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
// Assuming Alert exists in your UI library, adding basic styling fallback if not
import Alert from '@/components/ui/Alert'
import { HiUser, HiOfficeBuilding } from 'react-icons/hi'

// --- Types ---
type RegistrationRole = 'citizen' | 'director' | null
type Step = 'selection' | 'verification' | 'account'

interface SignUpFormProps {
    disableSubmit?: boolean
    setMessage: (msg: string) => void
    currentStep: Step
    setCurrentStep: (step: Step) => void
}

const SignUpForm = ({
    disableSubmit,
    setMessage,
    currentStep,
    setCurrentStep,
}: SignUpFormProps) => {
    // --- State ---
    const [currentRole, setCurrentRole] = useState<RegistrationRole>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)

    // Citizen Model
    const [citizenModel, setCitizenModel] = useState({
        pinfl: '',
        fullName: '',
        address: '',
        phone: '',
        password: '',
    })

    // Director Model
    const [directorModel, setDirectorModel] = useState({
        inn: '',
        companyName: '',
        directorName: '',
        directorPinflFromFile: '',
        userPinfl: '',
        phone: '',
        password: '',
        confirmPassword: '',
    })

    // --- Actions ---

    const selectRole = (role: RegistrationRole) => {
        setCurrentRole(role)
        setCurrentStep('verification')
        setMessage('')
    }

    // --- API Logic (Citizen) ---

    const checkCitizenPinfl = async () => {
        if (citizenModel.pinfl.length !== 14) {
            setMessage("JSHSHIR 14 ta raqamdan iborat bo'lishi kerak")
            return
        }
        setSearchLoading(true)
        setMessage('')

        try {
            // REPLACE WITH YOUR API CALL
            // const data = await api.getPersonByPinfl(citizenModel.pinfl)

            // Mocking success for demo:
            setTimeout(() => {
                setCitizenModel((prev) => ({
                    ...prev,
                    fullName: 'Test User Citizen',
                    address: 'Tashkent, Uzbekistan',
                }))
                setCurrentStep('account')
                setSearchLoading(false)
            }, 1000)
        } catch (error) {
            setMessage('Foydalanuvchi topilmadi yoki aloqa xatosi')
            setSearchLoading(false)
        }
    }

    const registerCitizen = async () => {
        if (!citizenModel.phone || !citizenModel.password) {
            setMessage('Telefon va Parol kiritilishi shart')
            return
        }

        setIsLoading(true)
        try {
            // REPLACE WITH YOUR API CALL
            console.log('Registering Citizen', citizenModel)

            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        } catch (error) {
            setMessage("Ro'yxatdan o'tishda xatolik")
            setIsLoading(false)
        }
    }

    // --- API Logic (Director) ---

    const checkCompanyInn = async () => {
        if (directorModel.inn.length !== 9) {
            setMessage("STIR (INN) 9 ta raqamdan iborat bo'lishi kerak")
            return
        }
        setSearchLoading(true)
        setMessage('')

        try {
            // REPLACE WITH YOUR API CALL
            setTimeout(() => {
                setDirectorModel((prev) => ({
                    ...prev,
                    companyName: 'ACME LLC',
                    directorName: 'Director John Doe',
                    directorPinflFromFile: '12345678901234',
                }))
                setSearchLoading(false)
            }, 1000)
        } catch (error) {
            setMessage('Tashkilot topilmadi')
            setSearchLoading(false)
        }
    }

    const verifyDirectorPinfl = () => {
        if (directorModel.userPinfl !== directorModel.directorPinflFromFile) {
            setMessage("Direktor JSHSHIR ma'lumotlari mos kelmadi")
            return
        }
        setCurrentStep('account')
        setMessage('')
    }

    const registerDirector = async () => {
        if (!directorModel.phone || !directorModel.password) {
            setMessage('Telefon va Parol kiritilishi shart')
            return
        }

        setIsLoading(true)
        try {
            // REPLACE WITH YOUR API CALL
            console.log('Registering Director', directorModel)

            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        } catch (error) {
            setMessage("Ro'yxatdan o'tishda xatolik")
            setIsLoading(false)
        }
    }

    // --- Render Helpers ---

    const renderSelectionStep = () => (
        <div className="flex flex-col gap-4">
            <div
                className="group border border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => selectRole('citizen')}
            >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                    <HiUser className="text-2xl text-blue-500" />
                </div>
                <div>
                    <div className="font-bold text-lg heading-text">Fuqaro</div>
                    <div className="text-gray-500 text-sm">
                        Jismoniy shaxs sifatida ro'yxatdan o'tish
                    </div>
                </div>
            </div>

            <div
                className="group border border-gray-200 dark:border-gray-700 hover:border-green-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => selectRole('director')}
            >
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                    <HiOfficeBuilding className="text-2xl text-green-500" />
                </div>
                <div>
                    <div className="font-bold text-lg heading-text">
                        Tashkilot
                    </div>
                    <div className="text-gray-500 text-sm">
                        Tashkilot direktori sifatida ro'yxatdan o'tish
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCitizenForm = () => (
        <div className="flex flex-col gap-4">
            {/* Step 1: Check PINFL */}
            <div>
                <label className="font-semibold mb-2 block text-sm">
                    JSHSHIR (PINFL)
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="14 xonali raqamni kiriting"
                        value={citizenModel.pinfl}
                        onChange={(e: any) =>
                            setCitizenModel({
                                ...citizenModel,
                                pinfl: e.target.value,
                            })
                        }
                        disabled={currentStep === 'account'}
                    />
                    <Button
                        variant="solid"
                        loading={searchLoading}
                        onClick={checkCitizenPinfl}
                        disabled={currentStep === 'account'}
                    >
                        Tekshirish
                    </Button>
                </div>
            </div>

            {/* Step 2: Account Details (Shown after check) */}
            {currentStep === 'account' && (
                <div className="animate-fade-in flex flex-col gap-4 mt-2">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                To'liq Ism
                            </span>
                            <div className="font-semibold">
                                {citizenModel.fullName}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                Manzil
                            </span>
                            <div className="text-sm">
                                {citizenModel.address}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Telefon raqami
                        </label>
                        <Input
                            placeholder="+998..."
                            value={citizenModel.phone}
                            onChange={(e: any) =>
                                setCitizenModel({
                                    ...citizenModel,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Parol
                        </label>
                        <Input
                            type="password"
                            placeholder="Parol o'ylab toping"
                            value={citizenModel.password}
                            onChange={(e: any) =>
                                setCitizenModel({
                                    ...citizenModel,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Button
                        block
                        variant="solid"
                        loading={isLoading}
                        onClick={registerCitizen}
                        disabled={disableSubmit}
                    >
                        Ro'yxatdan o'tishni yakunlash
                    </Button>
                </div>
            )}
        </div>
    )

    const renderDirectorForm = () => (
        <div className="flex flex-col gap-4">
            {/* Step 1: Check INN */}
            <div>
                <label className="font-semibold mb-2 block text-sm">
                    Tashkilot STIR (INN)
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="9 xonali raqamni kiriting"
                        value={directorModel.inn}
                        onChange={(e: any) =>
                            setDirectorModel({
                                ...directorModel,
                                inn: e.target.value,
                            })
                        }
                        disabled={!!directorModel.companyName}
                    />
                    <Button
                        variant="solid"
                        loading={searchLoading}
                        onClick={checkCompanyInn}
                        disabled={!!directorModel.companyName}
                    >
                        Izlash
                    </Button>
                </div>
            </div>

            {/* Found Company Info */}
            {directorModel.companyName && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 animate-fade-in">
                    <div className="text-sm text-gray-500">
                        Tashkilot topildi:
                    </div>
                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {directorModel.companyName}
                    </div>
                    <div className="text-sm mt-2">
                        Direktor:{' '}
                        <span className="font-medium">
                            {directorModel.directorName}
                        </span>
                    </div>
                </div>
            )}

            {/* Step 2: Verify Director PINFL */}
            {directorModel.companyName && currentStep === 'verification' && (
                <div className="animate-fade-in mt-2">
                    <Alert type="info" className="mb-4">
                        Tashkilot egasi ekanligingizni tasdiqlash uchun Direktor
                        JSHSHIR raqamini kiriting.
                    </Alert>
                    <label className="font-semibold mb-2 block text-sm">
                        Direktor JSHSHIR (PINFL)
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="JSHSHIR kiriting"
                            value={directorModel.userPinfl}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    userPinfl: e.target.value,
                                })
                            }
                        />
                        <Button
                            variant="solid"
                            color="green-500"
                            onClick={verifyDirectorPinfl}
                        >
                            Tasdiqlash
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in flex flex-col gap-4 mt-2">
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <h4 className="font-bold text-lg">Hisob ma'lumotlari</h4>

                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Telefon raqami
                        </label>
                        <Input
                            placeholder="+998..."
                            value={directorModel.phone}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Parol
                        </label>
                        <Input
                            type="password"
                            placeholder="Parol o'ylab toping"
                            value={directorModel.password}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Button
                        block
                        variant="solid"
                        loading={isLoading}
                        onClick={registerDirector}
                        disabled={disableSubmit}
                    >
                        Tashkilotni ro'yxatdan o'tkazish
                    </Button>
                </div>
            )}
        </div>
    )

    // --- Main Render Switch ---

    if (currentStep === 'selection') {
        return renderSelectionStep()
    }

    return (
        <div className="animate-fade-in">
            {currentRole === 'citizen'
                ? renderCitizenForm()
                : renderDirectorForm()}
        </div>
    )
}

export default SignUpForm
