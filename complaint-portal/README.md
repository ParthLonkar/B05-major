# Pothole Complaint Management Portal

A complete web-based complaint management system for tracking and managing pothole and road damage complaints. Built with React, TypeScript, Express.js, and Tailwind CSS. This portal seamlessly integrates with the existing Pothole Detection System.

## 🎯 Features

- **User Portal**
  - Beautiful splash screen and login
  - Complaint registration with GPS coordinates
  - Image upload preview (base64 storage)
  - Complaint tracking and status monitoring
  - Interactive heatmap with color-coded markers
  - Real-time status updates
  - Responsive mobile-first design

- **Admin Dashboard**
  - Comprehensive complaints management
  - Status updates (Pending → Assigned → In Progress → Completed)
  - Severity and status analytics
  - Quick statistics and charts
  - Bulk complaint viewing and filtering
  - Delete capability for complaints

- **Mock Data**
  - 30 pre-loaded realistic complaints
  - Different Indian cities with coordinates
  - Various severity levels and statuses
  - Automatic complaint ID generation

- **Design**
  - Modern Material Design inspired UI
  - Glassmorphism effects
  - Smooth animations and transitions
  - Dark mode support
  - Mobile app-like experience
  - Fully responsive

## 📋 Project Structure

```
complaint-portal/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Header, Navigation, FAB
│   │   │   ├── complaint/      # Complaint-specific components
│   │   │   └── ui/             # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API services
│   │   ├── context/            # React Context
│   │   ├── types/              # TypeScript definitions
│   │   ├── utils/              # Utility functions
│   │   ├── assets/             # Static assets
│   │   ├── App.tsx             # Main App component
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind styles
│   ├── public/                 # Static files
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── index.html
│
├── backend/
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Express middleware
│   │   ├── mock/               # Mock data
│   │   ├── utils/              # Utilities
│   │   └── server.ts           # Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git

### Frontend Setup

```bash
cd complaint-portal/frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Setup

```bash
cd complaint-portal/backend

# Install dependencies
npm install

# Start backend server (runs on http://localhost:5000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Both Services Together

```bash
# Terminal 1: Backend
cd complaint-portal/backend && npm run dev

# Terminal 2: Frontend
cd complaint-portal/frontend && npm run dev
```

The application will be available at `http://localhost:3000`

## 🔐 Authentication

### User Login
- **Any Name**: Enter any name you want
- **Any Email**: Enter any valid email format
- **Password**: Any value

### Admin Login
- **Username**: `admin`
- **Password**: `admin123`

## 📱 Mobile-First Design

The application is built with a mobile-first approach:
- Responsive layout works on phones (320px), tablets, and desktops
- Bottom navigation for easy thumb navigation
- Touch-friendly buttons and spacing
- Full-screen modal interactions
- Swipe-compatible components

## 🗺️ Heatmap Features

- **Color-Coded Markers**
  - 🔴 Red: Pending complaints
  - 🟡 Yellow: In Progress
  - 🟢 Green: Completed

- **Interactive Map**
  - Click markers to view details
  - Filter by status
  - View complaint coordinates
  - Display severity and description

## 🎨 UI/UX Components

### Reusable Components
- `Button` - Multiple variants and sizes
- `Card` - Elevated containers
- `Input` - Text input with validation
- `Select` - Dropdown selector
- `TextArea` - Multi-line text input
- `Badge` - Status and severity indicators
- `Modal` - Dialogs and confirmations
- `LoadingSpinner` - Loading states
- `Toast` - Notifications
- `EmptyState` - No data states

### Custom Hooks
- `useGeolocation` - GPS coordinate fetching
- `useLocalStorage` - Browser storage management
- `useToast` - Notification management

## 🔌 API Endpoints

### Complaints
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/:id` - Get specific complaint
- `POST /api/complaints` - Create new complaint
- `PUT /api/complaints/:id/status` - Update status
- `DELETE /api/complaints/:id` - Delete complaint
- `GET /api/complaints/search/query` - Search complaints

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/heatmap` - Get heatmap data

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register a user with name, email, and password

### Environment Variables
#### Frontend
- `VITE_API_URL` - Backend API URL, defaults to `http://localhost:5000/api`
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key for the live heatmap and complaint location preview

#### Backend
- `PORT` - Backend port, defaults to `5000`
- `SMTP_HOST` - SMTP server host for email notifications
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - Optional sender email address for complaint confirmation emails

## Environment Setup
Create a `.env` file in `backend/` and add your mail server settings if you want email notifications:

```bash
PORT=5000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=no-reply@complaint-portal.local
```

Create or update `frontend/.env` with your map key:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Health
- `GET /api/health` - Health check endpoint

