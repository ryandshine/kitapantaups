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

const createEmptyForm = (namaLembaga: string): NewKpsInput => ({
    nama_lembaga: namaLembaga,
    skema: 'HUTAN KEMASYARAKATAN',
    surat_keputusan: '',
    tanggal: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    desa: '',
    luas_total: 0,
    anggota_pria: 0,
    anggota_wanita: 0,
});

interface AddKpsModalProps {
    isOpen: boolean;
    initialNama?: string;
    onClose: () => void;
    onSelect: (kps: KpsData) => void;
}

export const AddKpsModal: React.FC<AddKpsModalProps> = ({ isOpen, initialNama = '', onClose, onSelect }) => {
    const [form, setForm] = useState<NewKpsInput>(() => createEmptyForm(initialNama));
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

    const updateField = <K extends keyof NewKpsInput>(field: K, value: NewKpsInput[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nama_lembaga.trim() || !form.provinsi.trim() || !form.kabupaten.trim()) {
            setError('Nama Lembaga, Provinsi, dan Kabupaten wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const payload: NewKpsInput = {
                ...form,
                nama_lembaga: form.nama_lembaga.trim(),
                provinsi: form.provinsi.trim(),
                kabupaten: form.kabupaten.trim(),
            };
            const response = await KpsService.createKps(payload);

            if (response.candidates.length > 0) {
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
                        Ditemukan {result.candidates.length} data dengan nama mirip. Pilih salah satu jika memang sama,
                        atau tetap gunakan data baru yang barusan dibuat.
                    </p>
                    <div className="flex flex-col gap-2">
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
                <ModalFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleUseNew}>Tetap Pakai Data Baru</Button>
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
                    label="Nama Lembaga / KPS"
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
                    fullWidth
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        label="Nomor SK"
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
                    <Input
                        label="Provinsi"
                        value={form.provinsi}
                        onChange={(e) => updateField('provinsi', e.target.value)}
                        required
                        fullWidth
                    />
                    <Input
                        label="Kabupaten"
                        value={form.kabupaten}
                        onChange={(e) => updateField('kabupaten', e.target.value)}
                        required
                        fullWidth
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        label="Kecamatan"
                        value={form.kecamatan}
                        onChange={(e) => updateField('kecamatan', e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Desa"
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
                        value={form.luas_total}
                        onChange={(e) => updateField('luas_total', Number(e.target.value) || 0)}
                        fullWidth
                    />
                    <Input
                        label="Anggota Pria"
                        type="number"
                        min={0}
                        value={form.anggota_pria}
                        onChange={(e) => updateField('anggota_pria', Number(e.target.value) || 0)}
                        fullWidth
                    />
                    <Input
                        label="Anggota Wanita"
                        type="number"
                        min={0}
                        value={form.anggota_wanita}
                        onChange={(e) => updateField('anggota_wanita', Number(e.target.value) || 0)}
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
