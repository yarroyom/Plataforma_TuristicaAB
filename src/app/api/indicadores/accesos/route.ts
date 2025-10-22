import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { usuarioId, fuente } = body; // fuente: navegador/dispositivo
  console.log("POST /api/indicadores/accesos llamado con:", { usuarioId, fuente });

  // Busca el indicador
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Número de accesos desde distintas fuentes" },
  });

  if (indicador) {
    // Busca el último valor registrado para hoy y esa fuente
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ultimo = await prisma.valorIndicador.findFirst({
      where: {
        indicadorId: indicador.id,
        fecha: { gte: hoy },
        // Si agregas el campo fuente en el modelo, puedes filtrar por fuente aquí
        // fuente: fuente,
      },
      orderBy: { fecha: "desc" },
    });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({
      data: {
        indicadorId: indicador.id,
        valorActual: nuevoValor,
        fecha: new Date(),
        // fuente, // <-- guarda la fuente si el modelo lo permite
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
