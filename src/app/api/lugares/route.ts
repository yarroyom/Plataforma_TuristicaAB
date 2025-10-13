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
    if (payload.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede registrar lugares" }, { status: 403 });
    }
    const { nombre, descripcion, imagen_url, latitud, longitud } = await req.json();
    const lugar = await prisma.lugarTuristico.create({
      data: { nombre, descripcion, imagen_url, latitud, longitud },
    });
    return NextResponse.json({ message: "Lugar registrado", lugar });
  } catch (err) {
    return NextResponse.json({ error: "Error al registrar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const lugares = await prisma.lugarTuristico.findMany();
    return NextResponse.json(lugares);
  } catch (err) {
    return NextResponse.json(
      { error: "Error al obtener lugares", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
  }
}
