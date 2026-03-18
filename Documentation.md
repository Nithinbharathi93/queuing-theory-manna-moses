# 🏥 HospitalSync — Complete Project Documentation

> **A Multi-Tenant Hospital Management & Queue Prediction System**  
> Built with React 19, Vite 7, Supabase, and Tailwind CSS.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Repository & File Structure](#4-repository--file-structure)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization Flow](#7-authentication--authorization-flow)
8. [Application Entry Point](#8-application-entry-point)
9. [Component Deep-Dive](#9-component-deep-dive)
   - [App (Root Component)](#91-app-root-component)
   - [LoginPage](#92-loginpage)
   - [RegisterPage](#93-registerpage)
   - [ManagementDashboard](#94-managementdashboard)
   - [ReceptionDashboard](#95-receptiondashboard)
   - [DoctorDashboard](#96-doctordashboard)
10. [Congestion Engine (Edge Function)](#10-congestion-engine-edge-function)
11. [Real-Time Updates](#11-real-time-updates)
12. [Design System & UI Conventions](#12-design-system--ui-conventions)
13. [Routes](#13-routes)
14. [Setup & Local Development](#14-setup--local-development)
15. [Deployment Notes](#15-deployment-notes)
16. [Known Patterns & Conventions](#16-known-patterns--conventions)

---

## 1. Project Overview

**HospitalSync** is a full-stack, browser-only Hospital ERP (Enterprise Resource Planning) system. It enables hospitals to:

- Register their institution and set up departments and floor infrastructure.
- Admit inpatients (IP) with bed and floor assignments or outpatients (OP) to a department queue.
- Monitor live bed occupancy, department congestion levels, and doctor availability.
- Provide doctors with shift management and live statistics for their department.

The system operates without any traditional backend server. All data operations run through the **Supabase** client SDK directly from the browser, with the analytics layer powered by **Supabase Edge Functions** running on Deno.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                  USER'S BROWSER                      │
│                                                      │
│   React SPA (Vite Dev Server / Static Build)         │
│   ┌──────────────┐ ┌───────────────┐ ┌────────────┐  │
│   │  Management  │ │  Reception   │ │   Doctor   │  │
│   │  Dashboard   │ │  Dashboard   │ │  Dashboard │  │
│   └──────┬───────┘ └──────┬────────┘ └─────┬──────┘  │
│          └────────────────┴────────────────┘          │
│                          │                            │
│              Supabase JS Client SDK                   │
└──────────────────────────┬───────────────────────────┘
                           │  HTTPS
         ┌─────────────────▼──────────────────┐
         │           SUPABASE CLOUD            │
         │                                    │
         │  ┌───────────┐  ┌──────────────┐   │
         │  │ Auth      │  │  PostgreSQL   │   │
         │  │ (JWT)     │  │  (RLS Tables) │   │
         │  └───────────┘  └──────────────┘   │
         │                                    │
         │  ┌──────────────────────────────┐   │
         │  │  Edge Function               │   │
         │  │  `calculate-congestion`      │   │
         │  │  (Deno / TypeScript)         │   │
         │  └──────────────────────────────┘   │
         │                                    │
         │  ┌──────────────────────────────┐   │
         │  │  Realtime                    │   │
         │  │  (Postgres Changes —         │   │
         │  │   `admissions` table)        │   │
         │  └──────────────────────────────┘   │
         └────────────────────────────────────┘
```

### Role-Based Access Model

| Role | Supabase Table Verified Against | Responsibilities |
|---|---|---|
| **Management / Admin** | `hospitals` (id = auth user id) | Register departments, floors, doctors, receptionists |
| **Reception** | `staff` (id, role = 'reception') | Admit patients, assign beds/floors, discharge patients, monitor live stats |
| **Doctor** | `doctors` (id = auth user id) | Clock in/out, view department-level congestion stats |

---

## 3. Tech Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.0 | UI component framework |
| `react-dom` | ^19.2.0 | DOM rendering |
| `react-router-dom` | ^7.12.0 | Client-side routing |
| `@supabase/supabase-js` | ^2.99.1 | Database, Auth, Realtime, Edge Functions client |
| `tailwindcss` | ^3.4.19 | Utility-first CSS framework |
| `lucide-react` | ^0.562.0 | Icon library |
| `axios` | ^1.13.6 | HTTP client (available but Edge Functions use Supabase SDK) |
| `autoprefixer` | ^10.4.23 | PostCSS CSS compatibility |
| `postcss` | ^8.5.6 | CSS transformation pipeline |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `vite` ^7.2.4 | Build tool and dev server |
| `@vitejs/plugin-react` ^5.1.1 | React Fast Refresh in Vite |
| `eslint` + plugins | Linting (hooks, react-refresh rules) |
| `@types/react`, `@types/react-dom` | TypeScript type hints in JSX |

---

## 4. Repository & File Structure

```
queuing-theory-manna-moses/          ← Git repository root
├── README.md                        ← Quick-start guide
├── Documentation.md                 ← This file (full documentation)
├── .gitignore
└── frontend/                        ← Entire application lives here
    ├── index.html                   ← SPA shell; mounts React at #root
    ├── vite.config.js               ← Vite build config (React plugin)
    ├── tailwind.config.js           ← Tailwind content paths
    ├── postcss.config.js            ← PostCSS (autoprefixer)
    ├── eslint.config.js             ← ESLint flat config
    ├── package.json                 ← npm dependencies & scripts
    ├── .env                         ← Supabase credentials (not committed)
    ├── .gitignore
    ├── public/
    │   └── hosp.svg                 ← Favicon
    └── src/
        ├── main.jsx                 ← React root; router setup
        ├── App.jsx                  ← ALL application components (910 lines)
        ├── NoStyle.jsx              ← Dev/prototype version (unstyled)
        ├── index.css                ← Tailwind directives (@tailwind base/components/utilities)
        ├── App.css                  ← Vite scaffold CSS (mostly unused)
        └── assets/                  ← Static assets
```

### Key Architectural Note

> **The entire application logic lives in a single file: `src/App.jsx`.** It exports the root `App` component and defines all sub-components inline: `ManagementDashboard`, `ReceptionDashboard`, `DoctorDashboard`, `LoginPage`, and `RegisterPage`. There is no separate backend server — every data operation goes directly through the Supabase SDK.

---

## 5. Environment Configuration

The app reads credentials from `frontend/.env` using Vite's `import.meta.env` mechanism:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE=http://localhost:5000/api   # Reserved/unused in current build
```

> **Important:** Variables **must** be prefixed with `VITE_` to be exposed to the browser bundle. The Supabase client is initialized once at module level in `App.jsx`:
> ```js
> const supabase = createClient(
>   import.meta.env.VITE_SUPABASE_URL,
>   import.meta.env.VITE_SUPABASE_ANON_KEY
> );
> ```

---

## 6. Database Schema

All tables reside in Supabase's PostgreSQL instance with Row Level Security (RLS) enabled.

### Tables

#### `hospitals`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | **Equals** the Supabase Auth `users.id` of the admin |
| `name` | text | Hospital name |

#### `departments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `hospital_id` | uuid (FK → hospitals.id) | Multi-tenant scope |
| `name` | text | e.g., "Cardiology", "Orthopaedics" |

#### `floors`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `hospital_id` | uuid (FK → hospitals.id) | |
| `floor_number` | integer | Display label |
| `total_beds` | integer | Capacity for occupancy calculation |

#### `doctors`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | **Equals** the Supabase Auth `users.id` of the doctor |
| `dr_id` | text | Human-readable doctor ID (e.g., "DOC1") |
| `hospital_id` | uuid (FK → hospitals.id) | |
| `dept_id` | uuid (FK → departments.id) | |
| `is_clocked_in` | boolean | Drives congestion calculations |

#### `staff`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | **Equals** the Supabase Auth `users.id` of the receptionist |
| `hospital_id` | uuid (FK → hospitals.id) | |
| `role` | text | Always `'reception'` for receptionists |

#### `patients`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `hospital_id` | uuid (FK → hospitals.id) | |
| `name` | text | Patient full name |
| `dept_id` | uuid (FK → departments.id) | |
| `patient_type` | text | `'IP'` (Inpatient) or `'OP'` (Outpatient) |
| `current_floor_id` | uuid (FK → floors.id) | `NULL` for OP patients |
| `is_emergency` | boolean | Always `false` for OP patients |
| `status` | text | `'waiting'` (OP), `'admitted'` (IP), `'discharged'` |

#### `admissions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `patient_id` | uuid (FK → patients.id) | |
| `floor_id` | uuid (FK → floors.id) | |
| `bed_number` | integer | Randomly assigned (1–500) on admit |
| `discharge_time` | timestamptz | `NULL` while active; set on discharge |

### Key Business Rules Enforced in Code

- **OP patients**: `current_floor_id = NULL`, `is_emergency = false`, `status = 'waiting'`, **no `admissions` row created**.
- **IP patients**: `current_floor_id = <selected floor>`, `status = 'admitted'`, an `admissions` row is created.
- **Discharge**: Sets `admissions.discharge_time = NOW()` and `patients.status = 'discharged'`. Freed beds are calculated by filtering `admissions` where `discharge_time IS NULL`.

---

## 7. Authentication & Authorization Flow

```
User visits "/"
    │
    ├─► LoginPage rendered
    │       │
    │       ├─ User selects role (Management / Reception / Doctor)
    │       └─ Submits email + password
    │               │
    │           handleLogin()
    │               │
    │           supabase.auth.signInWithPassword()
    │               │
    │        ┌─────────────────────────────────────┐
    │        │  Cross-reference role check:         │
    │        │  management → query `hospitals`      │
    │        │  reception  → query `staff`          │
    │        │  doctor     → query `doctors`        │
    │        └─────────────────────────────────────┘
    │               │
    │       ┌───────┴──────────┐
    │   Match found        No match
    │       │                  │
    │   setView('dashboard') signOut() + show "Access Denied"
    │       │
    │   Render role-specific dashboard
    │
    └─► RegisterPage (hospitals only, via "Register New Hospital" link)
            │
        supabase.auth.signUp() + insert into `hospitals`
```

### `handleLogin` function (`App.jsx`, line 17)

1. Calls `supabase.auth.signInWithPassword()` with email/password.
2. Queries the table matching the user-selected role to verify legitimacy.
3. If verification passes → sets `user`, `role`, and `view = 'dashboard'` state.
4. If verification fails → calls `signOut()` and surfaces an "Access Denied" error.

---

## 8. Application Entry Point

### `frontend/index.html`
The SPA shell. Contains a single `<div id="root">` and loads `/src/main.jsx` as a module script. Sets the favicon to `hosp.svg`.

### `frontend/src/main.jsx`
Bootstraps React with `createRoot` and wraps the app in `BrowserRouter`:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"    element={<App />} />
        <Route path="/dev" element={<NoStyle />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
```

| Route | Component | Purpose |
|---|---|---|
| `/` | `App` | Production application |
| `/dev` | `NoStyle` | Unstyled development/prototype variant |

---

## 9. Component Deep-Dive

### 9.1 `App` (Root Component)

**File:** `src/App.jsx` — lines 1–82  
**Type:** Default export

#### State

| State Variable | Type | Purpose |
|---|---|---|
| `user` | object \| null | Supabase Auth user object |
| `role` | string \| null | `'management'`, `'reception'`, or `'doctor'` |
| `view` | string | `'login'`, `'register'`, or `'dashboard'` |
| `loginError` | string \| null | Error message shown on the login page |

#### Behaviour

- Acts as a **top-level router/state machine** for different views and roles.
- Supabase client is initialized at module scope (not inside the component) — single instance for the entire SPA.
- Renders the shared **navigation bar** (portal name, logged-in email, Logout button) when `view === 'dashboard'`.
- Conditionally renders `ManagementDashboard`, `ReceptionDashboard`, or `DoctorDashboard` based on `role`.

#### Key Functions

| Function | Description |
|---|---|
| `handleLogin(email, password, selectedRole)` | Authenticates via Supabase Auth, role-verifies against DB tables, updates state. |
| `handleLogout()` | Signs out and resets all state to the login view. |

---

### 9.2 `LoginPage`

**Lines:** 827–868  
**Props:** `{ onLogin, setView, error }`

A **centered card UI** with:
- Email and password inputs.
- Role selector dropdown (`Management / Admin`, `Receptionist`, `Medical Doctor`).
- Error banner (with `animate-pulse`) shown when `error` prop is truthy.
- "Register New Hospital →" link that calls `setView('register')`.

On form submit, calls `onLogin(email, password, role)` — the `handleLogin` function from `App`.

---

### 9.3 `RegisterPage`

**Lines:** 870–910  
**Props:** `{ setView }`

Allows new hospitals to self-register:

1. Calls `supabase.auth.signUp()` with admin email and password.
2. Inserts a new row into `hospitals` with `{ id: data.user.id, name: hospitalName }`.
3. Redirects back to login on success.

> **Note:** Only the hospital administrator is created here. Doctors and receptionists are always created from within the `ManagementDashboard`.

---

### 9.4 `ManagementDashboard`

**Lines:** 85–371  
**Props:** `{ user }`

The admin control panel for setting up and viewing hospital infrastructure.

#### State

| State | Type | Purpose |
|---|---|---|
| `depts` | array | All departments for this hospital |
| `floors` | array | All floors with joined admissions and nested patients |
| `doctors` | array | All registered doctors with department name |
| `staff` | array | All registered receptionists |
| `selectedFloor` | object \| null | Currently selected floor for the detail view |

#### Data Fetching — `fetchConfig()`

Uses `Promise.all` to run 4 queries in parallel:
1. `departments` — all departments.
2. `floors` — with a relational join: `admissions(bed_number, discharge_time, patients(name, is_emergency, departments(name)))` ordered by `floor_number`.
3. `doctors` — with `departments(name)` join.
4. `staff` — all receptionists.

#### UI Layout (2-column grid on large screens)

**Left Column — Hospital Infrastructure**

| Feature | Description |
|---|---|
| **Departments section** | Form to add a department by name. Lists all departments with a hover-reveal delete button. |
| **Floors & Bed Capacity** | Form (floor number + bed count). Table listing all floors with occupancy bar. Click a row to open the Floor Detail View. |
| **Floor Detail View** | Conditionally shown panel listing all active (non-discharged) admitted patients on the selected floor: bed number, name, department, emergency status. |

**Right Column — User Management**

| Feature | Description |
|---|---|
| **Register Receptionist** | Form: email + password → `supabase.auth.signUp()` + insert into `staff`. Lists active receptionists with Remove button. |
| **Register Doctor** | Form: Doctor ID + email + password + department → `supabase.auth.signUp()` + insert into `doctors`. Lists all doctors in a table with department badge and Remove button. |

#### Key Functions

| Function | Description |
|---|---|
| `handleDelete(table, id)` | Generic confirm-then-delete for any table by ID. |
| `addDept(e)` | Inserts department row linked to `user.id` (hospital). |
| `addFloor(e)` | Inserts floor row with number and bed capacity. |
| `createStaff(e, type)` | Creates Supabase Auth user then inserts into `doctors` or `staff` table. |

#### Occupancy Bar Color Logic

- `> 80%` occupancy → `bg-red-500`
- `≤ 80%` occupancy → `bg-emerald-500`

---

### 9.5 `ReceptionDashboard`

**Lines:** 373–694  
**Props:** `{ user }`

The most complex dashboard — the core operational hub for receptionists.

#### State

| State | Type | Purpose |
|---|---|---|
| `data` | object | `{ patients, beds (floors), depts, doctors }` |
| `congestionData` | object | Map of `dept_id → congestion result` from Edge Function |
| `floorCongestion` | object | Map of `floor_id → congestion result` from Edge Function |
| `patientType` | string | `'IP'` or `'OP'` — controls admission form |

#### Data Loading — `loadData()`

Runs 4 parallel Supabase queries:

| Query | Detail |
|---|---|
| `departments` | All departments for the admit form dropdown. |
| `floors` | With `admissions(*)` filtered to active only (`discharge_time IS NULL`) — for bed availability. |
| `patients` | With `admissions(bed_number, floors(floor_number))` join, excluding `status = 'discharged'`. |
| `doctors` | Only `is_clocked_in = true`, with department name. |

After fetching, triggers `refreshCongestion()` for every department and every floor.

#### Real-Time Subscription

On mount, subscribes to `postgres_changes` on the `admissions` table (all events). Whenever any admission is created/updated/deleted, `loadData()` is called automatically, keeping the UI in sync.

```js
const channel = supabase.channel('schema-db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => loadData())
  .subscribe();
```

#### Key Functions

| Function | Description |
|---|---|
| `refreshCongestion(deptId, floorId, type)` | Invokes `calculate-congestion` Edge Function, stores result in `congestionData` (dept) or `floorCongestion` (floor). |
| `admit(e)` | Creates a patient record. If IP: creates an `admissions` row with a random bed number (1–500). If OP: no admission, status = `'waiting'`. |
| `discharge(pid)` | Sets `admissions.discharge_time = NOW()` and `patients.status = 'discharged'`. |

#### Admit Patient Form

Toggled by the `patientType` state (IP / OP toggle buttons):

- **IP (Inpatient):** Shows floor selector dropdown (lists available bed count per floor), emergency checkbox.
- **OP (Outpatient):** Shows info message; no floor/bed or emergency field.
- Submit button label changes: **"Admit & Assign Bed"** (IP) vs **"Add to Queue"** (OP).
- Hidden `<input type="hidden" name="patient_type">` carries the current toggle value into form submission.

#### UI Layout (3-column grid on large screens)

**Left column (1/3):**
- Admit Patient form
- Active Doctors panel (lists clocked-in doctors with department)

**Right column (2/3):**
- **Live Department Wait Times** — grid of cards per department (color-coded: red for High, green otherwise), showing congestion level and estimated wait in minutes.
- **Floor Occupancy & Congestion** — horizontal scrollable cards per floor with a bed fill bar.
- **Admitted Patients table** — all non-discharged patients with columns: Name (with avatar initial), Type badge (IP/OP), Status (Emergency/Normal/Waiting), Floor, Discharge button.

---

### 9.6 `DoctorDashboard`

**Lines:** 697–824  
**Props:** `{ user }`

A focused, single-page dashboard for logged-in doctors.

#### State

| State | Type | Purpose |
|---|---|---|
| `doc` | object \| null | Doctor record with `departments(name)` join, `is_clocked_in` status |
| `stats` | object \| null | Congestion result from Edge Function for the doctor's department |

#### On Mount

Fetches the doctor's own record from the `doctors` table, joined with `departments(name)`, filtered by `user.id`.

#### UI Layout

**Gradient header** (teal → emerald): Shows department badge, Doctor ID, and live clock-in status indicator (pulsing green dot when active).

**Two action cards (grid, side by side on medium+ screens):**

| Card | Behaviour |
|---|---|
| **Shift Management** | `toggleClock()` — flips `is_clocked_in` on the `doctors` row. Button turns amber/warning when clocked in ("Clock Out"), emerald when clocked out ("Clock In Now"). |
| **Department Stats** | `getStats()` — invokes `calculate-congestion` Edge Function for the doctor's own `dept_id`. |

**Stats result panel** (shown when `stats` is non-null):

| Metric | Description |
|---|---|
| Congestion Level | Color-coded: `High` = red, `Medium` = amber, `Low` = green |
| Patients Waiting | Queue length as an integer |
| Avg Wait Time | `normalWait` in minutes (rounded) |
| Urgent Wait | `emergencyWait` in minutes (rounded) |

---

## 10. Congestion Engine (Edge Function)

The `calculate-congestion` Supabase Edge Function is the analytics brain of the system. It runs as a serverless Deno function on Supabase infrastructure.

### Invocation

```js
const { data: result } = await supabase.functions.invoke('calculate-congestion', {
  body: { dept_id: deptId, floor_id: floorId }
});
```

It accepts either `dept_id`, `floor_id`, or both.

### Response Schema

```json
{
  "congestionLevel": "Low" | "Medium" | "High",
  "queueLength": 12,
  "normalWait": 18.5,
  "emergencyWait": 4.2
}
```

| Field | Type | Description |
|---|---|---|
| `congestionLevel` | string | `"Low"`, `"Medium"`, or `"High"` |
| `queueLength` | number | Number of currently waiting patients |
| `normalWait` | number | Estimated wait time in minutes for standard patients |
| `emergencyWait` | number | Estimated wait time in minutes for emergency/urgent patients |

### Algorithm

Uses **queuing theory** (an M/M/c or similar model) to factor in:
- Current patient queue length (from `patients` or `admissions` tables).
- Number of **actively clocked-in doctors** in the relevant department (the `is_clocked_in = true` count directly affects service rate).

This means doctor clock-in/clock-out events **immediately affect** predicted wait times shown to receptionists and doctors.

---

## 11. Real-Time Updates

HospitalSync uses **Supabase Realtime** to maintain a live view in the `ReceptionDashboard`:

```js
// Subscribes to any INSERT, UPDATE, or DELETE on the admissions table
supabase.channel('schema-db-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'admissions'
  }, () => loadData())
  .subscribe();
```

The subscription is cleaned up on component unmount:
```js
return () => supabase.removeChannel(channel);
```

Triggers that cause a real-time refresh:
- A receptionist admits a new IP patient (creates an `admissions` row).
- A receptionist discharges a patient (updates `admissions.discharge_time`).

---

## 12. Design System & UI Conventions

The UI follows a **clean light healthcare** theme built entirely with Tailwind CSS utility classes.

### Color Palette

| Token / Use Case | Tailwind Class | Color |
|---|---|---|
| Page background | `bg-slate-50` | Soft gray |
| Card / Surface | `bg-white` + `shadow-sm` | White |
| Primary / IP / Management | `bg-blue-600` | Blue |
| Outpatient / Queue | `bg-violet-600` | Purple |
| Emergency | `bg-red-500` + `animate-pulse` | Pulsing red |
| Active / Normal / Doctor In | `bg-emerald-500` | Green |
| Success action (register) | `bg-emerald-600` | Green |
| Doctor Management | `bg-teal-600` | Teal |
| Warning / Clock Out | `bg-amber-100` text `text-amber-800` | Amber |
| Inactive / Clocked Out | `bg-slate-400` | Gray |
| High Congestion | `bg-red-50 border-red-200` | Red tint |
| Low/Normal Congestion | `bg-emerald-50 border-emerald-100` | Green tint |

### Component Conventions

- **Cards:** `bg-white p-6 rounded-xl shadow-sm border border-slate-100`
- **Section headers:** `text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2` (always with an icon)
- **Primary buttons:** `bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm`
- **Tables:** `min-w-full divide-y divide-slate-200` with `thead bg-slate-50`
- **Badges/Pills:** `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold`
- **Emergency indicator:** `<span className="w-2 h-2 bg-red-600 rounded-full animate-pulse">` (always paired with "Emergency" text)
- **Active doctor indicator:** `<span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse">`

### Responsive Layout

| Breakpoint | Behaviour |
|---|---|
| Mobile (default) | Single-column stacked layout |
| `sm:` (640px+) | Navigation switches to row layout |
| `lg:` (1024px+) | Management dashboard → 2 columns; Reception → 3 columns (1 + 2) |
| `md:` (768px+) | Doctor dashboard action cards → 2 columns |

---

## 13. Routes

| URL Path | Component | Description |
|---|---|---|
| `/` | `App` | Main application (login → dashboard) |
| `/dev` | `NoStyle` | Unstyled developer prototype (not for production) |

Both routes are defined in `src/main.jsx` inside `<BrowserRouter>`.

---

## 14. Setup & Local Development

### Prerequisites

- **Node.js 18+**
- A live **Supabase project** with:
  - Database tables created (see [Database Schema](#6-database-schema))
  - `calculate-congestion` Edge Function deployed
  - Realtime enabled on the `admissions` table

### Step-by-Step

```bash
# 1. Navigate to the frontend directory
cd queuing-theory-manna-moses/frontend

# 2. Install dependencies
npm install

# 3. Create the environment file
#    Copy the template below into frontend/.env
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env

# 4. Start the development server
npm run dev
```

App will be available at: **`http://localhost:5173`**

### Available npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start Vite dev server with HMR |
| `build` | `vite build` | Production bundle (outputs to `dist/`) |
| `preview` | `vite preview` | Preview the production build locally |
| `lint` | `eslint .` | Run ESLint on the source |

---

## 15. Deployment Notes

- **The app is a static SPA.** Run `npm run build` to generate the `frontend/dist/` folder and host it on any static hosting (Vercel, Netlify, GitHub Pages, etc.).
- **No server-side env injection.** All Vite environment variables are inlined into the bundle at build time. Ensure your CI/CD pipeline provides `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment variables.
- **Supabase RLS:** Ensure Row Level Security policies are set correctly on all tables. The `anon` key is embedded in the client bundle and visible to users — RLS is the security boundary.
- The `/dev` route (`NoStyle.jsx`) should be considered internal tooling and can be removed from `main.jsx` before production if needed.

---

## 16. Known Patterns & Conventions

### Multi-Tenant Scoping
Every data record is associated with a `hospital_id`. The Management user's `user.id` **is** the `hospital_id`. Receptionists look up their `hospital_id` from the `staff` table on admit.

### Supabase Client — Module-Level Singleton
```js
// Top of App.jsx — created once, shared across all components in the module
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Optimistic State Pattern
All mutation functions (admit, discharge, delete) call the relevant Supabase mutation and then immediately call `loadData()` / `fetchConfig()` to re-fetch fresh data from the server, rather than updating local state optimistically.

### Bed Number Assignment
Bed numbers for inpatient admissions are assigned randomly at admission time:
```js
bed_number: Math.floor(Math.random() * 500)
```
This is a simplification — a real system would track per-floor bed availability.

### Floor Detail View (Management)
Clicking a row in the Floors table sets `selectedFloor` state, which conditionally renders a detail panel beneath the table. `e.stopPropagation()` is used on the Delete button inside each row to prevent the floor selection from firing simultaneously.

### OP vs IP Toggle
The `patientType` state in `ReceptionDashboard` drives the form UI. A hidden `<input type="hidden" name="patient_type">` keeps the form's native `elements` API consistent with the React-controlled toggle, so the `admit()` handler can read `patient_type.value` from `e.target.elements`.

---

*Documentation generated: 2026-03-18 | Project: HospitalSync | Repo: queuing-theory-manna-moses*
