import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AduanService } from '../lib/aduan.service';
import type { Aduan } from '../types';

export const useAduanList = (page: number = 1, pageSize: number = 20, searchTerm?: string) => {
    return useQuery({
        queryKey: ['aduan', 'list', page, pageSize, searchTerm],
        queryFn: () => AduanService.getAduanList(page, pageSize, searchTerm),
    });
};

export const useAduanCount = (filters?: { status?: string; balaiId?: string }) => {
    return useQuery({
        queryKey: ['aduan', 'count', filters],
        queryFn: () => AduanService.getAduanCount(filters),
    });
};

export const useAduanDetail = (id: string | undefined) => {
    return useQuery({
        queryKey: ['aduan', 'detail', id],
        queryFn: () => (id ? AduanService.getAduanById(id) : null),
        enabled: !!id,
    });
};

export const useAduanByTicket = (nomorTiket: string | undefined) => {
    return useQuery({
        queryKey: ['aduan', 'ticket', nomorTiket],
        queryFn: () => (nomorTiket ? AduanService.getAduanByTicket(nomorTiket) : null),
        enabled: !!nomorTiket,
    });
};

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: () => AduanService.getDashboardStats(),
    });
};





export const useUpdateAduan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Aduan> & { updatedBy?: string } }) =>
            AduanService.updateAduan(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'detail', variables.id] });
        },
    });
};

export const useDeleteAduan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AduanService.deleteAduan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
        },
    });
};
