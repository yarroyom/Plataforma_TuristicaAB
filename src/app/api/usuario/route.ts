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
    await prisma.valorIndicador.create({
      data: {
        indicadorId: 57, // id de "Número de actualizaciones realizadas"
        valorActual: 1,
        fecha: new Date(),
      },
    });

    // Registro de contenido agregado en el periodo (si aplica)
    if (foto || password) {
      await prisma.valorIndicador.create({
        data: {
          indicadorId: 58, // <-- id de "Contenido agregado en el periodo"
          valorActual: 1,
          fecha: new Date(),
        },
      });
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