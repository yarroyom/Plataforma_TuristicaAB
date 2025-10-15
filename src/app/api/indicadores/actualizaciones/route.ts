import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  console.log("POST /api/indicadores/actualizaciones llamado"); // <-- log para confirmar llamada
  const { usuarioId } = await req.json();
  console.log("usuarioId recibido:", usuarioId);

  try {
    // Busca el indicador
    const indicador = await prisma.indicador.findFirst({
      where: { nombre: "Número de actualizaciones realizadas" },
    });
    console.log("Indicador encontrado:", indicador);

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
      console.log("Último valor hoy:", ultimo);

      const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
      const registro = await prisma.valorIndicador.create({
        data: {
          indicadorId: indicador.id,
          valorActual: nuevoValor,
          fecha: new Date(),
        },
      });
      console.log("Registro guardado:", registro);
    } else {
      console.error("No se encontró el indicador 'Número de actualizaciones realizadas'");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error al guardar actualización:", error);
    return new Response(JSON.stringify({ error: "No se pudo guardar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
