# Micro-credential & Skill Passport System

ระบบจัดการและตรวจสอบทักษะ (Skill Passport) และใบรับรองย่อย (Micro-credentials) สำหรับนักศึกษาและผู้สอน

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

## 📡 API Endpoints

### Health Check (TON-51)
- `GET /api/health` — Returns `{ status: "ok", uptime, timestamp, dbState }`

### Authentication
- `POST /api/auth/register` — Register a new student or instructor
- `POST /api/auth/login` — Login and obtain JWT token
- `GET /api/auth/me` — Retrieve current authenticated user profile
