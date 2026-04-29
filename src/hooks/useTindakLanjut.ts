import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AduanFollowUpService } from '../lib/aduan.followups';
import type { CreateTindakLanjutDTO, TindakLanjut } from '../types';

type UpdateTindakLanjutInput = Partial<TindakLanjut> & { id: string };

export const useTindakLanjutList = (aduanId: string | undefined) => {
    return useQuery({
        queryKey: ['aduan', 'tindak-lanjut', aduanId],
        queryFn: () => (aduanId ? AduanFollowUpService.getTindakLanjutList(aduanId) : []),
        enabled: !!aduanId,
    });
};

export const useCreateTindakLanjut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTindakLanjutDTO) => AduanFollowUpService.createTindakLanjut(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'tindak-lanjut', variables.aduanId] });
        },
    });
};

export const useDeleteTindakLanjut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AduanFollowUpService.deleteTindakLanjut(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'tindak-lanjut'] });
        },
    });
};

export const useUpdateTindakLanjut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateTindakLanjutInput) => AduanFollowUpService.updateTindakLanjut(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['aduan'] });
            queryClient.invalidateQueries({ queryKey: ['aduan', 'tindak-lanjut', variables.aduanId] });
        },
    });
};
