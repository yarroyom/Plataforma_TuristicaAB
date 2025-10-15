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
    const body = await req.json();
    const { nombre, descripcion, imagen_url, latitud, longitud, usuarioId } = body;

    const lugar = await prisma.lugarTuristico.create({
      data: {
        nombre,
        descripcion,
        imagen_url,
        latitud,
        longitud,
      },
    });

    // Registro de contenido agregado en el periodo
    await prisma.valorIndicador.create({
      data: {
        indicadorId: 58, // <-- id de "Contenido agregado en el periodo"
        valorActual: 1,
        fecha: new Date(),
      },
    });

    return new Response(JSON.stringify({ lugar }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
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

export async function PUT(req: NextRequest) {
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
    const { id, nombre, descripcion, imagen_url, latitud, longitud } = await req.json();
    const lugar = await prisma.lugarTuristico.update({
      where: { id },
      data: { nombre, descripcion, imagen_url, latitud, longitud },
    });
    return NextResponse.json({ message: "Lugar actualizado", lugar });
  } catch (err) {
    return NextResponse.json({ error: "Error al actualizar lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
      return NextResponse.json({ error: "Solo el administrador puede eliminar lugares" }, { status: 403 });
    }
    const { id } = await req.json();
    await prisma.lugarTuristico.delete({ where: { id } });
    return NextResponse.json({ message: "Lugar eliminado" });
  } catch (err) {
    return NextResponse.json({ error: "Error al eliminar lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Número de veces que se usa 'Cómo llegar'" }
  });
  if (indicador) {
    const ultimo = await prisma.valorIndicador.findFirst({
      where: { indicadorId: indicador.id, fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
    });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({
      data: {
        indicadorId: indicador.id,
        valorActual: nuevoValor,
        fecha: new Date(),
      },
    });
  }
  return NextResponse.json({ message: "Registro actualizado" });
}
