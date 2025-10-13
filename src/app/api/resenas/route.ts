import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
  }
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { lugarId, comentario } = await req.json();
    const resena = await prisma.reseña.create({
      data: {
        lugarId,
        usuarioId: payload.id,
        comentario,
        creadoEn: new Date(), // Usa el nombre correcto del campo de fecha
      },
      include: {
        usuario: true, // Incluye el usuario con la foto
      },
    });
    return NextResponse.json({
      resena: {
        id: resena.id,
        usuarioId: resena.usuarioId,
        usuario: resena.usuario.nombre,
        foto: resena.usuario.foto || "", // Devuelve la foto aquí
        comentario: resena.comentario,
        fecha: resena.creadoEn.toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Error al guardar reseña" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const lugarId = Number(req.nextUrl.searchParams.get("lugarId"));
  if (!lugarId) return NextResponse.json({ error: "LugarId requerido" }, { status: 400 });
  try {
    const resenas = await prisma.reseña.findMany({
      where: { lugarId },
      include: { usuario: true }, // Incluye siempre el usuario con la foto actual
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json(
      Array.isArray(resenas)
        ? resenas.map(r => ({
            id: r.id,
            usuarioId: r.usuarioId,
            usuario: r.usuario?.nombre || "",
            foto: r.usuario?.foto || "", // Siempre la foto actual
            comentario: r.comentario,
            fecha: r.creadoEn?.toISOString().slice(0, 10) || "",
          }))
        : []
    );
  } catch (err) {
    return NextResponse.json({ error: "Error al obtener reseñas" }, { status: 500 });
  }
}
