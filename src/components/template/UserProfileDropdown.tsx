import { useEffect } from 'react'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useAccountStore } from '@/store/accountStore'
import { Link, useNavigate } from 'react-router-dom'
import { PiUserDuotone, PiSignOutDuotone } from 'react-icons/pi'
import type { JSX } from 'react'

type DropdownList = {
    label: string
    path: string
    icon: JSX.Element
}

const dropdownItemList: DropdownList[] = [
    {
        label: 'Profile',
        path: '/dashboard/profile',
        icon: <PiUserDuotone />,
    },
]

const _UserDropdown = () => {
    // 1. FIX: Select state individually to prevent infinite loops
    const userProfile = useAccountStore((state) => state.userProfile)
    const logout = useAccountStore((state) => state.logout)
    const getProfile = useAccountStore((state) => state.getProfile)

    const navigate = useNavigate()

    // 2. Now this is safe
    useEffect(() => {
        getProfile()
    }, [getProfile])

    const handleSignOut = () => {
        logout()
        navigate('/sign-in')
    }

    const userName = userProfile?.fullName || 'User'
    const userRole = userProfile?.role ? String(userProfile.role) : 'Account'

    const avatarProps = {
        icon: <PiUserDuotone />,
    }

    return (
        <Dropdown
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className="cursor-pointer flex items-center">
                    <Avatar size={32} {...avatarProps} />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {userName}
                        </div>
                        {/*<div className="text-xs">{userName}</div>*/}
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {dropdownItemList.map((item) => (
                <Dropdown.Item
                    key={item.label}
                    eventKey={item.label}
                    className="px-0"
                >
                    <Link className="flex h-full w-full px-2" to={item.path}>
                        <span className="flex gap-2 items-center w-full">
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </span>
                    </Link>
                </Dropdown.Item>
            ))}
            <Dropdown.Item variant="divider" />
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>Sign Out</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
