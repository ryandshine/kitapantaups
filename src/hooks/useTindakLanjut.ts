import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AduanService } from '../lib/aduan.service';
import type { CreateTindakLanjutDTO } from '../types';

export const useTindakLanjutList = (aduanId: string | undefined) => {
    return useQuery({
        queryKey: ['aduan', 'tindak-lanjut', aduanId],
        queryFn: () => (aduanId ? AduanService.getTindakLanjutList(aduanId) : []),
        enabled: !!aduanId,
    });
};

export const useCreateTindakLanjut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTindakLanjutDTO) => AduanService.createTindakLanjut(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'tindak-lanjut', variables.aduanId] });
        },
    });
};

export const useDeleteTindakLanjut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AduanService.deleteTindakLanjut(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'tindak-lanjut'] });
        },
    });
};
