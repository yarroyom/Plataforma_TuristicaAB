import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Indicador {
  id: number;
  nombre: string;
  categoria: string;
  dimension: string;
  meta: number;
  unidad: string | null;
  valores: { valorActual: number; fecha: Date }[];
  // ...otros campos si los tienes...
}

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

  // Filtrado por fechas (ajusta para incluir todo el día)
  const whereValor: any = {};
  if (fechaInicio && fechaFin) {
    const inicio = new Date(fechaInicio + "T00:00:00");
    const fin = new Date(fechaFin + "T23:59:59");
    whereValor.fecha = {
      gte: inicio,
      lte: fin,
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

  // Sumar valores para indicadores acumulativos (ejemplo: Número de clics por página)
  (indicadores as Indicador[]).forEach(indicador => {
    if (indicador.nombre === "Número de clics por página" && indicador.valores.length > 0) {
      // Suma todos los valores en el rango
      const total = indicador.valores.reduce((acc, v) => acc + v.valorActual, 0);
      // Muestra el total y la fecha del último registro
      indicador.valores = [{
        valorActual: total,
        fecha: indicador.valores[0].fecha,
      }];
    }
    // ...puedes agregar lógica similar para otros indicadores acumulativos...
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

  // Actualiza el valor actual del indicador "Número de veces que se usa 'Cómo llegar'"
  const indicadorComoLlegar = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Número de veces que se usa 'Cómo llegar'"
  );
  if (indicadorComoLlegar) {
    const ultimo = await prisma.valorIndicador.findFirst({
      where: {
        indicadorId: indicadorComoLlegar.id,
      },
      orderBy: { fecha: "desc" },
    });
    indicadorComoLlegar.valores = ultimo
      ? [{ valorActual: ultimo.valorActual, fecha: ultimo.fecha }]
      : [];
  }

  // Actualiza el valor actual del indicador "Tiempo promedio de permanencia en el sitio"
  const indicadorTiempo = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Tiempo promedio de permanencia en el sitio"
  );
  if (indicadorTiempo) {
    const ultimo = await prisma.valorIndicador.findFirst({
      where: {
        indicadorId: indicadorTiempo.id,
      },
      orderBy: { fecha: "desc" },
    });
    console.log("Valor tiempo promedio:", ultimo); // <-- log para depuración
    indicadorTiempo.valores = ultimo
      ? [{ valorActual: ultimo.valorActual, fecha: ultimo.fecha }]
      : [];
  }

  // Actualiza el valor actual del indicador "Número de actualizaciones realizadas"
  const indicadorActualizaciones = indicadores.find(
    (i: { nombre: string }) => i.nombre === "Número de actualizaciones realizadas"
  );
  if (indicadorActualizaciones) {
    const ultimo = await prisma.valorIndicador.findFirst({
      where: {
        indicadorId: indicadorActualizaciones.id,
      },
      orderBy: { fecha: "desc" },
    });
    indicadorActualizaciones.valores = ultimo
      ? [{ valorActual: ultimo.valorActual, fecha: ultimo.fecha }]
      : [];
  }

  return NextResponse.json(indicadores);
}
