ALTER TABLE public.aduan_documents
ADD COLUMN IF NOT EXISTS original_file_name text;

UPDATE public.aduan_documents
SET original_file_name = file_name
WHERE original_file_name IS NULL;

