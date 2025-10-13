import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const notificaciones = await prisma.notificacion.findMany({
    where: { activo: true },
    orderBy: { fecha: "desc" },
  });
  return NextResponse.json(notificaciones);
}

export async function POST(req: NextRequest) {
  const { mensaje, tipo, fecha } = await req.json();
  const notificacion = await prisma.notificacion.create({
    data: { mensaje, tipo, fecha: fecha ? new Date(fecha) : undefined },
  });

  if (tipo === "evento") {
    // Obtener todos los correos de usuarios registrados
    const usuarios = await prisma.usuario.findMany({
      select: { correo: true },
    });
    const destinatarios = usuarios.map((u: { correo: string }) => u.correo).join(",");

    // Enviar correo a todos los usuarios
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
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
