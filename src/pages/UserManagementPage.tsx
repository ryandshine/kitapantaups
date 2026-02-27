import {
    useUsersList,
    useCreateUser,
    useUpdateUserRole,
    useToggleUserStatus,
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
    UserPlus
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input,
    Select,
    Modal
} from '../components/ui';
import type { User } from '../types';
import { cn } from '../lib/utils';

export const UserManagementPage: React.FC = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const { data: users = [], isLoading: loading, refetch: fetchUsers } = useUsersList(isAdmin);
    const { mutate: createUser, isPending: isCreating } = useCreateUser();
    const { mutate: updateUserRole } = useUpdateUserRole();
    const { mutate: toggleStatus } = useToggleUserStatus();
    const { mutate: deleteUser } = useDeleteUser();

    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'staf' as 'admin' | 'staf'
    });

    const handleRoleChange = async (userId: string, newRole: any) => {
        setUpdatingUserId(userId);
        updateUserRole({ userId, newRole }, {
            onSettled: () => setUpdatingUserId(null),
            onError: () => alert('Gagal memperbarui role user.')
        });
    };

    const handleDeleteUser = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert('Anda tidak bisa menghapus akun Anda sendiri.');
            return;
        }

        const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus user "${user.displayName}"?\n\nData user ini akan hilang dari sistem.`);
        if (!confirmed) return;

        setUpdatingUserId(user.id);
        deleteUser(user.id, {
            onSettled: () => setUpdatingUserId(null),
            onError: () => alert('Gagal menghapus user.')
        });
    };

    const handleToggleStatus = async (user: User) => {
        if (user.id === currentUser?.id) return;

        setUpdatingUserId(user.id);
        toggleStatus({ userId: user.id, isActive: !user.isActive }, {
            onSettled: () => setUpdatingUserId(null),
            onError: () => alert('Gagal mengubah status user.')
        });
    };

    const handleCreateUser = async () => {
        if (!newUserForm.email || !newUserForm.password || !newUserForm.displayName) {
            alert('Semua field wajib diisi.');
            return;
        }

        createUser(newUserForm, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                setNewUserForm({ email: '', password: '', displayName: '', role: 'staf' });
            },
            onError: (error: any) => {
                alert(`Gagal membuat user: ${error.message}`);
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
            <div className="flex items-center justify-between border-b pb-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Manajemen Pengguna</h1>
                    <p className="text-sm text-muted-foreground">Kelola hak akses dan peran pengguna dalam sistem.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="primary"
                        leftIcon={<UserPlus className="h-4 w-4" />}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        Tambah Pengguna
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />}
                        onClick={() => fetchUsers()}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Daftar Pengguna ({filteredUsers.length})
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama atau email..."
                                className="pl-9 w-full md:w-64"
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
                                <tr className="border-b bg-muted/30">
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
                                                    <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-background shrink-0">
                                                        {u.photoURL ? (
                                                            <img src={u.photoURL} alt={u.displayName} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                                                                {u.displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-semibold text-foreground">{u.displayName}</span>
                                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 max-w-[140px]">
                                                    <Select
                                                        value={u.role}
                                                        onChange={(val) => handleRoleChange(u.id, val)}
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(u)}
                                                    disabled={u.id === currentUser?.id || updatingUserId === u.id}
                                                    className={cn(
                                                        "rounded-full px-3 h-7 text-[10px] font-semibold uppercase tracking-wider",
                                                        u.isActive
                                                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                            : "text-rose-600 bg-rose-50 hover:bg-rose-100"
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
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteUser(u)}
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

            {/* Add User Modal */}
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
        </div>
    );
};
