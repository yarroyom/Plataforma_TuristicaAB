import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const correo = String(body?.correo ?? "").toLowerCase();
    if (!correo) return NextResponse.json({ error: "correo requerido" }, { status: 400 });

  // Buscar usuario por correo de forma case-insensitive (Postgres es case-sensitive por defecto)
  const usuario = await prisma.usuario.findFirst({ where: { correo: { equals: correo, mode: 'insensitive' } } }).catch(() => null);
    if (!usuario) {
      // No revelar existencia de usuario: responder OK
      return NextResponse.json({ ok: true });
    }

    // Generar token JWT corto (15 minutos)
    const token = jwt.sign({ id: usuario.id, tipo: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

  // Enviar correo con enlace de reset. Usar NEXT_PUBLIC_BASE_URL si está, sino usar el origin de la petición
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? (new URL(req.url).origin) ?? 'http://localhost:3000';
  const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const mail = {
      from: process.env.SMTP_USER,
      to: usuario.correo,
      subject: 'Recuperación de contraseña - Plataforma',
      text: `Para restablecer tu contraseña, visita: ${resetUrl}\nEste enlace expira en 15 minutos.`,
    };

    await transporter.sendMail(mail).catch((e) => { console.error('sendMail error', e); });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
