# Project Architecture Overview

Technical architecture for the **Brio** admin web app (restaurant brand: Cactus Burrito Bar). This document serves as an architectural map for development and debugging.

---

## 1. Project Stack

| Layer | Technology |
|-------|------------|
| **Frontend framework** | React 18 (with TypeScript) |
| **Frontend build** | Vite 7 |
| **Backend framework** | Express 5 (Node.js) |
| **Database** | PostgreSQL (e.g. Neon); connection via `pg` |
| **ORM** | Drizzle ORM |
| **State management** | TanStack Query (React Query) for server state; local component state (useState) for UI |
| **Routing (client)** | Wouter |
| **Auth** | Passport.js (local strategy), express-session with connect-pg-simple (PostgreSQL session store) |
| **Validation** | Zod (shared types and API contracts in `shared/routes.ts`) |
| **Styling** | Tailwind CSS; Radix UI primitives; Lucide React icons |
| **Email** | Nodemailer (e.g. Gmail SMTP for password reset) |

The app runs as a single full-stack process: one Express server serves both the API and the Vite dev server (development) or static client build (production).

---

## 2. Folder Structure

```
project/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── App.tsx         # Root: QueryClient, Router, Toaster
│       ├── main.tsx        # Entry; mounts App
│       ├── index.css       # Global + Tailwind
│       ├── components/     # Reusable UI
│       │   ├── ui/         # Radix-based primitives (Button, Dialog, Table, etc.)
│       │   ├── layout/     # AppLayout, AppSidebar
│       │   └── ProtectedRoute.tsx
│       ├── hooks/          # React Query + fetch (use-auth, use-menu, use-locations, use-users, use-reports, use-toast)
│       ├── lib/            # queryClient, utils
│       └── pages/          # Route-level components
│           ├── auth/       # Login, Register, ForgotPassword, ResetPassword
│           ├── Dashboard.tsx
│           ├── Menu.tsx    # Menu management + modifier UI
│           ├── Locations.tsx
│           ├── Users.tsx
│           ├── Kitchen.tsx
│           └── not-found.tsx
├── server/                 # Express backend
│   ├── index.ts            # Express app, middleware, registerRoutes, Vite/static, listen
│   ├── routes.ts           # All API and auth route handlers
│   ├── auth.ts             # Passport setup, session, hashPassword, comparePasswords
│   ├── storage.ts          # DatabaseStorage implementing IStorage (CRUD for all entities)
│   ├── db.ts               # Drizzle client + pool (reads DATABASE_URL)
│   ├── email.ts            # Nodemailer: sendPasswordResetEmail (SMTP or console fallback)
│   ├── static.ts           # Serve built client in production
│   └── vite.ts             # Vite dev middleware
├── shared/                 # Code used by both client and server
│   ├── schema.ts           # Drizzle tables, relations, insert schemas, TypeScript types
│   └── routes.ts           # API contract: paths, input/output Zod schemas, buildUrl
├── script/                 # One-off scripts
│   ├── build.ts            # Production build
│   └── create-first-admin.ts  # Seed first super_admin user
├── package.json
├── .env                    # DATABASE_URL, SMTP_*, APP_BASE_URL, etc.
└── PROJECT_ARCHITECTURE.md # This file
```

- **server**: HTTP API, auth, session, and all persistence via `storage` + Drizzle.
- **client**: SPA; pages and hooks call API; no separate “services” folder—hooks encapsulate API calls and cache keys.
- **shared**: Single source of truth for API shape and DB types; no direct DB or HTTP here.
- **components**: `components/ui` = design system; `components/layout` and `ProtectedRoute` = app shell and guard.
- **routes**: Backend routes live in `server/routes.ts`; frontend routes are defined in `App.tsx` via Wouter.
- **database/schema**: Schema lives in `shared/schema.ts`; Drizzle connects in `server/db.ts`; migrations/sync via `drizzle-kit` (e.g. `db:push`).

---

## 3. Data Models

Important database entities and relationships (tables and relations are defined in `shared/schema.ts`).

### Location

- **Table**: `locations`
- **Purpose**: A single restaurant location (e.g. one “Cactus Burrito Bar” branch).
- **Fields**: `id`, `name`, `address`, `createdAt`.
- **Relations**: One location has many users, menu items, and modifier groups. There is no separate “Restaurant” entity; Location is the top-level tenant.

### User

- **Table**: `users`
- **Purpose**: Staff accounts (super_admin, location_admin, manager, kitchen_staff).
- **Fields**: `id`, `username` (used as email), `password` (hashed), `role`, `locationId` (nullable for super_admin), `isActive`, `passwordResetToken`, `passwordResetExpires`, `createdAt`.
- **Relations**: Many users belong to one location (optional).

