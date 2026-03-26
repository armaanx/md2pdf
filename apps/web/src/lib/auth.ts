import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@md2pdf/db";
import { getEnv } from "@md2pdf/core";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "md2pdf_session";

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(getEnv().AUTH_COOKIE_SECRET);
}

async function verifySession(token: string) {
  const verified = await jwtVerify<SessionPayload>(token, getSessionSecret());
  return verified.payload;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function setUserSession(user: { id: string; email: string; name: string }) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySession(token);

    if (!payload.sub) {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
  } catch {
    return null;
  }
}

