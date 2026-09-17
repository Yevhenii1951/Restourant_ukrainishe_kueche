# 🇺🇦 Kalyna — Ukrainische Küche in Kassel

## Full-Stack Restaurant Website — Project Specification

> **Project type:** Educational project, maximally close to production  
> **Location:** Kassel, Germany  
> **Cuisine:** Ukrainian  
> **Languages:** Deutsch (primary), English, Українська  
> **Approach:** Hybrid — Custom business logic + Managed infrastructure

---

## 1. Project Overview

A modern, production-ready restaurant website for a Ukrainian restaurant in Kassel, Germany. The project includes a public-facing website with menu, online ordering, table reservations, an AI assistant, and a full admin panel with CMS capabilities so the restaurant owner can manage all content independently.

### Core Goals

- Modern, fast, mobile-first website
- Full online ordering system (pickup & delivery)
- Table reservation system
- Admin panel / CMS for content management
- AI assistant for customer support
- DSGVO / GDPR compliant
- Local SEO optimized for Kassel
- Accessibility (WCAG 2.1 AA)
- Multi-language (DE / EN / UK)

---

## 2. Technology Stack

### 2.1 Core Framework

| Layer         | Technology                  | Purpose                             |
| ------------- | --------------------------- | ----------------------------------- |
| Framework     | **Next.js 15 (App Router)** | SSR/SSG, API routes, Server Actions |
| Language      | **TypeScript**              | Type safety                         |
| UI Library    | **React 19**                | Component-based UI                  |
| Styling       | **Tailwind CSS 4**          | Utility-first CSS                   |
| UI Components | **shadcn/ui**               | Accessible, customizable components |
| Forms         | **React Hook Form + Zod**   | Form handling + validation          |

### 2.2 Infrastructure (Managed Services)

| Service        | Technology                           | Purpose                       |
| -------------- | ------------------------------------ | ----------------------------- |
| Database       | **Supabase (PostgreSQL, EU region)** | Data storage, Auth, Storage   |
| Authentication | **Supabase Auth**                    | User management, roles        |
| File Storage   | **Supabase Storage**                 | Menu images, certificates     |
| Payments       | **Stripe** (test mode)               | Online payments               |
| Email          | **Resend** or **Brevo**              | Transactional emails          |
| Maps           | **Leaflet + OpenStreetMap**          | Location display (DSGVO-safe) |
| AI             | **Vercel AI SDK + OpenAI**           | AI assistant                  |
| Vector Search  | **Supabase pgvector**                | RAG for AI assistant          |
| Analytics      | **Plausible** or **Umami**           | Privacy-friendly analytics    |

### 2.3 Development & Quality

| Tool          | Technology              | Purpose                |
| ------------- | ----------------------- | ---------------------- |
| Testing       | **Vitest + Playwright** | Unit + E2E tests       |
| Accessibility | **axe-core**            | A11y testing           |
| Linting       | **ESLint + Prettier**   | Code quality           |
| Performance   | **Lighthouse CI**       | Performance monitoring |
| i18n          | **next-intl**           | Internationalization   |
| Git           | **GitHub**              | Version control        |

### 2.4 Deployment

| Option      | Platform                   | Use Case                      |
| ----------- | -------------------------- | ----------------------------- |
| Primary     | **Vercel**                 | Fast deploy, preview branches |
| Alternative | **Hetzner Cloud + Docker** | EU hosting, more control      |
| Database    | **Supabase EU**            | PostgreSQL in EU region       |

---

## 3. Architecture Principles

### 3.1 Hybrid Approach

```txt
┌─────────────────────────────────────────────────────┐
│                   CUSTOM (Your Code)                 │
├─────────────────────────────────────────────────────┤
│  • Public website (pages, layout, SEO)              │
│  • Menu system (categories, dishes, allergens)      │
│  • Shopping cart logic                              │
│  • Order processing                                 │
│  • Reservation system                               │
│  • Admin panel / CMS                                │
│  • AI assistant integration                         │
│  • Business rules (delivery zones, hours, pricing)  │
│  • Email templates                                  │
│  • i18n content                                     │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│              MANAGED (Third-party Services)          │
├─────────────────────────────────────────────────────┤
│  • Supabase — Database, Auth, Storage, pgvector     │
│  • Stripe — Payment processing                      │
│  • Resend/Brevo — Email delivery                    │
│  • OpenAI — AI model                                │
│  • Plausible — Analytics                            │
│  • Vercel/Hetzner — Hosting                         │
└─────────────────────────────────────────────────────┘
```

### 3.2 Key Rules

