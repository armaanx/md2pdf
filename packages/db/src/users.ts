import type { User } from "../generated/client/client";
import { prisma } from "./client";

export type AuthUser = Pick<User, "id" | "email" | "name" | "passwordHash">;
export type SessionUser = Pick<User, "id" | "email" | "name" | "createdAt">;

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true
    }
  });
}

export async function createUserRecord(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: input,
    select: {
      id: true,
      email: true,
      name: true
    }
  });
}

export async function findSessionUserById(id: string): Promise<SessionUser | null> {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  });
}
