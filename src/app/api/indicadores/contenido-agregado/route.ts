import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { usuarioId, tipo } = await req.json();

  // Busca el indicador
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Contenido agregado en el periodo" },
  });

  if (indicador) {
    // Busca el último valor registrado para hoy
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
        // Puedes agregar un campo extra si quieres guardar el tipo de contenido
        // tipo: tipo,
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