1. **All business logic lives in Next.js Server Actions / Route Handlers** — not in client-side code or directly in Supabase RLS policies.
2. **Supabase is infrastructure, not the application** — the app should be portable.
3. **Never store card data** — use Stripe Checkout/Payment Element.
4. **Never send raw PII to AI** — pseudonymize before sending.
5. **All forms validated with Zod** on both client and server.
6. **Prices stored in cents** (integer) to avoid floating-point issues.

---

## 4. Project Structure

```txt
kalyna-kassel/
├── app/
│   ├── [locale]/                    # i18n routes: /de, /en, /uk
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Startseite (Home)
│   │   ├── speisekarte/
│   │   │   └── page.tsx             # Menu
│   │   ├── mittagstisch/
│   │   │   └── page.tsx             # Lunch menu
│   │   ├── ueber-uns/
│   │   │   └── page.tsx             # About us
│   │   ├── reservierung/
│   │   │   └── page.tsx             # Table reservation
│   │   ├── bestellen/
│   │   │   └── page.tsx             # Online order (menu + cart)
│   │   ├── warenkorb/
│   │   │   └── page.tsx             # Cart
│   │   ├── kasse/
│   │   │   └── page.tsx             # Checkout
│   │   ├── bestellung/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Order confirmation/tracking
│   │   ├── catering/
│   │   │   └── page.tsx             # Catering request
│   │   ├── gutscheine/
│   │   │   └── page.tsx             # Gift certificates
│   │   ├── events/
│   │   │   └── page.tsx             # Events
│   │   ├── galerie/
│   │   │   └── page.tsx             # Photo gallery
│   │   ├── kontakt/
│   │   │   └── page.tsx             # Contact
│   │   ├── anfahrt/
│   │   │   └── page.tsx             # Directions
│   │   ├── faq/
│   │   │   └── page.tsx             # FAQ
│   │   ├── impressum/
│   │   │   └── page.tsx             # Legal notice
│   │   ├── datenschutz/
│   │   │   └── page.tsx             # Privacy policy
│   │   └── agb/
│   │       └── page.tsx             # Terms & conditions
│   │
│   ├── admin/                       # Admin panel
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard
│   │   ├── menu/
│   │   │   ├── page.tsx             # Menu items list
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Edit menu item
│   │   ├── categories/
│   │   │   └── page.tsx             # Categories management
│   │   ├── orders/
│   │   │   ├── page.tsx             # Orders list
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Order details
│   │   ├── reservations/
│   │   │   └── page.tsx             # Reservations calendar
│   │   ├── pages/
│   │   │   └── page.tsx             # CMS: edit page content
│   │   ├── settings/
│   │   │   └── page.tsx             # Restaurant settings
│   │   └── users/
│   │       └── page.tsx             # User management
│   │
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   └── ai/
│   │       └── chat/
│   │           └── route.ts
│   │
│   └── globals.css
│
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── layout/                      # Header, Footer, Navigation
│   ├── menu/                        # MenuCard, MenuFilters, AllergenBadge
│   ├── cart/                        # CartItem, CartSummary
│   ├── booking/                     # BookingForm, TimeSlotPicker
│   ├── admin/                       # AdminTable, StatusBadge
│   ├── ai/                          # AIChat, ChatBubble
│   └── shared/                      # Button, Input, Map
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   └── middleware.ts            # Auth middleware
│   ├── stripe.ts                    # Stripe helpers
│   ├── email.ts                     # Email sending
│   ├── ai.ts                        # AI assistant logic
│   ├── validation.ts                # Zod schemas
│   ├── utils.ts                     # Utility functions
│   └── constants.ts                 # App constants
│
├── actions/                         # Server Actions
│   ├── menu.ts                      # Menu CRUD actions
│   ├── cart.ts                      # Cart actions
│   ├── orders.ts                    # Order actions
│   ├── reservations.ts              # Reservation actions
│   ├── settings.ts                  # Settings actions
│   └── content.ts                   # CMS content actions
│
├── types/
│   └── index.ts                     # TypeScript types
│
├── messages/                        # i18n translations
│   ├── de.json
│   ├── en.json
│   └── uk.json
│
├── public/
│   ├── fonts/                       # Self-hosted fonts
│   ├── images/                      # Static images
│   └── favicon.ico
│
├── supabase/
│   ├── migrations/                  # DB migrations
│   └── seed.ts                      # Seed data
│
├── tests/
│   ├── unit/                        # Vitest unit tests
│   └── e2e/                         # Playwright E2E tests
│
├── .env.local                       # Environment variables
├── .env.example                     # Example env file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Database Schema

### 5.1 Tables

```sql
-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_uk TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  description_uk TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_uk TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  description_uk TEXT,
  price_cents INT NOT NULL,           -- Price in cents (e.g., 890 = 8.90€)
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  allergens TEXT[] DEFAULT '{}',      -- Array of allergen codes
  additives TEXT[] DEFAULT '{}',      -- Array of additive codes
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RESERVATIONS
-- ============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,                 -- e.g., '19:00'
  guests INT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',      -- pending, confirmed, cancelled, completed, no_show
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,  -- e.g., 'KLN-2025-0001'
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfillment TEXT NOT NULL,          -- pickup, delivery
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_notes TEXT,                 -- floor, intercom, etc.
  scheduled_at TIMESTAMPTZ,           -- requested time
  notes TEXT,
  subtotal_cents INT NOT NULL,
  delivery_cents INT DEFAULT 0,
  total_cents INT NOT NULL,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, failed, refunded
  payment_method TEXT,                -- stripe, cash_on_pickup, cash_on_delivery
  stripe_session_id TEXT,
  status TEXT DEFAULT 'new',          -- new, accepted, preparing, ready, out_for_delivery, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name_snapshot TEXT NOT NULL,         -- Name at time of order
  price_cents INT NOT NULL,           -- Price at time of order
  quantity INT NOT NULL,
  notes TEXT
);

