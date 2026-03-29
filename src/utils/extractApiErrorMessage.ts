const joinMessages = (messages: unknown[]) => {
    return messages
        .map((item) => {
            if (typeof item === 'string') {
                return item.trim()
            }

            if (item && typeof item === 'object') {
                const nestedMessage = (item as { message?: string }).message

                if (typeof nestedMessage === 'string') {
                    return nestedMessage.trim()
                }
            }

            return ''
        })
        .filter(Boolean)
        .join(', ')
}

const extractMessageFromData = (data: any) => {
    if (!data) return ''

    if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim()
    }

    if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim()
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
        return joinMessages(data.errors)
    }

    if (
        Array.isArray(data.data?.errorMessages) &&
        data.data.errorMessages.length > 0
    ) {
        return joinMessages(data.data.errorMessages)
    }

    return ''
}

const extractApiErrorMessage = (error: any, fallback: string) => {
    const responseMessage = extractMessageFromData(error?.response?.data)

    if (responseMessage) {
        return responseMessage
    }

    const directMessage = extractMessageFromData(error)

    if (directMessage) {
        return directMessage
    }

    if (
        typeof error?.message === 'string' &&
        error.message.trim() &&
        error.message !== 'Network Error'
    ) {
        return error.message.trim()
    }

    return fallback
}

export default extractApiErrorMessage
