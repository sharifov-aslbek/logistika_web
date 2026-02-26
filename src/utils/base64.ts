export function normalizeToStdBase64(input: string) {
    let s = input.replace(/\s+/g, '')

    s = s.replace(/-/g, '+').replace(/_/g, '/')

    const pad = s.length % 4
    if (pad === 2) s += '=='
    else if (pad === 3) s += '='
    else if (pad === 1) {
        throw new Error('Invalid base64 length (mod 4 = 1)')
    }

    return s
}