-- ============================================
-- CMS PAGES (editable content)
-- ============================================
CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- e.g., 'home', 'about', 'faq'
  title_de TEXT NOT NULL,
  title_en TEXT,
  title_uk TEXT,
  content_de JSONB,                   -- Structured content blocks
  content_en JSONB,
  content_uk JSONB,
  meta_title_de TEXT,
  meta_description_de TEXT,
  published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RESTAURANT SETTINGS
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Settings keys:
-- 'opening_hours'     → { mon: {open: '11:00', close: '22:00'}, ... }
-- 'delivery_zones'    → [{ name, zip_codes[], price_cents, min_order_cents }]
-- 'contact'           → { phone, email, address, lat, lng }
-- 'social_links'      → { instagram, facebook, google }
-- 'min_order_cents'   → 1500
-- 'free_delivery_from_cents' → 3000
-- 'max_reservation_guests' → 12
-- 'is_online_order_enabled' → true
-- 'is_reservation_enabled' → true

-- ============================================
-- DELIVERY ZONES
-- ============================================
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zip_codes TEXT[] NOT NULL,
  price_cents INT NOT NULL,
  min_order_cents INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GIFT CERTIFICATES
-- ============================================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  value_cents INT NOT NULL,
  remaining_cents INT NOT NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  recipient_name TEXT,
  message TEXT,
  status TEXT DEFAULT 'active',       -- active, used, expired
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CATERING REQUESTS
-- ============================================
CREATE TABLE catering_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_date DATE,
  guests INT,
  budget_cents INT,
  message TEXT,
  status TEXT DEFAULT 'new',          -- new, contacted, quoted, confirmed, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MENU EMBEDDINGS (for AI RAG)
-- ============================================
CREATE TABLE menu_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,              -- Text that was embedded
  embedding VECTOR(1536)              -- OpenAI embedding dimension
);

-- Enable vector similarity search
CREATE INDEX ON menu_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 5.2 Seed Data Example

