// scripts/delete_notifications.js
// Usa Prisma Client para contar y borrar todos los registros de la tabla Notificacion.
// Ejecutar: node scripts/delete_notifications.js (con DATABASE_URL en el entorno)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Conectando a BD...');
  const before = await prisma.notificacion.count().catch(err => {
    console.error('Error contando notificaciones:', err.message || err);
    process.exit(1);
  });

  console.log('Registros antes:', before);

  if (before === 0) {
    console.log('No hay registros para borrar. Saliendo.');
    await prisma.$disconnect();
    return;
  }

  // Confirmación simple por prompt en terminal
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question(`¿Borrar todos los ${before} registros de Notificacion? (si/no): `, async (answer) => {
    rl.close();
    if (answer.toLowerCase() !== 'si' && answer.toLowerCase() !== 's') {
      console.log('Operación cancelada por el usuario.');
      await prisma.$disconnect();
      return;
    }

    try {
      const res = await prisma.notificacion.deleteMany({});
      console.log('Registros borrados:', res.count);
    } catch (err) {
      console.error('Error borrando notificaciones:', err.message || err);
    } finally {
      await prisma.$disconnect();
    }
  });
}

main();
