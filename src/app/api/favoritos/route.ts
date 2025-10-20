import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { Favorito } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // obtener token desde cookie o header Authorization
    let token = req.cookies.get("token")?.value ?? null;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Resolver userId de forma robusta: número puro o payload JWT
    let userId: number | null = null;

    if (token) {
      // caso: token es número (id almacenado como token)
      if (/^\d+$/.test(token)) {
        userId = Number(token);
      } else if (process.env.JWT_SECRET) {
        try {
          const payload: any = jwt.verify(token, process.env.JWT_SECRET);
          const maybe = payload?.id ?? payload?.sub ?? null;
          if (maybe != null) {
            const idNum = Number(maybe);
            if (Number.isFinite(idNum) && idNum > 0) userId = idNum;
          }
        } catch (err) {
          console.warn("JWT verify falló (GET /api/favoritos):", err);
          // no retornamos error, dejamos userId = null para devolver [] más abajo
        }
      } else {
        // Si no hay JWT_SECRET intentamos interpretar token como id numérico
        const num = Number(token);
        if (Number.isFinite(num) && num > 0) userId = num;
      }
    }

    // Si no hay usuario válido, devolvemos array vacío para que la UI no falle
    if (!userId) {
      return NextResponse.json([]);
    }

    // obtener favoritos del usuario (incluyendo datos del lugar)
    const favoritos: Array<Favorito & { lugar: any | null }> = await prisma.favorito.findMany({
      where: { usuarioId: userId },
      include: { lugar: true },
      orderBy: { id: "desc" },
    });
    // Devolver solo los lugares para facilitar el render en frontend
    return NextResponse.json(favoritos.map((f) => f.lugar));
  } catch (err) {
    console.error("GET /api/favoritos error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
  const { lugarId } = await req.json();

  const existente = await prisma.favorito.findFirst({
    where: { usuarioId: payload.id, lugarId },
  });
  if (existente) return NextResponse.json({ message: "Ya es favorito" });

  await prisma.favorito.create({
    data: { usuarioId: payload.id, lugarId },
  });
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Cantidad de lugares agregados a favoritos" }
  });
  if (indicador) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
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
  return NextResponse.json({ message: "Agregado a favoritos" });
}

export async function DELETE(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
  const { lugarId } = await req.json();

  await prisma.favorito.deleteMany({
    where: { usuarioId: payload.id, lugarId },
  });
  return NextResponse.json({ message: "Eliminado de favoritos" });
}