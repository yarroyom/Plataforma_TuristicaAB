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

  // Filtrado por fechas
  const whereValor: any = {};
  if (fechaInicio && fechaFin) {
    whereValor.fecha = {
      gte: new Date(fechaInicio),
      lte: new Date(fechaFin),
    };
  }

  // Consulta indicadores con sus valores filtrados
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

  // Calcula el promedio de calificaciones a lugares turísticos desde LugarTuristico
  const indicadorPromedio = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Promedio de calificaciones a lugares turísticos"
  );
  if (indicadorPromedio) {
    const lugares = await prisma.lugarTuristico.findMany({
      select: { calificacionTotal: true, numeroCalificaciones: true },
    });
    console.log("Lugares para promedio:", lugares); // <-- log para depuración
    const totalCalificaciones = lugares.reduce(
      (acc: number, l: { calificacionTotal: number; numeroCalificaciones: number }) => acc + l.numeroCalificaciones,
      0
    );
    const sumaCalificaciones = lugares.reduce(
      (acc: number, l: { calificacionTotal: number }) => acc + l.calificacionTotal,
      0
    );
    const promedio =
      totalCalificaciones > 0 ? sumaCalificaciones / totalCalificaciones : 0;
    indicadorPromedio.valores = [
      {
        valorActual: promedio,
        fecha: new Date(),
      }
    ];
  }

  return NextResponse.json(indicadores);
}