```typescript
// supabase/seed.ts

const categories = [
	{
		slug: 'suppen',
		name_de: 'Suppen',
		name_en: 'Soups',
		name_uk: 'Супи',
		sort_order: 1,
	},
	{
		slug: 'hauptgerichte',
		name_de: 'Hauptgerichte',
		name_en: 'Main Courses',
		name_uk: 'Основні страви',
		sort_order: 2,
	},
	{
		slug: 'vegetarisch',
		name_de: 'Vegetarisch',
		name_en: 'Vegetarian',
		name_uk: 'Вегетаріанське',
		sort_order: 3,
	},
	{
		slug: 'beilagen',
		name_de: 'Beilagen',
		name_en: 'Sides',
		name_uk: 'Гарніри',
		sort_order: 4,
	},
	{
		slug: 'salate',
		name_de: 'Salate',
		name_en: 'Salads',
		name_uk: 'Салати',
		sort_order: 5,
	},
	{
		slug: 'desserts',
		name_de: 'Desserts',
		name_en: 'Desserts',
		name_uk: 'Десерти',
		sort_order: 6,
	},
	{
		slug: 'getraenke',
		name_de: 'Getränke',
		name_en: 'Drinks',
		name_uk: 'Напої',
		sort_order: 7,
	},
	{
		slug: 'mittagstisch',
		name_de: 'Mittagstisch',
		name_en: 'Lunch Menu',
		name_uk: 'Бізнес-ланч',
		sort_order: 8,
	},
]

const menuItems = [
	{
		slug: 'borschtsch',
		category_slug: 'suppen',
		name_de: 'Borschtsch',
		name_en: 'Borscht',
		name_uk: 'Борщ',
		description_de:
			'Ukrainische Rote-Bete-Suppe mit Fleisch, Sauerrahm und frischem Dill',
		price_cents: 790,
		is_popular: true,
		allergens: ['milk', 'celery'],
		tags: ['beliebt', 'hausgemacht'],
	},
	{
		slug: 'vegetarischer-borschtsch',
		category_slug: 'suppen',
		name_de: 'Vegetarischer Borschtsch',
		name_en: 'Vegetarian Borscht',
		name_uk: 'Вегетаріанський борщ',
		description_de: 'Rote-Bete-Suppe ohne Fleisch, mit Sauerrahm',
		price_cents: 690,
		is_vegetarian: true,
		allergens: ['milk', 'celery'],
	},
	{
		slug: 'wareniki-kartoffeln',
		category_slug: 'hauptgerichte',
		name_de: 'Wareniki mit Kartoffeln',
		name_en: 'Varenyky with Potatoes',
		name_uk: 'Вареники з картоплею',
		description_de:
			'Ukrainische Teigtaschen mit Kartoffelfüllung und Röstzwiebeln',
		price_cents: 990,
		is_vegetarian: true,
		is_popular: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'wareniki-kirschen',
		category_slug: 'desserts',
		name_de: 'Wareniki mit Kirschen',
		name_en: 'Varenyky with Cherries',
		name_uk: 'Вареники з вишнею',
		description_de: 'Süße Teigtaschen mit Kirschfüllung und Sauerrahm',
		price_cents: 890,
		is_vegetarian: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'deruny',
		category_slug: 'hauptgerichte',
		name_de: 'Deruny',
		name_en: 'Potato Pancakes',
		name_uk: 'Деруни',
		description_de: 'Kartoffelpuffer mit Sauerrahm und frischem Dill',
		price_cents: 850,
		is_vegetarian: true,
		is_popular: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'kiewer-kotelett',
		category_slug: 'hauptgerichte',
		name_de: 'Kiewer Kotelett',
		name_en: 'Chicken Kyiv',
		name_uk: 'Котлета по-київськи',
		description_de:
			'Hähnchenkotelett mit Kräuterbutter, paniert und goldbraun gebraten',
		price_cents: 1390,
		is_popular: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'banusch',
		category_slug: 'hauptgerichte',
		name_de: 'Banusch',
		name_en: 'Banosh',
		name_uk: 'Банош',
		description_de: 'Maisbrei mit Käse und Speck (oder Pilzen auf Wunsch)',
		price_cents: 1090,
		allergens: ['milk'],
	},
	{
		slug: 'holubzi',
		category_slug: 'hauptgerichte',
		name_de: 'Holubzi',
		name_en: 'Cabbage Rolls',
		name_uk: 'Голубці',
		description_de: 'Kohlrouladen mit Reis und Hackfleisch in Tomatensauce',
		price_cents: 1190,
		allergens: ['celery'],
	},
	{
		slug: 'syrnyky',
		category_slug: 'desserts',
		name_de: 'Syrnyky',
		name_en: 'Quark Pancakes',
		name_uk: 'Сирники',
		description_de:
			'Quarkpfannkuchen mit Sauerrahm oder hausgemachter Marmelade',
		price_cents: 690,
		is_vegetarian: true,
		is_popular: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'medivnyk',
		category_slug: 'desserts',
		name_de: 'Medivnyk',
		name_en: 'Honey Cake',
		name_uk: 'Медівник',
		description_de: 'Ukrainischer Honigkuchen mit Sauerrahm-Creme',
		price_cents: 490,
		is_vegetarian: true,
		allergens: ['gluten', 'eggs', 'milk'],
	},
	{
		slug: 'uzvar',
		category_slug: 'getraenke',
		name_de: 'Uzvar',
		name_en: 'Uzvar',
		name_uk: 'Узвар',
		description_de: 'Ukrainisches Kompott aus getrockneten Früchten',
		price_cents: 350,
		is_vegetarian: true,
		is_vegan: true,
		allergens: [],
	},
	{
		slug: 'kwas',
		category_slug: 'getraenke',
		name_de: 'Kwas',
		name_en: 'Kvass',
		name_uk: 'Квас',
		description_de: 'Hausgemachtes fermentiertes Brotgetränk',
		price_cents: 350,
		is_vegetarian: true,
		is_vegan: true,
		allergens: ['gluten'],
	},
]

const deliveryZones = [
	{
		name: 'Kassel Mitte',
		zip_codes: ['34117', '34119', '34121'],
		price_cents: 290,
		min_order_cents: 1500,
	},
	{
		name: 'Kassel Nord',
		zip_codes: ['34125', '34127', '34128'],
		price_cents: 390,
		min_order_cents: 2000,
	},
	{
		name: 'Kassel Süd',
		zip_codes: ['34123', '34130', '34131'],
		price_cents: 390,
		min_order_cents: 2000,
	},
	{
		name: 'Kassel Ost',
		zip_codes: ['34123', '34125'],
		price_cents: 390,
		min_order_cents: 2000,
	},
	{
		name: 'Baunatal',
		zip_codes: ['34225'],
		price_cents: 590,
		min_order_cents: 3000,
	},
]

const settings = [
	{
		key: 'opening_hours',
		value: {
			monday: { open: '11:00', close: '22:00', is_open: true },
			tuesday: { open: '11:00', close: '22:00', is_open: true },
			wednesday: { open: '11:00', close: '22:00', is_open: true },
			thursday: { open: '11:00', close: '22:00', is_open: true },
			friday: { open: '11:00', close: '23:00', is_open: true },
			saturday: { open: '12:00', close: '23:00', is_open: true },
			sunday: { open: '12:00', close: '21:00', is_open: true },
		},
	},
	{
		key: 'contact',
		value: {
			restaurant_name: 'Kalyna — Ukrainische Küche',
			phone: '+49 561 1234567',
			email: 'info@kalyna-kassel.de',
			address_street: 'Friedrich-Ebert-Straße 42',
			address_zip: '34117',
			address_city: 'Kassel',
			lat: 51.3127,
			lng: 9.4797,
		},
	},
	{ key: 'min_order_cents', value: 1500 },
	{ key: 'free_delivery_from_cents', value: 3000 },
	{ key: 'max_reservation_guests', value: 12 },
	{ key: 'is_online_order_enabled', value: true },
	{ key: 'is_reservation_enabled', value: true },
]
```

