import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

/* Helper: buscar lugar por id probando nombres comunes de modelo */
async function findLugarById(id: number) {
  const candidates = ["lugar", "lugares", "lugarTuristico", "Lugar", "LugarTuristico"];
  for (const name of candidates) {
    const model = (prisma as any)[name];
    if (model && typeof model.findUnique === "function") {
      try {
        const found = await model.findUnique({ where: { id } });
        if (found) return found;
      } catch {
        // ignorar y probar siguiente candidato
      }
    }
  }
  return null;
}

/* Determina si un registro representa contenido cultural */
function isCultural(record: any) {
  if (!record) return false;
  const fields = [
    String(record.tipo ?? ""),
    String(record.tipoLugar ?? ""),
    String(record.categoria ?? ""),
    String(record.esCultural ?? ""),
  ];
  return fields.some(f => f && f.toUpperCase().includes("CULTUR"));
}

/* Obtener o crear indicador simple */
async function getOrCreateIndicator(nombre: string, meta?: { categoria?: string; descripcion?: string }) {
  let indicador = await prisma.indicador.findFirst({ where: { nombre } });
  if (indicador) return indicador;
  // intentar crear con metadatos si existen (si falla, crear solo con nombre)
  const data: any = { nombre, ...(meta ?? {}) };
  try {
    indicador = await prisma.indicador.create({ data });
    return indicador;
  } catch (err: any) {
    // fallback: crear solo con nombre
    indicador = await prisma.indicador.create({ data: { nombre } });
    return indicador;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // body esperado: { usuarioId?, lugarId?, nombre?, descripcion?, imagen_url?, url? }
    const lugarIdRaw = body.lugarId ?? body?.lugar?.id ?? null;
    const lugarId = lugarIdRaw != null ? Number(lugarIdRaw) : null;

    // Si se proporcionó lugarId válido, intentar resolverse y decidir indicador según su tipo
    if (lugarId && Number.isFinite(lugarId) && lugarId > 0) {
      const lugarDb: any = await findLugarById(lugarId);
      if (lugarDb && isCultural(lugarDb)) {
        // indicador específico para actividades culturales
        const indicadorNombreCultural = "Número de veces que se comparten actividades culturales";
        const indicadorC = await getOrCreateIndicator(indicadorNombreCultural, {
          categoria: "Promoción Cultural",
          descripcion: "Conteo diario de veces que se comparten actividades culturales",
        });

        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ultimoC = await prisma.valorIndicador.findFirst({
          where: { indicadorId: indicadorC.id, fecha: { gte: hoy } },
          orderBy: { fecha: "desc" },
        });
        const nuevoValorC = ultimoC ? ultimoC.valorActual + 1 : 1;
        await prisma.valorIndicador.create({
          data: {
            indicadorId: indicadorC.id,
            valorActual: nuevoValorC,
            fecha: new Date(),
          },
        });

        return new Response(JSON.stringify({ ok: true, indicador: indicadorNombreCultural, nuevoValor: nuevoValorC }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      // si no es cultural o no se encontró, continuamos y actualizamos indicador general
    }

    // Indicador general: "Número de veces que se comparte un lugar/evento"
    const indicadorNombre = "Número de veces que se comparte un lugar/evento";
    const indicador = await getOrCreateIndicator(indicadorNombre);

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
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

    return new Response(JSON.stringify({ ok: true, indicador: indicadorNombre, nuevoValor }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("POST /api/indicadores/compartir-facebook error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
