import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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

const toForm = (kps: KpsData): NewKpsInput => ({
    nama_lembaga: kps.nama_lembaga || kps.nama_kps || '',
    skema: kps.skema || kps.kps_type || kps.jenis_kps || 'HUTAN KEMASYARAKATAN',
    surat_keputusan: kps.surat_keputusan || kps.nomor_sk || '',
    tanggal: (kps.tanggal || kps.tanggal_sk || '').slice(0, 10),
    provinsi: kps.provinsi || kps.lokasi_prov || '',
    kabupaten: kps.kabupaten || kps.lokasi_kab || '',
    kecamatan: kps.kecamatan || kps.lokasi_kec || '',
    desa: kps.desa || kps.lokasi_desa || '',
    luas_total: Number(kps.luas_total ?? kps.lokasi_luas_ha ?? 0) || 0,
    anggota_pria: Number(kps.anggota_pria || 0) || 0,
    anggota_wanita: Number(kps.anggota_wanita || 0) || 0,
});

interface EditKpsModalProps {
    isOpen: boolean;
    kps: KpsData | null;
    onClose: () => void;
    onSaved: (kps: KpsData) => void;
}

export const EditKpsModal: React.FC<EditKpsModalProps> = ({ isOpen, kps, onClose, onSaved }) => {
    const [form, setForm] = useState<NewKpsInput>(() => toForm(kps || {} as KpsData));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && kps) {
            setForm(toForm(kps));
            setError('');
        }
    }, [isOpen, kps]);

    const updateField = <K extends keyof NewKpsInput>(field: K, value: NewKpsInput[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const skemaOptions = form.skema && !SKEMA_OPTIONS.some((option) => option.value === form.skema)
        ? [{ value: form.skema, label: form.skema }, ...SKEMA_OPTIONS]
        : SKEMA_OPTIONS;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!kps) return;
        if (!form.nama_lembaga.trim() || !form.provinsi.trim() || !form.kabupaten.trim()) {
            setError('Nama Lembaga, Provinsi, dan Kabupaten wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const saved = await KpsService.updateKps(kps.id, {
                ...form,
                nama_lembaga: form.nama_lembaga.trim(),
                provinsi: form.provinsi.trim(),
                kabupaten: form.kabupaten.trim(),
            });
            onSaved(saved);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan KPS.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Data KPS" description="Koreksi informasi lembaga pada master KPS." size="lg">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <FeedbackBanner type="error" message={error} onClose={() => setError('')} />}
                {kps?.source === 'gokups' && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>Koreksi admin akan dipertahankan saat sinkronisasi GoKUPS berikutnya.</span>
                    </div>
                )}
                <Input label="Nama Lembaga / KPS" value={form.nama_lembaga} onChange={(e) => updateField('nama_lembaga', e.target.value)} required fullWidth />
                <Select label="Skema" options={skemaOptions} value={form.skema} onChange={(value) => updateField('skema', value)} fullWidth />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Nomor SK" value={form.surat_keputusan} onChange={(e) => updateField('surat_keputusan', e.target.value)} fullWidth />
                    <Input label="Tanggal SK" type="date" value={form.tanggal} onChange={(e) => updateField('tanggal', e.target.value)} fullWidth />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Provinsi" value={form.provinsi} onChange={(e) => updateField('provinsi', e.target.value)} required fullWidth />
                    <Input label="Kabupaten" value={form.kabupaten} onChange={(e) => updateField('kabupaten', e.target.value)} required fullWidth />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Kecamatan" value={form.kecamatan} onChange={(e) => updateField('kecamatan', e.target.value)} fullWidth />
                    <Input label="Desa" value={form.desa} onChange={(e) => updateField('desa', e.target.value)} fullWidth />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input label="Luas Total (Ha)" type="number" min={0} value={form.luas_total} onChange={(e) => updateField('luas_total', Number(e.target.value) || 0)} fullWidth />
                    <Input label="Anggota Pria" type="number" min={0} value={form.anggota_pria} onChange={(e) => updateField('anggota_pria', Number(e.target.value) || 0)} fullWidth />
                    <Input label="Anggota Wanita" type="number" min={0} value={form.anggota_wanita} onChange={(e) => updateField('anggota_wanita', Number(e.target.value) || 0)} fullWidth />
                </div>
                <ModalFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Batal</Button>
                    <Button type="submit" isLoading={isSubmitting}>Simpan Perubahan</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};
