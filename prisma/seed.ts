const { PrismaClient } = require("@prisma/client");
const prismaSeed = new PrismaClient();

async function main() {
  // Limpia la tabla antes de poblarla
  await prismaSeed.indicador.deleteMany();

  // Variable independiente: Plataforma Web
  await prismaSeed.indicador.createMany({
    data: [
      {
        nombre: "Número de clics por página",
        categoria: "Plataforma Web",
        dimension: "Usabilidad",
        meta: 1000,
        unidad: "clics",
      },
      {
        nombre: "Tiempo promedio de permanencia en el sitio",
        categoria: "Plataforma Web",
        dimension: "Usabilidad",
        meta: 5,
        unidad: "minutos",
      },
      {
        nombre: "Porcentaje de usuarios que completan tareas",
        categoria: "Plataforma Web",
        dimension: "Usabilidad",
        meta: 80,
        unidad: "%",
      },
      {
        nombre: "Número de accesos desde distintas fuentes",
        categoria: "Plataforma Web",
        dimension: "Accesibilidad",
        meta: 500,
        unidad: "accesos",
      },
      {
        nombre: "Número de actualizaciones realizadas",
        categoria: "Plataforma Web",
        dimension: "Actualización de contenido",
        meta: 20,
        unidad: "actualizaciones",
      },
      {
        nombre: "Contenido agregado en el periodo",
        categoria: "Plataforma Web",
        dimension: "Actualización de contenido",
        meta: 50,
        unidad: "elementos",
      },
      // Variable dependiente 1: Promoción Turística
      {
        nombre: "Promedio de calificaciones a lugares turísticos",
        categoria: "Promoción Turística",
        dimension: "Opinión sobre atractivos",
        meta: 4.5,
        unidad: "calificación",
      },
      {
        nombre: "Número de veces que se usa 'Cómo llegar'",
        categoria: "Promoción Turística",
        dimension: "Intención o deseo de visitar",
        meta: 100,
        unidad: "usos",
      },
      {
        nombre: "Número de veces que se comparte un lugar/evento",
        categoria: "Promoción Turística",
        dimension: "Intención o deseo de recomendar",
        meta: 50,
        unidad: "compartidos",
      },
      {
        nombre: "Cantidad de lugares agregados a favoritos",
        categoria: "Promoción Turística",
        dimension: "Interacción con la plataforma",
        meta: 200,
        unidad: "favoritos",
      },
      // Variable dependiente 2: Promoción Cultural
      {
        nombre: "Promedio de calificaciones a actividades culturales",
        categoria: "Promoción Cultural",
        dimension: "Opinión sobre actividades culturales",
        meta: 4.5,
        unidad: "calificación",
      },
      {
        nombre: "Número de veces que se comparten actividades culturales",
        categoria: "Promoción Cultural",
        dimension: "Intención de recomendar",
        meta: 30,
        unidad: "compartidos",
      },
      {
        nombre: "Cantidad de comentarios sobre eventos culturales",
        categoria: "Promoción Cultural",
        dimension: "Participación digital",
        meta: 100,
        unidad: "comentarios",
      },
    ],
  });

  // Muestra los registros insertados
  const indicadores = await prismaSeed.indicador.findMany();
  console.log("Indicadores en la base de datos:", indicadores);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaSeed.$disconnect();
  });
