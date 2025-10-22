import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import fetch from "node-fetch"; // <-- importa node-fetch

export async function POST(req: NextRequest) {
  console.log("POST /api/usuario llamado"); // <-- log para confirmar llamada

  try {
    // Obtén los datos del usuario desde el request
    const body = await req.json();
    const { usuarioId, foto, password } = body;

    // Código para actualizar usuario
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...(foto && { foto }),
        ...(password && { password }),
      },
    });

    // Actualización de perfil (actualizaciones realizadas)
    // En lugar de crear un registro con valorActual = 1 (lo que produce
    // registros unitarios y confunde la visualización), buscamos el último
    // valor de hoy y lo incrementamos, manteniendo el mismo patrón que
    // usan los endpoints en /api/indicadores/*
    try {
      const indicador = await prisma.indicador.findUnique({ where: { id: 57 } }).catch(() => null);
      if (indicador) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const ultimo = await prisma.valorIndicador.findFirst({
          where: { indicadorId: indicador.id, fecha: { gte: hoy } },
          orderBy: { fecha: "desc" },
        });
        const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
        await prisma.valorIndicador.create({
          data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() },
        });
      } else {
        // si no existe el indicador con id 57, crear un registro simple para no perder el evento
        await prisma.valorIndicador.create({ data: { indicadorId: 57, valorActual: 1, fecha: new Date() } });
      }
    } catch (e) {
      console.error("Error actualizando indicador 57 en usuario.route:", e);
    }

    // Registro de contenido agregado en el periodo (si aplica) - hacerlo incremental por día
    if (foto || password) {
      try {
        const indicadorNombre = "Contenido agregado en el periodo";
        const indicador = await prisma.indicador.findFirst({ where: { nombre: indicadorNombre } });
        if (indicador) {
          const hoy = new Date(); hoy.setHours(0,0,0,0);
          const ultimo = await prisma.valorIndicador.findFirst({ where: { indicadorId: indicador.id, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } });
          const nuevoValor = ultimo ? (ultimo.valorActual ?? 0) + 1 : 1;
          await prisma.valorIndicador.create({ data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() } });
        } else {
          await prisma.valorIndicador.create({ data: { indicadorId: 58, valorActual: 1, fecha: new Date() } });
        }
      } catch (e) {
        console.error("Error registrando contenido agregado en usuario.route:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error); // <-- log de error
    return new Response(JSON.stringify({ error: "No se pudo actualizar el usuario" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}