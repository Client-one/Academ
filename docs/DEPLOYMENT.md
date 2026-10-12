# Deployment Guide — Vercel + Supabase

## 0) Prerequisites

- Node.js 20+ and npm
- A Supabase account (Free tier works)
- A GitHub account + Vercel account

## 1) Supabase project setup

1. Create a new project at https://supabase.com (choose a strong DB password, store it).
2. Open **SQL Editor** and run, in order:
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_search_normalization.sql`
   3. `supabase/migrations/0003_harden_move_item.sql`
   4. `supabase/migrations/0004_database_integrity_hardening.sql`
   5. `supabase/migrations/0005_upload_lifecycle_consistency.sql`
   6. Then `supabase/seed.sql`

   (Or use the Supabase CLI: `supabase db push` applies them in order.)
3. Verify in **Table Editor**: `levels`, `semesters`, `courses`, `content_items`,
   `material_kinds`, `content_materials`, `profiles` exist; `material_kinds`
   contains 3 rows; and `content_materials` has an `upload_status` column.

   Migration 0004 requires verification in the project's Supabase environment
   (it changes constraints/policies): after applying, confirm
   - `storage_path` accepts only UUID-based paths (`{course}/{item}/{material}.{ext}`)
   - students cannot SELECT materials with `upload_status != 'ready'` (unless an article exists)
   - `public.move_item` takes the advisory lock before row locks.

   Migration 0005 tightens the upload lifecycle: `upload_status` is now
   `none | pending | ready` (the unused `failed` state was removed; failed
   uploads roll back and delete the row). After applying, confirm
   - `upload_status = 'ready'` always implies a non-NULL `storage_path`
   - `upload_status = 'none'` implies an article exists (article-only material)
   - `pending` rows have NULL `storage_path` and stay `draft`
4. Verify in **Storage**: a **private** bucket named `content-files` exists
   (created by the migration). Never toggle it public.

## 2) Auth configuration

1. **Authentication → Providers**: keep Email enabled.
2. **Settings → Auth**: you may disable "Confirm email" since admins provision
   accounts with `email_confirm: true` anyway.
3. No public signup exists in the app — but as extra hygiene you can leave
   "Allow new users to sign up" enabled in Supabase; orphaned Auth users
   without a `profiles` row cannot log in (guards reject them) and see
   nothing. Provisioning always creates both sides atomically.

## 3) Private university-number lookup

Already handled by the migration: `app_private.student_auth_email(text)`
with `EXECUTE` granted **only** to `service_role`. No dashboard step needed.

## 4) Environment variables

Copy `.env.example` → `.env.local` for local dev, and set the same three
variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret!) |

Rules: never prefix the service key with `NEXT_PUBLIC_`, never commit real
values (`.gitignore` already excludes `.env*`), never log them.

## 5) Initial admin creation (manual, one time)

1. Supabase → Authentication → Users → **Add user** → create with a strong
   password (this is the real admin email used at `/login/admin`).
2. Copy the user's UUID, then in SQL Editor:

```sql
insert into public.profiles (id, full_name, role)
values ('<PASTE_UUID_HERE>', 'المدير العام', 'admin');
```

3. Log in at `https://your-app.vercel.app/login/admin`.

## 6) GitHub + Vercel deploy

1. Push the project to a GitHub repo (never push `.env.local`).
2. Vercel → **Add New Project** → import the repo. Framework preset: Next.js.
3. Add the three environment variables (all environments).
4. Deploy. Vercel runs `next build` automatically.

## 7) Post-deploy smoke tests

- [ ] `/login` rejects a wrong university number with a generic error
- [ ] Admin creates a student → student logs in → sees only own semester
- [ ] Student cannot open a course URL from another semester (404)
- [ ] Admin uploads a PDF → publishes → student opens it via signed link
- [ ] Student searches and gets no draft/archived results
- [ ] Deactivated student is denied immediately (session killed)
- [ ] Direct SQL as anon: `select app_private.student_auth_email('x')` → permission denied
- [ ] Upload a file whose extension/content does not match the material kind → rejected
- [ ] Publish a material whose upload is incomplete (`upload_status != 'ready'`) → rejected
- [ ] Two admins reorder the same list concurrently → both succeed, ordering stays consistent
- [ ] `/courses/<courseA>/<item-of-courseB>` → 404 (URL integrity)

## 8) Troubleshooting

- **"Invalid server environment variables"** → `SUPABASE_SERVICE_ROLE_KEY`
  missing locally or in Vercel.
- **RLS errors in admin UI** → you are not active/admin in `profiles`, or the
  migration did not run fully.
- **Upload fails** → bucket missing/private policy issue; check the migration
  applied and Storage shows `content-files` as private.


## Upload size limits (material files)

Files are uploaded through a Server Action, so three limits apply and the
SMALLEST one wins:

| Layer | Limit | Where |
|---|---|---|
| Next.js Server Action body | 1 MB default → set to 4.25 MB | `next.config.ts` (`experimental.serverActions.bodySizeLimit`) |
| Vercel Function request body | 4.5 MB (hard, not configurable; 413 `FUNCTION_PAYLOAD_TOO_LARGE`) | Vercel platform |
| Application | 4,000,000 bytes per file | `MAX_SERVER_UPLOAD_BYTES` in `lib/security/file-validation.ts` |

Raising `bodySizeLimit` alone does NOT allow larger files on Vercel. The 20 MB
policy ceiling (`MAX_FILE_BYTES`) needs a direct-to-Storage upload path
(browser → Supabase signed upload URL), which is not implemented.

Upload order: the file is uploaded to Storage first, then the
`content_materials` row is inserted once as `ready` (no row-delete rollback is
needed; the table has no DELETE policy). If the insert fails the object is
removed and the removal is verified; an object that cannot be removed is logged
as `material_orphan_file_cleanup_failed` for manual cleanup.
