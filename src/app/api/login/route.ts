import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { correo, password } = await req.json();

    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Log para depuración
    console.log("Usuario encontrado:", usuario);

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Generar token con id, correo y rol
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // Log para depuración
    console.log("Token generado:", token);


    const response = NextResponse.json({ message: "Login exitoso" });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/"
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error en el login" }, { status: 500 });
  }
}
