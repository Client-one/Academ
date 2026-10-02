-- 0005: upload lifecycle consistency hardening
--
-- Clarifies and enforces the upload_status semantics for content_materials:
--
--   ready   — file upload finished; storage_path IS a real object path.
--   none    — article-only material; no upload attempted, article required.
--   pending — upload in progress; storage_path IS NULL and row stays draft.
--
-- Changes:
--   1. Drop the unused 'failed' state. The app never writes it: a failed
--      upload rolls back and deletes the row, so keeping the state only
--      created ambiguity.
--   2. Strengthen the lifecycle CHECK so the file-state invariants hold
--      REGARDLESS of the article column. Previously `article is not null`
--      alone satisfied the old disjunction, which allowed impossible
--      combinations such as (upload_status = 'ready', storage_path NULL).
--   3. Article-only stays intentional and protected: upload_status = 'none'
--      requires an article and forbids a storage_path.

begin;

-- 1. Retire 'failed' (no production row should hold it; map defensively).
update public.content_materials
  set upload_status = 'pending'
  where upload_status = 'failed';

alter table public.content_materials
  drop constraint if exists content_materials_upload_lifecycle_chk;
alter table public.content_materials
  drop constraint if exists content_materials_upload_status_check;

alter table public.content_materials
  add constraint content_materials_upload_status_chk
  check (upload_status in ('none', 'pending', 'ready'));

-- 2 + 3. State invariants, independent of the article column.
alter table public.content_materials
  add constraint content_materials_upload_lifecycle_chk check (
    -- ready file material: always has a real storage path
    (upload_status = 'ready' and storage_path is not null)
    -- article-only material: no file, but an article must exist
    or (upload_status = 'none' and storage_path is null and article is not null)
    -- upload in progress: no path yet, never visible to students
    or (upload_status = 'pending' and storage_path is null and status = 'draft')
  );

commit;
