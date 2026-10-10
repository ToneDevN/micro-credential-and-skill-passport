# Micro-credential & Skill Passport System

ระบบจัดการและตรวจสอบทักษะ (Skill Passport) และใบรับรองย่อย (Micro-credentials) สำหรับนักศึกษาและผู้สอน

## 📖 เกี่ยวกับโปรเจกต์ (About this Project)

**ปัญหาที่ต้องการแก้:** การวัดผลการเรียนแบบเกรดรวมในรายวิชาไม่สามารถสะท้อนได้ว่านักศึกษามี *ทักษะย่อย (micro-skill)* อะไรบ้างที่ผ่านการพิสูจน์แล้วจริง ๆ ทำให้ทั้งนักศึกษาเองและผู้ที่ต้องการตรวจสอบ (เช่น ผู้สอน, หน่วยงาน) ไม่มีหลักฐานทักษะที่ตรวจสอบย้อนกลับได้

**แนวทางแก้ไข:** ระบบนี้แตกรายวิชา (Course) ออกเป็นทักษะย่อย (Micro-skill) แต่ละทักษะ นักศึกษาสามารถส่งหลักฐาน (evidence) เพื่อขอให้ผู้สอนตรวจสอบและยืนยัน (verify) ว่าทักษะนั้นผ่านจริง เมื่อได้รับการอนุมัติ ทักษะนั้นจะถูกบันทึกลงใน **Skill Passport** ของนักศึกษา ซึ่งทำหน้าที่เป็นสมุดพกทักษะดิจิทัลที่รวบรวมทักษะทั้งหมดที่ได้รับการยืนยันแล้วจากทุกรายวิชา

**ผู้ใช้งานหลัก:**
- **นักศึกษา (Student)** — สำรวจทักษะที่เปิดสอน, ส่งคำขอยืนยันทักษะพร้อมหลักฐาน, แก้ไข/ยกเลิก/ส่งใหม่คำขอที่ถูกตีกลับ, และดู Skill Passport/Skill Map ของตนเอง
- **ผู้สอน (Instructor)** — สร้างและจัดการรายวิชาและทักษะย่อยในรายวิชาของตน, ตรวจสอบและอนุมัติ/ปฏิเสธคำขอยืนยันทักษะของนักศึกษา, และดูแดชบอร์ดวิเคราะห์ภาพรวม/รายทักษะ

**ภาพรวม Workflow:**
1. ผู้สอนสร้างรายวิชา และเพิ่มทักษะย่อย (micro-skill) เข้าไปในรายวิชานั้น
2. นักศึกษาสำรวจทักษะที่เปิดให้ และส่งคำขอยืนยันทักษะ (verification request) พร้อมหลักฐาน
3. ผู้สอนตรวจสอบคำขอ แล้วอนุมัติหรือปฏิเสธ (พร้อมเหตุผล) — นักศึกษาสามารถแก้ไขและส่งใหม่ได้หากถูกปฏิเสธ
4. เมื่อคำขอได้รับการอนุมัติ ทักษะนั้นจะถูกเพิ่มเข้า Skill Passport ของนักศึกษาโดยอัตโนมัติ
5. ทั้งนักศึกษาและผู้สอนสามารถดูสถานะทักษะ/คำขอผ่านแดชบอร์ดและรายงานวิเคราะห์ของตนเอง

## 🛠 Tech Stack

* **Backend:** Node.js + Express.js
* **Frontend:** React + Vite
* **Database:** MongoDB (via Mongoose)
* **UI Framework:** Bootstrap 5
* **Authentication:** JWT (jsonwebtoken + bcryptjs)
* **Containerization:** Docker + Docker Compose

---

## 📁 Project Structure