---

## 6. Public Pages — Detailed Specification

### 6.1 Startseite (Home)

| Block          | Content                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| Hero           | Large food photo, headline "Authentische ukrainische Küche in Kassel", CTA buttons |
| USP            | 4 icons: Hausgemacht / Frische Zutaten / Vegetarische Optionen / Lieferung         |
| Popular dishes | 3-4 cards from `is_popular` items                                                  |
| About teaser   | Short text + photo, link to Über uns                                               |
| Opening hours  | Today's hours highlighted                                                          |
| Location       | Mini map + address                                                                 |
| Reviews        | 3 testimonials                                                                     |
| FAQ teaser     | 3-4 top questions                                                                  |
| CTA banner     | "Jetzt reservieren" or "Online bestellen"                                          |

### 6.2 Speisekarte (Menu)

| Feature     | Details                                                |
| ----------- | ------------------------------------------------------ |
| Categories  | Sidebar or top tabs                                    |
| Filters     | Vegetarisch, Vegan, Glutenfrei, Scharf, Beliebt        |
| Search      | Full-text search across names and descriptions         |
| Cards       | Image, name, description, price, allergen badges, tags |
| Add to cart | Button on each card (if online order enabled)          |
| Allergens   | Small letter codes with tooltip/legend                 |

### 6.3 Reservierung (Reservation)

| Feature      | Details                                            |
| ------------ | -------------------------------------------------- |
| Date picker  | Only future dates, respects opening hours          |
| Time slots   | Generated based on opening hours, 30-min intervals |
| Guests       | 1-12 (configurable in settings)                    |
| Form         | Name, email, phone, notes                          |
| Validation   | Server-side check for availability                 |
| Confirmation | Page + email with booking details                  |
| Cancellation | Link in email to cancel                            |

### 6.4 Online Bestellen (Order)

| Feature        | Details                                            |
| -------------- | -------------------------------------------------- |
| Menu browse    | Same as Speisekarte but with add-to-cart           |
| Cart           | Persistent (localStorage + server sync)            |
| Fulfillment    | Pickup or Delivery toggle                          |
| Delivery check | Enter PLZ → check zone, show fee                   |
| Time selection | "So schnell wie möglich" or specific time          |
| Checkout       | Name, phone, email, address (if delivery), payment |
| Payment        | Stripe Checkout, Cash on pickup, Cash on delivery  |
| Confirmation   | Order number, status tracking page                 |

### 6.5 AI Assistent (Chat Widget)

| Feature         | Details                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| Position        | Fixed bottom-right corner                                                                   |
| Capabilities    | Answer questions about menu, hours, delivery, allergens                                     |
| Recommendations | Suggest dishes based on preferences                                                         |
| Cart actions    | Add items to cart via chat                                                                  |
| Booking         | Help create reservation draft                                                               |
| RAG             | Uses pgvector to search menu items semantically                                             |
| Disclaimer      | "KI-Assistent kann Fehler machen. Maßgeblich sind Speisekarte und Angaben des Restaurants." |
| DSGVO           | No PII sent to AI; pseudonymized context only                                               |

---

## 7. Admin Panel Specification

### 7.1 Access Control

| Role      | Permissions                                         |
| --------- | --------------------------------------------------- |
| `ADMIN`   | Full access: everything                             |
| `MANAGER` | Orders, reservations, menu, settings, content       |
| `STAFF`   | View orders, change order status, view reservations |