### MenuItem

- **Table**: `menu_items`
- **Purpose**: A sellable item at a location (e.g. “Truffle Pasta”).
- **Fields**: `id`, `locationId`, `name`, `price` (cents), `category` (text), `isAvailable`, `createdAt`.
- **Relations**: Many menu items belong to one location; one menu item can have many modifier groups.
- **Note**: “Category” is not a separate table; it is a text field on MenuItem used for grouping/labels in the UI.

### ModifierGroup

- **Table**: `modifier_groups`
- **Purpose**: A step in the modifier flow for a menu item (e.g. “Choose Protein”).
- **Fields**: `id`, `locationId`, `menuItemId`, `name`, `description`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`.
- **Relations**: Belongs to one location and one menu item; has many modifier options. Used for step-by-step choices (e.g. future kiosk flow).

### ModifierOption

- **Table**: `modifier_options`
- **Purpose**: One choice within a modifier group (e.g. “Chicken”, “Large” with optional price delta).
- **Fields**: `id`, `modifierGroupId`, `name`, `priceDelta` (cents), `isDefault`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`.
- **Relations**: Belongs to one modifier group.

### Entity relationship summary

- **Location** → has many **Users**, **MenuItems**, **ModifierGroups**.
- **MenuItem** → has many **ModifierGroups** (each group optionally tied to one item via `menuItemId`).
- **ModifierGroup** → has many **ModifierOptions**.
- Ordering is driven by `sortOrder` on both modifier groups and modifier options.

---

## 4. API Endpoints

### Menu items

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/locations/:locationId/menu-items` | requireAuth | List menu items for a location |
| POST | `/api/locations/:locationId/menu-items` | requireAuth + role | Create menu item |
| PUT | `/api/locations/:locationId/menu-items/:id` | requireAuth + role | Update menu item |
| DELETE | `/api/locations/:locationId/menu-items/:id` | requireAuth + role | Delete menu item |

Path params and request bodies are aligned with `shared/routes.ts` (api.menuItems.*).

### Modifier groups

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/menu-items/:menuItemId/modifiers` | requireAuth | Get all modifier groups for a menu item, each with nested `options` (sorted by sortOrder in UI). |
| POST | `/api/modifier-groups` | requireAuth | Create modifier group. Body: `name`, `menuItemId`, `locationId`. |
| PUT | `/api/modifier-groups/:id` | requireAuth | Update modifier group. Body: optional `name`, `sortOrder`. |
| DELETE | `/api/modifier-groups/:id` | requireAuth | Delete modifier group. |

