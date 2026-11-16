-- The POS checks each update's SHA-256 before installing it (FR-118, 2026-11-17).
--
-- public.app_release says which POS build the tablets should update to. Until
-- now a tablet installed whatever file apk_url pointed at. With sha256 the POS
-- checks the download against the published hash and refuses a broken or
-- swapped file. Android itself still refuses an APK signed with another key.
--
-- Undo: supabase/rollbacks/20261117140000_app_release_sha256.sql

alter table public.app_release
  add column if not exists sha256 text
    constraint app_release_sha256_format check (sha256 ~ '^[0-9a-f]{64}$');

comment on column public.app_release.sha256 is
  'Lowercase hex SHA-256 of the APK at apk_url. POS builds from 10150 refuse an update without a matching hash.';
