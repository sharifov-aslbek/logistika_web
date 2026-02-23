import { useState, useEffect, useMemo } from 'react'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { HiOutlineRefresh } from 'react-icons/hi'
import { useEImzoStore } from '@/store/eImzoStore'

interface MissingSignProps {
    disabled?: boolean
    onSignClicked: (cert: any) => void
}

// --- Helper: Title Case ---
const toTitleCase = (str: string) => {
    if (!str) return ''
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    )
}

// --- Helper: Extract ID (INN/PINFL) from PFX Alias ---
const extractId = (alias: string) => {
    if (!alias) return ''
    const pinflMatch = alias.match(/1\.2\.860\.3\.16\.1\.2=(\d{14})/)
    if (pinflMatch) return `PINFL: ${pinflMatch[1]}`

    const innMatch = alias.match(/1\.2\.860\.3\.16\.1\.1=(\d{9})/)
    if (innMatch) return `INN: ${innMatch[1]}`

    return ''
}

// --- Main Parsing Logic ---
const parseCertInfo = (cert: any) => {
    const rawName = cert._issuedPerson || cert.issuedPerson || cert.CN || ''
    const label = toTitleCase(rawName)

    const rawOrg = cert._companyName || cert.companyName || cert.O || ''
    const org = rawOrg ? rawOrg.toUpperCase() : 'JISMONIY SHAXS'

    let tin = cert._innNumber || cert.innNumber || cert.UID || ''

    if (!tin) {
        const aliasText = cert._alias || cert.alias || ''
        tin = extractId(aliasText)
    } else {
        tin = tin.length > 9 ? `PINFL: ${tin}` : `INN: ${tin}`
    }

    return { label, org, tin }
}

const MissingSign = ({ disabled, onSignClicked }: MissingSignProps) => {
    const { certificates, loading, init } = useEImzoStore()
    const [selectedCert, setSelectedCert] = useState<any>(null)

    useEffect(() => {
        init()
    }, [])

    const activeCertificates = useMemo(() => {
        const now = Date.now()
        return certificates.filter((cert: any) => {
            const validTo =
                cert._validEndDate || cert.validEndDate || cert.validTo
            const endDate = new Date(validTo).getTime()
            return endDate > now
        })
    }, [certificates])

    const options = activeCertificates.map((cert: any, index: number) => {
        const info = parseCertInfo(cert)
        return {
            value: (cert._serialNumber || cert.serialNumber) + index,
            label: info.label,
            raw: cert,
            details: { org: info.org, tin: info.tin },
        }
    })

    const formatOptionLabel = (option: any) => (
        <div className="flex flex-col items-start py-0.5">
            <span className="font-bold text-gray-800 dark:text-gray-100 text-[14px]">
                {option.label}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {option.details.org} | {option.details.tin}
            </span>
        </div>
    )

    const handleChange = (option: any) => {
        setSelectedCert(option)
        onSignClicked(option?.raw || null)
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    ELEKTRON IMZO (E-IMZO)
                </div>
                <Button
                    size="xs"
                    icon={<HiOutlineRefresh className="text-sm" />}
                    variant="plain"
                    onClick={() => init()}
                    loading={loading}
                    // UPDATED: Blue hover color
                    className="text-gray-400 hover:text-blue-600 p-0 h-auto"
                    title="Yangilash"
                />
            </div>

            <Select
                placeholder={
                    loading ? 'E-IMZO yuklanmoqda...' : 'Kalitni tanlang...'
                }
                options={options}
                value={selectedCert}
                onChange={handleChange}
                formatOptionLabel={formatOptionLabel}
                isDisabled={disabled || loading}
                isLoading={loading}
                noOptionsMessage={() => 'Kalitlar topilmadi'}
                // UPDATED: Blue Border when selected
                className={`mb-4 ${selectedCert ? '[&>div]:!border-blue-500 [&>div]:!ring-1 [&>div]:!ring-blue-500' : ''}`}
                size="md"
            />

            {selectedCert && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3 w-full animate-fade-in">
                    <div className="flex justify-between items-start gap-4 mb-2 pb-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap pt-0.5">
                            Tashkilot (Org):
                        </span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 text-right leading-tight break-words uppercase">
                            {selectedCert.details.org}
                        </span>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            ID (INN/PINFL):
                        </span>
                        <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 text-right">
                            {selectedCert.details.tin}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MissingSign
