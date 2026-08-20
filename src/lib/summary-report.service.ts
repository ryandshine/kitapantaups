import { api } from './api';

export type SummaryCount = { label: string; count: number };

export type SummaryReport = {
    generatedAt: string;
    overview: {
        totalAduan: number;
        selesai: number;
        aktif: number;
        terlambat: number;
        tahunBerjalan: number;
        totalKps: number;
        totalLuas: number;
        anggotaPria: number;
        anggotaWanita: number;
        completionRate: number;
    };
    statusSummary: SummaryCount[];
    monthlyTrend: Array<{ month: string; received: number; resolved: number }>;
    agingSummary: SummaryCount[];
    provinceSummary: SummaryCount[];
    regencySummary: SummaryCount[];
    categorySummary: SummaryCount[];
    rkpsSummary: SummaryCount[];
    kupsSummary: SummaryCount[];
    picSummary: Array<{ label: string; total: number; selesai: number; aktif: number; rataRataHari: number }>;
    priorityAduan: Array<{ ticket: string; perihal: string; status: string; pic: string | null; created_at: string; ageDays: number }>;
    recentAduan: Array<{ ticket: string; perihal: string; status: string; pic: string; updated_at: string }>;
    appendix: Array<{
        ticket: string;
        created_at: string;
        updated_at: string;
        perihal: string;
        pengadu: string;
        status: string;
        pic: string;
        provinsi: string;
        kabupaten: string;
        kps: string;
    }>;
};

export const SummaryReportService = {
    getSummary: () => api.get<SummaryReport>('/reports/summary'),
};
