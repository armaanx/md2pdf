import { findAuthUserByEmail } from "@md2pdf/db";
import { loginSchema } from "@md2pdf/core";
import { NextResponse } from "next/server";
import { setUserSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const user = await findAuthUserByEmail(parsed.data.email);

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await setUserSession(user);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
}