### 7.2 Dashboard

- Today's orders (count + revenue)
- Today's reservations
- Pending actions (new orders, new reservations)
- Popular dishes this week
- Revenue chart (last 7/30 days)

### 7.3 Menu Management (CMS)

- List all items with filters (category, available, popular)
- Create/edit/delete items
- Upload images (→ Supabase Storage)
- Set allergens, tags, dietary flags
- Toggle availability
- Set sort order
- Bulk actions (enable/disable all in category)

### 7.4 Categories Management (CMS)

- Create/edit/delete categories
- Set translations (DE/EN/UK)
- Reorder with drag & drop

### 7.5 Orders Management

- List with filters (status, date, fulfillment type)
- Detail view with items, customer info, address
- Status transitions: New → Accepted → Preparing → Ready → Completed/Cancelled
- Print receipt
- Send status update email to customer

### 7.6 Reservations Management

- Calendar view (week/month)
- List view with filters
- Confirm / Cancel / Mark as No-Show
- Export to CSV

### 7.7 CMS Pages (Content Management)

The restaurant owner can edit:

| Page         | Editable Fields                          |
| ------------ | ---------------------------------------- |
| Home         | Hero text, USP items, about teaser       |
| About        | Full text, team photos, story            |
| FAQ          | Questions and answers                    |
| Events       | Event list with date, title, description |
| Catering     | Description text                         |
| Gallery      | Photo upload and captions                |
| Mittagstisch | Weekly lunch menu                        |

Content stored as structured JSON in `cms_pages` table, editable via rich text / block editor in admin.

### 7.8 Settings

- Opening hours (per day, with special hours for holidays)
- Delivery zones (add/edit/remove ZIP codes, prices)
- Contact information
- Minimum order amount
- Free delivery threshold
- Toggle online ordering on/off
- Toggle reservations on/off
- Social media links

### 7.9 Users

- View all users
- Change roles
- Deactivate accounts

---

## 8. Email Templates

| Email                    | Trigger               | Recipient        |
| ------------------------ | --------------------- | ---------------- |
| Reservation confirmation | Reservation created   | Customer         |
| Reservation cancelled    | Reservation cancelled | Customer         |
| Order confirmation       | Order placed          | Customer         |
| Order status update      | Status changed        | Customer         |
| New order alert          | Order placed          | Admin/Restaurant |
| New reservation alert    | Reservation created   | Admin/Restaurant |
| Catering request         | Form submitted        | Admin/Restaurant |
| Contact form             | Form submitted        | Admin/Restaurant |

**Implementation:** React Email templates sent via Resend/Brevo API.

---

## 9. AI Assistant — Technical Details

### 9.1 System Prompt

```txt
You are a helpful assistant for "Kalyna — Ukrainische Küche" restaurant in Kassel, Germany.
You help customers with:
- Menu questions (dishes, ingredients, allergens, prices)
- Recommendations based on preferences
- Opening hours and location
- Delivery zones and fees
- Table reservations
- General restaurant information

Rules:
- Always respond in the same language as the user
- Be friendly and professional
- If unsure, say you don't know and suggest contacting the restaurant
- Never invent dishes or prices
- Always include disclaimer about possible errors
- Current time: {current_time}
- Today's opening hours: {today_hours}
```

### 9.2 Tools (Function Calling)

```typescript
const tools = [
	{
		name: 'searchMenu',
		description:
			'Search menu items by name, description, or dietary preference',
		parameters: { query: 'string', filters: 'object' },
	},
	{
		name: 'checkReservationAvailability',
		description:
			'Check if a table is available for a given date, time, and guest count',
		parameters: { date: 'string', time: 'string', guests: 'number' },
	},
	{
		name: 'getDeliveryFee',
		description: 'Calculate delivery fee for a given postal code',
		parameters: { zipCode: 'string' },
	},
	{
		name: 'getOpeningHours',
		description: 'Get restaurant opening hours',
		parameters: { date: 'string (optional)' },
	},
]
```

### 9.3 RAG Flow

1. User sends message
2. Generate embedding for user message (OpenAI `text-embedding-3-small`)
3. Search `menu_embeddings` table for similar items (cosine similarity)
4. Include top-3 results as context in prompt
5. Generate response with tool calling
6. Return response + suggested actions

---

## 10. SEO & Local Search

### 10.1 Target Keywords

- ukrainisches Restaurant Kassel
- ukrainische Küche Kassel
- Borschtsch Kassel
- Wareniki Kassel
- ukrainisch essen Kassel
- ukrainische Lieferung Kassel
- ukrainisches Catering Kassel

### 10.2 Technical SEO

