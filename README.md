
# 🏥 HospitalSync

**A Deterministic Multi-Tenant Hospital Management & Queue Prediction System.**

HospitalSync is a specialized ERP designed to synchronize patient traffic, medical staff availability, and bed capacity. It uses a custom mathematical simulation engine to provide real-time congestion analytics and wait-time predictions.

---

## 🚀 System Architecture

HospitalSync is built on a **Three-Role Logic** system:

1. **Management:** Global configuration, doctor onboarding, and bed capacity management.
2. **Reception:** Live traffic injection (Arrival rates, Emergency vs. Normal patient counts).
3. **Medical Staff:** Real-time availability toggles (Clock-in/out) that dynamically affect the queue calculation.

### Tech Stack

* **Frontend:** Vite + React (ESM), Tailwind CSS (Midnight Medical Theme), Axios.
* **Backend:** Node.js, Express.js, Bcrypt (Security), Crypto.
* **Database:** Supabase (PostgreSQL) with custom PL/pgSQL Triggers for data initialization.

---

## 🛠️ Backend Setup (`/hospital-backend`)

### 1. Installation

```bash
cd hospital-backend
npm install

```

### 2. Environment Variables (`.env`)

```env
PORT=3000
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

```

### 3. Database Schema (Supabase SQL Editor)

You must run the provided SQL scripts to create:

* `hospitals` table (linked to Supabase Auth).
* `doctors` table (with unique `dr_id`).
* `hospital_stats` table (automatically initialized via triggers).

### 4. API Endpoints

| Endpoint | Method | Role |
| --- | --- | --- |
| `/api/auth/register-hospital` | POST | Super Admin |
| `/api/auth/management` | POST | Management |
| `/api/hospital/create-doctor` | POST | Management |
| `/api/hospital/update-stats` | PATCH | Reception |
| `/api/doctor/toggle-clock` | POST | Doctor |
| `/api/queue/simulate/:id` | GET | All |

---

## 💻 Frontend Setup (`/hospital-frontend`)

### 1. Installation

```bash
cd hospital-frontend
npm install
npm install react-router-dom axios

```

### 2. Design System

The UI follows a **Midnight Healthcare** theme:

* **Primary Background:** `#0f172a` (Midnight Slate)
* **Action Color:** `#10b981` (Emerald Green)
* **Surface Color:** `#1e293b` (Elevated Surface)

### 3. Key Features

* **Role-Based Routing:** Protected routes that verify session data in `localStorage`.
* **Dynamic Visuals:** High-contrast "Live Status" cards with congestion level indicators (Low, Medium, High).
* **Frosted Navbar:** Persistent session management with role-aware action buttons.

---

## 🧠 The Deterministic Logic

The heart of the system is the `simulator.js` utility. It calculates the **Congestion Vector** based on:


The system is **Cloud-Agnostic** and uses a RAG-friendly data structure, making it ready for future AI integration.

---
