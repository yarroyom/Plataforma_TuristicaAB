import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");
  const dimension = searchParams.get("dimension");
  const fechaInicio = searchParams.get("fechaInicio");
  const fechaFin = searchParams.get("fechaFin");

  // Filtrado por categoría y dimensión
  const whereIndicador: any = {};
  if (categoria) whereIndicador.categoria = categoria;
  if (dimension) whereIndicador.dimension = dimension;

  // Filtrado por fechas (parseo UTC, acepta solo inicio o solo fin)
  const whereValor: any = {};
  const hasFechaRange = !!(fechaInicio || fechaFin);
  let inicio: Date | undefined;
  let fin: Date | undefined;
  if (fechaInicio || fechaFin) {
    const inicioStr = (fechaInicio || fechaFin) as string;
    const finStr = (fechaFin || fechaInicio) as string;
    const parseToUTCStart = (d: string) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
    };
    const parseToUTCEnd = (d: string) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999));
    };
    inicio = parseToUTCStart(inicioStr);
    fin = parseToUTCEnd(finStr);
    whereValor.fecha = { gte: inicio, lte: fin };
  }

  // Consulta indicadores con sus valores filtrados (si hay rango, trae los valores dentro del rango)
  const indicadores = await prisma.indicador.findMany({
    where: whereIndicador,
    include: {
      valores: {
        where: whereValor,
        orderBy: { fecha: "desc" },
      },
    },
    orderBy: { nombre: "asc" },
  });

  // Calcula la SUMA de calificaciones a actividades culturales (antes era promedio)
  const indicadorPromedioCulturales = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Promedio de calificaciones a actividades culturales"
  );
  if (indicadorPromedioCulturales) {
    if (hasFechaRange && inicio && fin) {
      // Usar SUM de ratings en lugar de AVG
      const res: { sum: number | null; count: string | null; fecha: Date | null }[] = await prisma.$queryRaw`
        SELECT SUM(r.valor)::numeric AS sum, COUNT(r.valor)::text AS count, MAX(r."creadoEn") AS fecha
        FROM "Rating" r
        JOIN "LugarTuristico" l ON r."lugarId" = l.id
        WHERE l."tipo" = 'CULTURAL'
          AND r."creadoEn" >= ${inicio}
          AND r."creadoEn" <= ${fin}
      `;
  const sum = res?.[0]?.sum !== null && res?.[0]?.sum !== undefined ? Number(res[0].sum) : 0;
  const count = res?.[0]?.count ? Number(res[0].count) : 0;
  const fecha = res?.[0]?.fecha ?? fin;
  const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  indicadorPromedioCulturales.valores = [{ valorActual: avg, fecha, count }];
    } else {
      const res: { sum: number | null; count: string | null; fecha: Date | null }[] = await prisma.$queryRaw`
        SELECT SUM(r.valor)::numeric AS sum, COUNT(r.valor)::text AS count, MAX(r."creadoEn") AS fecha
        FROM "Rating" r
        JOIN "LugarTuristico" l ON r."lugarId" = l.id
        WHERE l."tipo" = 'CULTURAL'
      `;
  const sum = res?.[0]?.sum !== null && res?.[0]?.sum !== undefined ? Number(res[0].sum) : 0;
  const count = res?.[0]?.count ? Number(res[0].count) : 0;
  const fecha = res?.[0]?.fecha ?? new Date();
  const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  indicadorPromedioCulturales.valores = [{ valorActual: avg, fecha, count }];
    }
  }

  // Indicador: Promedio de calificaciones a lugares turísticos
  const indicadorPromedioTuristicos = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Promedio de calificaciones a lugares turísticos"
  );
  if (indicadorPromedioTuristicos) {
    if (hasFechaRange && inicio && fin) {
      // Usar SUM de ratings en lugar de AVG
      const res: { sum: number | null; count: string | null; fecha: Date | null }[] = await prisma.$queryRaw`
        SELECT SUM(r.valor)::numeric AS sum, COUNT(r.valor)::text AS count, MAX(r."creadoEn") AS fecha
        FROM "Rating" r
        JOIN "LugarTuristico" l ON r."lugarId" = l.id
        WHERE l."tipo" = 'TURISTICO'
          AND r."creadoEn" >= ${inicio}
          AND r."creadoEn" <= ${fin}
      `;
  const sum = res?.[0]?.sum !== null && res?.[0]?.sum !== undefined ? Number(res[0].sum) : 0;
  const count = res?.[0]?.count ? Number(res[0].count) : 0;
  const fecha = res?.[0]?.fecha ?? fin;
  const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  indicadorPromedioTuristicos.valores = [{ valorActual: avg, fecha, count }];
    } else {
      const res: { sum: number | null; count: string | null; fecha: Date | null }[] = await prisma.$queryRaw`
        SELECT SUM(r.valor)::numeric AS sum, COUNT(r.valor)::text AS count, MAX(r."creadoEn") AS fecha
        FROM "Rating" r
        JOIN "LugarTuristico" l ON r."lugarId" = l.id
        WHERE l."tipo" = 'TURISTICO'
      `;
  const sum = res?.[0]?.sum !== null && res?.[0]?.sum !== undefined ? Number(res[0].sum) : 0;
  const count = res?.[0]?.count ? Number(res[0].count) : 0;
  const fecha = res?.[0]?.fecha ?? new Date();
  const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  indicadorPromedioTuristicos.valores = [{ valorActual: avg, fecha, count }];
    }
  }

  // Fallback: si la petición especificó un rango de fechas y algún indicador
  // quedó sin valores (vacío), intentar recuperar el último registro
  // conocido para ese indicador y usarlo como valor actual. Esto evita que
  // la UI muestre vacíos cuando la BD tiene datos fuera del rango por TZ u
  // otros motivos.
  if (hasFechaRange && Array.isArray(indicadores)) {
    for (const ind of indicadores) {
      try {
        if (!ind?.valores || ind.valores.length === 0) {
          const ultimoRegistro = await prisma.valorIndicador.findFirst({
            where: { indicadorId: ind.id },
            orderBy: { fecha: "desc" },
          });
          if (ultimoRegistro) {
            ind.valores = [ultimoRegistro];
          }
        }
      } catch (e) {
        // no bloquear la respuesta por un fallo en el fallback; continuar
      }
    }
  }

  return NextResponse.json(indicadores);
}
