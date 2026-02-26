// src/views/LandingPage/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './landingpage.css';

import HippoLogo from '@/assets/hippo-logo.png'; // Adjust path if needed

const LandingPage = () => {
    // --- State ---
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [formStatus, setFormStatus] = useState({ message: '', color: '' });

    // --- Refs for Scroll Animations ---
    const revealRefs = useRef<(HTMLDivElement | null)[]>([]);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const addToRevealRefs = (el: HTMLDivElement | null) => {
        if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
    };
    const addToStepRefs = (el: HTMLDivElement | null) => {
        if (el && !stepRefs.current.includes(el)) stepRefs.current.push(el);
    };

    // --- Scroll Effects ---
    useEffect(() => {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        revealRefs.current.forEach((ref) => { if (ref) revealObserver.observe(ref); });

        const stepsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const index = Number((entry.target as HTMLElement).dataset.index || 0);
                    setTimeout(() => entry.target.classList.add('activated'), index * 300);
                    stepsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        stepRefs.current.forEach((ref) => { if (ref) stepsObserver.observe(ref); });

        // Prevent background scrolling when mobile menu is open
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            revealObserver.disconnect();
            stepsObserver.disconnect();
            document.body.style.overflow = 'auto';
        };
    }, [isMobileMenuOpen]);

    // --- Form Submit ---
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setFormStatus({ message: 'Iltimos, barcha maydonlarni to‘ldiring', color: 'red' });
            return;
        }

        setFormStatus({ message: 'Yuborilmoqda...', color: '#555' });
        const BOT_TOKEN = '8254519971:AAFkLFk_G-nBmpKYzJo0q3pkWzJpsM1NCW8';
        const CHAT_ID = '-1003797188114';
        const message = `📩 *Yangi so‘rov!*\n👤 Ism: ${name}\n📞 Telefon: ${phone}`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' }),
            });

            if (response.ok) {
                setFormStatus({ message: '✅ So‘rov yuborildi!', color: 'green' });
                setName('');
                setPhone('');
                setTimeout(() => {
                    setIsModalOpen(false);
                    setFormStatus({ message: '', color: '' });
                }, 1500);
            } else {
                throw new Error('API Error');
            }
        } catch {
            setFormStatus({ message: '❌ Xatolik yuz berdi', color: 'red' });
        }
    };

    return (
        <div className="landing-page-wrapper">
            <nav className="navbar">
                <div className="container nav-container">
                    <div className="logo">
                        <img src={HippoLogo} alt="Hippo Logo" />
                    </div>

                    {/* NAV MENU WRAPPER - Toggles on Mobile */}
                    <div className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
                        <ul className="nav-links">
                            <li><a href="#xizmatlar" onClick={() => setIsMobileMenuOpen(false)}>Bizning xizmatlar</a></li>
                            <li><a href="#jarayon" onClick={() => setIsMobileMenuOpen(false)}>Texnik yordam</a></li>
                            <li><Link to="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>Platformaga kirish</Link></li>
                        </ul>
                        <div className="nav-auth">
                            <Link to="/sign-in" className="btn btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Mijoz bo'lish</Link>
                            <Link to="/sign-in" className="btn btn-outline" onClick={() => setIsMobileMenuOpen(false)}>Platformaga kirish</Link>
                        </div>
                    </div>

                    {/* HAMBURGER ICON */}
                    <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
                        {/* Fallback if you don't have font-awesome installed: */}
                        {!isMobileMenuOpen && <span style={{fontSize: '24px'}}>☰</span>}
                        {isMobileMenuOpen && <span style={{fontSize: '28px'}}>×</span>}
                    </div>
                </div>
            </nav>

            <header className="hero">
                <div className="container hero-content">
                    <h1 ref={addToRevealRefs} className="reveal">
                        Hippo.uz - <span className="gradient-text">Biznesingiz uchun xizmatlar ekotizimi</span>
                    </h1>
                    <p ref={addToRevealRefs} className="reveal delay-1">
                        Buyurtmalar uchun hujjat jarayonlarini avtomatlashtiring va yetkazib berishni soniyalar ichida rasmiylashtiring. Savdo tarmoqlari va ishlab chiqaruvchilar uchun tayyor yechimlar.
                    </p>
                    <div ref={addToRevealRefs} className="hero-btns reveal delay-2">
                        <Link to="/sign-in" className="btn btn-primary">Mijoz bo'lish</Link>
                        <Link to="/sign-in" className="btn btn-outline">Platformaga kirish</Link>
                    </div>
                </div>
            </header>

            <section id="xizmatlar" className="features">
                <div className="container">
                    <div className="section-title">
                        <h2>Bizning imkoniyatlar</h2>
                        <p>Barcha turdagi mijozlar uchun qulay yechimlar</p>
                    </div>
                    <div className="features-grid">
                        <div ref={addToRevealRefs} className="feature-card reveal delay-1">
                            <div className="icon-box">🏢</div>
                            <h3>Yuridik shaxslar uchun</h3>
                            <p>Minglab xatlarni bir zumda reyestr orqali yuboring. Hisobotlarni avtomatik shakllantiring va vaqtingizni tejang.</p>
                        </div>

                        <div ref={addToRevealRefs} className="feature-card reveal delay-2">
                            <div className="icon-box">👤</div>
                            <h3>Jismoniy shaxslar uchun</h3>
                            <p>Uydan chiqmasdan turib davlat idoralariga yoki boshqa tashkilotlarga rasmiy xat va arizalar yuboring.</p>
                        </div>

                        <div ref={addToRevealRefs} className="feature-card reveal delay-3">
                            <div className="icon-box">🖨️</div>
                            <h3>Avtomatik Chop etish</h3>
                            <p>Biz eng yaqin pochta bo'limida xatingizni chop etamiz va konvertga joylaymiz.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="jarayon" className="steps-wrapper">
                <div className="container">
                    <div className="section-title">
                        <h2>Qanday ishlaydi?</h2>
                        <p>Hujjat yuborish jarayoni 3 ta oddiy bosqichda</p>
                    </div>

                    <div className="steps-grid">
                        <div ref={addToStepRefs} data-index="0" className="step-card">
                            <div className="step-icon-wrap">1</div>
                            <h3>Buyurtma</h3>
                            <p>Hujjatni tizimga yuklang</p>
                        </div>
                        <div ref={addToStepRefs} data-index="1" className="step-card">
                            <div className="step-icon-wrap">2</div>
                            <h3>Tekshiruv</h3>
                            <p>Biz ma'lumotlarni tasdiqlaymiz</p>
                        </div>
                        <div ref={addToStepRefs} data-index="2" className="step-card">
                            <div className="step-icon-wrap">3</div>
                            <h3>Yetkazish</h3>
                            <p>Manzilingizga yetib boradi</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container">
                <section className="rainbow-cta">
                    <h2 ref={addToRevealRefs} className="reveal delay-1">Savollaringiz qoldimi?</h2>
                    <p ref={addToRevealRefs} className="reveal delay-2">
                        So'rov qoldiring — biz sizga ish jarayoni haqida batafsil ma'lumot beramiz va individual ulanish shartlarini taklif qilamiz.
                    </p>
                    <button ref={addToRevealRefs} className="btn btn-primary reveal delay-3" onClick={() => setIsModalOpen(true)}>
                        So'rov qoldirish
                    </button>
                </section>
            </div>

            <footer>
                <div className="container footer-container">
                    <div className="footer-logo">
                        <img src={HippoLogo} alt="Hippo Logo" />
                    </div>
                    <div className="footer-links">
                        <h4>Kompaniya</h4>
                        <ul>
                            <li><a href="#">Biz haqimizda</a></li>
                            <li><a href="#">Aloqa</a></li>
                            <li><a href="#">Blog</a></li>
                        </ul>
                    </div>
                    <div className="footer-address">
                        Toshkent, Shayxontohur tumani, Zafarobod ko'chasi, 7<br />
                        Biz bilan bog'lanish: +998 78 122 63 63
                    </div>
                </div>
                <div className="container footer-bottom">
                    <p>© Hippo.uz 2026. Barcha huquqlar himoyalangan</p>
                    <div className="footer-bottom-links">
                        <a href="#">Maxfiylik siyosati</a>
                        <a href="#">Foydalanish shartlari</a>
                    </div>
                </div>
            </footer>

            {/* MODAL */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
                <div className="modal">
                    <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                    <h2>So‘rov qoldirish</h2>
                    <p>Biz siz bilan tez orada bog‘lanamiz</p>

                    <form onSubmit={handleFormSubmit}>
                        <input type="text" placeholder="Ismingiz" required value={name} onChange={(e) => setName(e.target.value)} />
                        <input type="tel" placeholder="+998 XX XXX XX XX" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <button type="submit" className="btn btn-primary full-width">Yuborish</button>
                    </form>
                    <p className="form-status" style={{ color: formStatus.color }}>{formStatus.message}</p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;