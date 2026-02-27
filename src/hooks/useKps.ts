import { useQuery } from '@tanstack/react-query';
import { KpsService } from '../lib/kps.service';

export const useKpsList = (page: number = 1, pageSize: number = 20) => {
    return useQuery({
        queryKey: ['kps', 'list', page, pageSize],
        queryFn: () => KpsService.getKpsList(page, pageSize),
    });
};

export const useKpsCount = () => {
    return useQuery({
        queryKey: ['kps', 'count'],
        queryFn: () => KpsService.getKpsCount(),
    });
};

export const useKpsSearch = (query: string) => {
    return useQuery({
        queryKey: ['kps', 'search', query],
        queryFn: () => KpsService.searchKps(query),
        enabled: query.length > 0,
    });
};

export const useKpsDetail = (kpsId: string | undefined) => {
    return useQuery({
        queryKey: ['kps', 'detail', kpsId],
        queryFn: () => (kpsId ? KpsService.getKpsById(kpsId) : null),
        enabled: !!kpsId,
    });
};
