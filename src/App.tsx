import { BrowserRouter } from 'react-router-dom'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import { AuthProvider } from '@/auth'
import Views from '@/views'
import appConfig from './configs/app.config'
import './locales'

// 1. IMPORT YOUR NEW PROVIDER
import LayoutProvider from '@/components/template/LayoutProvider'

if (appConfig.enableMock) {
    import('./mock')
}

function App() {
    return (
        <Theme>
            <BrowserRouter>
                <AuthProvider>
                    {/* 2. WRAP THE LAYOUT WITH IT */}
                    <LayoutProvider>
                        <Layout>
                            <Views />
                        </Layout>
                    </LayoutProvider>
                </AuthProvider>
            </BrowserRouter>
        </Theme>
    )
}

export default App
