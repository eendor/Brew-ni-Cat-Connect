-- Undo 20261117140000_app_release_sha256.sql.
alter table public.app_release drop column if exists sha256;
