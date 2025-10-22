import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper: obtiene el rol del usuario a partir de la cookie 'token' si existe
async function getRoleFromReq(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get("token")?.value ?? null;
    if (!token) return null;
    // Si token es un id numérico, obtener usuario
    if (/^\d+$/.test(token)) {
      const usuario = await prisma.usuario.findUnique({ where: { id: Number(token) }, select: { rol: true } });
      return usuario?.rol ?? null;
    }
    // Intentar decodificar JWT sin verificar para extraer id o rol
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64").toString() || "{}");
      const maybeId = payload?.id ?? payload?.sub ?? null;
      if (maybeId) {
        const usuario = await prisma.usuario.findUnique({ where: { id: Number(maybeId) }, select: { rol: true } });
        return usuario?.rol ?? null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  } catch (e) {
    console.warn("getRoleFromReq error:", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const role = await getRoleFromReq(req);

  // ADMIN: ver solo notificaciones tipo 'calificacion'
  if (role === "ADMIN") {
    const notis = await prisma.notificacion.findMany({ where: { activo: true, tipo: "calificacion" }, orderBy: { fecha: "desc" } });
    return NextResponse.json(notis);
  }

  // TURISTA y EMPRENDEDOR: ver notificaciones excepto calificaciones
  const notis = await prisma.notificacion.findMany({ where: { activo: true, NOT: { tipo: "calificacion" } }, orderBy: { fecha: "desc" } });
  return NextResponse.json(notis);
}

export async function POST(req: NextRequest) {
  const { mensaje, tipo, fecha } = await req.json();
  const notificacion = await prisma.notificacion.create({
    data: { mensaje, tipo, fecha: fecha ? new Date(fecha) : undefined },
  });

  if (tipo === "evento") {
    // Obtener todos los correos de usuarios registrados
    const usuarios = await prisma.usuario.findMany({ select: { correo: true } });
    const destinatarios = usuarios.map((u: { correo: string }) => u.correo).join(",");

    // Enviar correo a todos los usuarios
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Agua Blanca" <${process.env.SMTP_USER}>`,
      to: destinatarios,
      subject: "Nuevo evento en Agua Blanca",
      text: mensaje,
    });
  }

  return NextResponse.json(notificacion);
}
