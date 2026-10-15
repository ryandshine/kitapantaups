import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { FeedbackBanner } from './feedback-banner';
import { KpsService, type NewKpsInput } from '../../lib/kps.service';
import type { KpsData } from '../../types';

const SKEMA_OPTIONS = [
    { value: 'HUTAN DESA', label: 'Hutan Desa' },
    { value: 'HUTAN KEMASYARAKATAN', label: 'Hutan Kemasyarakatan' },
    { value: 'HUTAN TANAMAN RAKYAT', label: 'Hutan Tanaman Rakyat' },
    { value: 'KEMITRAAN KEHUTANAN', label: 'Kemitraan Kehutanan' },
    { value: 'HUTAN ADAT', label: 'Hutan Adat' },
    { value: 'HUTAN RAKYAT', label: 'Hutan Rakyat' },
    { value: 'LAINNYA', label: 'Lainnya' },
];

const PROVINSI_INDONESIA = [
    'ACEH',
    'BALI',
    'BANTEN',
    'BENGKULU',
    'D I YOGYAKARTA',
    'DKI JAKARTA',
    'GORONTALO',
    'JAMBI',
    'JAWA BARAT',
    'JAWA TENGAH',
    'JAWA TIMUR',
    'KALIMANTAN BARAT',
    'KALIMANTAN SELATAN',
    'KALIMANTAN TENGAH',
    'KALIMANTAN TIMUR',
    'KALIMANTAN UTARA',
    'KEPULAUAN BANGKA BELITUNG',
    'KEPULAUAN RIAU',
    'LAMPUNG',
    'MALUKU',
    'MALUKU UTARA',
    'NUSA TENGGARA BARAT',
    'NUSA TENGGARA TIMUR',
    'PAPUA',
    'PAPUA BARAT',
    'PAPUA BARAT DAYA',
    'PAPUA PEGUNUNGAN',
    'PAPUA SELATAN',
    'PAPUA TENGAH',
    'RIAU',
    'SULAWESI BARAT',
    'SULAWESI SELATAN',
    'SULAWESI TENGAH',
    'SULAWESI TENGGARA',
    'SULAWESI UTARA',
    'SUMATERA BARAT',
    'SUMATERA SELATAN',
    'SUMATERA UTARA'
];

interface FormState {
    nama_lembaga: string;
    skema: string;
    surat_keputusan: string;
    tanggal: string;
    provinsi: string;
    kabupaten: string;
    kecamatan: string;
    desa: string;
    luas_total: string;
    anggota_pria: string;
    anggota_wanita: string;
}

const createEmptyForm = (namaLembaga: string): FormState => ({
    nama_lembaga: namaLembaga,
    skema: 'HUTAN KEMASYARAKATAN',
    surat_keputusan: '',
    tanggal: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    desa: '',
    luas_total: '',
    anggota_pria: '',
    anggota_wanita: '',
});

interface AddKpsModalProps {
    isOpen: boolean;
    initialNama?: string;
    onClose: () => void;
    onSelect: (kps: KpsData) => void;
}

