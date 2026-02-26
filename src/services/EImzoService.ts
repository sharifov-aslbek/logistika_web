import { EIMZO_URL, EIMZO_HOST, EIMZO_API_KEY } from '@/configs/eimzo.config'
import { normalizeToStdBase64 } from '@/utils/base64'
// --- Helper Classes (Ported from Vue) ---

class CertificateCertkey {
    [key: string]: any
    constructor(eimzoCertificateObject: any) {
        const subjectSeparatedValues =
            eimzoCertificateObject.subjectName.split(',')
        let innNumber = this._getValueFromSeparatedValuesArray(
            subjectSeparatedValues,
            'INITIALS',
            null,
        )

        if (innNumber === null) {
            innNumber = this._getValueFromSeparatedValuesArray(
                subjectSeparatedValues,
                'INN',
                null,
            )
            if (innNumber === null) {
                innNumber = this._getValueFromSeparatedValuesArray(
                    subjectSeparatedValues,
                    'UID',
                    '',
                )
            }
        }

        this._type = 'cer'
        this._disk = eimzoCertificateObject.disk
        this._path = eimzoCertificateObject.path
        this._name = eimzoCertificateObject.name
        this._serialNumber = eimzoCertificateObject.serialNumber
        this._validFromDate = new Date(eimzoCertificateObject.validFrom)
        this._validEndDate = new Date(eimzoCertificateObject.validTo)
        this._innNumber = innNumber
        this._companyName = this._getValueFromSeparatedValuesArray(
            subjectSeparatedValues,
            'O',
            '',
        )
        this._issuedPerson = this._getValueFromSeparatedValuesArray(
            subjectSeparatedValues,
            'CN',
            '',
        )
        this._alias = null
    }

    _getValueFromSeparatedValuesArray(
        values: string[],
        key: string,
        defaultValue: any,
    ) {
        const keyInUpperCase = `${key.toUpperCase()}=`
        for (let i = 0; i < values.length; i++) {
            const value = values[i].trim()
            if (value.length >= keyInUpperCase.length) {
                if (
                    value.substr(0, keyInUpperCase.length).toUpperCase() ===
                    keyInUpperCase
                ) {
                    return value.substr(keyInUpperCase.length)
                }
            }
        }
        return defaultValue ?? null
    }
}

class CertificatePfx {
    [key: string]: any
    constructor(eimzoCertificateObject: any) {
        const aliasValues = eimzoCertificateObject.alias.split(',')
        let innNumber = this._getValueFromSeparatedValuesArray(
            aliasValues,
            '1.2.860.3.16.1.1',
            null,
        )

        if (innNumber === null) {
            innNumber = this._getValueFromSeparatedValuesArray(
                aliasValues,
                'INN',
                null,
            )
            if (innNumber === null) {
                innNumber = this._getValueFromSeparatedValuesArray(
                    aliasValues,
                    'UID',
                    '',
                )
            }
        }

        const todaysLastMoment = new Date()
        todaysLastMoment.setHours(23, 59, 59, 999)

        let validFrom = this._getValueFromSeparatedValuesArray(
            aliasValues,
            'validfrom',
            null,
        )
        validFrom =
            validFrom === null || validFrom === undefined
                ? todaysLastMoment
                : new Date(validFrom.split('.').join('-'))

        let validTo = this._getValueFromSeparatedValuesArray(
            aliasValues,
            'validto',
            null,
        )
        validTo =
            validTo === null || validTo === undefined
                ? todaysLastMoment
                : new Date(validTo.split('.').join('-'))

        this._type = 'pfx'
        this._disk = eimzoCertificateObject.disk
        this._path = eimzoCertificateObject.path
        this._name = eimzoCertificateObject.name
        this._serialNumber = this._getValueFromSeparatedValuesArray(
            aliasValues,
            'serialnumber',
            '',
        )
        this._validFromDate = validFrom
        this._validEndDate = validTo
        this._innNumber = innNumber
        this._companyName = this._getValueFromSeparatedValuesArray(
            aliasValues,
            'o',
            '',
        )
        this._issuedPerson = this._getValueFromSeparatedValuesArray(
            aliasValues,
            'cn',
            '',
        )
        this._alias = eimzoCertificateObject.alias
    }

    _getValueFromSeparatedValuesArray(
        values: string[],
        key: string,
        defaultValue: any,
    ) {
        const keyInUpperCase = `${key.toUpperCase()}=`
        for (let i = 0; i < values.length; i++) {
            const value = values[i].trim()
            if (value.length >= keyInUpperCase.length) {
                if (
                    value.substr(0, keyInUpperCase.length).toUpperCase() ===
                    keyInUpperCase
                ) {
                    return value.substr(keyInUpperCase.length)
                }
            }
        }
        return defaultValue ?? null
    }
}