- `sitemap.xml` (auto-generated)
- `robots.txt`
- Canonical URLs
- Meta titles and descriptions (per page, per language)
- Open Graph tags
- Twitter cards
- Image `alt` attributes
- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`)
- Fast loading (< 2s LCP)

### 10.3 Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Kalyna — Ukrainische Küche",
  "servesCuisine": "Ukrainian",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Friedrich-Ebert-Straße 42",
    "addressLocality": "Kassel",
    "postalCode": "34117",
    "addressCountry": "DE"
  },
  "telephone": "+49 561 1234567",
  "url": "https://kalyna-kassel.de",
  "acceptsReservations": true,
  "priceRange": "€€",
  "openingHoursSpecification": [...]
}
```

---

## 11. DSGVO / GDPR Compliance

| Requirement          | Implementation                                       |
| -------------------- | ---------------------------------------------------- |
| Impressum            | Dedicated page with all legal info                   |
| Datenschutzerklärung | Detailed privacy policy                              |
| Cookie consent       | Minimal cookies; consent banner only if needed       |
| Fonts                | Self-hosted (no Google Fonts CDN)                    |
| Maps                 | Leaflet + OpenStreetMap (no Google Maps)             |
| Analytics            | Plausible (no cookies, no personal data)             |
| Data minimization    | Only collect what's needed for order/reservation     |
| Data deletion        | Users can request deletion                           |
| AI disclosure        | Clear notice that AI is used                         |
| Server location      | Supabase EU region, Hetzner (Germany)                |
| SSL                  | HTTPS everywhere                                     |
| Contact form         | Checkbox "Ich habe die Datenschutzerklärung gelesen" |

---

## 12. Accessibility (WCAG 2.1 AA)

- Semantic HTML structure
- Skip navigation link ("Zum Inhalt springen")
- Visible focus indicators
- Keyboard navigation for all interactive elements
- Sufficient color contrast (4.5:1 for text)
- Image alt text
- Form labels and error messages
- ARIA attributes where needed
- Screen reader testing
- Minimum touch target size (44x44px)

---

## 13. Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
AUTH_SECRET=your-random-secret-here

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=Kalyna <info@kalyna-kassel.de>

# AI
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=de
```

---

## 14. Development Phases

### Phase 1: Foundation (Week 1)

- [ ] Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- [ ] Set up Supabase project (EU region)
- [ ] Create database schema + migrations
- [ ] Seed initial data
- [ ] Set up i18n with next-intl (DE/EN/UK)
- [ ] Build layout (header, footer, navigation)
- [ ] Create Impressum and Datenschutz pages

### Phase 2: Menu & Content (Week 2)

- [ ] Build Speisekarte page with categories and filters
- [ ] Create menu item cards with allergen badges
- [ ] Build Über uns page
- [ ] Build Kontakt page with Leaflet map
- [ ] Build FAQ page
- [ ] Set up Supabase Storage for images

### Phase 3: Reservation System (Week 3)

- [ ] Build reservation form with date/time picker
- [ ] Implement availability checking logic
- [ ] Create server action for reservation creation
- [ ] Send confirmation email
- [ ] Build admin reservation calendar

### Phase 4: Online Ordering (Week 4)

- [ ] Build shopping cart (add, remove, quantity, persistence)
- [ ] Build checkout flow (pickup/delivery, address, time)
- [ ] Implement delivery zone checking
- [ ] Calculate totals (subtotal, delivery, total)
- [ ] Create order in database
- [ ] Send order confirmation email
- [ ] Build order tracking page

### Phase 5: Payments (Week 5)

- [ ] Integrate Stripe Checkout
- [ ] Handle Stripe webhooks
- [ ] Update order payment status
- [ ] Add cash payment options
- [ ] Test all payment flows

### Phase 6: Admin Panel (Week 6)

- [ ] Build admin layout with sidebar
- [ ] Implement authentication + role-based access
- [ ] Build dashboard with stats
- [ ] Build menu management (CRUD)
- [ ] Build order management (list, detail, status changes)
- [ ] Build reservation management
- [ ] Build settings page
- [ ] Build CMS pages editor

### Phase 7: AI Assistant (Week 7)

- [ ] Generate menu embeddings (pgvector)
- [ ] Build chat UI component
- [ ] Implement AI chat API route
- [ ] Add function calling (search menu, check availability)
- [ ] Add RAG for menu search
- [ ] Test and refine responses

### Phase 8: Polish & Deploy (Week 8)

- [ ] SEO optimization (meta, sitemap, structured data)
- [ ] Accessibility audit and fixes
- [ ] Performance optimization (Lighthouse 90+)
- [ ] E2E tests for critical flows
- [ ] Mobile testing
- [ ] Deploy to Vercel
- [ ] Configure production domain
- [ ] Write README with demo credentials

---

## 15. Demo Credentials

```txt
Admin Panel:
  Email: admin@kalyna-kassel.de
  Password: demo-admin-123

