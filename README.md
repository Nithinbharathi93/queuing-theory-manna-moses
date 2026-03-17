
# 🏥 HospitalSync

**A Multi-Tenant Hospital Management & Queue Prediction System.**

HospitalSync is a full-featured hospital ERP that runs entirely in the browser, powered by **Supabase** for authentication, a real-time PostgreSQL database, and serverless Edge Functions for live queue analytics. It tracks patient traffic, bed occupancy, and staff availability — with real-time congestion predictions per department and floor.

---

## 🚀 System Architecture

HospitalSync uses a **Three-Role Access Model** with zero traditional backend. All business logic runs through Supabase Auth, Supabase Postgres, and Supabase Edge Functions.

| Role | Responsibilities |
|---|---|
| **Management / Admin** | Register hospital, create departments & floors, onboard doctors & receptionists |
| **Reception** | Admit patients (IP or OP), assign floors/beds, monitor live congestion, discharge patients |
| **Doctor** | Clock in/out to affect queue capacity, check real-time department wait times |

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite 7 + React 19, Tailwind CSS v3 |
| **Auth & Database** | Supabase (PostgreSQL + Row Level Security) |
| **Serverless Logic** | Supabase Edge Functions (`calculate-congestion`) |
| **Real-time** | Supabase Realtime (Postgres Changes listener on `admissions`) |
| **Routing** | React Router DOM v7 |

---

## 📁 Project Structure

```
queuing-theory-manna-moses/
└── frontend/           # Vite + React SPA (the entire application)
    ├── src/
    │   └── App.jsx     # All components: Auth, Management, Reception, Doctor dashboards
    ├── .env            # Supabase credentials
    ├── tailwind.config.js
    └── vite.config.js
```

> **Note:** There is no separate backend server. All data operations go directly through the Supabase client SDK.

---

## 🛠️ Setup & Installation

### Prerequisites
- A [Supabase](https://supabase.com) project with the database schema below applied.
- Node.js 18+

### 1. Clone & Install

```bash
cd frontend
npm install
```

### 2. Environment Variables

Create a `.env` file inside the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> The Supabase URL and anon key are visible in your Supabase project under **Settings → API**.

### 3. Run Locally

```bash
npm run dev
```

App will be available at `http://localhost:5173`.

---

## 🗄️ Database Schema (Supabase SQL Editor)

Apply the following tables in your Supabase project:

| Table | Purpose |
|---|---|
| `hospitals` | One row per registered hospital (linked to Supabase Auth `users.id`) |
| `departments` | Departments owned by a hospital (e.g. Cardiology, Ortho) |
| `floors` | Floor records with `total_beds` capacity per hospital |
| `doctors` | Doctor profiles with `dr_id`, `dept_id`, and `is_clocked_in` status |
| `staff` | Receptionist accounts with `role = 'reception'` |
| `patients` | Patient records; `patient_type` is `IP` (Inpatient) or `OP` (Outpatient) |
| `admissions` | Links a patient to a `floor_id` and `bed_number`; has `discharge_time` |

### Key Column Notes
- `patients.is_emergency` — Only applies to IP patients; always `false` for OP.
- `patients.current_floor_id` — `null` for OP patients; set to the assigned floor for IP.
- `patients.status` — `'waiting'` for OP, `'admitted'` for IP, `'discharged'` after discharge.
- `admissions.discharge_time` — `null` while active; set on discharge to free the bed.

---

## 🧠 Congestion Engine (Supabase Edge Function)

The `calculate-congestion` Edge Function is the heart of the analytics layer. It accepts a `dept_id` or `floor_id` and returns:

| Field | Description |
|---|---|
| `congestionLevel` | `Low`, `Medium`, or `High` |
| `queueLength` | Number of patients currently waiting |
| `normalWait` | Estimated wait time (minutes) for standard patients |
| `emergencyWait` | Estimated wait time (minutes) for emergency/urgent patients |

The congestion level is calculated using queuing theory, factoring in the number of **active (clocked-in) doctors** and current patient load — making doctor availability a direct input to wait-time predictions.

---

## ✨ Key Features

### 👔 Management Dashboard
- Add / delete **Departments** and **Floors** (with bed capacity).
- Register **Receptionists** and **Doctors** (signed up via Supabase Auth and linked to the hospital).
- **Floor Detail View** — click any floor to see currently admitted patients, their department, and emergency status.
- Live **occupancy progress bars** per floor.

### 🏥 Reception Dashboard
- **Admit Patient** form with a toggle between:
  - 🏥 **Inpatient (IP)** — requires floor/bed assignment, supports emergency flag.
  - 🚶 **Outpatient (OP)** — added to the department queue; no bed or emergency flag.
- **Live Department Wait Times** — grid of congestion cards per department, auto-refreshed.
- **Floor Occupancy & Congestion** — horizontal scroll cards with bed fill bar per floor.
- **Patient Table** — shows all active (non-discharged) patients with type, status, floor, and a discharge button.
- **Active Doctors Panel** — lists currently clocked-in doctors with their department.
- Real-time updates via Supabase Realtime subscription on the `admissions` table.

### 👨‍⚕️ Doctor Dashboard
- **Shift Management** — clock in/out toggle. Clocking in makes the doctor visible to Reception and improves department congestion scores.
- **Department Stats** — on-demand query to the Edge Function showing live queue length, avg wait, and urgent wait for the doctor's own department.

---

## 🎨 Design System

The UI follows a **clean light healthcare** theme:

| Token | Value |
|---|---|
| Background | `bg-slate-50` (Soft Gray) |
| Surface / Card | `bg-white` with `shadow-sm` |
| Primary Action | `bg-blue-600` (Management / IP) |
| OP / Queue | `bg-violet-600` |
| Emergency | `bg-red-500` with `animate-pulse` |
| Active / Normal | `bg-emerald-500` / `bg-emerald-100` |

---

## 🔐 Authentication Flow

1. User visits `/` → `LoginPage` is shown.
2. User selects a **role** (Management, Receptionist, Doctor) and signs in with email/password.
3. Supabase Auth authenticates the user.
4. The app **cross-references the selected role** against the appropriate table (`hospitals`, `staff`, `doctors`) to verify authorization.
5. On mismatch, the session is signed out and an "Access Denied" error is shown.
6. On match, the correct dashboard is rendered.

New hospitals register via the **"Register New Hospital"** link on the login page, which creates a Supabase Auth user and inserts a row into the `hospitals` table.

---

## 📦 Dependencies

```json
{
  "@supabase/supabase-js": "^2.99.1",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.12.0",
  "tailwindcss": "^3.4.19",
  "lucide-react": "^0.562.0",
  "axios": "^1.13.6"
}
```