// --- Main Service Class (Logic Only) ---

class EImzoClient {
    url: string
    hostname: string
    apiKey: string

    constructor() {
        this.url = EIMZO_URL
        this.hostname = EIMZO_HOST
        this.apiKey = EIMZO_API_KEY
    }

    // WebSocket Helper
    _makeRequest(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const socket = new WebSocket(this.url)
                socket.onopen = () => socket.send(JSON.stringify(data))
                socket.onmessage = (event) => {
                    socket.close()
                    resolve(JSON.parse(event.data))
                }
                socket.onerror = (e) => {
                    // socket.close() // sometimes causes issues if already closed
                    reject(e)
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    // 1. Handshake (Check API Key)
    async initHandshake() {
        const data = {
            name: 'apikey',
            arguments: [this.hostname, this.apiKey],
        }
        const response = await this._makeRequest(data)
        return response.success
    }

    // 2. Load Certificates
    async loadAllCertificates() {
        // List Disks
        const disksResponse = await this._makeRequest({
            plugin: 'pfx',
            name: 'list_disks',
        })
        if (!disksResponse.success) throw new Error('Failed to load disks')

        const promises: Promise<any>[] = []
        const disks = disksResponse.disks

        for (const disk of disks) {
            // PFX
            promises.push(
                this._makeRequest({
                    plugin: 'pfx',
                    name: 'list_certificates',
                    arguments: [disk],
                }).then((resp) =>
                    resp.certificates.map((c: any) => new CertificatePfx(c)),
                ),
            )

            // CertKey
            promises.push(
                this._makeRequest({
                    plugin: 'certkey',
                    name: 'list_certificates',
                    arguments: [disk],
                }).then((resp) =>
                    resp.certificates.map(
                        (c: any) => new CertificateCertkey(c),
                    ),
                ),
            )
        }

        const results = await Promise.all(promises)
        return results.flat()
    }

    // 3. Load Key (Pre-sign)
    async loadKey(cert: any) {
        const data = {
            plugin: cert._type === 'pfx' ? 'pfx' : 'certkey',
            name: 'load_key',
            arguments: [
                cert._disk,
                cert._path,
                cert._name,
                cert._type === 'pfx' ? cert._alias : cert._serialNumber,
            ],
        }

        const response = await this._makeRequest(data)
        if (response.success) {
            return response.keyId
        } else {
            throw new Error('Load key failed')
        }
    }

    async createPkcs7(keyId: string, hashCode: string) {
        console.log('hashCode len:', hashCode?.length)
        console.log('hashCode sample:', String(hashCode).slice(0, 80))

        // === eski kabi hashni base64 qilish (urisafe emas) ===
        const fromCharCode = String.fromCharCode

        const cb_utob = (c: string) => {
            if (c.length < 2) {
                const cc = c.charCodeAt(0)
                return cc < 0x80
                    ? c
                    : cc < 0x800
                        ? fromCharCode(0xc0 | (cc >>> 6)) + fromCharCode(0x80 | (cc & 0x3f))
                        : fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) +
                        fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
                        fromCharCode(0x80 | (cc & 0x3f))
            } else {
                const cc =
                    0x10000 +
                    (c.charCodeAt(0) - 0xD800) * 0x400 +
                    (c.charCodeAt(1) - 0xDC00)
                return (
                    fromCharCode(0xf0 | ((cc >>> 18) & 0x07)) +
                    fromCharCode(0x80 | ((cc >>> 12) & 0x3f)) +
                    fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
                    fromCharCode(0x80 | (cc & 0x3f))
                )
            }
        }

        // eslint-disable-next-line no-control-regex
        const re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g
        const utob = (u: string) => u.replace(re_utob, cb_utob)

        const base64Hash = btoa(utob(hashCode))

        const data = {
            plugin: 'pkcs7',
            name: 'create_pkcs7',
            arguments: [base64Hash, keyId, 'yes'],
        }

        const response = await this._makeRequest(data)

        if (!response.success) {
            throw new Error('Sign failed')
        }

        // === MUHIM: pkcs7_64 ni normalize qilish ===
        const rawPkcs7 = response.pkcs7_64

        console.log('raw pkcs7 len:', rawPkcs7?.length)
        console.log('has whitespace:', /\s/.test(rawPkcs7))
        console.log('has -/_:', /[-_]/.test(rawPkcs7))

        const normalizedPkcs7 = normalizeToStdBase64(rawPkcs7)

        return normalizedPkcs7
    }
}

export default new EImzoClient()
