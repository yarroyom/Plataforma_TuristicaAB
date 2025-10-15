import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.json();
  const { comentario, lugarId, usuarioId } = body;

  // Crea la reseña en la base de datos
  const nuevaReseña = await prisma.reseña.create({
    data: {
      comentario: comentario,
      lugarId: lugarId,
      usuarioId: usuarioId,
    },
  });

  // Actualiza el indicador de cantidad de comentarios sobre eventos culturales
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Cantidad de comentarios sobre eventos culturales" },
  });
  if (indicador) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
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
  }

  // Ejemplo: recibe tiempoPromedio del frontend
  const { tiempoPromedio } = body; // tiempo en minutos

  // Actualiza el indicador de tiempo promedio de permanencia en el sitio
  if (typeof tiempoPromedio === "number") {
    const indicadorTiempo = await prisma.indicador.findFirst({
      where: { nombre: "Tiempo promedio de permanencia en el sitio" },
    });
    if (indicadorTiempo) {
      await prisma.valorIndicador.create({
        data: {
          indicadorId: indicadorTiempo.id,
          valorActual: tiempoPromedio,
          fecha: new Date(),
        },
      });
    }
  }

  // Llama al endpoint de actualizaciones
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/indicadores/actualizaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return new Response(JSON.stringify(nuevaReseña), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}