import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Save as SaveIcon, User, Bell, Shield, Camera, Lock as LockIcon, UserCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserService } from '../lib/user.service';

export const PengaturanPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profil');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await UserService.updateMe({
                displayName,
                phone,
            });
            await refreshUser();
            alert('Profil berhasil diperbarui!');
        } catch (err) {
            console.error(err);
            alert('Gagal memperbarui profil.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file maksimal 2MB');
            return;
        }

        setIsUploading(true);
        try {
            await UserService.uploadPhoto(file);
            await refreshUser();
            alert('Foto profil berhasil diperbarui!');
        } catch (err) {
            console.error(err);
            alert('Gagal mengunggah foto.');
        } finally {
            setIsUploading(false);
        }
    };

    const tabs = [
        { id: 'profil', label: 'Profil Saya', icon: User },
        { id: 'keamanan', label: 'Keamanan', icon: Shield },
        { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
    ];

    return (
        <div className="max-w-5xl animate-in fade-in duration-500 flex flex-col gap-8">
            <div className="flex flex-col gap-1 border-b pb-6">
                <h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">Pengaturan Akun</h1>
                <p className="mt-2 text-muted-foreground">Kelola informasi pribadi, preferensi keamanan, dan notifikasi akun Anda.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                <div className="flex flex-col gap-1 md:col-span-3">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-all',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                        : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted'
                                )}
                            >
                                <Icon size={18} className={cn(isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-6 md:col-span-9">
                    {activeTab === 'profil' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Profil</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center gap-8 py-4 sm:flex-row">
                                        <div className="group relative">
                                            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-border bg-muted shadow-inner">
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <UserCircle className="h-20 w-20 text-muted-foreground" />
                                                )}
                                                {isUploading && (
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 active:scale-95"
                                                title="Ubah Foto"
                                            >
                                                <Camera size={16} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handlePhotoChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 text-center sm:text-left">
                                            <h3 className="text-xl font-bold leading-tight text-foreground">{user?.displayName}</h3>
                                            <p className="text-sm font-semibold uppercase tracking-widest text-primary">{user?.role}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">ID Pegawai: {user?.id.substring(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-6 border-t pt-8 sm:grid-cols-2">
                                        <Input
                                            label="Nama Lengkap"
                                            placeholder="Masukkan nama lengkap"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            fullWidth
                                        />
                                        <Input
                                            label="Email Dinas"
                                            value={user?.email || ''}
                                            disabled
                                            fullWidth
                                            helperText="Email tidak dapat diubah secara mandiri."
                                        />
                                        <Input
                                            label="Nomor Telepon"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+62 812..."
                                            fullWidth
                                        />
                                        <div className="flex flex-col gap-1.5">
                                            <label className="ml-0.5 text-sm font-semibold text-foreground/80">Role Sistem</label>
                                            <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
                                                {user?.role?.toUpperCase()}
                                            </div>
                                            <span className="ml-0.5 text-[11px] text-muted-foreground">Role dikelola oleh Administrator Sistem.</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                                        <Button
                                            variant="primary"
                                            onClick={handleSave}
                                            isLoading={isSaving}
                                            className="px-8 shadow-lg shadow-primary/20"
                                            leftIcon={<SaveIcon size={16} />}
                                        >
                                            Simpan Perubahan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'keamanan' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LockIcon className="text-primary" size={18} />
                                        Keamanan Akun
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-12">
                                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-4 text-center">
                                        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                            <Shield size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold">Kelola Password</h3>
                                        <p className="text-sm text-muted-foreground">Fitur pengubahan password mandiri sedang dalam proses pengembangan oleh tim IT.</p>
                                        <Button variant="outline" size="sm" className="mt-2">Hubungi Admin IT</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'notifikasi' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60">
                                        <Bell size={24} />
                                    </div>
                                    <p className="font-medium italic text-muted-foreground">Modul ini akan segera tersedia.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
