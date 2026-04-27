import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Login gagal. Cek kembali email & password.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="grid min-h-screen grid-cols-1 bg-gradient-to-br from-background via-muted/20 to-background lg:grid-cols-[1.1fr_1fr]">
            <section className="relative hidden overflow-hidden border-r border-green-700/50 bg-[#34A853] p-10 lg:flex lg:flex-col lg:justify-between shadow-lg">
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[40rem] h-[40rem] rounded-full bg-white/10 blur-3xl opacity-60 pointer-events-none" />
                <div className="relative z-10 inline-flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-sm">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight text-white">KitapantauPS</span>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">Direktorat PPS</span>
                    </div>
                </div>
                <div className="relative z-10 max-w-xl space-y-5">
                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
                        Sistem Informasi Pengaduan Perhutanan Sosial
                    </h1>
                    <p className="text-[0.95rem] leading-relaxed text-white/90">
                        Platform terpadu untuk pencatatan aduan, tindak lanjut, dan pelaporan operasional perhutanan sosial.
                    </p>
                </div>
                <p className="relative z-10 text-xs font-medium text-white/70">
                    &copy; 2026 Direktorat Pengendalian Perhutanan Sosial
                </p>
            </section>

            <section className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-border/80 bg-card/95 shadow-xl shadow-black/5">
                        <CardHeader className="space-y-4 pb-4">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary/30">
                                <ShieldCheck className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-semibold tracking-tight">Masuk ke Sistem</CardTitle>
                                <CardDescription>Gunakan akun internal untuk mengakses dashboard.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {error && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    label="Email"
                                    placeholder="nama@email.com"
                                    leftIcon={<Mail className="h-4 w-4" />}
                                    fullWidth
                                />

                                <Input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    label="Kata Sandi"
                                    placeholder="••••••••"
                                    leftIcon={<Lock className="h-4 w-4" />}
                                    fullWidth
                                />

                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    rightIcon={<ArrowRight className="h-4 w-4" />}
                                    fullWidth
                                    className="h-11"
                                >
                                    Masuk ke Dashboard
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        &copy; 2026 Direktorat Pengendalian Perhutanan Sosial
                    </p>
                </div>
            </section>
        </div>
    );
};
