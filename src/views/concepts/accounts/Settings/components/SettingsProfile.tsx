import { useEffect } from 'react'
import Input from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar' // Import Avatar
import { FormItem, Form } from '@/components/ui/Form'
import Spinner from '@/components/ui/Spinner'
import { useAccountStore } from '@/store/accountStore'
import { HiOutlineUser } from 'react-icons/hi' // Import User Icon

const SettingsProfile = () => {
    // 1. Connect to Store
    const getProfile = useAccountStore((state) => state.getProfile)
    const userProfile = useAccountStore((state) => state.userProfile)
    const isLoading = useAccountStore((state) => state.isLoading)

    // 2. Fetch data on mount
    useEffect(() => {
        getProfile()
    }, [getProfile])

    // 3. Loading State
    if (isLoading && !userProfile.fullName) {
        return (
            <div className="flex justify-center p-10">
                <Spinner size={40} />
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h4 className="mb-6 border-b dark:border-gray-700 pb-3">
                Shaxsiy ma'lumotlar
            </h4>

            {/* ADDED: User Icon Section */}
            <div className="flex flex-col items-center mb-8">
                <Avatar
                    size={90}
                    className="bg-gray-100 text-gray-300 shadow-lg"
                    icon={<HiOutlineUser />}
                    shape="circle"
                />
                <div className="mt-4 text-center">
                    <h5 className="font-bold text-gray-700 dark:text-gray-200">
                        {userProfile.fullName || 'Foydalanuvchi'}
                    </h5>
                    <p className="text-gray-500 text-sm">
                        {userProfile.role || 'Hisob'}
                    </p>
                </div>
            </div>

            <Form>
                {/* Full Name */}
                <FormItem label="F.I.O">
                    <Input
                        value={userProfile.fullName}
                        placeholder="F.I.O"
                        disabled
                        className="bg-gray-50 dark:!bg-gray-900 cursor-not-allowed"
                    />
                </FormItem>

                {/* Grid for Phone and PINFL */}
                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem label="Telefon raqami">
                        <Input
                            value={userProfile.phone}
                            placeholder="+998..."
                            disabled
                            className="bg-gray-50 dark:!bg-gray-900 cursor-not-allowed"
                        />
                    </FormItem>

                    <FormItem label="JSHSHIR (PINFL)">
                        <Input
                            value={userProfile.pinfl}
                            placeholder="JSHSHIR"
                            disabled
                            className="bg-gray-50 dark:!bg-gray-900 cursor-not-allowed"
                        />
                    </FormItem>
                </div>

                {/* Address */}
                <FormItem label="Manzil">
                    <Input
                        textArea
                        rows={2}
                        value={userProfile.address}
                        placeholder="Manzil"
                        disabled
                        className="bg-gray-50 dark:!bg-gray-900 cursor-not-allowed resize-none"
                    />
                </FormItem>
            </Form>
        </div>
    )
}

export default SettingsProfile
