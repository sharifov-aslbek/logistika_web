import * as XLSX from 'xlsx'



// aa
export const EXCEL_ACCEPT =
    '.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export type Option = {
    value: number
    label: string
}

export type RegistryApiResult = {
    status: 'success' | 'error'
    message: string
    totalProcessed: number
    successCount: number
    errorCount: number
    errorMessages: string[]
}

const EXCEL_DATE_OUTPUT_FORMAT = 'dd/mm/yyyy'

const HEADER_ALIASES: Record<string, string> = {
    receiver: 'receiver',
    receiver_name: 'receiver',
    qabul_qiluvchi: 'receiver',
    oluvchi: 'receiver',
    получатель: 'receiver',

    address: 'address',
    receiver_address: 'address',
    manzil: 'address',
    адрес: 'address',

    region: 'region',
    region_id: 'region',
    viloyat: 'region',
    область: 'region',

    area: 'area',
    area_id: 'area',
    tuman: 'area',
    tuman_id: 'area',
    район: 'area',

    branch_id: 'branch_id',
    branchid: 'branch_id',
    branch_id_: 'branch_id',
    branch: 'branch_id',
    filial: 'branch_id',
    filial_id: 'branch_id',

    pinfl_or_inn: 'pinfl_or_inn',
    pinflorinn: 'pinfl_or_inn',
    pinfl_inn: 'pinfl_or_inn',
    pinfl: 'pinfl',
    inn: 'inn',
}

export const normalizeHeaderKey = (header: string) => {
    const normalized = String(header || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[()]/g, '')
        .replace(/__+/g, '_')

    return HEADER_ALIASES[normalized] || normalized
}

export const isMeaningfulValue = (value: unknown) => {
    return String(value ?? '').trim() !== ''
}

export const getInternalRequiredHeaders = () => {
    return ['receiver', 'address', 'region', 'area']
}

export const getExternalRequiredHeaders = () => {
    return []
}

export const getNormalizedExternalIdentifiers = (row: Record<string, any>) => {
    const pinfl = String(row.pinfl ?? '').replace(/\D/g, '')
    const inn = String(row.inn ?? '').replace(/\D/g, '')
    const legacyPinflOrInn = String(row.pinfl_or_inn ?? '').replace(/\D/g, '')
    const orderedKeys = Object.keys(row).filter((key) =>
        ['pinfl', 'inn', 'pinfl_or_inn'].includes(key),
    )
    const preferredKey = orderedKeys[0] || 'pinfl_or_inn'

    return {
        pinfl,
        inn,
        preferredKey,
        pinflOrInn:
            preferredKey === 'pinfl'
                ? pinfl
                : preferredKey === 'inn'
                  ? inn
                  : legacyPinflOrInn,
    }
}

const getWorksheetCellDisplayValue = (cell?: XLSX.CellObject) => {
    if (!cell) {
        return ''
    }

    const cellFormat =
        typeof cell.z === 'string' && cell.z.trim() ? cell.z : undefined
    const isDateCell =
        cell.t === 'd' ||
        (typeof cell.v === 'number' &&
            typeof cellFormat === 'string' &&
            XLSX.SSF.is_date(cellFormat))

    if (isDateCell) {
        try {
            return XLSX.SSF.format(EXCEL_DATE_OUTPUT_FORMAT, cell.v)
        } catch {
            // If formatting fails, continue with the existing fallbacks below.
        }
    }

    // Prefer the formatted display text from Excel so values like
    // `05/01/2026` are preserved exactly as shown in the sheet.
    if (typeof cell.w === 'string') {
        return cell.w
    }

    if (cell.v == null) {
        return ''
    }

    if (cell.v instanceof Date) {
        return String(cell.v)
    }

    return String(cell.v)
}

const readWorksheetRows = (worksheet: XLSX.WorkSheet) => {
    const ref = worksheet['!ref']

    if (!ref) {
        return [] as string[][]
    }

    const range = XLSX.utils.decode_range(ref)
    const rows: string[][] = []

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const row: string[] = []

        for (
            let columnIndex = range.s.c;
            columnIndex <= range.e.c;
            columnIndex += 1
        ) {
            const cellAddress = XLSX.utils.encode_cell({
                r: rowIndex,
                c: columnIndex,
            })

            row.push(getWorksheetCellDisplayValue(worksheet[cellAddress]))
        }

        rows.push(row)
    }

    return rows
}

export const readSheetWithHeaders = (
    worksheet: XLSX.WorkSheet,
    requiredHeaders: string[],
) => {
    const rows = readWorksheetRows(worksheet)

    if (!rows || rows.length < 3) {
        return {
            error: "Excel faylda kamida 3 qator bo'lishi kerak: 1-qator keylar, 2-qator label, 3-qator data.",
            data: [],
        }
    }

    const headerRow = rows[0] || []
    const normalizedHeaders = headerRow.map((cell) =>
        normalizeHeaderKey(String(cell || '')),
    )

    const missingHeaders = requiredHeaders.filter(
        (header) => !normalizedHeaders.includes(header),
    )

    if (missingHeaders.length > 0) {
        return {
            error: `Excel ustunlari topilmadi. Jadvalda quyidagi ustunlar bo'lishi kerak: ${requiredHeaders.join(', ')}. Topilmaganlar: ${missingHeaders.join(', ')}`,
            data: [],
        }
    }

    const dataRows = rows.slice(2)

    const mappedData = dataRows
        .map((row) => {
            const obj: Record<string, any> = {}

            normalizedHeaders.forEach((header, index) => {
                if (header) {
                    obj[header] = row?.[index] ?? ''
                }
            })

            return obj
        })
        .filter((row) =>
            Object.values(row).some((value) => isMeaningfulValue(value)),
        )

    return {
        error: null,
        data: mappedData,
    }
}

