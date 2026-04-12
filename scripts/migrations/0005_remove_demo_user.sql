BEGIN;

DELETE FROM public.users
WHERE email = 'demo@klhk.go.id';

COMMIT;
