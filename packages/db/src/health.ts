import { prisma } from "./client";

export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
