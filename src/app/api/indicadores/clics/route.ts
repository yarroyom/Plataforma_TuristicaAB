import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pagina = body?.pagina ?? body?.page ?? "unknown";
    const usuarioId = body?.usuarioId ?? null;

    // Buscar indicador por nombre, o crear si no existe
    const nombre = "Número de clics por página";
    let indicador = await prisma.indicador.findFirst({ where: { nombre } });
    if (!indicador) {
      indicador = await prisma.indicador.create({ data: { nombre, categoria: "Plataforma Web", unidad: "clics", meta: 1000 } });
    }

    // Incrementar el contador del día para la página (si el modelo soporta campo 'pagina', intentarlo)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Intentar buscar último registro del día para este indicador (sin filtrar por pagina si no existe campo)
    const ultimo = await prisma.valorIndicador.findFirst({
      where: { indicadorId: indicador.id },
      orderBy: { fecha: "desc" },
    });
    const nuevoValor = ultimo ? (ultimo.valorActual ?? 0) + 1 : 1;
    await prisma.valorIndicador.create({
      data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/indicadores/clics error:", e);
    return NextResponse.json({ error: "No se pudo registrar clic" }, { status: 500 });
  }
}
