import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../generated/client/client";

const require = createRequire(import.meta.url);
const { PrismaClient: PrismaClientConstructor } = require("../generated/client/client") as typeof import(
  "../generated/client/client"
);

declare global {
  // eslint-disable-next-line no-var
  var __md2pdfPrisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before initializing PrismaClient.");
  }

  return new PrismaClientConstructor({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

function getPrismaClient() {
  if (!globalThis.__md2pdfPrisma) {
    globalThis.__md2pdfPrisma = createPrismaClient();
  }

  return globalThis.__md2pdfPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  }
});