### Modifier options

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/modifier-options` | requireAuth | Create modifier option. Body: `name`, `priceDelta`, `modifierGroupId`. |
| PUT | `/api/modifier-options/:id` | requireAuth | Update modifier option. Body: optional `name`, `priceDelta`, `sortOrder`. |
| DELETE | `/api/modifier-options/:id` | requireAuth | Delete modifier option. |

Modifier group and option endpoints are implemented in `server/routes.ts`; they are not declared in `shared/routes.ts` (menu items and other domains are).

---

## 5. UI Components for Menu Management

Menu management lives in **Menu.tsx** (`client/src/pages/Menu.tsx`). The page is wrapped in `ProtectedRoute` (allowed roles: super_admin, location_admin, manager).

### Menu page (Menu.tsx)

- **Purpose**: Main menu management screen: list of menu items for the selected location, Add Item, and per-row Edit/Delete.
- **Behavior**: Location selector (for super_admin), table of items (name, category, price, status, actions), and a single **Add/Edit Menu Item** dialog. When editing, a read-only “Modifiers” preview and a “Manage Modifiers” button open the modifier modal.
- **State**: `selectedLocationId`, `isDialogOpen`, `editingId`, `formData`, `isModifiersModalOpen`. Modifier data for the edited item comes from `useMenuItemModifiers(editingId)` so the preview stays in sync after changes.

### Add/Edit Menu Item dialog

- **Purpose**: Create or update a menu item (name, price, category, isAvailable). Not a separate component; it is a `<Dialog>` inside Menu.tsx.
- **Behavior**: Form submit calls `useCreateMenuItem` or `useUpdateMenuItem`. When `editingId` is set, a “Modifiers” section shows a read-only list of groups/options and a button to open **Manage Modifiers**.

### ManageModifiersModal

- **Purpose**: Configure modifier groups and options for one menu item (create/delete groups and options, reorder by sortOrder).
- **Props**: `isOpen`, `onClose`, `itemName`, `menuItemId`, `locationId`.
- **Behavior**:
  - Uses `useMenuItemModifiers(menuItemId)` and displays groups sorted by `sortOrder`, options within each group sorted by `sortOrder`.
  - Add modifier group: form posts to `POST /api/modifier-groups`; then refetch.
  - Per group: Up/Down (swap `sortOrder` via `PUT /api/modifier-groups/:id`), Delete, “Add Option”.
  - Per option: Up/Down (swap `sortOrder` via `PUT /api/modifier-options/:id`), Delete.
  - Inline **ModifierOptionForm**: name + price delta; submits to `POST /api/modifier-options`, invalidates/refetches modifiers.

### ModifierOptionForm

- **Purpose**: Inline form inside ManageModifiersModal to add one option to a group (name, extra price).
- **Props**: `groupId`, `menuItemId`, `onCancel`.
- **Behavior**: Uses `useCreateModifierOption(menuItemId)`; on success, parent refetches so the new option appears in sorted order.

---

## 6. Data Flow

### When a modifier group is created

1. User clicks “Add Modifier Group” in ManageModifiersModal and submits the form with name; `menuItemId` and `locationId` come from props.
2. `useCreateModifierGroup(menuItemId).mutateAsync({ name, menuItemId, locationId })` runs.
3. Frontend sends `POST /api/modifier-groups` with that body.
4. `server/routes.ts` validates body, calls `storage.createModifierGroup(...)`; DB inserts into `modifier_groups` (default `sortOrder` 0).
5. Response returns the new group; hook’s `onSuccess` invalidates `['menu-item-modifiers', menuItemId]`.
6. Modal may call `refetch()` so the list updates; Edit Menu Item dialog’s modifier preview also updates because it uses the same `useMenuItemModifiers(editingId)` cache.

### When a modifier option is created

1. User clicks “Add Option” on a group and fills ModifierOptionForm (name, price delta).
2. `useCreateModifierOption(menuItemId).mutateAsync({ name, priceDelta, modifierGroupId: groupId })` runs.
3. Frontend sends `POST /api/modifier-options` with that body.
4. `server/routes.ts` calls `storage.createModifierOption(...)`; DB inserts into `modifier_options` (default `sortOrder` 0).
5. Hook invalidates `['menu-item-modifiers', menuItemId]`; modal (and preview) refetch and show the new option in sorted order.

### When modifiers are loaded for a menu item

1. A component (Menu page or ManageModifiersModal) calls `useMenuItemModifiers(menuItemId)` with a non-null `menuItemId`.
2. React Query runs the query fn (if enabled): `GET /api/menu-items/${menuItemId}/modifiers` with credentials.
3. `server/routes.ts` handler gets `menuItemId`, calls `storage.getModifierGroupsByMenuItem(menuItemId)`, then for each group `storage.getModifierOptions(group.id)`.
4. Handler returns an array of groups, each with an `options` array attached.
5. Response is cached under `['menu-item-modifiers', menuItemId]`. UI sorts groups and options by `sortOrder` when rendering (e.g. in ManageModifiersModal and in the Edit dialog preview).

---

## 7. Future Extension Points

Areas where the system is likely to grow, based on current design and references in the codebase:

- **Conditional modifiers**: Modifier groups are always shown for an item today. Later, rules (e.g. “only when size = Large”) could be added, with a new table or fields and UI in ManageModifiersModal or item config.
- **Kiosk ordering flow**: Modifier groups and options are already ordered by `sortOrder` and structured for step-by-step choices; a future kiosk (or waiter) flow can consume the same `GET /api/menu-items/:menuItemId/modifiers` and present steps in that order.
- **Drag-and-drop ordering**: Reordering is currently Up/Down buttons that swap `sortOrder`. A drag-and-drop list (e.g. on groups and options) could call the same `PUT` endpoints with updated `sortOrder` values.
- **Pricing logic**: Base price is on MenuItem; options have `priceDelta`. Future extensions could add discount rules, time-based pricing, or composite pricing that the backend resolves when building an order.
- **Categories as entities**: Category is a text field on MenuItem. If the product needs category management, ordering, or reporting by category, a `categories` table and relation to MenuItem would be a natural next step.
- **Orders and checkout**: No order/checkout model yet; the architecture (locations, menu items, modifiers) is set up so a future order flow can reference menu items and selected modifier options and apply pricing logic.

---

*Document generated from the current codebase. Update this file when adding major features or changing structure.*
