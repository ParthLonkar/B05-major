import bcrypt from 'bcrypt';
import { Complaint as PrismaComplaint } from '@prisma/client';
import { Complaint } from '../mock/data';
import { prisma } from './prisma';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const toComplaint = (row: PrismaComplaint): Complaint => ({
  id: String(row.id),
  complaintId: row.complaintId,
  fullName: row.fullName,
  mobileNumber: row.mobileNumber,
  email: row.email ?? undefined,
  category: row.category as Complaint['category'],
  description: row.description,
  imagePreview: row.imagePreview ?? undefined,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  address: row.address,
  severity: row.severity as Complaint['severity'],
  status: row.status as Complaint['status'],
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  estimatedCompletion: row.estimatedCompletion?.toISOString(),
  assignedTo: row.assignedTeam ?? undefined,
  notes: row.notes ?? undefined,
});

const findComplaint = (id: string) => {
  const numericId = Number(id);
  return prisma.complaint.findFirst({
    where: {
      OR: [
        { complaintId: id },
        ...(Number.isSafeInteger(numericId) && numericId > 0 ? [{ id: numericId }] : []),
      ],
    },
  });
};

export const initializeDatabase = async (): Promise<void> => {
  await prisma.$connect();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('ADMIN_PASSWORD must be set before starting the backend.');
  await prisma.user.upsert({
    where: { email: 'admin@complaints.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@complaints.com',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'admin',
    },
  });
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    password: row.passwordHash,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.createdAt.toISOString(),
  };
};

export const createUser = async (name: string, email: string, password: string): Promise<User> => {
  const normalizedEmail = email.toLowerCase();
  const row = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'user',
    },
  });
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    password: row.passwordHash,
    role: 'user',
    createdAt: row.createdAt.toISOString(),
  };
};

export const getAllComplaints = async (): Promise<Complaint[]> => {
  const rows = await prisma.complaint.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toComplaint);
};

export const getComplaintById = async (id: string): Promise<Complaint | null> => {
  const row = await findComplaint(id);
  return row ? toComplaint(row) : null;
};

export const searchComplaints = async (query: string): Promise<Complaint[]> => {
  const rows = await prisma.complaint.findMany({
    where: {
      OR: [
        { complaintId: { contains: query } },
        { address: { contains: query } },
        { description: { contains: query } },
        { fullName: { contains: query } },
        { email: { contains: query } },
        { mobileNumber: { contains: query } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toComplaint);
};

export const createComplaint = async (
  data: Omit<Complaint, 'id' | 'complaintId' | 'createdAt' | 'updatedAt' | 'estimatedCompletion' | 'assignedTo' | 'notes' | 'status'>,
  uploadedFilePath?: string
): Promise<Complaint> => {
  const year = new Date().getFullYear();
  const prefix = `PTH-${year}-`;
  const latest = await prisma.complaint.findFirst({
    where: { complaintId: { startsWith: prefix } },
    orderBy: { complaintId: 'desc' },
    select: { complaintId: true },
  });
  const latestNumber = latest ? Number(latest.complaintId.slice(prefix.length)) : 0;
  const complaintId = `${prefix}${String(latestNumber + 1).padStart(5, '0')}`;

  const row = await prisma.complaint.create({
    data: {
      complaintId,
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      email: data.email || null,
      category: data.category,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      severity: data.severity,
      imagePreview: uploadedFilePath || data.imagePreview || null,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return toComplaint(row);
};

export const updateComplaintStatus = async (
  id: string,
  status: 'Pending' | 'Progressed' | 'Under Construction' | 'Done'
): Promise<Complaint | null> => {
  const existing = await findComplaint(id);
  if (!existing) return null;

  let assignedTeam = existing.assignedTeam;
  let notes = existing.notes;
  let estimatedCompletion = existing.estimatedCompletion;
  if (status === 'Progressed') {
    assignedTeam = `Team ${Math.floor(Math.random() * 5) + 1}`;
    notes = 'Work has been initiated and team assigned.';
  } else if (status === 'Under Construction') {
    notes = 'Construction work is actively underway on site.';
  } else if (status === 'Done') {
    estimatedCompletion = null;
    notes = 'Work completed successfully. Issue resolved.';
  }

  const row = await prisma.complaint.update({
    where: { id: existing.id },
    data: { status, assignedTeam, notes, estimatedCompletion },
  });
  return toComplaint(row);
};

export const deleteComplaint = async (id: string): Promise<boolean> => {
  const existing = await findComplaint(id);
  if (!existing) return false;
  await prisma.complaint.delete({ where: { id: existing.id } });
  return true;
};

export const getDashboardStats = async () => {
  const complaints = await prisma.complaint.findMany({ select: { status: true, severity: true } });
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const progressed = complaints.filter((c) => c.status === 'Progressed').length;
  const underConstruction = complaints.filter((c) => c.status === 'Under Construction').length;
  const done = complaints.filter((c) => c.status === 'Done').length;
  return {
    total: complaints.length,
    pending,
    progressed,
    underConstruction,
    done,
    severityCounts: {
      low: complaints.filter((c) => c.severity === 'Low').length,
      medium: complaints.filter((c) => c.severity === 'Medium').length,
      high: complaints.filter((c) => c.severity === 'High').length,
      critical: complaints.filter((c) => c.severity === 'Critical').length,
    },
    statusCounts: { pending, progressed, underConstruction, done },
  };
};

export const getHeatmapData = async () => {
  const rows = await prisma.complaint.findMany({
    select: {
      complaintId: true,
      latitude: true,
      longitude: true,
      severity: true,
      status: true,
      description: true,
      category: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.complaintId,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    severity: row.severity,
    status: row.status,
    description: row.description,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  }));
};
