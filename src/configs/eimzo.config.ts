// 1. YOUR KEYS
const KEYS = {
    // Key for "localhost" or "127.0.0.1"
    DEV: '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',

    // Key for "tezdoc.uz"
    PROD: '9F7CAA07E6BE17FFD9A1B121F6A4FAE5E8A9EBBF5D1AE72B61C362970CC69E52C9FDFF9CDD93B37C2F72D737EFC1314488DB441F1ED2B211217D9829658AAA16',
}

// 2. DETECT ENVIRONMENT
const isSecure = window.location.protocol === 'https:'
const hostname = window.location.hostname

// 3. EXPORT CONFIG
export const EIMZO_URL = isSecure
    ? 'wss://127.0.0.1:64443/service/cryptapi'
    : 'ws://127.0.0.1:64646/service/cryptapi'

export const EIMZO_HOST = hostname

export const EIMZO_API_KEY = hostname.includes('tezdoc.uz')
    ? KEYS.PROD
    : KEYS.DEV
