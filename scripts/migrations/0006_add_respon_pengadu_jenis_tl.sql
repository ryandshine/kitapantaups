INSERT INTO public.master_jenis_tl (nama_jenis_tl)
VALUES ('Respon pengadu/Pihak ketiga')
ON CONFLICT (nama_jenis_tl) DO NOTHING;
