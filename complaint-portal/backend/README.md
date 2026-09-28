# Complaint Portal - Backend API

Express.js + TypeScript backend API for the Pothole Complaint Management Portal, connected to a MySQL database via Prisma ORM.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm
- MySQL Server (listening on localhost:3306)
- Database created: `pothole_db`

### 2. Environment Setup
Create a `.env` file in `complaint-portal/backend/`:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pothole_db
DATABASE_URL="mysql://root:@localhost:3306/pothole_db"

# JWT Authentication Secret
JWT_SECRET=your_random_secret_here
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Prisma Database Migrations & Seed
On a fresh setup or new machine, run:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations (creates database tables)
npm run prisma:migrate

# Seed database with initial admin user and 30 realistic complaints
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000/api`.

---

## 🗄️ Database Schema & Features

- **Users (`users`)**: Admin and user accounts with bcrypt-hashed passwords (default admin: `admin@complaints.com` / `admin123`).
- **Complaints (`complaints`)**: Pothole and road damage complaints (`PTH-YYYY-XXXXX`).
- **Images (`images`)**: Uploaded/annotated image references linked to complaints (with `onDelete: Cascade`).
- **Detections (`detections`)**: AI YOLO detection results and bounding box JSON data (with `onDelete: Cascade`).

---

## 🔌 API Endpoints Summary

- `POST /api/auth/login` - Authenticate user or admin
- `POST /api/auth/register` - Register a new user
- `GET /api/complaints` - Fetch all complaints
- `GET /api/complaints/:id` - Fetch complaint details by ID
- `POST /api/complaints` - Create a new complaint
- `PUT /api/complaints/:id/status` - Update complaint status
- `DELETE /api/complaints/:id` - Delete complaint (cascades to related images & detections)
- `GET /api/complaints/search/query?q=` - Search complaints
- `GET /api/dashboard/stats` - Fetch overall stats & counts
- `GET /api/dashboard/heatmap` - Fetch coordinate data for map visualization
- `GET /api/health` - API Health check
