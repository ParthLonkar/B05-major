import path from 'path';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import complaintRoutes from './routes/complaints';
import dashboardRoutes from './routes/dashboard';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './utils/database';

const envCandidates = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];

envCandidates.forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

const startServer = async () => {
  await initializeDatabase();

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'OK',
      message: 'Complaint Management Portal API is running',
      service: 'Complaint Management Portal',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  // Start server
  app.listen(port, () => {
    console.log(`🚀 Complaint Management Portal Backend running on http://localhost:${port}`);
    console.log(`📍 Health check: http://localhost:${port}/api/health`);
    console.log(`📝 Complaints API: http://localhost:${port}/api/complaints`);
    console.log(`🔐 Auth API: http://localhost:${port}/api/auth`);
    console.log(`📊 Dashboard API: http://localhost:${port}/api/dashboard`);
    console.log(`🖼️ Static Uploads: http://localhost:${port}/uploads`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
