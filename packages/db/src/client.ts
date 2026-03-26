import { PrismaClient } from "../generated/client/index";

declare global {
  // eslint-disable-next-line no-var
  var __md2pdfPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__md2pdfPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__md2pdfPrisma = prisma;
}

