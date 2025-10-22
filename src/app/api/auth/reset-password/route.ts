import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "");
    const newPassword = String(body?.password ?? "");
    if (!token || !newPassword) return NextResponse.json({ error: 'token y password requeridos' }, { status: 400 });

    let payload: any = null;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch (e) {
      return NextResponse.json({ error: 'token inválido o expirado' }, { status: 400 });
    }

    if (!payload?.id) return NextResponse.json({ error: 'token inválido' }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({ where: { id: Number(payload.id) }, data: { password: hashed } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
