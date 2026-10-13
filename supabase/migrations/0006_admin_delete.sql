-- 0006 — Admin delete (added on request: remove items created by mistake).
--
-- Until now no table had a DELETE policy, so nothing could be removed. This
-- grants DELETE to ADMINS ONLY on the academic hierarchy and materials.
-- Students and anonymous users still cannot delete anything.
--
-- Safety nets that remain in force:
--   * Foreign keys are ON DELETE RESTRICT: a level with semesters, a semester
--     with courses/students, a course with content items, or a content item
--     with materials CANNOT be deleted until it is empty. The app turns this
--     into a clear Arabic message.
--   * Student accounts are deleted through the Auth Admin API (service role,
--     server-side only); the profile row follows via ON DELETE CASCADE.
--   * Material files are removed from Storage by the server action; the
--     storage DELETE policy (admin only) already exists from 0001.

begin;

create policy levels_delete on public.levels for delete to authenticated
  using (public.is_admin());

create policy semesters_delete on public.semesters for delete to authenticated
  using (public.is_admin());

create policy courses_delete on public.courses for delete to authenticated
  using (public.is_admin());

create policy content_items_delete on public.content_items for delete to authenticated
  using (public.is_admin());

create policy content_materials_delete on public.content_materials for delete to authenticated
  using (public.is_admin());

commit;
