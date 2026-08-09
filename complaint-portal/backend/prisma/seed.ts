import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

const categories = ['Pothole', 'Road Damage', 'Water Logging', 'Other'];
const severities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Pending', 'Progressed', 'Under Construction', 'Done'];

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

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Admin User
  const adminHashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@complaints.com' },
    update: {
      name: 'Admin',
      passwordHash: adminHashedPassword,
      role: 'admin',
    },
    create: {
      name: 'Admin',
      email: 'admin@complaints.com',
      passwordHash: adminHashedPassword,
      role: 'admin',
    },
  });
  console.log('✅ Admin user created/verified:', adminUser.email);

  // 2. Clear existing complaints if re-seeding
  await prisma.complaint.deleteMany({});

  // 3. Seed 30 mock complaints
  let complaintCounter = 1;
  const year = new Date().getFullYear();

  for (let i = 0; i < 30; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const offsetLat = (Math.random() - 0.5) * 0.1;
    const offsetLng = (Math.random() - 0.5) * 0.1;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));

    const complaintId = `PTH-${year}-${String(complaintCounter).padStart(5, '0')}`;
    complaintCounter++;

    await prisma.complaint.create({
      data: {
        complaintId,
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
        createdAt: createdDate,
        updatedAt: new Date(),
        estimatedCompletion:
          status !== 'Done'
            ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
            : null,
        assignedTeam: status !== 'Pending' ? `Team ${Math.floor(Math.random() * 5) + 1}` : null,
        notes:
          status === 'Under Construction' ? 'Construction work is actively underway on site.' : null,
      },
    });
  }

  console.log('✅ Seeded 30 mock complaints successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
