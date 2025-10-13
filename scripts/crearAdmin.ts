const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function crearAdmin() {
  const correoAdmin = "ferarroyo0102@gmail.com";
  const nombreAdmin = "Administradora";
  const passwordPlano = "AguaBlanca123!";

  // Busca si ya existe un usuario con ese correo
  const existente = await prisma.usuario.findUnique({ where: { correo: correoAdmin } });
  if (existente) {
    // Si existe, actualiza su rol a ADMIN y su contraseña
    const hash = await bcrypt.hash(passwordPlano, 10);
    const actualizado = await prisma.usuario.update({
      where: { correo: correoAdmin },
      data: {
        nombre: nombreAdmin,
        password: hash,
        rol: "ADMIN",
      },
    });
    console.log("Usuario actualizado como administrador:", actualizado);
    console.log("Contraseña para login:", passwordPlano);
    return;
  }

  // Si no existe, crea el usuario como administrador
  const hash = await bcrypt.hash(passwordPlano, 10);

  const admin = await prisma.usuario.create({
    data: {
      nombre: nombreAdmin,
      correo: correoAdmin,
      password: hash,
      rol: "ADMIN",
    },
  });

  console.log("Administrador creado exitosamente:", admin);
  console.log("Contraseña para login:", passwordPlano);
}

crearAdmin()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
