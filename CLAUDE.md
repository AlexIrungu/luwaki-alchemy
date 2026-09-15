# LUWAKI ALCHEMY — Project Context

The main build for **Kent Ecommerce / LUWAKI ALCHEMY** (renamed from LUWAKI COLLECTIVE by the client, 2026-09-15): a store selling 3D-printed press-on
nails in translucent resin. Vault note: `Second Brain/Projects/Kent Ecommerce.md`.

Client: **Kent** (geometry, Rhino) + **Lucy** (brand, creative voice).
Sister repos: `../luwaki-demo` (proven 3D viewer prototype) · `Kent Design` (separate engagement).

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth +
Storage) · Paystack. Phase 2 adds GSAP + Lenis; Phase 3 ports React Three Fiber from `luwaki-demo`.
Hosting: **Vercel** — not Hostinger shared.

## The five facts that shape everything

1. **Per-single-nail pricing.** Every design carries its own price; a set of ten totals the sum of
   its slots. There is no flat set price. Money is integer KES — never a float.
2. **The cart is ten slots.** Each slot is design + shape + finger position, priced individually.
   **An empty slot blocks checkout.** This is enforced in `lib/cart/logic.ts` and by a unique index
   on `cart_items (cart_id, slot_hand, slot_finger)`.
3. **Accounts are mandatory to order.** Browsing is open to anyone. The gate exists because
   fulfilment reads the customer's nail measurements.
4. **Measurements are production data.** Ten fingers, in `measurements`. Incomplete = unfulfillable
   order, so it blocks checkout exactly as hard as an empty slot. They are **snapshotted onto the
   order** at checkout — never read live, or a later profile edit silently changes what the
   workshop prints.
5. **The catalogue grows by 30 models a month.** The admin dashboard is structural, not a nicety.

## Constraints

- **Never hardcode "nail" into the schema.** The catalogue expands past nails. Shapes, finger
  position and the 10-slot set are one category's behaviour: they live in `product_variants.options`
  (jsonb), `collections.purchase_mode`, and `lib/catalogue.ts` — never in a column name.
- **Snake_case for every Supabase field** (`unit_price_kes`, `profile_id`).
- **Tailwind v4** — no `tailwind.config.js`. Tokens are CSS variables in the `@theme` block of
  `app/globals.css`; use semantic names (`text-ink-dim`, `bg-panel`), never raw hex.
- **The palette and fonts are placeholders.** Lucy owns the brand; swap them when the sheet lands.
- **Never trust a client-side price.** The cart lives in localStorage; checkout re-prices from the
  catalogue server-side and re-runs `checkoutBlocks` before touching Paystack.
- **`SUPABASE_SERVICE_ROLE_KEY` must hold the service_role key**, not the anon key — a mismatch
  fails writes with "violates row-level security policy". Server-only; never import
  `createAdminClient` from a `"use client"` file.
- **`is_admin()` is security-definer** so RLS policies can call it without recursing into
  `profiles`. Don't inline the role check into a policy.
- **Reduced motion from day one.** The CSS block in `globals.css` is not enough for Phase 2 —
  GSAP timelines must check `prefers-reduced-motion` in JS before they start.
- **Motion vs. commerce.** Restraint lives on the product, cart and account pages. The spectacle
  belongs to the home, UNIVERSE and COLLECTIONS routes.

## Phasing (mirrors the quote)

`components/ui/Section.tsx` renders every unbuilt section as a `<Placeholder phase={1|2|3}>`, so
the shell is never mistaken for the finished site and scope stays visible.

- **Phase 1 — the store.** Every route, the 10-slot cart, accounts + measurements, Paystack,
  PRIVATE EDIT, admin dashboard, restrained motion, static imagery.
- **Phase 2 — the effects layer.** Hero morph, ENVISION pin, angled COLLECTIONS scroll, numbers
  and logo effects, UNIVERSE 1→∞, rainbow cursor. **Separately paid — never an assumed inclusion.**
- **Phase 3 — the 3D viewer.** Port `luwaki-demo`: Rhino→Draco GLB pipeline, orbit viewer, colour
  picker. Two gotchas carry over verbatim:
  - **Never use drei `<Environment preset>`** — it fetches an HDR and suspends, rendering the
    Canvas blank white outside a `<Suspense>`. Use `StudioEnvironment` from the demo.
  - **Clone materials, not just the scene** — `useGLTF` caches by URL and `Object3D.clone()`
    shares material instances, so colour changes leak between designs.

## Admin

`/admin` is guarded twice: middleware checks the role, and **every server action re-checks it
itself** — a server action is a public endpoint and does not inherit the page's protection. RLS is
the backstop under both.

- Creating a design generates its five shape variants from `SHAPES`. A design with no variant
  cannot be added to a cart, so this is never left as a step to forget.
- A variant's `price_kes` is **null by default, meaning "inherit the design's price"**. Fill it in
  only when a shape genuinely costs differently.
- `setPublished` refuses to publish a design with no on-sale shape or no imagery.
- A slug is generated once from the name and is a URL forever — don't regenerate it on rename.
- Product media is a **public** bucket: the catalogue is public and signed URLs would defeat CDN
  caching on a page showing dozens of images.
- `/admin/orders/[id]` is the workshop's print sheet. Its widths come from `orders.measurements`
  — the checkout snapshot, **never** a join to the customer's current profile.

## Payments

Lucy registered the business in September 2026; Paystack needs the verified entity, expected end
of that month. `lib/payments/provider.ts` holds a **real, complete Paystack implementation** plus a
stub that takes over when `PAYSTACK_SECRET_KEY` is absent, so the full checkout → order →
production-queue path is testable now. **Going live is setting two env vars, not a code change.**

The order of operations in `app/checkout/actions.ts` is not negotiable:

1. The browser submits **only** which variant sits on which finger. Never a price.
2. Every price is read back from the catalogue server-side, and unpublished designs are refused.
3. Measurements are re-counted server-side, then **snapshotted onto the order**.
4. The order is written as `pending_payment` (customers have no insert policy on `orders` — it is
   written on their behalf by the service-role client), then payment is initialised.
5. **Only a verified webhook moves an order to `paid`.** The webhook checks an HMAC-SHA512 of the
   raw body, refuses an amount that does not match the order total, and is guarded on
   `status = 'pending_payment'` so a replay cannot drag an in-production order backwards.

The success page also confirms directly with the provider, because a customer may never land on
it and their arrival proves nothing on its own.

**Shipping is still unscoped with the client** — `shippingKES()` in `lib/orders.ts` returns 0 and
exists so that question stays visible instead of being answered by a hardcoded number buried in
checkout. Packaging options and nail-prep add-ons are likewise placeholders.

## Don't

- Don't reach for Shopify/Woo — the 10-slot cart and per-nail pricing rule them out.
- Don't add a contact form to PRIVATE EDIT. Account required, details from the profile.
- Don't seed designs yet: the collection→design mapping is unconfirmed and "Dimonds" has to be
  settled before it becomes a URL slug.
- Don't copy the GLBs in from the demo — Kent hasn't delivered the real exports.
