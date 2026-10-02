-- ============================================================================
-- 0004_database_integrity_hardening.sql
--
-- Release-hardening migration. Applied AFTER 0003; does not modify earlier
-- migrations. Changes:
--
--   1. move_item: DETERMINISTIC lock ordering. The per-list advisory
--      transaction lock is now acquired BEFORE any row lock is taken, and
--      the row + its neighbor are then locked FOR UPDATE inside that
--      critical section. Two concurrent reorders of the same list can never
--      interleave (no deadlock cycle: advisory lock is always the FIRST lock
--      acquired, row locks always come SECOND, and within a swap the row
--      locks are acquired in a single deterministic statement order).
--
--   2. profiles_guard_update: extended to protect ALL server-managed audit
--      fields. created_by / created_at are now immutable for EVERYONE
--      (including admins — there is no legitimate reason to rewrite audit
--      metadata), and role / university_id / level_id / semester_id /
--      is_active remain admin-only as before.
--
--   3. content_materials: explicit upload lifecycle instead of the
--      placeholder storage_path = 'pending':
--        upload_status: none | pending | ready | failed
--      Invariants enforced by CHECK constraints:
--        * a "pending"/"failed" upload has NO storage_path and stays draft
--        * a "ready" file material has a storage_path
--        * every material has an article OR a ready file OR is a draft
--          pending upload
--        * storage_path (when present) must be a UUID-based path
--          {course_id}/{content_item_id}/{material_id}.{ext}
--      Student SELECT policy now also requires the file to be actually
--      uploaded (upload_status = 'ready') unless an article exists.
--
--   4. material-kind ↔ file-extension consistency trigger (defense in depth
--      on top of the application's magic-byte validation):
--        official_professor_pdf / student_summary_pdf  → .pdf only
--        student_summary_image                          → .jpg/.jpeg/.png/.webp
--
-- NOTE: this migration must be applied (and its effects verified) in the
-- project's own Supabase environment; it is written to be idempotent-safe
-- for a fresh apply on top of 0001–0003.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. move_item — deterministic lock ordering (advisory lock FIRST)
-- ---------------------------------------------------------------------------

create or replace function public.move_item(p_kind text, p_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order    integer;
  v_neighbor uuid;
  v_parent   uuid;
  v_lock_key text;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;
  if p_delta <> 1 and p_delta <> -1 then
    raise exception 'invalid delta';
  end if;

  -- Phase 1 (NO locks held yet): identify the ordered list this item belongs
  -- to. Plain reads — if the row is moved/deleted concurrently we re-read
  -- authoritatively after taking the lock.
  if p_kind = 'level' then
    select order_index into v_order from public.levels where id = p_id;
    v_lock_key := 'move:level';
  elsif p_kind = 'semester' then
    select level_id into v_parent from public.semesters where id = p_id;
    v_lock_key := 'move:semester:' || coalesce(v_parent::text, 'none');
  elsif p_kind = 'course' then
    select semester_id into v_parent from public.courses where id = p_id;
    v_lock_key := 'move:course:' || coalesce(v_parent::text, 'none');
  elsif p_kind = 'content_item' then
    select course_id into v_parent from public.content_items where id = p_id;
    v_lock_key := 'move:content_item:' || coalesce(v_parent::text, 'none');
  elsif p_kind = 'material' then
    select content_item_id into v_parent from public.content_materials where id = p_id;
    v_lock_key := 'move:material:' || coalesce(v_parent::text, 'none');
  else
    raise exception 'unknown kind';
  end if;

  -- Phase 2: acquire the per-list advisory lock BEFORE touching any row.
  -- Every transaction reordering this list takes the SAME lock FIRST, so
  -- concurrent reorders serialize here and can never deadlock.
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  -- Phase 3: inside the critical section, lock the row and its neighbor
  -- FOR UPDATE (deterministic: moved row first, neighbor second — always
  -- in this order for every transaction on this list).
  if p_kind = 'level' then
    select order_index into v_order from public.levels where id = p_id for update;
    if v_order is null then raise exception 'not found'; end if;
    select id into v_neighbor from public.levels
      where order_index = v_order + p_delta order by order_index limit 1 for update;
    if v_neighbor is null then return; end if;
    update public.levels set order_index = order_index + p_delta where id = p_id;
    update public.levels set order_index = order_index - p_delta where id = v_neighbor;
  elsif p_kind = 'semester' then
    select order_index, level_id into v_order, v_parent from public.semesters where id = p_id for update;
    if v_order is null then raise exception 'not found'; end if;
    select id into v_neighbor from public.semesters
      where level_id = v_parent and order_index = v_order + p_delta
      order by order_index limit 1 for update;
    if v_neighbor is null then return; end if;
    update public.semesters set order_index = order_index + p_delta where id = p_id;
    update public.semesters set order_index = order_index - p_delta where id = v_neighbor;
  elsif p_kind = 'course' then
    select order_index, semester_id into v_order, v_parent from public.courses where id = p_id for update;
    if v_order is null then raise exception 'not found'; end if;
    select id into v_neighbor from public.courses
      where semester_id = v_parent and order_index = v_order + p_delta
      order by order_index limit 1 for update;
    if v_neighbor is null then return; end if;
    update public.courses set order_index = order_index + p_delta where id = p_id;
    update public.courses set order_index = order_index - p_delta where id = v_neighbor;
  elsif p_kind = 'content_item' then
    select order_index, course_id into v_order, v_parent from public.content_items where id = p_id for update;
    if v_order is null then raise exception 'not found'; end if;
    select id into v_neighbor from public.content_items
      where course_id = v_parent and order_index = v_order + p_delta
      order by order_index limit 1 for update;
    if v_neighbor is null then return; end if;
    update public.content_items set order_index = order_index + p_delta where id = p_id;
    update public.content_items set order_index = order_index - p_delta where id = v_neighbor;
  elsif p_kind = 'material' then
    select order_index, content_item_id into v_order, v_parent from public.content_materials where id = p_id for update;
    if v_order is null then raise exception 'not found'; end if;
    select id into v_neighbor from public.content_materials
      where content_item_id = v_parent and order_index = v_order + p_delta
      order by order_index limit 1 for update;
    if v_neighbor is null then return; end if;
    update public.content_materials set order_index = order_index + p_delta where id = p_id;
    update public.content_materials set order_index = order_index - p_delta where id = v_neighbor;
  end if;
end;
$$;

-- Grants unchanged from 0001 (execute to authenticated only).

-- ---------------------------------------------------------------------------
-- 2. profiles: protect ALL server-managed fields
-- ---------------------------------------------------------------------------

create or replace function public.profiles_guard_update()
returns trigger
language plpgsql
as $$
begin
  -- Audit metadata is immutable for everyone, admins included.
  if new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'not permitted';
  end if;

  -- Privileged identity/assignment fields: admins only.
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.university_id is distinct from old.university_id
       or new.level_id is distinct from old.level_id
       or new.semester_id is distinct from old.semester_id
       or new.is_active is distinct from old.is_active then
      raise exception 'not permitted';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. content_materials: explicit upload lifecycle
-- ---------------------------------------------------------------------------

alter table public.content_materials
  add column upload_status text not null default 'none'
  check (upload_status in ('none', 'pending', 'ready', 'failed'));

-- Backfill: rows that already have a stored file are "ready".
update public.content_materials set upload_status = 'ready' where storage_path is not null;

-- Replace the old "file or article" rule with the full lifecycle invariant.
alter table public.content_materials
  drop constraint content_materials_file_or_article_chk;

alter table public.content_materials
  add constraint content_materials_upload_lifecycle_chk check (
    -- article attached (always allowed; file may or may not exist)
    article is not null
    -- a finished file upload
    or (upload_status = 'ready' and storage_path is not null)
    -- an upload in flight or failed: no path yet, never publishable
    or (upload_status in ('pending', 'failed') and storage_path is null and status = 'draft')
  );

-- Storage paths are always UUID-based, never raw filenames.
alter table public.content_materials
  add constraint content_materials_storage_path_format_chk check (
    storage_path is null
    or storage_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(pdf|jpg|jpeg|png|webp)$'
  );

-- Students must never see a material whose file was never actually uploaded.
drop policy content_materials_select on public.content_materials;
create policy content_materials_select on public.content_materials for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and (upload_status = 'ready' or article is not null)
      and exists (
        select 1
        from public.content_items i
        join public.courses c on c.id = i.course_id
        where i.id = content_materials.content_item_id
          and i.status = 'published'
          and c.status = 'published'
          and c.semester_id = public.my_semester_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. material-kind ↔ file-extension consistency (defense in depth)
-- ---------------------------------------------------------------------------

create or replace function public.content_materials_kind_file_chk()
returns trigger
language plpgsql
as $$
declare
  v_code text;
  v_ext  text;
begin
  if new.storage_path is null then
    return new;
  end if;
  select code into v_code from public.material_kinds where id = new.material_kind_id;
  v_ext := lower(split_part(new.storage_path, '.', -1));
  if v_code in ('official_professor_pdf', 'student_summary_pdf') and v_ext <> 'pdf' then
    raise exception 'material kind % requires a PDF file', v_code;
  end if;
  if v_code = 'student_summary_image' and v_ext not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'material kind % requires an image file', v_code;
  end if;
  return new;
end;
$$;

create trigger content_materials_kind_file_chk_trg
  before insert or update of storage_path, material_kind_id on public.content_materials
  for each row execute function public.content_materials_kind_file_chk();

commit;
