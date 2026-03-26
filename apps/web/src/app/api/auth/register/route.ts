import { prisma } from "@md2pdf/db";
import { registerSchema } from "@md2pdf/core";
import { NextResponse } from "next/server";
import { hashPassword, setUserSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration payload." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (existingUser) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password)
    }
  });

  await setUserSession(user);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
}

