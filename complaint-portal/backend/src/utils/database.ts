import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Complaint, initializeMockData, getAllComplaints as getMockComplaints } from '../mock/data';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
}

const databaseFolder = path.resolve(__dirname, '..', '..', 'data');
const databasePath = path.join(databaseFolder, 'portal-db.json');

const ensureDatabaseFolder = async () => {
  await fs.mkdir(databaseFolder, { recursive: true });
};

const loadDatabase = async (): Promise<DatabaseSchema> => {
  await ensureDatabaseFolder();

  try {
    const raw = await fs.readFile(databasePath, 'utf8');
    const db = JSON.parse(raw) as DatabaseSchema;
    return db;
  } catch (error) {
    throw new Error('Unable to read complaint database');
  }
};

const saveDatabase = async (db: DatabaseSchema): Promise<void> => {
  await ensureDatabaseFolder();
  const payload = JSON.stringify(db, null, 2);
  await fs.writeFile(databasePath, payload, 'utf8');
};

const generateComplaintId = (complaints: Complaint[]) => {
  const year = new Date().getFullYear();
  const existingNumbers = complaints
    .map((c) => c.complaintId.match(/PTH-\d{4}-(\d{5})/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => Number(match[1]));

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `PTH-${year}-${String(nextNumber).padStart(5, '0')}`;
};

export const initializeDatabase = async () => {
  await ensureDatabaseFolder();

  try {
    await fs.access(databasePath);
    const db = await loadDatabase();
    const adminExists = db.users.some((user) => user.role === 'admin');
    if (!adminExists) {
      db.users.push({
        id: 'admin1',
        name: 'Admin',
        email: 'admin@complaints.com',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      await saveDatabase(db);
    }
  } catch {
    initializeMockData();
    const sampleComplaints = getMockComplaints();
    const db: DatabaseSchema = {
      users: [
        {
          id: 'admin1',
          name: 'Admin',
          email: 'admin@complaints.com',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
      ],
      complaints: sampleComplaints,
    };
    await saveDatabase(db);
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const db = await loadDatabase();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
};

export const createUser = async (name: string, email: string, password: string): Promise<User> => {
  const db = await loadDatabase();
  const existingUser = db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return existingUser;
  }

  const user: User = {
    id: uuidv4(),
    name,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await saveDatabase(db);
  return user;
};

export const getAllComplaints = async (): Promise<Complaint[]> => {
  const db = await loadDatabase();
  return [...db.complaints];
};

export const getComplaintById = async (id: string): Promise<Complaint | null> => {
  const db = await loadDatabase();
  return db.complaints.find((complaint) => complaint.complaintId === id) ?? null;
};

export const searchComplaints = async (query: string): Promise<Complaint[]> => {
  const db = await loadDatabase();
  const lowerQuery = query.toLowerCase();
  return db.complaints.filter((complaint) =>
    complaint.complaintId.toLowerCase().includes(lowerQuery) ||
    complaint.address.toLowerCase().includes(lowerQuery) ||
    complaint.description.toLowerCase().includes(lowerQuery) ||
    complaint.fullName.toLowerCase().includes(lowerQuery) ||
    complaint.email?.toLowerCase().includes(lowerQuery) ||
    complaint.mobileNumber.toLowerCase().includes(lowerQuery)
  );
};

export const createComplaint = async (data: Omit<Complaint, 'id' | 'complaintId' | 'createdAt' | 'updatedAt' | 'estimatedCompletion' | 'assignedTo' | 'notes' | 'status'>): Promise<Complaint> => {
  const db = await loadDatabase();

  const complaint: Complaint = {
    ...data,
    id: uuidv4(),
    complaintId: generateComplaintId(db.complaints),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Pending',
    estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  db.complaints.push(complaint);
  await saveDatabase(db);
  return complaint;
};

export const updateComplaintStatus = async (
  id: string,
  status: 'Pending' | 'Progressed' | 'Under Construction' | 'Done'
): Promise<Complaint | null> => {
  const db = await loadDatabase();
  const complaint = db.complaints.find((c) => c.complaintId === id);
  if (!complaint) return null;

  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();

  if (status === 'Progressed') {
    complaint.assignedTo = `Team ${Math.floor(Math.random() * 5) + 1}`;
    complaint.notes = 'Work has been initiated and team assigned.';
  }

  if (status === 'Under Construction') {
    complaint.notes = 'Construction work is actively underway on site.';
  }

  if (status === 'Done') {
    complaint.estimatedCompletion = undefined;
    complaint.notes = 'Work completed successfully. Issue resolved.';
  }

  await saveDatabase(db);
  return complaint;
};

export const deleteComplaint = async (id: string): Promise<boolean> => {
  const db = await loadDatabase();
  const index = db.complaints.findIndex((c) => c.complaintId === id);
  if (index === -1) return false;

  db.complaints.splice(index, 1);
  await saveDatabase(db);
  return true;
};

export const getDashboardStats = async () => {
  const db = await loadDatabase();
  const total = db.complaints.length;
  const pending = db.complaints.filter((c) => c.status === 'Pending').length;
  const progressed = db.complaints.filter((c) => c.status === 'Progressed').length;
  const underConstruction = db.complaints.filter((c) => c.status === 'Under Construction').length;
  const done = db.complaints.filter((c) => c.status === 'Done').length;

  return {
    total,
    pending,
    progressed,
    underConstruction,
    done,
    severityCounts: {
      low: db.complaints.filter((c) => c.severity === 'Low').length,
      medium: db.complaints.filter((c) => c.severity === 'Medium').length,
      high: db.complaints.filter((c) => c.severity === 'High').length,
      critical: db.complaints.filter((c) => c.severity === 'Critical').length,
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
  const db = await loadDatabase();
  return db.complaints.map((complaint) => ({
    id: complaint.complaintId,
    latitude: complaint.latitude,
    longitude: complaint.longitude,
    severity: complaint.severity,
    status: complaint.status,
    description: complaint.description,
    category: complaint.category,
    createdAt: complaint.createdAt,
  }));
};
