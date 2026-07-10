import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { uuidv7 } from 'uuidv7';

// Load env variables if not loaded
import dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  // Clean existing test users if any
  await prisma.user.deleteMany({
    where: {
      email: { in: ['admin@techstore.com', 'staff@techstore.com'] }
    }
  });

  const admin = await prisma.user.create({
    data: {
      id: uuidv7(),
      email: 'admin@techstore.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    }
  });

  const staff = await prisma.user.create({
    data: {
      id: uuidv7(),
      email: 'staff@techstore.com',
      password: staffPassword,
      name: 'Store Staff',
      role: 'STAFF',
      isActive: true,
      emailVerifiedAt: new Date(),
    }
  });

  console.log('Created test users:');
  console.log('Admin:', admin.email);
  console.log('Staff:', staff.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
