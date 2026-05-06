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
const EXTERNAL_ERROR_IDENTIFIER_REGEX = /\b(?:\d{14}|\d{9})\b/g

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

    templatename: 'templateName',
    template_name: 'templateName',
    template: 'templateName',
    shablon_name: 'templateName',
    shablonname: 'templateName',
    shablon: 'templateName',
    shablon_turi: 'templateName',
    shablon_nomi: 'templateName',
    шаблон: 'templateName',
    шаблон_тури: 'templateName',
    шаблон_номи: 'templateName',

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

    // Excel renders large integers (e.g. 14-digit PINFL) in scientific
    // notation like `1.23457E+13`, which would lose digits once non-numerics
    // are stripped. Use the raw integer value in that case.
    if (
        cell.t === 'n' &&
        typeof cell.v === 'number' &&
        Number.isFinite(cell.v) &&
        Number.isInteger(cell.v) &&
        typeof cell.w === 'string' &&
        /[eE][+-]?\d+/.test(cell.w)
    ) {
        return cell.v.toFixed(0)
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

const normalizeTextForLookup = (value: unknown) => {
    return String(value ?? '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

const transliterateCyrillicToLatin = (value: string) => {
    const letters: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'yo',
        ж: 'j',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'x',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sh',
        ъ: '',
        ы: 'i',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
        ў: 'o',
        қ: 'q',
        ғ: 'g',
        ҳ: 'h',
    }

    return value
        .toLowerCase()
        .split('')
        .map((letter) => letters[letter] ?? letter)
        .join('')
}

const normalizeTemplateNameForMatch = (value: unknown) => {
    return transliterateCyrillicToLatin(String(value ?? ''))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim()
}

const getTemplateMatchScore = (source: string, candidate: string) => {
    if (!source || !candidate) {
        return 0
    }

    if (source === candidate) {
        return 100
    }

    if (source.includes(candidate) || candidate.includes(source)) {
        return Math.round(
            (Math.min(source.length, candidate.length) /
                Math.max(source.length, candidate.length)) *
                80,
        )
    }

    return 0
}

export const resolveTemplateNameFromExcelValue = (
    value: unknown,
    templateNames: string[],
) => {
    const source = normalizeTemplateNameForMatch(value)

    if (!source) {
        return ''
    }

    return templateNames.reduce(
        (bestMatch, templateName) => {
            const candidate = normalizeTemplateNameForMatch(templateName)
            const score = getTemplateMatchScore(source, candidate)

            if (score > bestMatch.score) {
                return {
                    name: templateName,
                    score,
                }
            }

            return bestMatch
        },
        {
            name: '',
            score: 0,
        },
    ).name
}

export const getExcelTemplateNameValue = (row: Record<string, any>) => {
    return row.templateName ?? ''
}

export const validateExcelTemplateNames = (
    parsedRows: RegistryParsedRow[],
    templateNames: string[],
): RegistryValidationResult => {
    const errors: string[] = []
    const issues: RegistryValidationIssue[] = []

    parsedRows.forEach(({ rowNumber, normalizedRow }) => {
        const excelTemplateName = getExcelTemplateNameValue(normalizedRow)
        const matchedTemplateName = resolveTemplateNameFromExcelValue(
            excelTemplateName,
            templateNames,
        )

        if (!String(excelTemplateName ?? '').trim()) {
            const message = `Qator ${rowNumber}: Excel ichida shablon nomi bo'sh`

            errors.push(message)
            issues.push({ rowNumber, message })
            return
        }

        if (!matchedTemplateName) {
            const message = `Qator ${rowNumber}: "${excelTemplateName}" shabloni mavjud shablonlar ichidan topilmadi`

            errors.push(message)
            issues.push({ rowNumber, message })
        }
    })

    return {
        errors,
        issues,
    }
}

const extractQuotedValues = (message: string) => {
    const matches = message.match(/"([^"]+)"|'([^']+)'/g) || []

    return matches.map((match) => normalizeTextForLookup(match.slice(1, -1)))
}

const buildDownloadRowsFromParsedRows = (
    parsedRows: RegistryParsedRow[],
    rowNumbers: Set<number>,
) => {
    return parsedRows
        .filter((row) => rowNumbers.has(row.rowNumber))
        .map((row) => ({
            ...row.originalRow,
        }))
}

const buildExternalFailedRowNumbers = (
    parsedRows: RegistryParsedRow[],
    errorMessages: string[],
) => {
    const failedIdentifiers = new Set<string>()

    errorMessages.forEach((message) => {
        const matches = message.match(EXTERNAL_ERROR_IDENTIFIER_REGEX) || []

        matches.forEach((match) => {
            failedIdentifiers.add(match)
        })
    })

    if (failedIdentifiers.size === 0) {
        return new Set<number>()
    }

    return parsedRows.reduce((rowNumbers, row) => {
        const { pinfl, inn, pinflOrInn } = getNormalizedExternalIdentifiers(
            row.normalizedRow,
        )
        const rowIdentifiers = [pinfl, inn, pinflOrInn].filter(Boolean)

        if (
            rowIdentifiers.some((identifier) => failedIdentifiers.has(identifier))
        ) {
            rowNumbers.add(row.rowNumber)
        }

        return rowNumbers
    }, new Set<number>())
}

const buildInternalFailedRowNumbers = (
    parsedRows: RegistryParsedRow[],
    errorMessages: string[],
) => {
    return errorMessages.reduce((rowNumbers, message) => {
        const normalizedMessage = normalizeTextForLookup(message)
        const quotedValues = new Set(extractQuotedValues(message))

        const matchesBoth = parsedRows.filter((row) => {
            const receiver = normalizeTextForLookup(row.normalizedRow.receiver)
            const address = normalizeTextForLookup(row.normalizedRow.address)

            if (!receiver || !address) {
                return false
            }

            return (
                (quotedValues.has(receiver) && quotedValues.has(address)) ||
                (normalizedMessage.includes(receiver) &&
                    normalizedMessage.includes(address))
            )
        })

        if (matchesBoth.length > 0) {
            matchesBoth.forEach((row) => rowNumbers.add(row.rowNumber))
            return rowNumbers
        }

        const receiverMatches = parsedRows.filter((row) => {
            const receiver = normalizeTextForLookup(row.normalizedRow.receiver)

            if (!receiver) {
                return false
            }

            return (
                quotedValues.has(receiver) || normalizedMessage.includes(receiver)
            )
        })

        if (receiverMatches.length === 1) {
            rowNumbers.add(receiverMatches[0].rowNumber)
            return rowNumbers
        }

        const addressMatches = parsedRows.filter((row) => {
            const address = normalizeTextForLookup(row.normalizedRow.address)

            if (!address) {
                return false
            }

            return quotedValues.has(address) || normalizedMessage.includes(address)
        })

        if (addressMatches.length === 1) {
            rowNumbers.add(addressMatches[0].rowNumber)
        }

        return rowNumbers
    }, new Set<number>())
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

export const buildApiFailedDownloadRows = (
    type: 'internal' | 'external',
    parsedRows: RegistryParsedRow[],
    errorMessages: string[],
) => {
    if (parsedRows.length === 0 || errorMessages.length === 0) {
        return [] as Record<string, string>[]
    }

    const failedRowNumbers =
        type === 'external'
            ? buildExternalFailedRowNumbers(parsedRows, errorMessages)
            : buildInternalFailedRowNumbers(parsedRows, errorMessages)

    return buildDownloadRowsFromParsedRows(parsedRows, failedRowNumbers)
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

const sanitizeBackendContentValue = (value: unknown) => {
    const stringValue = String(value ?? '')

    if (!/\d/.test(stringValue)) {
        return stringValue
    }

    return stringValue.replace(/[$€£¥₽₩]/g, '').trim()
}

export const transformInternalDataToApiFormat = (
    rawData: any[],
    templateName: string,
    selectedBranchId?: number | null,
    options?: {
        readTemplateFromExcel?: boolean
        templateNames?: string[]
    },
) => {
    const cleanRows = rawData.filter((row) => {
        return row && isMeaningfulValue(row.receiver)
    })

    return cleanRows.map((row) => {
        const { receiver, address, region, area, branch_id, ...rest } = row
        const contentObj: Record<string, string> = {}
        const rowTemplateName =
            options?.readTemplateFromExcel && options.templateNames
                ? resolveTemplateNameFromExcelValue(
                      getExcelTemplateNameValue(row),
                      options.templateNames,
                  )
                : templateName

        delete rest.templateName

        Object.keys(rest).forEach((key) => {
            contentObj[key] = sanitizeBackendContentValue(rest[key])
        })

        return {
            receiver: String(receiver ?? ''),
            regionId: Number(region) || 0,
            areaId: Number(area) || 0,
            address: String(address ?? ''),
            content: JSON.stringify(contentObj),
            templateName: rowTemplateName || templateName,
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
    options?: {
        readTemplateFromExcel?: boolean
        templateNames?: string[]
    },
) => {
    const cleanRows = rawData.filter((row) => {
        const { pinflOrInn } = getNormalizedExternalIdentifiers(row)

        return row && isMeaningfulValue(pinflOrInn)
    })

    return cleanRows.map((row) => {
        const { pinfl, inn, pinfl_or_inn, branch_id, ...rest } = row
        const contentObj: Record<string, string> = {}
        const normalizedIdentifiers = getNormalizedExternalIdentifiers(row)
        const rowTemplateName =
            options?.readTemplateFromExcel && options.templateNames
                ? resolveTemplateNameFromExcelValue(
                      getExcelTemplateNameValue(row),
                      options.templateNames,
                  )
                : templateName

        delete rest.templateName

        Object.keys(rest).forEach((key) => {
            contentObj[key] = sanitizeBackendContentValue(rest[key])
        })

        return {
            pinflOrInn: normalizedIdentifiers.pinflOrInn,
            templateName: rowTemplateName || templateName,
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
