import { EIMZO_URL, EIMZO_HOST, EIMZO_API_KEY } from '@/configs/eimzo.config'

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

    // 4. Create PKCS7 Signature
    async createPkcs7(keyId: string, hash: string) {
        // Base64 Helper
        const _encode = (u: string) =>
            btoa(
                encodeURIComponent(u).replace(/%([0-9A-F]{2})/g, (match, p1) =>
                    String.fromCharCode(parseInt(p1, 16)),
                ),
            )
        const base64Hash = _encode(hash)
            .replace(/[+/]/g, (m0) => (m0 === '+' ? '-' : '_'))
            .replace(/=/g, '')

        const data = {
            plugin: 'pkcs7',
            name: 'create_pkcs7',
            arguments: [base64Hash, keyId, 'no'],
        }

        const response = await this._makeRequest(data)
        if (response.success) {
            return response.pkcs7_64
        } else {
            throw new Error('Sign failed')
        }
    }
}

export default new EImzoClient()
