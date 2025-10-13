// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma"; // <-- usa el default export

export async function GET(req: NextRequest) {
  // Obtener token de cookie o header Authorization
  let token = req.cookies.get("token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
  }

  if (!token) {
    // Log para depuración
    console.log("No se encontró token en cookie ni en header");
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    // Busca el usuario en la base de datos para obtener la foto
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, rol: true, correo: true, nombre: true, foto: true },
    });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    return NextResponse.json(usuario);
  } catch (err) {
    // Log para depuración
    console.log("Error al verificar token:", err);
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
