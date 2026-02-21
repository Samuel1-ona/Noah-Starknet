import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    X,
    ShieldCheck,
    Zap,
    Users,
    Cpu,
    Globe,
    BarChart3,
    Lock,
    ArrowRight
} from 'lucide-react';

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    content: React.ReactNode;
    icon: React.ReactNode;
}

export const PitchDeck: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides: Slide[] = [
        {
            id: 0,
            title: "NOAH Protocol",
            subtitle: "The Privacy Layer for Starknet Identity",
            icon: <ShieldCheck size={48} color="#64b5f6" />,
            content: (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', color: '#b0bec5', maxWidth: '600px', margin: '0 auto 3rem' }}>
                        Empowering the next generation of Gaming, DeFi, and Consumer Apps with secure, anonymous, and reusable KYC.
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1rem 2rem',
                        borderRadius: '3rem',
                        gap: '2rem',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e676' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>Production Ready</span>
                        </div>
                        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ fontSize: '0.875rem', color: '#b0bec5' }}>Built on Starknet</span>
                    </div>
                </div>
            )
        },
        {
            id: 1,
            title: "The Problem",
            subtitle: "The 'Struggle' of Identity in Web3",
            icon: <Lock size={48} color="#64b5f6" />,
            content: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', textAlign: 'left' }}>
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: '#ff5252', marginBottom: '1rem' }}>Fragile Privacy</h3>
                        <p style={{ color: '#b0bec5' }}>Users are forced to upload sensitive documents to centralized servers, creating massive honeypots for hackers.</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: '#ff5252', marginBottom: '1rem' }}>High Friction</h3>
                        <p style={{ color: '#b0bec5' }}>Every new protocol requires a new KYC process. 40%+ drop-off rate for new user onboarding.</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: '#ff5252', marginBottom: '1rem' }}>Compliance Liability</h3>
                        <p style={{ color: '#b0bec5' }}>Devs are stuck between regulatory requirements and the technical risk of storing PII (Personally Identifiable Information).</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: '#ff5252', marginBottom: '1rem' }}>Sybil Attacks</h3>
                        <p style={{ color: '#b0bec5' }}>Gaming and Airdrops are plagued by bots and multi-accounting due to lack of unique human verification.</p>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            title: "The Solution",
            subtitle: "Verify Once, Use Everywhere",
            icon: <Zap size={48} color="#64b5f6" />,
            content: (
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', color: 'white' }}>The Zero-Knowledge Identity Layer</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                        <div style={{ width: '200px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#64b5f6', marginBottom: '0.5rem' }}>100%</div>
                            <p style={{ fontSize: '0.875rem', color: 'white' }}>Private On-Chain</p>
                        </div>
                        <div style={{ width: '200px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#64b5f6', marginBottom: '0.5rem' }}>0s</div>
                            <p style={{ fontSize: '0.875rem', color: 'white' }}>Latency Reuse</p>
                        </div>
                        <div style={{ width: '200px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#64b5f6', marginBottom: '0.5rem' }}>ZERO</div>
                            <p style={{ fontSize: '0.875rem', color: 'white' }}>Server-Side PII</p>
                        </div>
                    </div>
                    <p style={{ marginTop: '3rem', color: '#b0bec5', maxWidth: '700px', margin: '3rem auto 0', lineHeight: 1.6 }}>
                        Noah uses Noir ZK-Proofs to decouple "Verification" from "Identity". Protocols get the signal (e.g., "User is over 18") without ever knowing who the user is.
                    </p>
                </div>
            )
        },
        {
            id: 3,
            title: "How It Works",
            subtitle: "The Noir Tech Stack",
            icon: <Cpu size={48} color="#64b5f6" />,
            content: (
                <div style={{ position: 'relative', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                    <div style={{ width: '25%', padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>1. Local Scan</h4>
                        <p style={{ fontSize: '0.8rem', color: '#b0bec5' }}>Passport data extracted in user's browser via OCR/NFC.</p>
                    </div>
                    <ArrowRight color="#b0bec5" />
                    <div style={{ width: '30%', padding: '1.5rem', textAlign: 'center', background: 'rgba(100, 181, 246, 0.05)', border: '2px solid #64b5f6', borderRadius: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>2. Noir Prover</h4>
                        <p style={{ fontSize: '0.8rem', color: '#b0bec5' }}>WASM-based ZK-Proof generation (Barretenberg).</p>
                    </div>
                    <ArrowRight color="#b0bec5" />
                    <div style={{ width: '25%', padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>3. Starknet</h4>
                        <p style={{ fontSize: '0.8rem', color: '#b0bec5' }}>Garaga-powered verification on Cairo contracts.</p>
                    </div>
                </div>
            )
        },
        {
            id: 4,
            title: "Market Use Cases",
            subtitle: "Building the Private Web3",
            icon: <Globe size={48} color="#64b5f6" />,
            content: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <BarChart3 color="#64b5f6" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>DeFi & RWA</h4>
                        <p style={{ fontSize: '0.85rem', color: '#b0bec5' }}>Institutional-grade compliance for lending pools and tokenized assets.</p>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Users color="#64b5f6" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>Gaming</h4>
                        <p style={{ fontSize: '0.85rem', color: '#b0bec5' }}>Sybil-resistance. High-stakes tournaments with unique human verification.</p>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Lock color="#64b5f6" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ marginBottom: '0.5rem', color: 'white' }}>Consumer</h4>
                        <p style={{ fontSize: '0.85rem', color: '#b0bec5' }}>Private age-gating for content, retail portals, and gated communities.</p>
                    </div>
                </div>
            )
        },
        {
            id: 5,
            title: "Why Starknet?",
            subtitle: "The Infrastructure for Privacy",
            icon: <BarChart3 size={48} color="#64b5f6" />,
            content: (
                <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem' }}>
                        <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: '#64b5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</div>
                            <div>
                                <strong style={{ color: 'white' }}>High Throughput & Low Fees</strong>
                                <p style={{ color: '#b0bec5', fontSize: '0.9rem' }}>Starknet's roll-up architecture allows hundreds of identity verifications per second.</p>
                            </div>
                        </li>
                        <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: '#64b5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</div>
                            <div>
                                <strong style={{ color: 'white' }}>Garaga-Optimized Verifiers</strong>
                                <p style={{ color: '#b0bec5', fontSize: '0.9rem' }}>Highly efficient Cairo-based SNARK verifiers minimize gas costs for dApps.</p>
                            </div>
                        </li>
                        <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: '#64b5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</div>
                            <div>
                                <strong style={{ color: 'white' }}>ZK-Native Ecosystem</strong>
                                <p style={{ color: '#b0bec5', fontSize: '0.9rem' }}>Built on the same proving principles as Starknet itself, ensuring long-term compatibility.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            )
        }
    ];

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#0a0a0a',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem',
                color: 'white'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/logo.png" alt="Noah" style={{ width: 40, height: 40, borderRadius: '0.75rem' }} />
                    <div>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'block' }}>NOAH</span>
                        <span style={{ fontSize: '0.6rem', color: '#64b5f6', fontWeight: 700, textTransform: 'uppercase' }}>Pitch Deck 2026</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        style={{ maxWidth: '1000px', width: '100%' }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'inline-block' }}>{slides[currentSlide].icon}</div>
                            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>{slides[currentSlide].title}</h1>
                            <h2 style={{ fontSize: '1.5rem', color: '#64b5f6', fontWeight: 600 }}>{slides[currentSlide].subtitle}</h2>
                        </div>

                        <div style={{ minHeight: '350px' }}>
                            {slides[currentSlide].content}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <div style={{ color: '#b0bec5', fontSize: '0.875rem' }}>
                    Slide {currentSlide + 1} of {slides.length}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={prevSlide}
                        style={{
                            width: '50px',
                            height: '50px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            borderRadius: '50%',
                            cursor: 'pointer'
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextSlide}
                        style={{
                            width: '50px',
                            height: '50px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#64b5f6',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            cursor: 'pointer'
                        }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: i === currentSlide ? '#64b5f6' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
