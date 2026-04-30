import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Leaf } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Login gagal. Cek kembali email & password.';
};

const AgroforestryIllustration: React.FC = () => (
    <div className="relative h-full min-h-[26rem] overflow-hidden rounded-[2rem] border border-primary/12 bg-[linear-gradient(180deg,rgba(255,251,244,0.98)_0%,rgba(244,236,224,0.96)_46%,rgba(230,224,206,0.9)_100%)] shadow-[0_24px_80px_-36px_rgba(46,106,87,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(210,139,54,0.22),transparent_26%),radial-gradient(circle_at_74%_12%,rgba(107,142,122,0.18),transparent_26%),radial-gradient(circle_at_50%_64%,rgba(46,106,87,0.16),transparent_36%)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(210,139,54,0.16),transparent_58%)]" />

        <div className="absolute inset-x-0 bottom-0 h-[62%] rounded-t-[42%] bg-[linear-gradient(180deg,rgba(136,162,123,0.18),rgba(87,121,93,0.12))]" />
        <div className="absolute inset-x-[-8%] bottom-[22%] h-[28%] rounded-[50%] bg-[linear-gradient(180deg,rgba(170,189,126,0.9),rgba(108,144,95,0.94))]" />
        <div className="absolute inset-x-[-10%] bottom-[12%] h-[25%] rounded-[48%] bg-[linear-gradient(180deg,rgba(102,137,92,0.96),rgba(57,98,74,0.98))]" />
        <div className="absolute -left-[4%] bottom-[3%] h-[22%] w-[46%] rounded-[50%] bg-[linear-gradient(180deg,rgba(57,98,74,0.96),rgba(34,71,55,0.98))]" />
        <div className="absolute right-[-6%] bottom-[1%] h-[24%] w-[52%] rounded-[50%] bg-[linear-gradient(180deg,rgba(57,98,74,0.94),rgba(28,57,44,0.98))]" />

        <div className="absolute left-[12%] bottom-[23%] h-[20%] w-[0.55rem] rounded-full bg-[#72533b]" />
        <div className="absolute left-[9.5%] bottom-[37%] h-[14%] w-[8.5%] rounded-[999px_999px_0_999px] bg-[#557d5b] rotate-[-12deg]" />
        <div className="absolute left-[14%] bottom-[37%] h-[12%] w-[7.5%] rounded-[999px_999px_999px_0] bg-[#6f9867] rotate-[18deg]" />

        <div className="absolute left-[30%] bottom-[28%] h-[28%] w-[0.7rem] rounded-full bg-[#5d4935]" />
        <div className="absolute left-[22%] bottom-[44%] h-[18%] w-[17%] rounded-[52%] bg-[#345f4b]" />
        <div className="absolute left-[24%] bottom-[51%] h-[15%] w-[13%] rounded-[50%] bg-[#4a7a5b]" />
        <div className="absolute left-[28%] bottom-[40%] h-[19%] w-[14%] rounded-[50%] bg-[#5f8f66]" />

        <div className="absolute left-[59%] bottom-[32%] h-[34%] w-[0.72rem] rounded-full bg-[#604632]" />
        <div className="absolute left-[52%] bottom-[48%] h-[19%] w-[17%] rounded-[50%] bg-[#2f5f4b]" />
        <div className="absolute left-[56%] bottom-[56%] h-[15%] w-[13%] rounded-[50%] bg-[#4f815f]" />
        <div className="absolute left-[60%] bottom-[46%] h-[17%] w-[14%] rounded-[50%] bg-[#709965]" />

        <div className="absolute right-[12%] bottom-[27%] h-[30%] w-[0.62rem] rounded-full bg-[#604632]" />
        <div className="absolute right-[16%] bottom-[43%] h-[16%] w-[13%] rounded-[50%] bg-[#355f4c]" />
        <div className="absolute right-[9%] bottom-[48%] h-[18%] w-[15%] rounded-[52%] bg-[#557f5d]" />
        <div className="absolute right-[13%] bottom-[56%] h-[13%] w-[10%] rounded-[50%] bg-[#7aa26d]" />

        <div className="absolute left-[37%] bottom-[23%] h-[15%] w-[8%] rounded-[46%_46%_10%_10%] bg-[#234639]" />
        <div className="absolute left-[39.2%] bottom-[37%] h-[6%] w-[1.1%] rounded-full bg-[#234639]" />
        <div className="absolute left-[42.3%] bottom-[24%] h-[13%] w-[7%] rounded-[46%_46%_12%_12%] bg-[#315846]" />
        <div className="absolute left-[44.2%] bottom-[36.5%] h-[6%] w-[1%] rounded-full bg-[#315846]" />

        <div className="absolute right-[31%] bottom-[22%] h-[16%] w-[8.5%] rounded-[46%_46%_12%_12%] bg-[#234639]" />
        <div className="absolute right-[28.8%] bottom-[37%] h-[6%] w-[1%] rounded-full bg-[#234639]" />
        <div className="absolute right-[36.5%] bottom-[24%] h-[14%] w-[7%] rounded-[46%_46%_12%_12%] bg-[#315846]" />
        <div className="absolute right-[34.5%] bottom-[36.8%] h-[5%] w-[1%] rounded-full bg-[#315846]" />

        <div className="absolute left-[46%] bottom-[18%] h-[17%] w-[3.5%] rounded-t-[80%] bg-[#21382d]" />
        <div className="absolute left-[46.8%] bottom-[32%] h-[11%] w-[1.4%] rounded-full bg-[#21382d]" />
        <div className="absolute left-[44.3%] bottom-[31.5%] h-[1.4%] w-[4.5%] rounded-full bg-[#21382d] rotate-[28deg]" />
        <div className="absolute left-[48.2%] bottom-[31.6%] h-[1.4%] w-[4.7%] rounded-full bg-[#21382d] rotate-[-34deg]" />

        <div className="absolute left-[47%] bottom-[17%] h-[15%] w-[10%] rounded-[48%_52%_20%_18%] bg-[#dbb167]/50 blur-[1px]" />
        <div className="absolute right-[18%] top-[16%] flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/35 shadow-[0_18px_40px_-24px_rgba(210,139,54,0.7)] backdrop-blur-sm">
            <Leaf className="h-10 w-10 text-[#b46e24]" strokeWidth={1.75} />
        </div>

    </div>
);

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
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(210,139,54,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(46,106,87,0.1),transparent_24%),linear-gradient(180deg,rgba(251,247,240,1),rgba(244,236,225,1))] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1540px] grid-cols-1 gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                <section className="hidden lg:block">
                    <AgroforestryIllustration />
                </section>

                <section className="flex items-center justify-center">
                    <div className="w-full max-w-[33rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-4 lg:hidden">
                            <AgroforestryIllustration />
                        </div>

                        <Card className="overflow-hidden border-primary/12 bg-card/92 shadow-[0_32px_90px_-42px_rgba(46,106,87,0.38)]">
                            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(210,139,54,0.16),transparent_70%)]" />
                            <CardHeader className="relative space-y-4 pb-4">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/8 text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-primary/72">Portal Internal</p>
                                    <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">
                                        Akses pengaduan, tindak lanjut, dan pemantauan operasional dalam satu panel kerja.
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="relative space-y-5">
                                {error && (
                                    <div className="rounded-2xl border border-destructive/20 bg-destructive/8 p-3 text-sm font-medium text-destructive">
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
                                        className="h-12 rounded-2xl border-primary/10 bg-muted/44 text-foreground placeholder:text-muted-foreground/72"
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
                                        className="h-12 rounded-2xl border-primary/10 bg-muted/44 text-foreground placeholder:text-muted-foreground/72"
                                    />

                                    <Button
                                        type="submit"
                                        isLoading={isLoading}
                                        rightIcon={<ArrowRight className="h-4 w-4" />}
                                        fullWidth
                                        className="h-12 rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(210,139,54,0.86),rgba(232,200,140,0.96))] font-semibold text-[#284236] shadow-[0_16px_34px_-18px_rgba(180,110,36,0.55)] hover:translate-y-[-1px] hover:bg-[linear-gradient(135deg,rgba(210,139,54,0.92),rgba(239,210,154,1))]"
                                    >
                                        Masuk ke Dashboard
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
                            &copy; 2026 Direktorat Pengendalian Perhutanan Sosial
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};
