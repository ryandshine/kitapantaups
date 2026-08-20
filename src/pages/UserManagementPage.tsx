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
    KeyRound,
    MoreHorizontal
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

    const activeUserCount = users.filter((user) => user.isActive).length;
    const inactiveUserCount = users.length - activeUserCount;

    const closeActionMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.closest('details')?.removeAttribute('open');
    };

    const renderUserActions = (user: User) => (
        <details className="relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="h-5 w-5" />
                <span className="sr-only">Buka aksi untuk {user.displayName || user.email}</span>
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
                <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Aksi pengguna</p>
                <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
                    onClick={(event) => {
                        closeActionMenu(event);
                        openResetPasswordModal(user);
                    }}
                    disabled={updatingUserId === user.id}
                >
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Reset password
                </button>
                {user.id !== currentUser?.id && (
                    <>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
                            onClick={(event) => {
                                closeActionMenu(event);
                                void handleRoleChange(user.id, user.role === 'admin' ? 'staf' : 'admin');
                            }}
                            disabled={updatingUserId === user.id}
                        >
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            Jadikan {user.role === 'admin' ? 'Staf' : 'Admin'}
                        </button>
                        <button
                            type="button"
                            className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                                user.isActive ? 'text-destructive hover:bg-destructive/10' : 'text-secondary hover:bg-secondary/10'
                            )}
                            onClick={(event) => {
                                closeActionMenu(event);
                                void handleToggleStatus(user);
                            }}
                            disabled={updatingUserId === user.id}
                        >
                            {user.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                            onClick={(event) => {
                                closeActionMenu(event);
                                setDeleteCandidate(user);
                            }}
                            disabled={updatingUserId === user.id}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus pengguna
                        </button>
                    </>
                )}
            </div>
        </details>
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
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 px-1 py-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary">Administrasi Sistem</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Manajemen Pengguna</h1>
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-muted-foreground">Kelola hak akses dan peran pengguna dalam sistem.</p>
                </div>
                <Button
                    className="w-full rounded-xl font-semibold sm:w-auto"
                    leftIcon={<UserPlus className="h-4 w-4" />}
                    onClick={() => setIsAddModalOpen(true)}
                >
                    Tambah Pengguna
                </Button>
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/70 bg-transparent p-5 sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-primary" />
                                Pengguna ({filteredUsers.length})
                            </CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">Kelola akun, peran, dan status akses pengguna.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama atau email..."
                                aria-label="Cari nama atau email pengguna"
                                className="w-full pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs">
                        <span className="font-semibold text-foreground"><strong className="mr-1 text-base tabular-nums">{users.length}</strong> Pengguna</span>
                        <span className="text-muted-foreground"><strong className="mr-1 text-base tabular-nums text-primary">{activeUserCount}</strong> Aktif</span>
                        <span className="text-muted-foreground"><strong className="mr-1 text-base tabular-nums text-destructive">{inactiveUserCount}</strong> Nonaktif</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden overflow-hidden md:block">
                        <table className="w-full table-fixed text-sm">
                            <colgroup>
                                <col className="w-[45%]" />
                                <col className="w-[18%]" />
                                <col className="w-[18%]" />
                                <col className="w-[19%]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b border-border/70 bg-muted/20">
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pengguna</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Peran</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="h-6 w-6 animate-spin" />
                                                Memuat data pengguna...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-muted-foreground">Pengguna tidak ditemukan.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-primary/5">
                                            <td className="min-w-0 px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <UserAvatar user={u} />
                                                    <div className="min-w-0 leading-tight">
                                                        <span className="block truncate font-semibold text-foreground">{(u.displayName || '').trim() || u.email?.split('@')[0] || 'User'}</span>
                                                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                                                    {u.role === 'admin' ? 'Admin' : 'Staf'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', u.isActive ? 'status-soft-green' : 'status-soft-red')}>
                                                    {u.isActive ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                                                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">{renderUserActions(u)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-3 p-3 md:hidden">
                        {loading && users.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                                <RefreshCw className="h-6 w-6 animate-spin" />
                                Memuat data pengguna...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">Pengguna tidak ditemukan.</p>
                        ) : (
                            filteredUsers.map((u) => (
                                <article key={u.id} className="rounded-xl border border-border bg-muted/15 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <UserAvatar user={u} />
                                            <div className="min-w-0 leading-tight">
                                                <p className="truncate font-semibold text-foreground">{(u.displayName || '').trim() || u.email?.split('@')[0] || 'User'}</p>
                                                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                        {renderUserActions(u)}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">{u.role === 'admin' ? 'Admin' : 'Staf'}</span>
                                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', u.isActive ? 'status-soft-green' : 'status-soft-red')}>
                                            {u.isActive ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                                            {u.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </article>
                            ))
                        )}
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
