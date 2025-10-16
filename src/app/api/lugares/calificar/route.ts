import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lugarId, usuarioId, calificacion } = body;

  if (!lugarId || !usuarioId || typeof calificacion !== "number") {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    // Upsert: crea o actualiza el rating por (lugarId, usuarioId)
    await prisma.rating.upsert({
      where: {
        // Prisma genera un identificador compuesto: lugarId_usuarioId
        lugarId_usuarioId: {
          lugarId: Number(lugarId),
          usuarioId: Number(usuarioId),
        },
      },
      create: {
        lugarId: Number(lugarId),
        usuarioId: Number(usuarioId),
        valor: Math.round(calificacion),
      },
      update: {
        valor: Math.round(calificacion),
        creadoEn: new Date(),
      },
    });

    // Recalcular agregados desde la tabla Rating
    const agg = await prisma.rating.aggregate({
      where: { lugarId: Number(lugarId) },
      _sum: { valor: true },
      _count: { _all: true },
    });

    const suma = Number(agg._sum?.valor ?? 0);
    const conteo = Number(agg._count?._all ?? 0);

    // Actualizar campos en LugarTuristico
    await prisma.lugarTuristico.update({
      where: { id: Number(lugarId) },
      data: {
        calificacionTotal: suma,
        numeroCalificaciones: conteo,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al guardar rating:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
