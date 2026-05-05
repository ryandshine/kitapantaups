import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Login gagal. Cek kembali email & password.';
};

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
            // Get Turnstile token
            const turnstileToken = (window as any).turnstile?.getResponse();
            
            await login(email, password, turnstileToken);
            navigate('/');
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            // Reset turnstile on error
            (window as any).turnstile?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2c23]">
            {/* Full-screen Background Image */}
            <div className="absolute inset-0">
                <img 
                    src="/images/login_agroforestry.png" 
                    alt="Background" 
                    className="h-full w-full object-cover transition-transform duration-[20s] hover:scale-105"
                />
                {/* Dark & Blur Overlays */}
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#1a2c23]/60" />
            </div>

            {/* Content Container */}
            <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
                <div className="w-full max-w-[28rem] animate-in fade-in zoom-in-95 duration-700">
                    
                    {/* Glassmorphic Card */}
                    <Card className="overflow-hidden border-white/20 bg-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-300 hover:border-white/30">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
                        
                        <CardHeader className="relative space-y-4 pb-6 pt-8 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner backdrop-blur-md">
                                <ShieldCheck className="h-8 w-8 text-primary-foreground drop-shadow-sm" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">KitapantauPS</h1>
                            </div>
                        </CardHeader>

                        <CardContent className="relative space-y-6 pb-10">
                            {error && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-200 backdrop-blur-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-4">
                                    <Input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        label="Email"
                                        labelClassName="text-white/90"
                                        placeholder="nama@email.com"
                                        leftIcon={<Mail className="h-4 w-4 text-white/70" />}
                                        fullWidth
                                        className="h-12 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15"
                                    />

                                    <Input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        label="Kata Sandi"
                                        labelClassName="text-white/90"
                                        placeholder="••••••••"
                                        leftIcon={<Lock className="h-4 w-4 text-white/70" />}
                                        fullWidth
                                        className="h-12 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15"
                                    />
                                </div>
                                
                                {/* Cloudflare Turnstile Widget */}
                                <div className="space-y-3">
                                    <p className="text-center text-sm font-medium text-white/80">
                                        Let us know you are human
                                    </p>
                                    <div 
                                        className="cf-turnstile flex justify-center" 
                                        data-sitekey="0x4AAAAAADJnzXIXzEdsq1Lc"
                                        data-theme="light"
                                        data-size="flexible"
                                    ></div>
                                </div>

                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    rightIcon={<ArrowRight className="h-4 w-4" />}
                                    fullWidth
                                    className="h-13 mt-2 rounded-2xl border border-white/20 bg-[linear-gradient(135deg,rgba(210,139,54,0.9),rgba(232,200,140,0.95))] font-bold text-[#1a2c23] shadow-lg shadow-orange-900/20 hover:scale-[1.02] hover:bg-[linear-gradient(135deg,rgba(210,139,54,1),rgba(239,210,154,1))] active:scale-[0.98] transition-all"
                                >
                                    Login ke Dashboard
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-xs font-medium text-white/40 drop-shadow-sm">
                            &copy; 2026 Direktorat Pengendalian Perhutanan Sosial
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
