import { BrowserRouter, Routes, Route } from 'react-router-dom' // <-- Add Routes and Route here
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import { AuthProvider } from '@/auth'
import Views from '@/views'
import appConfig from './configs/app.config'
import './locales'
import LayoutProvider from '@/components/template/LayoutProvider'

// 👇 IMPORT YOUR LANDING PAGE HERE
import LandingPage from '@/views/landingpage'

if (appConfig.enableMock) {
    import('./mock')
}

function App() {
    return (
        <Theme>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        {/* 1. YOUR PUBLIC LANDING PAGE (NO LAYOUT WRAPPER) */}
                        <Route path="/" element={<LandingPage />} />

                        {/* 2. THE REST OF YOUR TEMPLATE (WITH LAYOUT WRAPPER) */}
                        <Route path="/*" element={
                            <LayoutProvider>
                                <Layout>
                                    <Views />
                                </Layout>
                            </LayoutProvider>
                        } />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </Theme>
    )
}

export default App