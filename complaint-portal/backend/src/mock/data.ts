/**
 * Mock Data for Complaint Management Portal
 * Simulates a database with realistic complaint data
 */

import { v4 as uuidv4 } from 'uuid';

export interface Detection {
  id: string;
  class_id: number;
  class_name: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Complaint {
  id: string;
  complaintId: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  category: 'Pothole' | 'Road Damage' | 'Water Logging' | 'Other';
  description: string;
  imagePreview?: string; // Base64 encoded image preview
  latitude: number;
  longitude: number;
  address: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
  assignedTo?: string;
  notes?: string;
}

// Initialize empty complaints array - will be populated with mock data
let complaintsDatabase: Complaint[] = [];

// Generate auto-incrementing complaint IDs
let complaintCounter = 1;
const generateComplaintId = (): string => {
  const id = `PTH-${new Date().getFullYear()}-${String(complaintCounter).padStart(5, '0')}`;
  complaintCounter++;
  return id;
};

// Indian cities with coordinates for realistic data
const cities = [
  { name: 'Bangalore, Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi, India', lat: 28.7041, lng: 77.1025 },
  { name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Chandigarh, India', lat: 30.7333, lng: 76.7794 },
];

const categories: Array<'Pothole' | 'Road Damage' | 'Water Logging' | 'Other'> = [
  'Pothole',
  'Road Damage',
  'Water Logging',
  'Other',
];

const severities: Array<'Low' | 'Medium' | 'High' | 'Critical'> = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const statuses: Array<'Pending' | 'Assigned' | 'In Progress' | 'Completed'> = [
  'Pending',
  'Assigned',
  'In Progress',
  'Completed',
];

const descriptions = [
  'Large pothole on main road causing vehicles to swerve',
  'Multiple potholes affecting traffic flow during rush hours',
  'Road is completely damaged with deep cracks and holes',
  'Water logging issue causing waterborne diseases',
  'Severe road deterioration near school area - safety hazard',
  'Pothole causing accidents to two-wheelers',
  'Road surface completely worn out needs resurfacing',
  'Water accumulation blocking traffic for 50 meters',
  'Dangerous pothole deep enough to damage car suspension',
  'Road subsidence with water drainage issues',
  'Multiple damages across the street segment',
  'Severe pothole near junction causing traffic accidents',
  'Waterlogging preventing normal drainage',
  'Uneven road surface causing difficulties for elderly citizens',
  'Critical road damage affecting public transport route',
];

const names = [
  'Rahul Kumar', 'Priya Singh', 'Amit Patel', 'Sneha Gupta', 'Arjun Reddy',
  'Neha Sharma', 'Vikas Malhotra', 'Anjali Verma', 'Rohan Kapoor', 'Deepika Iyer',
  'Suresh Nayak', 'Pooja Desai', 'Sanjay Kulkarni', 'Divya Murthy', 'Arun Bhat',
  'Shreya Nambiar', 'Manoj Rao', 'Kavya Saxena', 'Harsha Reddy', 'Nisha Chopra',
  'Ravi Mishra', 'Ananya Roy', 'Vishal Singh', 'Ritika Das', 'Sandeep Yadav',
  'Meera Iyer', 'Vikram Sinha', 'Priyanka Desai', 'Ashok Kumar', 'Simran Kaur',
];

// Initialize mock data with 30 realistic complaints
export const initializeMockData = () => {
  complaintsDatabase = [];
  complaintCounter = 1;

  for (let i = 0; i < 30; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const offsetLat = (Math.random() - 0.5) * 0.1;
    const offsetLng = (Math.random() - 0.5) * 0.1;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));

    const complaint: Complaint = {
      id: uuidv4(),
      complaintId: generateComplaintId(),
      fullName: names[Math.floor(Math.random() * names.length)],
      mobileNumber: `+91${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`,
      email: `user${i}@example.com`,
      category: categories[Math.floor(Math.random() * categories.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      latitude: city.lat + offsetLat,
      longitude: city.lng + offsetLng,
      address: city.name,
      severity: severities[Math.floor(Math.random() * severities.length)],
      status,
      createdAt: createdDate.toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedCompletion:
        status !== 'Completed'
          ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      assignedTo: status !== 'Pending' ? `Team ${Math.floor(Math.random() * 5) + 1}` : undefined,
      notes:
        status === 'In Progress' ? 'Materials ordered, repair scheduled for next week.' : undefined,
    };

    complaintsDatabase.push(complaint);
  }
};

// API Functions
export const getAllComplaints = (): Complaint[] => {
  return [...complaintsDatabase];
};

export const getComplaintById = (id: string): Complaint | null => {
  return complaintsDatabase.find((c) => c.complaintId === id) || null;
};

export const createComplaint = (data: Omit<Complaint, 'id' | 'complaintId' | 'createdAt' | 'updatedAt' | 'estimatedCompletion' | 'assignedTo' | 'notes' | 'status'>): Complaint => {
  const complaint: Complaint = {
    ...data,
    id: uuidv4(),
    complaintId: generateComplaintId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Pending',
    estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  complaintsDatabase.push(complaint);
  return complaint;
};

export const updateComplaintStatus = (
  id: string,
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed'
): Complaint | null => {
  const complaint = complaintsDatabase.find((c) => c.complaintId === id);
  if (!complaint) return null;

  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();

  if (status === 'Assigned') {
    complaint.assignedTo = `Team ${Math.floor(Math.random() * 5) + 1}`;
  }
  if (status === 'In Progress') {
    complaint.notes = 'Materials ordered, repair scheduled for next week.';
  }
  if (status === 'Completed') {
    complaint.estimatedCompletion = undefined;
    complaint.notes = 'Repair completed successfully. Road surface restored.';
  }

  return complaint;
};

export const deleteComplaint = (id: string): boolean => {
  const index = complaintsDatabase.findIndex((c) => c.complaintId === id);
  if (index === -1) return false;

  complaintsDatabase.splice(index, 1);
  return true;
};

export const getDashboardStats = () => {
  const total = complaintsDatabase.length;
  const pending = complaintsDatabase.filter((c) => c.status === 'Pending').length;
  const assigned = complaintsDatabase.filter((c) => c.status === 'Assigned').length;
  const inProgress = complaintsDatabase.filter((c) => c.status === 'In Progress').length;
  const completed = complaintsDatabase.filter((c) => c.status === 'Completed').length;

  const severityCounts = {
    low: complaintsDatabase.filter((c) => c.severity === 'Low').length,
    medium: complaintsDatabase.filter((c) => c.severity === 'Medium').length,
    high: complaintsDatabase.filter((c) => c.severity === 'High').length,
    critical: complaintsDatabase.filter((c) => c.severity === 'Critical').length,
  };

  const statusCounts = {
    pending,
    assigned,
    inProgress,
    completed,
  };

  return {
    total,
    pending,
    assigned,
    inProgress,
    completed,
    severityCounts,
    statusCounts,
  };
};

export const getHeatmapData = () => {
  return complaintsDatabase.map((complaint) => ({
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

export const searchComplaints = (query: string): Complaint[] => {
  const lowerQuery = query.toLowerCase();
  return complaintsDatabase.filter((c) =>
    c.complaintId.toLowerCase().includes(lowerQuery) ||
    c.address.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery) ||
    c.fullName.toLowerCase().includes(lowerQuery)
  );
};
