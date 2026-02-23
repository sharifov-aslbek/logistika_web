import { RedocStandalone } from 'redoc'

export default function ApiDocs() {
    return (
        <RedocStandalone
            specUrl="/openai.json"
            options={{
                scrollYOffset: 60,
                theme: {
                    colors: {
                        primary: {
                            main: '#2563eb',
                        },
                    },
                },
            }}
        />
    )
}
