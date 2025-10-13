import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    const resena = await prisma.reseña.findUnique({
      where: { id: Number(id) },
    });
    if (!resena) {
      return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
    }
    if (resena.usuarioId !== payload.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar esta reseña" }, { status: 403 });
    }
    await prisma.reseña.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ message: "Reseña eliminada" });
  } catch (err) {
    return NextResponse.json({ error: "Error al eliminar reseña" }, { status: 500 });
  }
}