export const isExcelFile = (file: File) => {
    const fileName = file.name.toLowerCase()

    return (
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        file.type === 'application/vnd.ms-excel' ||
        file.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
}

export const validateRegistryFile = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) {
        return 'Excel fayl tanlash shart'
    }

    if (newFiles.length > 1) {
        return 'Faqat bitta Excel fayl yuklash mumkin'
    }

    if (!isExcelFile(newFiles[0])) {
        return 'Faqat Excel (.xlsx, .xls) fayl yuklash mumkin'
    }

    return true
}

export const validateInternalExcelData = (data: any[]) => {
    const errors: string[] = []
    const requiredFields = getInternalRequiredHeaders()

    data.forEach((row, index) => {
        const rowNumber = index + 3

        if (!row.receiver || String(row.receiver).trim() === '') {
            errors.push(`Qator ${rowNumber}: "receiver" ustuni bo'sh`)
        }

        const missingCols = requiredFields.filter((field) => {
            return row[field] == null || String(row[field]).trim() === ''
        })

        if (missingCols.length > 0) {
            errors.push(
                `Qator ${rowNumber}: To'ldirilmagan ustunlar: ${missingCols.join(', ')}`,
            )
        }
    })

    return errors
}

export const validateExternalExcelData = (data: any[]) => {
    const errors: string[] = []
    const hasPinflHeader = data.some((row) =>
        Object.prototype.hasOwnProperty.call(row, 'pinfl'),
    )
    const hasInnHeader = data.some((row) =>
        Object.prototype.hasOwnProperty.call(row, 'inn'),
    )
    const hasLegacyHeader = data.some((row) =>
        Object.prototype.hasOwnProperty.call(row, 'pinfl_or_inn'),
    )

    if (!hasPinflHeader && !hasInnHeader && !hasLegacyHeader) {
        return ["Excel faylda `pinfl` yoki `inn` nomli header bo'lishi kerak"]
    }

    data.forEach((row, index) => {
        const rowNumber = index + 3
        const { pinfl, inn, pinflOrInn, preferredKey } =
            getNormalizedExternalIdentifiers(row)

        if (!pinflOrInn) {
            errors.push(`Qator ${rowNumber}: "${preferredKey}" ustuni bo'sh`)
        }

        if (preferredKey === 'pinfl' && pinfl && pinfl.length !== 14) {
            errors.push(`Qator ${rowNumber}: "pinfl" 14 ta raqam bo'lishi kerak`)
        }

        if (preferredKey === 'inn' && inn && inn.length !== 9) {
            errors.push(`Qator ${rowNumber}: "inn" 9 ta raqam bo'lishi kerak`)
        }

        if (
            preferredKey === 'pinfl_or_inn' &&
            pinflOrInn &&
            pinflOrInn.length !== 9 &&
            pinflOrInn.length !== 14
        ) {
            errors.push(
                `Qator ${rowNumber}: "pinfl_or_inn" 9 yoki 14 ta raqam bo'lishi kerak`,
            )
        }
    })

    return errors
}

export const transformInternalDataToApiFormat = (
    rawData: any[],
    templateName: string,
    selectedBranchId?: number | null,
) => {
    const cleanRows = rawData.filter((row) => {
        return row && isMeaningfulValue(row.receiver)
    })

    return cleanRows.map((row) => {
        const { receiver, address, region, area, branch_id, ...rest } = row
        const contentObj: Record<string, string> = {}

        Object.keys(rest).forEach((key) => {
            contentObj[key] = String(rest[key] ?? '')
        })

        return {
            receiver: String(receiver ?? ''),
            regionId: Number(region) || 0,
            areaId: Number(area) || 0,
            address: String(address ?? ''),
            content: JSON.stringify(contentObj),
            templateName,
            BranchId: selectedBranchId
                ? Number(selectedBranchId)
                : branch_id
                  ? Number(branch_id)
                  : 0,
        }
    })
}

export const transformExternalDataToApiFormat = (
    rawData: any[],
    templateName: string,
    selectedBranchId?: number | null,
) => {
    const cleanRows = rawData.filter((row) => {
        const { pinflOrInn } = getNormalizedExternalIdentifiers(row)

        return row && isMeaningfulValue(pinflOrInn)
    })

    return cleanRows.map((row) => {
        const { pinfl, inn, pinfl_or_inn, branch_id, ...rest } = row
        const contentObj: Record<string, string> = {}
        const normalizedIdentifiers = getNormalizedExternalIdentifiers(row)

        Object.keys(rest).forEach((key) => {
            contentObj[key] = String(rest[key] ?? '')
        })

        return {
            pinflOrInn: normalizedIdentifiers.pinflOrInn,
            templateName,
            content: JSON.stringify(contentObj),
            branchId: selectedBranchId
                ? Number(selectedBranchId)
                : branch_id
                  ? Number(branch_id)
                  : 0,
        }
    })
}

export const mapApiResult = (response: any): RegistryApiResult => {
    const resultData = response.data?.data || {}

    return {
        status: 'success',
        message: response.data?.message || 'Amaliyot muvaffaqiyatli yakunlandi',
        totalProcessed: resultData.totalProcessed || 0,
        successCount: resultData.successCount || 0,
        errorCount: resultData.errorCount || 0,
        errorMessages: resultData.errorMessages || [],
    }
}

export const createRegistryErrorResult = (
    message: string,
): RegistryApiResult => {
    return {
        status: 'error',
        message,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
        errorMessages: [message],
    }
}
