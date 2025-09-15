import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const emprendedores = await prisma.emprendedorPerfil.findMany({
    include: { usuario: true }
  });
  return NextResponse.json(emprendedores);
}

export async function POST(req: Request) {
  const { usuarioId, nombre, descripcion, telefono, direccion, foto } = await req.json();

  const perfil = await prisma.emprendedorPerfil.create({
    data: { usuarioId, nombre, descripcion, telefono, direccion, foto }
  });

  return NextResponse.json(perfil);
}
