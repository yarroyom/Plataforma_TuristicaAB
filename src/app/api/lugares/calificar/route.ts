import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { lugarId, calificacion, usuarioId } = await req.json();

  console.log("Calificar lugar:", { lugarId, calificacion, usuarioId });

  // Guarda la calificación como reseña
  await prisma.reseña.create({
    data: {
      lugarId: Number(lugarId),
      comentario: "",
      usuarioId: Number(usuarioId),
      calificacion: calificacion,
    },
  });

  // Actualiza los campos en LugarTuristico
  const lugar = await prisma.lugarTuristico.findUnique({
    where: { id: Number(lugarId) },
  });
  console.log("Lugar antes de update:", lugar);

  if (lugar) {
    const nuevaSuma = (lugar.calificacionTotal || 0) + calificacion;
    const nuevoConteo = (lugar.numeroCalificaciones || 0) + 1;
    const actualizado = await prisma.lugarTuristico.update({
      where: { id: Number(lugarId) },
      data: {
        calificacionTotal: nuevaSuma,
        numeroCalificaciones: nuevoConteo,
      },
    });
    console.log("Lugar actualizado:", actualizado);
  } else {
    console.error("No se encontró el lugar con id:", lugarId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