Manager:
  Email: manager@kalyna-kassel.de
  Password: demo-manager-123

Test Payment (Stripe):
  Card: 4242 4242 4242 4242
  Expiry: any future date
  CVC: any 3 digits
```

---

## 16. Performance Targets

| Metric                    | Target |
| ------------------------- | ------ |
| Lighthouse Performance    | 90+    |
| Lighthouse Accessibility  | 95+    |
| Lighthouse Best Practices | 95+    |
| Lighthouse SEO            | 100    |
| First Contentful Paint    | < 1.5s |
| Largest Contentful Paint  | < 2.5s |
| Time to Interactive       | < 3.5s |
| Cumulative Layout Shift   | < 0.1  |

---

## 17. What NOT to Build (for MVP)

These features can be added later but are not essential for the first version:

- User accounts / customer profiles
- Order history
- Loyalty program
- Blog / News section
- Multi-restaurant support
- Mobile app
- Real-time order tracking on map
- Table QR code ordering
- Inventory management
- Supplier ordering
- Advanced reporting
- A/B testing
- Push notifications

---

## 18. References & Inspiration

- Modern restaurant websites: Noma, Nobelhart & Schmutzig
- German restaurant standards: Lieferando, Wolt UX patterns
- Ukrainian cuisine presentation: authentic but modern
- shadcn/ui components for clean admin interfaces
- Stripe Checkout for German market
- next-intl for i18n best practices

---

## 19. Quick Start Commands

```bash
# Create project
npx create-next-app@latest kalyna-kassel --typescript --tailwind --app --src-dir=false

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
npm install next-intl
npm install zod react-hook-form @hookform/resolvers
npm install react-email @react-email/components resend
npm install leaflet react-leaflet
npm install ai @ai-sdk/openai
npm install date-fns
npm install lucide-react
npm install -D vitest @testing-library/react playwright @axe-core/playwright

# Initialize shadcn/ui
npx shadcn@latest init

# Add shadcn components
npx shadcn@latest add button card input select dialog sheet tabs table badge dropdown-menu calendar popover form toast

# Run development server
npm run dev

# Run tests
npm run test        # Vitest
npm run test:e2e    # Playwright
```

---

_Document version: 1.0_  
_Last updated: 2025_  
_Project: Kalyna — Ukrainische Küche Kassel_

---

CODEX SDD-TDD
Готов полный SDD-пакет для передачи другой модели. Реализацию приложения я не начинал.

Главные точки входа:

- Project AGENTS.md (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/AGENTS.md)
- SDD index (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/docs/sdd/README.md)
- Business specification (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/docs/sdd/spec.md)
- Implementation plan (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/docs/sdd/implementation-plan.md)
- Ticket index (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/docs/sdd/tickets/README.md)
- Master prompt (1_FullStack/1_DEVELOPMENT_SDD/06_PROJECTS/Restourant_ukrainishe_kueche/docs/sdd/master-implementation-prompt.md)

Подготовлено:

- 28 vertical-slice тикетов KLN-001–KLN-028;
- требования с идентификаторами FR, NFR, UX, AC;
- архитектурные границы и data flows;
- точные бизнес-правила;
- order/payment/reservation/voucher state machines;
- логическая схема БД, индексы, grants и RLS;
- API и Server Action contracts;
- RBAC-матрица;
- threat model;
- TDD и test-database fuse;
- 9 критических браузерных сценариев;
- German legal/privacy checklist;
- WCAG 2.2 AA;
- local SEO;
- typed CMS;
- дизайн-направление;
- реестр старых assets;
- AI tools, ограничения, бюджет и пятидневное хранение;
- deterministic demo seed;
- handover template.

Ключевые решения:

- Next.js 16 + React 19.2 + Tailwind 4;
- Supabase с SQL migrations, без Prisma;
- guest checkout, клиентских аккаунтов нет;
- pickup и доставка по PLZ;
- ручное подтверждение заказов и бронирований;
- реальные столы и защита от двойного бронирования;
- Stripe Checkout в test mode;
- только полный refund;
- AI только read-only, без pgvector;
- DE/EN/UK, немецкий fallback;
- Brevo через адаптер;
- отдельные development/test/production environments;
- commit и push после каждого тикета, PR открываете вы.

Секреты из Oma Netz не использовались. В SDD прямо запрещено копировать чужие ключи; оттуда учтён только общий streaming-подход. Старое удаление файла 111
уже находилось в рабочем дереве — я его не трогал.

Проверено:

- создано ровно 28 тикетов;
- все SDD-файлы меньше 200 строк;
- новые документы не содержат ключей или паролей;
- файлы реализации и assets не изменялись;
- commit и push не выполнялись.
