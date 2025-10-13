import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (payload.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede editar la historia" }, { status: 403 });
    }
    const { descripcion } = await req.json();

    // Log para depuración
    console.log("ID recibido:", id);
    console.log("Descripción recibida:", descripcion);

    // Verifica si el lugar existe antes de actualizar
    const lugarExistente = await prisma.lugarTuristico.findUnique({
      where: { id: Number(id) },
    });
    if (!lugarExistente) {
      console.error("Lugar no encontrado en la base de datos");
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
    }

    const lugar = await prisma.lugarTuristico.update({
      where: { id: Number(id) },
      data: { descripcion },
    });

    // Log para depuración
    console.log("Lugar actualizado:", lugar);

    return NextResponse.json({ message: "Historia actualizada", lugar });
  } catch (err) {
    // Log para depuración
    console.error("Error al actualizar:", err);
    return NextResponse.json(
      { error: "Error al actualizar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lugar = await prisma.lugarTuristico.findUnique({
      where: { id: Number(id) },
    });
    if (!lugar) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
    }
    return NextResponse.json(lugar);
  } catch (err) {
    return NextResponse.json(
      { error: "Error al obtener lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
  }
}