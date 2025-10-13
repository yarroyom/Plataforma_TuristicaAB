import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId: payload.id },
    include: { lugar: true },
    orderBy: { creadoEn: "desc" },
  });

  return NextResponse.json(
    favoritos.map((f: { lugar: any }) => f.lugar)
  );
}

export async function POST(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
  const { lugarId } = await req.json();

  const existente = await prisma.favorito.findFirst({
    where: { usuarioId: payload.id, lugarId },
  });
  if (existente) return NextResponse.json({ message: "Ya es favorito" });

  await prisma.favorito.create({
    data: { usuarioId: payload.id, lugarId },
  });
  return NextResponse.json({ message: "Agregado a favoritos" });
}

export async function DELETE(req: NextRequest) {
  let token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
  const { lugarId } = await req.json();

  await prisma.favorito.deleteMany({
    where: { usuarioId: payload.id, lugarId },
  });
  return NextResponse.json({ message: "Eliminado de favoritos" });
}
