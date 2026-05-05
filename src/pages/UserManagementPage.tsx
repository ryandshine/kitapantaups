import {
    useUsersList,
    useCreateUser,
    useUpdateUserRole,
    useToggleUserStatus,
    useResetUserPassword,
    useDeleteUser
} from '../hooks/useUser';
import { useAuth } from '../contexts/AuthContext';
import React, { useState } from 'react';
import {
    Users,
    Trash2,
    Search,
    RefreshCw,
    CheckCircle,
    XCircle,
    ShieldAlert,
    UserPlus,
    KeyRound
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input,
    Select,
    Modal,
    FeedbackBanner,
    ConfirmDialog
} from '../components/ui';
import type { User } from '../types';
import { cn } from '../lib/utils';

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

const isUserRole = (value: string): value is User['role'] =>
    value === 'admin' || value === 'staf';

const UserAvatar: React.FC<{ user: User }> = ({ user }) => {
    const safeDisplayName = (user.displayName || '').trim() || user.email?.split('@')[0] || 'User';
    const safeInitial = safeDisplayName.charAt(0).toUpperCase();

    return (
        <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-background shrink-0">
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                {safeInitial}
            </div>
        </div>
    );
};

export const UserManagementPage: React.FC = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const { data: users = [], isLoading: loading } = useUsersList(isAdmin);
    const { mutate: createUser, isPending: isCreating } = useCreateUser();
    const { mutate: updateUserRole } = useUpdateUserRole();
    const { mutate: toggleStatus } = useToggleUserStatus();
    const { mutate: resetUserPassword, isPending: isResettingPassword } = useResetUserPassword();
    const { mutate: deleteUser } = useDeleteUser();

    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
    const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'staf' as 'admin' | 'staf'
    });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);

    React.useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const handleRoleChange = async (userId: string, newRole: User['role']) => {
        setUpdatingUserId(userId);
        updateUserRole({ userId, newRole }, {
            onSettled: () => setUpdatingUserId(null),
            onSuccess: () => setFeedback({ type: 'success', message: 'Role user berhasil diperbarui.' }),
            onError: () => setFeedback({ type: 'error', message: 'Gagal memperbarui role user.' })
        });
    };

    const handleDeleteUser = async (user: User) => {
        if (user.id === currentUser?.id) {
            setFeedback({ type: 'info', message: 'Anda tidak bisa menghapus akun Anda sendiri.' });
            return;
        }

        setUpdatingUserId(user.id);
        deleteUser(user.id, {
            onSettled: () => setUpdatingUserId(null),
            onSuccess: () => {
                setDeleteCandidate(null);
                setFeedback({ type: 'success', message: 'User berhasil dihapus.' });
            },
            onError: () => setFeedback({ type: 'error', message: 'Gagal menghapus user.' })
        });
    };

    const handleToggleStatus = async (user: User) => {
        if (user.id === currentUser?.id) return;

        setUpdatingUserId(user.id);
        toggleStatus({ userId: user.id, isActive: !user.isActive }, {
            onSettled: () => setUpdatingUserId(null),
            onSuccess: () => setFeedback({ type: 'success', message: `Status user berhasil diubah menjadi ${!user.isActive ? 'aktif' : 'non-aktif'}.` }),
            onError: () => setFeedback({ type: 'error', message: 'Gagal mengubah status user.' })
        });
    };

    const openResetPasswordModal = (user: User) => {
        setSelectedUserForPassword(user);
        setPasswordForm({ password: '', confirmPassword: '' });
        setIsPasswordModalOpen(true);
    };

    const handleResetPassword = () => {
        if (!selectedUserForPassword) return;
        if (passwordForm.password.length < 8) {
            setFeedback({ type: 'info', message: 'Password minimal 8 karakter.' });
            return;
        }
        if (passwordForm.password !== passwordForm.confirmPassword) {
            setFeedback({ type: 'info', message: 'Konfirmasi password tidak sama.' });
            return;
        }

        setUpdatingUserId(selectedUserForPassword.id);
        resetUserPassword(
            { userId: selectedUserForPassword.id, password: passwordForm.password },
            {
                onSuccess: () => {
                    setIsPasswordModalOpen(false);
                    setSelectedUserForPassword(null);
                    setPasswordForm({ password: '', confirmPassword: '' });
                    setFeedback({ type: 'success', message: 'Password user berhasil diperbarui.' });
                },
                onError: () => setFeedback({ type: 'error', message: 'Gagal memperbarui password user.' }),
                onSettled: () => setUpdatingUserId(null),
            }
        );
    };

    const handleCreateUser = async () => {
        if (!newUserForm.email || !newUserForm.password || !newUserForm.displayName) {
            setFeedback({ type: 'info', message: 'Semua field wajib diisi.' });
            return;
        }

        createUser(newUserForm, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                setNewUserForm({ email: '', password: '', displayName: '', role: 'staf' });
                setFeedback({ type: 'success', message: 'Pengguna baru berhasil dibuat.' });
            },
            onError: (error: unknown) => {
                setFeedback({ type: 'error', message: `Gagal membuat user: ${getErrorMessage(error, 'Terjadi kesalahan.')}` });
            }
        });
    };

    const filteredUsers = users.filter((u: User) =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
                <h1 className="text-xl font-bold">Akses Dibatasi</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    Maaf, halaman ini hanya dapat diakses oleh Administrator sistem.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="hero-panel mb-6">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Manajemen Pengguna</h1>
                        <p className="text-[0.92rem] text-muted-foreground">Kelola hak akses dan peran pengguna dalam sistem.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="hero-button"
                            leftIcon={<UserPlus className="h-4 w-4" />}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Tambah Pengguna
                        </Button>
                    </div>
                </div>
                <div className="hero-orb" />
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <Card className="overflow-hidden">
                <CardHeader className="page-section-header pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Daftar Pengguna ({filteredUsers.length})
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama atau email..."
                                className="w-full pl-9 md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/20">
                                    <th className="px-4 py-3 text-left font-semibold">Pengguna</th>
                                    <th className="px-4 py-3 text-left font-semibold">Role / Peran</th>
                                    <th className="px-4 py-3 text-left font-semibold text-center">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-muted-foreground italic">
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="h-6 w-6 animate-spin" />
                                                Memuat data pengguna...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-muted-foreground italic">
                                            User tidak ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="border-b hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={u} />
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-semibold text-foreground">{(u.displayName || '').trim() || u.email?.split('@')[0] || 'User'}</span>
                                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 max-w-[140px]">
                                                    <Select
                                                        value={u.role}
                                                        onChange={(val) => {
                                                            if (isUserRole(val)) {
                                                                void handleRoleChange(u.id, val);
                                                            }
                                                        }}
                                                        disabled={u.id === currentUser?.id || updatingUserId === u.id}
                                                        options={[
                                                            { value: 'admin', label: 'Admin' },
                                                            { value: 'staf', label: 'Staf' },
                                                        ]}
                                                        className="h-8 py-0 px-2 text-xs"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center rounded-full px-3 h-7 text-[10px] font-semibold uppercase tracking-wider',
                                                        u.isActive
                                                            ? 'status-soft-green'
                                                            : 'status-soft-red'
                                                    )}
                                                >
                                                    {u.isActive ? (
                                                        <>
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Aktif
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Non-Aktif
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2 text-[11px]"
                                                        onClick={() => openResetPasswordModal(u)}
                                                        disabled={updatingUserId === u.id}
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                                                        Password
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={cn(
                                                            'h-8 px-2 text-[11px]',
                                                            u.isActive
                                                                ? 'border-destructive/20 text-destructive hover:bg-destructive/10'
                                                                : 'border-secondary/20 text-secondary hover:bg-secondary/10'
                                                        )}
                                                        onClick={() => handleToggleStatus(u)}
                                                        disabled={u.id === currentUser?.id || updatingUserId === u.id}
                                                    >
                                                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteCandidate(u)}
                                                        disabled={u.id === currentUser?.id || updatingUserId === u.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => !isCreating && setIsAddModalOpen(false)}
                title="Tambah Pengguna Baru"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Email</label>
                        <Input
                            type="email"
                            placeholder="nama@email.com"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Nama Lengkap</label>
                        <Input
                            type="text"
                            placeholder="Nama pengguna"
                            value={newUserForm.displayName}
                            onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Password</label>
                        <Input
                            type="password"
                            placeholder="Minimal 6 karakter"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Role</label>
                        <Select
                            value={newUserForm.role}
                            onChange={(val) => setNewUserForm({ ...newUserForm, role: val as 'admin' | 'staf' })}
                            options={[
                                { value: 'admin', label: 'Admin' },
                                { value: 'staf', label: 'Staf' },
                            ]}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsAddModalOpen(false)}
                            disabled={isCreating}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateUser}
                            disabled={isCreating}
                        >
                            {isCreating ? 'Membuat...' : 'Tambah Pengguna'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => {
                    if (isResettingPassword) return;
                    setIsPasswordModalOpen(false);
                    setSelectedUserForPassword(null);
                }}
                title="Reset Password Pengguna"
                description="Admin dapat mengubah password user dari sini."
            >
                <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-semibold text-foreground">{selectedUserForPassword?.displayName || '-'}</p>
                        <p className="text-xs text-muted-foreground">{selectedUserForPassword?.email || '-'}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Password Baru</label>
                        <Input
                            type="password"
                            placeholder="Minimal 8 karakter"
                            value={passwordForm.password}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                            disabled={isResettingPassword}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground/80">Konfirmasi Password</label>
                        <Input
                            type="password"
                            placeholder="Ulangi password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            disabled={isResettingPassword}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsPasswordModalOpen(false);
                                setSelectedUserForPassword(null);
                            }}
                            disabled={isResettingPassword}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                        >
                            {isResettingPassword ? 'Menyimpan...' : 'Simpan Password'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!deleteCandidate}
                onOpenChange={(open) => !open && setDeleteCandidate(null)}
                title="Hapus Pengguna"
                description={
                    <>
                        Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">{deleteCandidate?.displayName || '-'}</span>?
                        Data user ini akan hilang dari sistem.
                    </>
                }
                confirmLabel="Hapus Pengguna"
                confirmVariant="destructive"
                isLoading={!!deleteCandidate && updatingUserId === deleteCandidate.id}
                onConfirm={() => deleteCandidate && handleDeleteUser(deleteCandidate)}
            />
        </div>
    );
};
