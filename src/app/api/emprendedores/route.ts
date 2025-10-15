import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export async function GET() {
  const emprendedores = await prisma.emprendedorPerfil.findMany({
    include: { usuario: true },
  });
  return NextResponse.json(emprendedores);
}

export async function POST(req: NextRequest) {
  try {
    // Obtener token desde cookie HttpOnly
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar token
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const body = await req.json();
    const { nombre, descripcion, telefono, direccion, foto } = body;

    // Obtén el correo del usuario logueado
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { correo: true },
    });

    const perfil = await prisma.emprendedorPerfil.create({
      data: {
        usuarioId: payload.id,
        nombre,
        descripcion,
        telefono,
        direccion,
        foto,
      },
    });

    // Crear notificación de nuevo negocio
    await prisma.notificacion.create({
      data: {
        mensaje: `El emprendedor ${perfil.nombre} ha creado un nuevo negocio.`,
        tipo: "negocio",
      },
    });

    // Obtener el correo del administrador
    const admin = await prisma.usuario.findFirst({
      where: { rol: "ADMIN" },
      select: { correo: true },
    });

    // Enviar correo solo a la administradora
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `"Agua Blanca" <${process.env.SMTP_USER}>`,
        to: "ferarroyo0102@gmail.com", // solo a la administradora
        subject: "Nuevo negocio en Agua Blanca",
        text: `El emprendedor ${perfil.nombre} ha creado un nuevo negocio en Agua Blanca.`,
      });
      console.log("Correo enviado:", info);
    } catch (error) {
      console.error("Error al enviar correo:", error);
    }

    // Registro de contenido agregado en el periodo
    await prisma.valorIndicador.create({
      data: {
        indicadorId: 58, // <-- id de "Contenido agregado en el periodo"
        valorActual: 1,
        fecha: new Date(),
      },
    });

    return NextResponse.json({ perfil }); // <-- Faltaba este return
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error creando perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, descripcion, telefono, direccion, foto } = body;

    // Actualiza el perfil del emprendedor
    const perfil = await prisma.emprendedorPerfil.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        telefono,
        direccion,
        foto,
      },
    });

    // Llama al endpoint de actualizaciones
    await prisma.valorIndicador.create({
      data: {
        indicadorId: 57,
        valorActual: 1,
        fecha: new Date(),
      },
    });

    return NextResponse.json({ perfil });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
  }
}


