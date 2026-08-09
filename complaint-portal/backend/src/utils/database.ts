import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from './prisma';
import { Complaint } from '../mock/data';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Stored password hash
  role: 'user' | 'admin';
  createdAt: string;
}

const mapPrismaComplaintToComplaint = (c: any): Complaint => ({
  id: c.uuid,
  complaintId: c.complaintId,
  fullName: c.fullName,
  mobileNumber: c.mobileNumber,
  email: c.email || undefined,
  category: c.category as any,
  description: c.description,
  imagePreview: c.imagePreview || undefined,
  latitude: Number(c.latitude),
  longitude: Number(c.longitude),
  address: c.address,
  severity: c.severity as any,
  status: c.status as any,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
  estimatedCompletion: c.estimatedCompletion ? c.estimatedCompletion.toISOString() : undefined,
  assignedTo: c.assignedTeam || undefined,
  notes: c.notes || undefined,
});

const generateComplaintId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const complaints = await prisma.complaint.findMany({
    select: { complaintId: true },
  });

  const existingNumbers = complaints
    .map((c) => c.complaintId.match(/PTH-\d{4}-(\d{5})/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => Number(match[1]));

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `PTH-${year}-${String(nextNumber).padStart(5, '0')}`;
};

export const initializeDatabase = async () => {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@complaints.com',
          passwordHash: hashedPassword,
          role: 'admin',
        },
      });
      console.log('✅ Admin user initialized in MySQL database.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.uuid,
    name: dbUser.name,
    email: dbUser.email,
    password: dbUser.passwordHash,
    role: dbUser.role === 'admin' ? 'admin' : 'user',
    createdAt: dbUser.createdAt.toISOString(),
  };
};

export const createUser = async (name: string, email: string, password: string): Promise<User> => {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const dbUser = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'user',
    },
  });

  return {
    id: dbUser.uuid,
    name: dbUser.name,
    email: dbUser.email,
    password: dbUser.passwordHash,
    role: 'user',
    createdAt: dbUser.createdAt.toISOString(),
  };
};

export const getAllComplaints = async (): Promise<Complaint[]> => {
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return complaints.map(mapPrismaComplaintToComplaint);
};

export const getComplaintById = async (id: string): Promise<Complaint | null> => {
  const isNumeric = /^\d+$/.test(id);
  const complaint = await prisma.complaint.findFirst({
    where: {
      OR: [
        { complaintId: id },
        { uuid: id },
        ...(isNumeric ? [{ id: parseInt(id, 10) }] : []),
      ],
    },
  });

  return complaint ? mapPrismaComplaintToComplaint(complaint) : null;
};

export const searchComplaints = async (query: string): Promise<Complaint[]> => {
  const lowerQuery = query.toLowerCase();
  const complaints = await prisma.complaint.findMany({
    where: {
      OR: [
        { complaintId: { contains: lowerQuery } },
        { address: { contains: lowerQuery } },
        { description: { contains: lowerQuery } },
        { fullName: { contains: lowerQuery } },
        { email: { contains: lowerQuery } },
        { mobileNumber: { contains: lowerQuery } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return complaints.map(mapPrismaComplaintToComplaint);
};

export const createComplaint = async (
  data: Omit<Complaint, 'id' | 'complaintId' | 'createdAt' | 'updatedAt' | 'estimatedCompletion' | 'assignedTo' | 'notes' | 'status'>
): Promise<Complaint> => {
  const complaintId = await generateComplaintId();
  const estimatedCompletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const newComplaint = await prisma.complaint.create({
    data: {
      complaintId,
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      email: data.email || null,
      category: data.category,
      description: data.description,
      latitude: new Prisma.Decimal(data.latitude),
      longitude: new Prisma.Decimal(data.longitude),
      address: data.address,
      severity: data.severity,
      status: 'Pending',
      imagePreview: data.imagePreview || null,
      estimatedCompletion,
    },
  });

  return mapPrismaComplaintToComplaint(newComplaint);
};

export const updateComplaintStatus = async (
  id: string,
  status: 'Pending' | 'Progressed' | 'Under Construction' | 'Done'
): Promise<Complaint | null> => {
  const target = await getComplaintById(id);
  if (!target) return null;

  let assignedTeam: string | undefined = target.assignedTo;
  let notes: string | undefined = target.notes;
  let estimatedCompletion: Date | null = target.estimatedCompletion
    ? new Date(target.estimatedCompletion)
    : null;

  if (status === 'Progressed') {
    assignedTeam = `Team ${Math.floor(Math.random() * 5) + 1}`;
    notes = 'Work has been initiated and team assigned.';
  }

  if (status === 'Under Construction') {
    notes = 'Construction work is actively underway on site.';
  }

  if (status === 'Done') {
    estimatedCompletion = null;
    notes = 'Work completed successfully. Issue resolved.';
  }

  const updated = await prisma.complaint.update({
    where: { complaintId: target.complaintId },
    data: {
      status,
      assignedTeam,
      notes,
      estimatedCompletion,
    },
  });

  return mapPrismaComplaintToComplaint(updated);
};

export const deleteComplaint = async (id: string): Promise<boolean> => {
  const target = await getComplaintById(id);
  if (!target) return false;

  try {
    await prisma.complaint.delete({
      where: { complaintId: target.complaintId },
    });
    return true;
  } catch (error) {
    console.error('Failed to delete complaint:', error);
    return false;
  }
};

export const getDashboardStats = async () => {
  const total = await prisma.complaint.count();
  const pending = await prisma.complaint.count({ where: { status: 'Pending' } });
  const progressed = await prisma.complaint.count({ where: { status: 'Progressed' } });
  const underConstruction = await prisma.complaint.count({ where: { status: 'Under Construction' } });
  const done = await prisma.complaint.count({ where: { status: 'Done' } });

  const lowSeverity = await prisma.complaint.count({ where: { severity: 'Low' } });
  const mediumSeverity = await prisma.complaint.count({ where: { severity: 'Medium' } });
  const highSeverity = await prisma.complaint.count({ where: { severity: 'High' } });
  const criticalSeverity = await prisma.complaint.count({ where: { severity: 'Critical' } });

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
  const complaints = await prisma.complaint.findMany({
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

  return complaints.map((c) => ({
    id: c.complaintId,
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
    severity: c.severity,
    status: c.status,
    description: c.description,
    category: c.category,
    createdAt: c.createdAt.toISOString(),
  }));
};
