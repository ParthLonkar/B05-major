import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Complaint } from '../mock/data';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Stored password hash
  role: 'user' | 'admin';
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
}

const DB_PATH = path.resolve(__dirname, '../../data/portal-db.json');
const SQLITE_DB_PATH = path.resolve(__dirname, '../../data/portal-auth.db');

const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite auth database:', err.message);
  }
});

const runSql = <T = void>(sql: string, params: any[] = []): Promise<T> =>
  new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this as unknown as T);
    });
  });

const getSql = <T = any>(sql: string, params: any[] = []): Promise<T | null> =>
  new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((row as T) ?? null);
    });
  });

const allSql = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((rows as T[]) ?? []);
    });
  });

// Helper functions for JSON file operations
const readDatabase = (): DatabaseSchema => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], complaints: [] };
  }
};

const writeDatabase = (data: DatabaseSchema): void => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

const generateComplaintId = (): string => {
  const year = new Date().getFullYear();
  const db = readDatabase();

  const existingNumbers = db.complaints
    .map((c) => c.complaintId.match(/PTH-\d{4}-(\d{5})/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => Number(match[1]));

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `PTH-${year}-${String(nextNumber).padStart(5, '0')}`;
};

export const initializeDatabase = async () => {
  try {
    const dir = path.dirname(SQLITE_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await runSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
        createdAt TEXT NOT NULL
      )
    `);

    const existingAdmin = await getSql<{ id: string }>(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await runSql(
        `INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, 'admin', ?)` ,
        ['admin1', 'Admin', 'admin@complaints.com', hashedPassword, new Date().toISOString()]
      );
      console.log('✅ Admin user initialized in SQLite database.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const row = await getSql<User>(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email]);
  return row || null;
};

export const createUser = async (name: string, email: string, password: string): Promise<User> => {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  await runSql(
    `INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, 'user', ?)`,
    [newUser.id, newUser.name, newUser.email, newUser.password, newUser.createdAt]
  );

  return newUser;
};

export const getAllComplaints = async (): Promise<Complaint[]> => {
  const db = readDatabase();
  return db.complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getComplaintById = async (id: string): Promise<Complaint | null> => {
  const db = readDatabase();
  const complaint = db.complaints.find(
    (c) => c.complaintId === id || c.id === id
  );
  return complaint || null;
};

export const searchComplaints = async (query: string): Promise<Complaint[]> => {
  const db = readDatabase();
  const lowerQuery = query.toLowerCase();
  
  const results = db.complaints.filter((c) =>
    c.complaintId.toLowerCase().includes(lowerQuery) ||
    c.address.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery) ||
    c.fullName.toLowerCase().includes(lowerQuery) ||
    (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
    c.mobileNumber.includes(lowerQuery)
  );

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createComplaint = async (
  data: Omit<Complaint, 'id' | 'complaintId' | 'createdAt' | 'updatedAt' | 'estimatedCompletion' | 'assignedTo' | 'notes' | 'status'>,
  uploadedFilePath?: string
): Promise<Complaint> => {
  const complaintId = generateComplaintId();
  const estimatedCompletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const newComplaint: Complaint = {
    id: uuidv4(),
    complaintId,
    fullName: data.fullName,
    mobileNumber: data.mobileNumber,
    email: data.email,
    category: data.category,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    severity: data.severity,
    status: 'Pending',
    imagePreview: uploadedFilePath || data.imagePreview,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedCompletion,
  };

  const db = readDatabase();
  db.complaints.push(newComplaint);
  writeDatabase(db);

  return newComplaint;
};

export const updateComplaintStatus = async (
  id: string,
  status: 'Pending' | 'Progressed' | 'Under Construction' | 'Done'
): Promise<Complaint | null> => {
  const db = readDatabase();
  const index = db.complaints.findIndex((c) => c.complaintId === id || c.id === id);
  
  if (index === -1) return null;

  const complaint = db.complaints[index];
  
  let assignedTo: string | undefined = complaint.assignedTo;
  let notes: string | undefined = complaint.notes;
  let estimatedCompletion: string | undefined = complaint.estimatedCompletion;

  if (status === 'Progressed') {
    assignedTo = `Team ${Math.floor(Math.random() * 5) + 1}`;
    notes = 'Work has been initiated and team assigned.';
  }

  if (status === 'Under Construction') {
    notes = 'Construction work is actively underway on site.';
  }

  if (status === 'Done') {
    estimatedCompletion = undefined;
    notes = 'Work completed successfully. Issue resolved.';
  }

  db.complaints[index] = {
    ...complaint,
    status,
    assignedTo,
    notes,
    estimatedCompletion,
    updatedAt: new Date().toISOString(),
  };

  writeDatabase(db);
  return db.complaints[index];
};

export const deleteComplaint = async (id: string): Promise<boolean> => {
  const db = readDatabase();
  const index = db.complaints.findIndex((c) => c.complaintId === id || c.id === id);
  
  if (index === -1) return false;

  try {
    db.complaints.splice(index, 1);
    writeDatabase(db);
    return true;
  } catch (error) {
    console.error('Failed to delete complaint:', error);
    return false;
  }
};

export const getDashboardStats = async () => {
  const db = readDatabase();
  const complaints = db.complaints;

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const progressed = complaints.filter((c) => c.status === 'Progressed').length;
  const underConstruction = complaints.filter((c) => c.status === 'Under Construction').length;
  const done = complaints.filter((c) => c.status === 'Done').length;

  const lowSeverity = complaints.filter((c) => c.severity === 'Low').length;
  const mediumSeverity = complaints.filter((c) => c.severity === 'Medium').length;
  const highSeverity = complaints.filter((c) => c.severity === 'High').length;
  const criticalSeverity = complaints.filter((c) => c.severity === 'Critical').length;

  return {
    total,
    pending,
    progressed,
    underConstruction,
    done,
    severityCounts: {
      low: lowSeverity,
      medium: mediumSeverity,
      high: highSeverity,
      critical: criticalSeverity,
    },
    statusCounts: {
      pending,
      progressed,
      underConstruction,
      done,
    },
  };
};

export const getHeatmapData = async () => {
  const db = readDatabase();
  
  return db.complaints.map((c) => ({
    id: c.complaintId,
    latitude: c.latitude,
    longitude: c.longitude,
    severity: c.severity,
    status: c.status,
    description: c.description,
    category: c.category,
    createdAt: c.createdAt,
  }));
};