```text
micro-credential-and-skill-passpost/
├── backend/
│   ├── src/
│   │   ├── config/         # MongoDB connection & configuration
│   │   ├── controllers/    # Route controllers (Auth, etc.)
│   │   ├── middleware/     # JWT auth middleware, error handler
│   │   ├── models/         # Mongoose models (User)
│   │   ├── routes/         # Express routes (/api/health, /api/auth)
│   │   └── scripts/        # Database seed script
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components (Navbar, ProtectedRoute)
│   │   ├── context/        # AuthContext state management
│   │   ├── pages/          # Pages (HomePage, LoginPage, RegisterPage)
│   │   ├── services/       # Axios instance with auth interceptor
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v9 or higher
- **MongoDB**: Local MongoDB instance or Docker

### 2. Environment Variables Configuration

#### Backend:
Copy `.env.example` to `.env` in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Default values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skill_passport
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

#### Frontend:
Copy `.env.example` to `.env` in `frontend/`:
```bash
cp frontend/.env.example frontend/.env
```
Default value:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### 3. Local Development

#### A. Start MongoDB
Using Docker:
```bash
docker run -d --name skill-passport-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=skill_passport mongo:7
```

#### B. Seed Sample Data (TON-55)
Populate the database with initial accounts:
```bash
cd backend
npm run seed
```
**Pre-seeded accounts:**
| Role | Email | Password |
|---|---|---|
| Instructor | `instructor@test.com` | `password123` |
| Student | `student1@test.com` | `password123` |
| Student | `student2@test.com` | `password123` |

#### C. Run Backend
```bash
cd backend
npm run dev
```
Backend will start on `http://localhost:5000`.

#### D. Run Frontend
```bash
cd frontend
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

### 4. Running with Docker Compose (TON-53)

To start all services (MongoDB + Backend + Frontend) in one command:
```bash
docker compose up --build
```
Or if using legacy docker-compose:
```bash
docker-compose up --build
```

---

## ✨ Features

- **Authentication & roles** — JWT-based register/login for `student` and `instructor` accounts
- **Course & skill management** — Instructors create courses and attach micro-skills to them
- **Skill verification workflow** — Students submit evidence for a skill, edit/cancel/resubmit while pending, and instructors approve or reject each request
- **Skill Passport** — Students get an aggregated passport of verified skills plus a visual skill map
- **Analytics dashboard** — Instructors view overall and per-skill verification analytics
- **Public skill explore** — Anyone can search skills or browse a course's public skill list

## 📡 API Endpoints

All endpoints below are available under both `/api` and `/api/v1`.

### Health Check
- `GET /api/health` — Returns `{ status: "ok", uptime, timestamp, dbState }`

### Authentication
- `POST /api/auth/register` — Register a new student or instructor
- `POST /api/auth/login` — Login and obtain JWT token
- `POST /api/auth/logout` — Logout the current user
- `GET /api/auth/me` — Retrieve current authenticated user profile *(auth required)*

### Courses
- `GET /api/courses` — List all courses
- `GET /api/courses/:id` — Get a course by id
- `GET /api/courses/my` — List courses owned by the current instructor *(instructor)*
- `GET /api/courses/:courseId/public-skills` — Public/student view of a course's skills
- `POST /api/courses` — Create a course *(instructor)*
- `PUT /api/courses/:id` — Update a course *(instructor)*
- `DELETE /api/courses/:id` — Delete a course *(instructor)*

### Skills
- `GET /api/skills/search` — Search skills across courses
- `GET /api/courses/:courseId/skills` — List a course's skills *(instructor)*
- `POST /api/courses/:courseId/skills` — Add a skill to a course *(instructor)*
- `PUT /api/courses/:courseId/skills/:skillId` — Update a course skill *(instructor)*
- `DELETE /api/courses/:courseId/skills/:skillId` — Remove a skill from a course *(instructor)*

### Verification Requests
- `POST /api/verification-requests` — Submit a skill verification request *(student)*
- `GET /api/verification-requests/my` — List the current student's requests *(student)*
- `PUT /api/verification-requests/:id` — Edit a pending request *(student)*
- `DELETE /api/verification-requests/:id` — Cancel a request *(student)*
- `POST /api/verification-requests/:id/resubmit` — Resubmit a rejected request *(student)*
- `GET /api/verification-requests/instructor` — List requests awaiting review *(instructor)*
- `PUT /api/verification-requests/:id/approve` — Approve a verification request *(instructor)*
- `PUT /api/verification-requests/:id/reject` — Reject a verification request *(instructor)*

### Passport
- `GET /api/passport/my` — Get the current student's skill passport *(student)*
- `GET /api/passport/my/skill-map` — Get the current student's skill map *(student)*

### Analytics
- `GET /api/analytics/overview` — Overall verification analytics *(instructor)*
- `GET /api/analytics/skills` — Per-skill analytics *(instructor)*