## 📊 Mock Data Structure

```typescript
{
  id: "uuid",
  complaintId: "PTH-2026-00001",
  fullName: "User Name",
  mobileNumber: "+91XXXXXXXXXX",
  email: "user@email.com",
  category: "Pothole",
  description: "Complaint description",
  imagePreview: "base64string",
  latitude: 12.9716,
  longitude: 77.5946,
  address: "City Name",
  severity: "High",
  status: "Pending",
  createdAt: "ISO8601",
  updatedAt: "ISO8601",
  estimatedCompletion: "ISO8601",
  assignedTo: "Team 1",
  notes: "Admin notes"
}
```

## 🔄 Mock API Behavior

All APIs use in-memory arrays:
- Data persists during the session
- Resets on server restart
- No database required
- Full CRUD operations supported

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations (prepared)

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework
- **TypeScript** - Type safety
- **UUID** - ID generation
- **CORS** - Cross-origin support

## 📦 npm Packages

### Frontend Dependencies
```
react@^18.2.0
react-dom@^18.2.0
react-router-dom@^6.14.0
axios@^1.4.0
```

### Frontend DevDependencies
```
@vitejs/plugin-react@^4.0.0
tailwindcss@^3.3.3
postcss@^8.4.28
autoprefixer@^10.4.14
typescript@^5.1.6
vite@^4.4.5
```

### Backend Dependencies
```
express@^4.18.2
cors@^2.8.5
dotenv@^16.3.1
uuid@^9.0.0
```

### Backend DevDependencies
```
@types/express@^4.17.17
@types/node@^20.4.2
typescript@^5.1.6
ts-node@^10.9.1
```

## 🗄️ Database Integration

To connect a real database later, follow these steps:

### For MongoDB
1. Install `mongoose`: `npm install mongoose`
2. Create models in `backend/src/models/`
3. Update `backend/src/mock/data.ts` to `backend/src/models/index.ts`
4. Replace in-memory operations with database queries
5. Controllers already have the right structure

### For PostgreSQL
1. Install `prisma`: `npm install @prisma/client prisma`
2. Initialize: `npx prisma init`
3. Add your database URL to `.env`
4. Create schema in `prisma/schema.prisma`
5. Replace mock data operations with Prisma queries

### For MySQL
1. Install `typeorm`: `npm install typeorm mysql2`
2. Create entities in `backend/src/entities/`
3. Replace mock operations with TypeORM queries

**The architecture is designed to support database integration without changing the UI!**

## 🎬 App Flow

1. **Splash Screen** (3 seconds) → Beautiful intro
2. **Login Page** → User or Admin authentication
3. **Home Page** → Dashboard with quick stats
4. **Report Complaint** → Fill form with GPS & image
5. **Track Complaint** → Search and view status
6. **Heatmap** → Visualize complaints on map
7. **Admin Dashboard** → Manage all complaints

## 🔒 Security Notes

- Mock authentication (for demo purposes)
- No real password hashing
- Session stored in localStorage
- To add real auth: implement JWT tokens

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Common Issues

### CORS Errors
- Ensure backend runs on `http://localhost:5000`
- Frontend proxy configured in `vite.config.ts`

### API Not Found (404)
- Check backend is running
- Verify port is 5000
- Check route definitions in `backend/src/routes/`

### Module Not Found
- Clear `node_modules` and reinstall
- Clear Vite cache: `rm -rf dist`

### Dark Mode Not Working
- Check `prefers-color-scheme` in browser
- Toggle in system settings

## 📚 Component Examples

### Creating a Complaint
```typescript
const response = await complaintApi.create({
  fullName: "John Doe",
  mobileNumber: "+919876543210",
  email: "john@example.com",
  category: "Pothole",
  description: "Large pothole near main street",
  latitude: 12.9716,
  longitude: 77.5946,
  address: "Bangalore, Karnataka",
  severity: "High",
});
```

### Updating Status
```typescript
const response = await complaintApi.updateStatus(
  "PTH-2026-00001",
  "In Progress"
);
```

### Fetching Dashboard Stats
```typescript
const stats = await dashboardApi.getStats();
console.log(stats.total, stats.pending, stats.completed);
```

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [React Router](https://reactrouter.com)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Express.js](https://expressjs.com)

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Contributing

To extend this project:

1. Add new components in `frontend/src/components/`
2. Add new pages in `frontend/src/pages/`
3. Add new API routes in `backend/src/routes/`
4. Add new controllers in `backend/src/controllers/`

## 📞 Support

For questions or issues, refer to the inline code comments and TypeScript types for guidance.

---

**Built with ❤️ for Pothole Detection and Complaint Management**
