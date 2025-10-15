import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const usuarioId = Number(req.nextUrl.searchParams.get("usuarioId"));
  if (!usuarioId) return new Response(JSON.stringify([]), { status: 200 });

  const redes = await prisma.redSocial.findMany({
    where: { usuarioId },
    orderBy: { creadoEn: "desc" },
  });

  return new Response(JSON.stringify(redes), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const { usuarioId, nombre, link } = await req.json();

  await prisma.redSocial.create({
    data: {
      usuarioId,
      nombre,
      link,
    },
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
