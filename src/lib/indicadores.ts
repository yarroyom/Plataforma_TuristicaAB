import prisma from "./prisma";

/**
 * Incrementa un indicador por su nombre para el día actual.
 * - Busca el indicador por nombre.
 * - Busca el último `ValorIndicador` del día y suma 1, o crea con 1 si no existe.
 * - Devuelve el registro creado o null si falla.
 */
export async function incrementIndicadorByName(nombre: string) {
  try {
    const indicador = await prisma.indicador.findFirst({ where: { nombre } });
    if (!indicador) {
      console.warn(`incrementIndicadorByName: indicador no encontrado: ${nombre}`);
      return null;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ultimo = await prisma.valorIndicador.findFirst({
      where: { indicadorId: indicador.id, fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
    });

    const nuevoValor = ultimo ? (ultimo.valorActual ?? 0) + 1 : 1;
    const registro = await prisma.valorIndicador.create({
      data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() },
    });
    return registro;
  } catch (e) {
    console.warn("incrementIndicadorByName error:", e);
    return null;
  }
}
