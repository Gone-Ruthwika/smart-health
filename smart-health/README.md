# Smart Health Appointment System

Full-stack healthcare appointment booking platform with real-time queue tracking.

## Stack
- Frontend: React + Vite + Tailwind CSS + Axios + Socket.io-client
- Backend: Node.js + Express.js + Socket.io
- Database: MySQL
- Auth: JWT + bcrypt

---

## Quick Start

### 1. Database Setup

Create a MySQL database and run the schema:

```bash
mysql -u root -p -e "CREATE DATABASE smart_health;"
mysql -u root -p smart_health < backend/src/config/schema.sql
mysql -u root -p smart_health < backend/src/config/seed.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL or DB_* values and JWT_SECRET
npm install
npm run dev
```

Backend runs on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

---

## Seed Credentials

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin@smarthealth.com    | admin123  |
| User  | john@example.com         | user1234  |

---

## API Overview

| Method | Endpoint                          | Auth     |
|--------|-----------------------------------|----------|
| POST   | /api/auth/signup                  | Public   |
| POST   | /api/auth/login                   | Public   |
| GET    | /api/auth/me                      | User     |
| GET    | /api/centers                      | Public   |
| GET    | /api/centers/nearby?lat=&lng=     | Public   |
| GET    | /api/doctors?center_id=           | Public   |
| GET    | /api/doctors/:id/slots?date=      | Public   |
| POST   | /api/appointments                 | User     |
| GET    | /api/appointments/me              | User     |
| PATCH  | /api/appointments/:id/cancel      | User     |
| PATCH  | /api/appointments/:id/reschedule  | User     |
| GET    | /api/admin/appointments           | Admin    |
| PATCH  | /api/admin/appointments/:id/status| Admin    |
| GET    | /api/admin/queue-status           | Admin    |
| POST   | /api/admin/centers                | Admin    |
| POST   | /api/admin/doctors                | Admin    |

---

## Deployment

- **Frontend** → Vercel/Netlify: `npm run build`, deploy `dist/`
- **Backend** → Render/Railway: set env vars, `npm start`
- **Database** → Supabase or Neon (set `DATABASE_URL` in backend env)

Set `CLIENT_URL` in backend `.env` to your deployed frontend URL for CORS.
