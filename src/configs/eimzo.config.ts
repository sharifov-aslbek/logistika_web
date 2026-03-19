// 1. YOUR KEYS
const KEYS = {
    // Key for "localhost" or "127.0.0.1"
    DEV: '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',

    // Key for "xathippo.uz"
    PROD: '8F1A67D24031765D8348BBCD8CB99E58EB64D2210CE38032A8031A1E11EB8F8BE6A6D43999E2C9E21DD5AA824CB133115E6A3E40B7E948E2357399DEFB63E1FD',
}

const hostname = window.location.hostname

// Check if we are on the production domain
const isProd = hostname === 'xathippo.uz' || hostname === 'www.xathippo.uz'

export const EIMZO_URL = 'wss://127.0.0.1:64443/service/cryptapi'

export const EIMZO_HOST = hostname

export const EIMZO_API_KEY = isProd ? KEYS.PROD : KEYS.DEV