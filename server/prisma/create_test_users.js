import pkg from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';
import { uuidv7 } from 'uuidv7';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

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