export const AddKpsModal: React.FC<AddKpsModalProps> = ({ isOpen, initialNama = '', onClose, onSelect }) => {
    const [form, setForm] = useState<FormState>(() => createEmptyForm(initialNama));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ data: KpsData; candidates: KpsData[] } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setForm(createEmptyForm(initialNama));
            setError('');
            setResult(null);
        }
    }, [isOpen, initialNama]);

    const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedNama = form.nama_lembaga.trim();
        const trimmedProvinsi = form.provinsi.trim().toUpperCase();
        const trimmedKabupaten = form.kabupaten.trim().toUpperCase();

        if (!trimmedNama || !trimmedProvinsi || !trimmedKabupaten) {
            setError('Nama Lembaga, Provinsi, dan Kabupaten wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const payload: NewKpsInput = {
                nama_lembaga: trimmedNama,
                skema: form.skema,
                surat_keputusan: form.surat_keputusan.trim() || undefined,
                tanggal: form.tanggal.trim() || undefined,
                provinsi: trimmedProvinsi,
                kabupaten: trimmedKabupaten,
                kecamatan: form.kecamatan.trim() || undefined,
                desa: form.desa.trim() || undefined,
                luas_total: form.luas_total ? Number(form.luas_total) : 0,
                anggota_pria: form.anggota_pria ? Number(form.anggota_pria) : 0,
                anggota_wanita: form.anggota_wanita ? Number(form.anggota_wanita) : 0,
            };
            const response = await KpsService.createKps(payload);

            if (response.candidates && response.candidates.length > 0) {
                setResult(response);
            } else {
                onSelect(response.data);
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan KPS baru.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUseCandidate = (candidate: KpsData) => {
        onSelect(candidate);
        onClose();
    };

    const handleUseNew = () => {
        if (!result) return;
        onSelect(result.data);
        onClose();
    };

    if (result) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="KPS Serupa Ditemukan"
                description="Data baru sudah tersimpan. Pastikan ini bukan duplikat sebelum melanjutkan."
                size="lg"
            >
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Ditemukan {result.candidates.length} data dengan nama mirip di master KPS. Pilih salah satu jika memang sama,
                        atau tetap gunakan data baru yang barusan dibuat.
                    </p>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                        {result.candidates.map((candidate) => (
                            <button
                                key={candidate.id}
                                type="button"
                                onClick={() => handleUseCandidate(candidate)}
                                className="rounded-xl border border-border px-4 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                            >
                                <div className="font-semibold text-foreground">{candidate.nama_lembaga || candidate.nama_kps}</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    SK: {candidate.surat_keputusan || candidate.nomor_sk || '-'} &middot;{' '}
                                    {candidate.kabupaten || candidate.lokasi_kab || '-'}, {candidate.provinsi || candidate.lokasi_prov || '-'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
                <ModalFooter className="mt-4 gap-2">
                    <Button type="button" variant="outline" onClick={() => setResult(null)}>
                        Kembali ke Form
                    </Button>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Batal
                    </Button>
                    <Button type="button" onClick={handleUseNew}>
                        Tetap Pakai Data Baru
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tambah KPS Baru"
            description="Isi data minimal untuk lembaga yang belum ada di sinkronisasi GoKUPS."
            size="lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <FeedbackBanner type="error" message={error} onClose={() => setError('')} />}

                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    <Sparkles size={14} className="mt-0.5 shrink-0" />
                    <span>Data ini akan ditandai sebagai data lokal dan tidak akan tertimpa oleh sinkronisasi GoKUPS.</span>
                </div>

                <Input
                    label="Nama Lembaga / KPS *"
                    placeholder="Contoh: KTH Sinar Harapan"
                    value={form.nama_lembaga}
                    onChange={(e) => updateField('nama_lembaga', e.target.value)}
                    required
                    fullWidth
                />

                <Select
                    label="Skema"
                    options={SKEMA_OPTIONS}
                    value={form.skema}
                    onChange={(value) => updateField('skema', value)}
                    usePortal={false}
                    fullWidth
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        label="Nomor SK"
                        placeholder="Contoh: SK.123/MENLHK/..."
                        value={form.surat_keputusan}
                        onChange={(e) => updateField('surat_keputusan', e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Tanggal SK"
                        type="date"
                        value={form.tanggal}
                        onChange={(e) => updateField('tanggal', e.target.value)}
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Input
                            label="Provinsi *"
                            placeholder="Ketik atau pilih provinsi..."
                            value={form.provinsi}
                            onChange={(e) => updateField('provinsi', e.target.value.toUpperCase())}
                            list="kps-modal-provinsi-list"
                            required
                            fullWidth
                        />
                        <datalist id="kps-modal-provinsi-list">
                            {PROVINSI_INDONESIA.map((prov) => (
                                <option key={prov} value={prov} />
                            ))}
                        </datalist>
                    </div>
                    <Input
                        label="Kabupaten *"
                        placeholder="Contoh: BOGOR"
                        value={form.kabupaten}
                        onChange={(e) => updateField('kabupaten', e.target.value.toUpperCase())}
                        required
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        label="Kecamatan"
                        placeholder="Contoh: Cisarua"
                        value={form.kecamatan}
                        onChange={(e) => updateField('kecamatan', e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Desa"
                        placeholder="Contoh: Tugu Selatan"
                        value={form.desa}
                        onChange={(e) => updateField('desa', e.target.value)}
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                        label="Luas Total (Ha)"
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0"
                        value={form.luas_total}
                        onChange={(e) => updateField('luas_total', e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Anggota Pria"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={form.anggota_pria}
                        onChange={(e) => updateField('anggota_pria', e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Anggota Wanita"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={form.anggota_wanita}
                        onChange={(e) => updateField('anggota_wanita', e.target.value)}
                        fullWidth
                    />
                </div>

                <ModalFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Batal
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Simpan &amp; Pakai KPS Ini
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};
