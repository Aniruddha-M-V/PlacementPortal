# Training Management & Placement Portal

A production-ready MERN Stack web application for colleges to manage students, training sessions, attendance, assessments, workshops, reports, and placement eligibility.

---

## Quick Start

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x |
| MongoDB | 6.x (local) or MongoDB Atlas |
| npm | 9.x |

---

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 2. Configure Environment

Copy the example and fill in your values:

```bash
cd backend
cp .env.example .env
```

For local development, the defaults in `.env.example` work as-is. The only required change is `MONGODB_URI`:

```env
# Local development (default)
MONGODB_URI=mongodb://localhost:27017/placementPortal

# Production (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/placementPortal?retryWrites=true&w=majority
```

---

### 3. Start the Servers

Open two terminals:

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Default Admin Account

On first startup, if no users exist in the database, a default Admin account is **created automatically**.

| Field    | Value                          |
|----------|--------------------------------|
| Email    | `admin@placementportal.com`    |
| Password | `Admin@123456`                 |
| Role     | Admin (Placement Coordinator)  |

> ⚠️ **Change this password immediately after your first login.**

There is no public registration page. Only the Admin can create Faculty and Student accounts from within the application.

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — manage all users, sessions, reports, settings |
| **Faculty** | Mark attendance, add assessments, review resumes |
| **Student** | View own profile, sessions, attendance, and notifications |

---

## Tech Stack

### Frontend
- React 19 + Vite
- Tailwind CSS
- React Router v7
- TanStack Query
- React Hook Form + Zod
- Recharts
- Lucide Icons
- Framer Motion

### Backend
- Node.js + Express
- JWT Authentication
- bcryptjs
- Mongoose + MongoDB
- Multer + Cloudinary (resume uploads)
- ExcelJS + PDFKit (reports)
- Helmet, CORS, Morgan

---

## Project Structure

```
placement-portal/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, Cloudinary, bootstrap
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API route definitions
│   │   ├── scripts/        # Manual seed script
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helpers (tokens, response, etc.)
│   │   └── validators/     # express-validator rules
│   ├── app.js
│   ├── server.js
│   └── .env.example
│
└── frontend/
    └── src/
        ├── api/            # Axios API modules per feature
        ├── components/     # Layout + shared UI components
        │   ├── layout/     # Sidebar, Topbar, AppShell
        │   └── shared/     # RoleGuard, etc.
        ├── context/        # AuthContext
        ├── pages/          # One folder per feature/route
        └── utils/          # Formatters, constants, permissions
```

---

## Available Scripts

### Backend
```bash
npm run dev     # Start with nodemon (hot-reload)
npm start       # Start without hot-reload (production)
npm run seed    # Manually create admin (only if no users exist)
```

### Frontend
```bash
npm run dev     # Start Vite dev server
npm run build   # Production build
npm run preview # Preview production build
```

---

## API Base URL

All API routes are prefixed with `/api`:

```
http://localhost:5000/api
http://localhost:5000/api/health   ← health check
```

The frontend proxies `/api` to the backend automatically in development (configured in `vite.config.js`).

---

## Core Modules

| Module | Route |
|--------|-------|
| Dashboard | `/dashboard` |
| Students | `/students` |
| Faculty | `/faculty` |
| Training Sessions | `/sessions` |
| Attendance | `/attendance` |
| Assessments | `/assessments` |
| Resume Review | `/resume` |
| Activities & Workshops | `/activities` |
| Placement Eligibility | `/eligibility` |
| Reports (Excel/PDF) | `/reports` |
| Notifications | `/notifications` |
| Calendar | `/calendar` |
| Analytics | `/analytics` |
| Profile | `/profile` |
| Settings | `/settings` |

---

## Placement Eligibility Rules

A student is automatically marked **Eligible** when all of the following conditions are met:

- ✅ Attendance ≥ 75%
- ✅ Aptitude score ≥ 60%
- ✅ Technical score ≥ 60%
- ✅ Soft Skills score ≥ 60%
- ✅ Resume uploaded and approved
- ✅ Zero active backlogs

---

## License

MIT
