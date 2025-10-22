import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { incrementIndicadorByName } from "@/lib/indicadores";

async function findLugarById(id: number) {
  const candidates = ["lugar", "lugares", "lugarTuristico", "Lugar", "LugarTuristico"];
  for (const name of candidates) {
    const model = (prisma as any)[name];
    if (model && typeof model.findUnique === "function") {
      try {
        const found = await model.findUnique({ where: { id } });
        if (found) return found;
      } catch {}
    }
  }
  return null;
}

function isCultural(record: any) {
  if (!record) return false;
  const fields = [String(record.tipo ?? ""), String(record.tipoLugar ?? ""), String(record.categoria ?? ""), String(record.esCultural ?? "")];
  return fields.some(f => f && f.toUpperCase().includes("CULTUR"));
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  console.log("POST /api/indicadores/compartir-red-social called, payload:", JSON.stringify(payload));
  const { usuarioId, lugarId, redSocial, linkPerfil, urlLugar } = payload;

  // Si se proporcionó lugarId válido, intentar resolverse y decidir indicador según su tipo
  if (lugarId && Number.isFinite(lugarId) && lugarId > 0) {
    const lugarDb: any = await findLugarById(lugarId);
    if (lugarDb && isCultural(lugarDb)) {
      // indicador específico para actividades culturales
      try {
        const registro = await incrementIndicadorByName("Número de veces que se comparten actividades culturales");
        if (registro) return new Response(JSON.stringify({ ok: true, indicador: "Número de veces que se comparten actividades culturales", nuevoValor: registro.valorActual }), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (e) {
        console.warn("Error incrementando indicador cultural en compartir-red-social:", e);
      }
      // fallback manual
      try {
        const indicadorC = await prisma.indicador.findFirst({ where: { nombre: "Número de veces que se comparten actividades culturales" } }) ?? await prisma.indicador.create({ data: { nombre: "Número de veces que se comparten actividades culturales", categoria: "Promoción Cultural", descripcion: "Conteo diario de veces que se comparten actividades culturales" } });
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const ultimoC = await prisma.valorIndicador.findFirst({ where: { indicadorId: indicadorC.id, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } });
        const nuevoValorC = ultimoC ? ultimoC.valorActual + 1 : 1;
        await prisma.valorIndicador.create({ data: { indicadorId: indicadorC.id, valorActual: nuevoValorC, fecha: new Date() } });
        return new Response(JSON.stringify({ ok: true, indicador: "Número de veces que se comparten actividades culturales", nuevoValor: nuevoValorC }), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (e) {
        console.warn("Fallback error indicador cultural compartir-red-social:", e);
      }
    }
  }

  // Indicador general: usar helper cuando sea posible
  try {
    const registro = await incrementIndicadorByName("Número de veces que se comparte un lugar/evento");
    if (registro) return new Response(JSON.stringify({ ok: true, indicador: "Número de veces que se comparte un lugar/evento", nuevoValor: registro.valorActual }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.warn("incrementIndicadorByName fallo en compartir-red-social:", e);
  }

  // Fallback manual para indicador general
  try {
    const indicador = await prisma.indicador.findFirst({ where: { nombre: "Número de veces que se comparte un lugar/evento" } }) ?? await prisma.indicador.create({ data: { nombre: "Número de veces que se comparte un lugar/evento", categoria: "Promoción Turística", descripcion: "Conteo diario de veces que se comparten lugares y eventos" } });
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const ultimo = await prisma.valorIndicador.findFirst({ where: { indicadorId: indicador.id, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({ data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() } });
  } catch (e) {
    console.warn("Fallback error indicador general compartir-red-social:", e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
