import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { usuarioId, lugarId, nombre, descripcion, imagen_url, url } = await req.json();

  // Guarda el evento de compartir en la base de datos (puedes crear un modelo si lo deseas)
  // O simplemente actualiza el indicador correspondiente
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Número de veces que se comparte un lugar/evento" },
  });

  if (indicador) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ultimo = await prisma.valorIndicador.findFirst({
      where: {
        indicadorId: indicador.id,
        fecha: { gte: hoy },
      },
      orderBy: { fecha: "desc" },
    });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({
      data: {
        indicadorId: indicador.id,
        valorActual: nuevoValor,
        fecha: new Date(),
        // Puedes guardar más datos si agregas campos extra al modelo
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
