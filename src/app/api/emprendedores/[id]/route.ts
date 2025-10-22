import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { incrementIndicadorByName } from "@/lib/indicadores";

interface Params {
  params: { id: string };
}

// Obtener perfil por id
export async function GET(req: Request, { params }: Params) {
  const id = parseInt(params.id);

  const perfil = await prisma.emprendedorPerfil.findUnique({
    where: { id },
    include: { usuario: true },
  });

  if (!perfil) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  return NextResponse.json(perfil);
}

// Editar perfil
export async function PUT(req: Request, { params }: Params) {
  const id = parseInt(params.id);
  const data = await req.json();

  const perfil = await prisma.emprendedorPerfil.findUnique({
    where: { id },
    include: { usuario: true },
  });
  if (!perfil) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  // Validación de rol
  if (perfil.usuario.rol !== "EMPRENDEDOR") {
    return NextResponse.json({ error: "No tienes permiso para editar este perfil" }, { status: 403 });
  }

  const updatedPerfil = await prisma.emprendedorPerfil.update({
    where: { id },
    data,
  });

  // Registrar actualización (no bloqueante)
  (async () => {
    try {
      await incrementIndicadorByName("Número de actualizaciones realizadas");
    } catch (e) {
      console.warn("No se pudo registrar indicador de actualizaciones (emprendedores):", e);
    }
  })();

  return NextResponse.json(updatedPerfil);
}

// Eliminar perfil
export async function DELETE(req: Request, { params }: Params) {
  const id = parseInt(params.id);

  const perfil = await prisma.emprendedorPerfil.findUnique({
    where: { id },
    include: { usuario: true },
  });
  if (!perfil) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  // Validación de rol
  if (perfil.usuario.rol !== "EMPRENDEDOR") {
    return NextResponse.json({ error: "No tienes permiso para eliminar este perfil" }, { status: 403 });
  }

  await prisma.emprendedorPerfil.delete({ where: { id } });

  return NextResponse.json({ message: "Perfil eliminado correctamente" });
}
