import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, correo, password, rol } = await req.json();

    // Validar rol
    if (!["TURISTA", "EMPRENDEDOR"].includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Verificar si ya existe
    const existe = await prisma.usuario.findUnique({ where: { correo } });
    if (existe) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
    }
     // Encriptar contraseña
    const hashed = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: { nombre, correo, password: hashed, rol }
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error en el registro" }, { status: 500 });
  }
}