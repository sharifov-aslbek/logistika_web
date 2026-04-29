import * as XLSX from 'xlsx'



// aaa
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

export type RegistryOriginalRow = {
    rowNumber: number
    rowObject: Record<string, string>
}

export type RegistryParsedRow = {
    rowNumber: number
    originalRow: Record<string, string>
    normalizedRow: Record<string, any>
}

export type RegistrySheetReadResult = {
    error: string | null
    data: Record<string, any>[]
    parsedRows: RegistryParsedRow[]
    originalRows: RegistryOriginalRow[]
    missingHeaders: string[]
}

export type RegistryValidationIssue = {
    rowNumber: number
    message: string
}

export type RegistryValidationResult = {
    errors: string[]
    issues: RegistryValidationIssue[]
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

const getExportHeaderName = (header: string, index: number) => {
    const trimmedHeader = String(header || '').trim()

    return trimmedHeader || `column_${index + 1}`
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
): RegistrySheetReadResult => {
    const rows = readWorksheetRows(worksheet)

    if (!rows || rows.length < 3) {
        return {
            error: "Excel faylda kamida 3 qator bo'lishi kerak: 1-qator keylar, 2-qator label, 3-qator data.",
            data: [],
            parsedRows: [],
            originalRows: [],
            missingHeaders: [],
        }
    }

    const headerRow = rows[0] || []
    const exportHeaders = headerRow.map((cell, index) =>
        getExportHeaderName(String(cell || ''), index),
    )
    const normalizedHeaders = headerRow.map((cell) =>
        normalizeHeaderKey(String(cell || '')),
    )
    const dataRows = rows.slice(2)
    const originalRows = dataRows
        .map((row, index) => {
            const rowObject: Record<string, string> = {}

            exportHeaders.forEach((header, columnIndex) => {
                rowObject[header] = row?.[columnIndex] ?? ''
            })

            return {
                rowNumber: index + 3,
                rowObject,
            }
        })
        .filter((row) =>
            Object.values(row.rowObject).some((value) => isMeaningfulValue(value)),
        )
    const parsedRows = originalRows.map((row) => {
        const normalizedRow: Record<string, any> = {}

        normalizedHeaders.forEach((header, index) => {
            if (header) {
                normalizedRow[header] = row.rowObject[exportHeaders[index]] ?? ''
            }
        })

        return {
            rowNumber: row.rowNumber,
            originalRow: row.rowObject,
            normalizedRow,
        }
    })
    const mappedData = parsedRows.map((row) => row.normalizedRow)

    const missingHeaders = requiredHeaders.filter(
        (header) => !normalizedHeaders.includes(header),
    )

    if (missingHeaders.length > 0) {
        return {
            error: `Excel ustunlari topilmadi. Jadvalda quyidagi ustunlar bo'lishi kerak: ${requiredHeaders.join(', ')}. Topilmaganlar: ${missingHeaders.join(', ')}`,
            data: mappedData,
            parsedRows,
            originalRows,
            missingHeaders,
        }
    }

    return {
        error: null,
        data: mappedData,
        parsedRows,
        originalRows,
        missingHeaders: [],
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

export const validateInternalExcelData = (
    parsedRows: RegistryParsedRow[],
): RegistryValidationResult => {
    const errors: string[] = []
    const issues: RegistryValidationIssue[] = []
    const requiredFields = getInternalRequiredHeaders()

    const addIssue = (rowNumber: number, message: string) => {
        errors.push(message)
        issues.push({
            rowNumber,
            message,
        })
    }

    parsedRows.forEach(({ rowNumber, normalizedRow }) => {
        const missingCols = requiredFields.filter((field) => {
            return (
                normalizedRow[field] == null ||
                String(normalizedRow[field]).trim() === ''
            )
        })

        if (missingCols.length === 1 && missingCols[0] === 'receiver') {
            addIssue(rowNumber, `Qator ${rowNumber}: "receiver" ustuni bo'sh`)
            return
        }

        if (missingCols.length > 0) {
            addIssue(
                rowNumber,
                `Qator ${rowNumber}: To'ldirilmagan ustunlar: ${missingCols.join(', ')}`,
            )
        }
    })

    return {
        errors,
        issues,
    }
}

export const validateExternalExcelData = (
    parsedRows: RegistryParsedRow[],
): RegistryValidationResult => {
    const errors: string[] = []
    const issues: RegistryValidationIssue[] = []
    const hasPinflHeader = parsedRows.some(({ normalizedRow }) =>
        Object.prototype.hasOwnProperty.call(normalizedRow, 'pinfl'),
    )
    const hasInnHeader = parsedRows.some(({ normalizedRow }) =>
        Object.prototype.hasOwnProperty.call(normalizedRow, 'inn'),
    )
    const hasLegacyHeader = parsedRows.some(({ normalizedRow }) =>
        Object.prototype.hasOwnProperty.call(normalizedRow, 'pinfl_or_inn'),
    )

    const addIssue = (rowNumber: number, message: string) => {
        errors.push(message)
        issues.push({
            rowNumber,
            message,
        })
    }

    if (!hasPinflHeader && !hasInnHeader && !hasLegacyHeader) {
        return {
            errors: ["Excel faylda `pinfl` yoki `inn` nomli header bo'lishi kerak"],
            issues,
        }
    }

    parsedRows.forEach(({ rowNumber, normalizedRow }) => {
        const { pinfl, inn, pinflOrInn, preferredKey } =
            getNormalizedExternalIdentifiers(normalizedRow)

        if (!pinflOrInn) {
            addIssue(rowNumber, `Qator ${rowNumber}: "${preferredKey}" ustuni bo'sh`)
        }

        if (preferredKey === 'pinfl' && pinfl && pinfl.length !== 14) {
            addIssue(
                rowNumber,
                `Qator ${rowNumber}: "pinfl" 14 ta raqam bo'lishi kerak`,
            )
        }

        if (preferredKey === 'inn' && inn && inn.length !== 9) {
            addIssue(
                rowNumber,
                `Qator ${rowNumber}: "inn" 9 ta raqam bo'lishi kerak`,
            )
        }

        if (
            preferredKey === 'pinfl_or_inn' &&
            pinflOrInn &&
            pinflOrInn.length !== 9 &&
            pinflOrInn.length !== 14
        ) {
            addIssue(
                rowNumber,
                `Qator ${rowNumber}: "pinfl_or_inn" 9 yoki 14 ta raqam bo'lishi kerak`,
            )
        }
    })

    return {
        errors,
        issues,
    }
}

export const buildValidationDownloadRows = (
    originalRows: RegistryOriginalRow[],
    issues: RegistryValidationIssue[],
    includeAllRows = false,
) => {
    if (issues.length === 0) {
        if (!includeAllRows || originalRows.length === 0) {
            return [] as Record<string, string>[]
        }

        return originalRows.map((row) => ({
            ...row.rowObject,
        }))
    }

    const issueMap = issues.reduce(
        (map, issue) => {
            const currentMessages = map.get(issue.rowNumber) || []
            currentMessages.push(issue.message)
            map.set(issue.rowNumber, currentMessages)
            return map
        },
        new Map<number, string[]>(),
    )

    return originalRows
        .filter((row) => issueMap.has(row.rowNumber))
        .map((row) => ({
            ...row.rowObject,
        }))
}

export const downloadValidationRowsExcel = (
    rows: Record<string, string>[],
    fileName: string,
) => {
    if (rows.length === 0) {
        return false
    }

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Errors')
    XLSX.writeFile(workbook, fileName)

    return true
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
