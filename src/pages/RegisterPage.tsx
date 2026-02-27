import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';
import { Sparkles, ShieldCheck, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
    const { user, loading, error, register, clearError } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    if (user && !loading) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError('Konfirmasi password tidak cocok.');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password minimal 6 karakter.');
            return;
        }

        setIsSubmitting(true);

        try {
            await register(email, password, name);
        } catch (err: any) {
            // Error is handled in context
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col lg:flex-row font-sans selection:bg-primary/20">
            {/* Left Column: Branding (Same as Login for consistency) */}
            <div className="relative hidden lg:flex lg:w-[45%] bg-slate-900 overflow-hidden items-center justify-center p-12">
                {/* Animated Background Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />

                <div className="relative z-10 max-w-md w-full flex flex-col gap-8">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
                            <Sparkles className="text-white h-8 w-8" />
                        </div>
                        <h1 className="text-5xl font-bold text-white tracking-tighter">KitapantauPS</h1>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h2 className="text-3xl font-bold text-white leading-[1.1]">
                            Bergabung dengan Ekosistem Digital <span className="text-primary italic">Perhutanan Sosial</span>.
                        </h2>
                        <div className="flex flex-col gap-4">
                            {[
                                "Akses dashboard monitoring real-time",
                                "Kelola penugasan dan disposisi efisien",
                                "Input data lapangan lebih cepat & akurat",
                                "Integrasi data pusat dan daerah"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-3 text-white/75">
                                    <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                                    <span className="text-sm font-medium">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <p className="text-white/65 text-sm leading-relaxed italic">
                            "Mewujudkan tata kelola perhutanan sosial yang transparan dan akuntabel melalui transformasi teknologi digital."
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-white text-xs tracking-widest">
                                PPS
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-xs font-semibold uppercase tracking-widest">Direktorat PPS</span>
                                <span className="text-white/55 text-[10px]">Kementerian Kehutanan</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Register Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 relative overflow-hidden">
                {/* Mobile Background Elements */}
                <div className="lg:hidden absolute top-0 left-0 w-full h-32 bg-slate-900 -z-10" />

                <div className="max-w-[420px] w-full flex flex-col gap-10 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-bold text-foreground tracking-tight">Buat Akun Baru</h2>
                        <p className="text-muted-foreground font-medium">Silakan lengkapi data diri Anda untuk mendaftar sistem.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {(error || localError) && (
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-3 animate-in shake duration-500">
                                <ShieldCheck size={18} />
                                <span>{error || localError}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            <Input
                                label="Nama Lengkap"
                                placeholder="Masukkan nama lengkap Anda"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                fullWidth
                                leftIcon={<User size={18} className="text-muted-foreground" />}
                            />

                            <Input
                                label="Alamat Email"
                                type="email"
                                placeholder="nama@klhk.go.id"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                fullWidth
                                leftIcon={<Mail size={18} className="text-muted-foreground" />}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="Minimal 6 karakter"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    fullWidth
                                    leftIcon={<Lock size={18} className="text-muted-foreground" />}
                                />

                                <Input
                                    label="Ulangi Password"
                                    type="password"
                                    placeholder="Konfirmasi password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    fullWidth
                                    leftIcon={<ShieldCheck size={18} className="text-muted-foreground" />}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 pt-4">
                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                isLoading={isSubmitting}
                                className="h-14 bg-slate-900 hover:bg-black text-white text-lg font-semibold shadow-2xl shadow-slate-200"
                                rightIcon={!isSubmitting && <ArrowRight size={20} />}
                            >
                                Daftar Sekarang
                            </Button>

                            <div className="relative flex items-center justify-center py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200" />
                                </div>
                                <span className="relative z-10 px-4 bg-[#fafafa] text-muted-foreground text-xs font-semibold uppercase tracking-widest">Atau</span>
                            </div>

                            <p className="text-center text-muted-foreground font-medium">
                                Sudah memiliki akun?{' '}
                                <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-4">
                                    Masuk di sini
                                </Link>
                            </p>
                        </div>
                    </form>

                    <div className="flex flex-col items-center gap-2 mt-4">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">Direktorat Pengendalian Perhutanan Sosial</span>
                        <div className="flex gap-4">
                            <div className="h-1 bg-slate-200 w-8 rounded-full" />
                            <div className="h-1 bg-primary w-8 rounded-full" />
                            <div className="h-1 bg-slate-200 w-8 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
