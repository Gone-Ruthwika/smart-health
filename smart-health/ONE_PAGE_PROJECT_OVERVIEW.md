# Smart Health — One-Page Project Overview

## 1. Project Summary
Smart Health is a full-stack healthcare appointment booking system. It enables patients to find hospitals and doctors, book appointments, view live queue status, and manage bookings. It also supports two admin levels: a main admin for platform control and hospital admins for center-specific management.

## 2. Core Features
- Patient registration and login
- Browse centers, doctors, and available slots
- Book, cancel, reschedule appointments
- Live queue status and estimated wait times
- In-app notifications and email alerts
- Hospital-scoped admin access and permissions
- Main admin management for hospitals, doctors, users, and appointments

## 3. What makes it different
- Real-time queue monitoring using `Socket.IO`
- Hospital admin scope: admins see only assigned hospitals
- Multi-role support: patient, hospital admin, main admin
- Notification system with live updates and emails
- Appointment lifecycle management, not just simple booking

## 4. Technology Stack
### Frontend
- `React`: UI rendering and component logic
- `Vite`: fast development server and build tool
- `Tailwind CSS`: responsive styling with utility classes
- `Axios`: API requests to backend services
- `React Router`: page navigation
- `Socket.IO Client`: real-time updates in the browser
- `React Hot Toast`: toast notifications

### Backend
- `Node.js`: server runtime
- `Express.js`: REST API framework
- `Socket.IO`: real-time websocket updates
- `JWT`: token-based authentication
- `bcryptjs`: password hashing
- `express-validator`: request validation
- `Nodemailer`: email delivery
- `MySQL`: structured data storage

## 5. Role Responsibilities
- Patient: signup/login, book and manage appointments, track queue
- Main Admin: manage hospitals, doctors, users, admin roles, queues
- Hospital Admin: manage assigned hospital data, doctor schedules, appointments, queue flow

## 6. Deployment Notes
- Backend: `npm start` or `npm run dev` in `/backend`
- Frontend: `npm run dev` in `/frontend`
- Database: MySQL with schema and seed scripts in `/backend/src/config`
- Key env variables: `JWT_SECRET`, `DATABASE_URL` / `DB_*`, `CLIENT_URL`, SMTP settings

## 7. Why this project matters
Smart Health improves healthcare appointment handling by combining booking, scoped administration, and real-time queue visibility. It reduces waiting uncertainty and gives admins clear control over hospital-specific operations.