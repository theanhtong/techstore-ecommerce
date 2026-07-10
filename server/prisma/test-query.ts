import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Querying all users...');
    const result = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log('Users:', result);
  } catch (error: any) {
    console.error('Query failed:', error.message);
  }
}

run().finally(() => prisma.$disconnect());
