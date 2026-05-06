UPDATE public.aduan_documents
SET file_name = split_part(
  split_part(file_url, '?', 1),
  '/',
  array_length(string_to_array(split_part(file_url, '?', 1), '/'), 1)
)
WHERE file_url LIKE '%/uploads/%'
  AND file_name IS DISTINCT FROM split_part(
    split_part(file_url, '?', 1),
    '/',
    array_length(string_to_array(split_part(file_url, '?', 1), '/'), 1)
  );
