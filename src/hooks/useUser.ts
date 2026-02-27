import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '../lib/user.service';

export const useUsersList = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['users', 'list'],
        queryFn: () => UserService.getAllUsers(),
        enabled,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ email, password, displayName, role }: any) =>
            UserService.createUser(email, password, displayName, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
        },
    });
};

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, newRole }: { userId: string, newRole: 'admin' | 'staf' }) =>
            UserService.updateUserRole(userId, newRole),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
        },
    });
};

export const useToggleUserStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, isActive }: { userId: string, isActive: boolean }) =>
            UserService.toggleUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => UserService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
        },
    });
};
