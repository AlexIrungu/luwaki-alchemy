# LUWAKI ALCHEMY

Storefront for LUWAKI ALCHEMY — 3D-printed press-on nails, sold per nail, printed to each
customer's measurements.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Paystack
npm run dev
```

## Database

Migrations are in `supabase/migrations/`, applied in order:

| File | Contents |
|---|---|
| `0001_core_schema.sql` | Catalogue, accounts, measurements, cart, orders, commissions |
| `0002_rls.sql` | Row-level security, `is_admin()`, new-user trigger |
| `0003_seed_collections.sql` | SUBLIME · OPULENCE · NOIR |
| `0004_storage.sql` | Public `product-media` bucket + admin-only write policies |

```bash
supabase link --project-ref <ref>
supabase db push
npm run db:types
```

Make yourself an admin after signing up once:

```sql
update profiles set role = 'admin' where id = '<your auth user id>';
```

## Layout

```
app/            routes, one per section of the brief's site map
components/     layout chrome, cart view, purchase controls
lib/catalogue   nail-specific vocabulary (shapes, fingers, the ten slots)
lib/cart        pure cart rules + the localStorage provider
lib/supabase    browser, server and service-role clients
supabase/       SQL migrations
```

Unbuilt sections render as a labelled `<Placeholder>` carrying the phase that owns the work.
See `CLAUDE.md` for the constraints that govern this build.
