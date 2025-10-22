import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { incrementIndicadorByName } from "@/lib/indicadores";

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json().catch(() => ({}));
    // Incrementar contador de tareas completadas (numerador)
    const registro = await incrementIndicadorByName("Tareas completadas por usuarios");
    if (registro) {
      return new Response(JSON.stringify({ ok: true, nuevoValor: registro.valorActual }), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    // fallback minimal
    const indicador = await prisma.indicador.findFirst({ where: { nombre: "Tareas completadas por usuarios" } }) ?? await prisma.indicador.create({ data: { nombre: "Tareas completadas por usuarios", categoria: "Plataforma Web", descripcion: "Conteo diario de tareas completadas por usuarios" } });
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const ultimo = await prisma.valorIndicador.findFirst({ where: { indicadorId: indicador.id, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({ data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() } });
    return new Response(JSON.stringify({ ok: true, nuevoValor }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error en tareas-completadas endpoint:", e);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
