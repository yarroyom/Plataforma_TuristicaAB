import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const usuarioIdParam = req.nextUrl.searchParams.get("usuarioId");
  const usuarioId = usuarioIdParam ? Number(usuarioIdParam) : null;

  const where = usuarioId ? { usuarioId } : undefined;

  const redes = await prisma.redSocial.findMany({
    where,
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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    const usuarioId = Number(body?.usuarioId);
    if (!id || !usuarioId) return new Response(JSON.stringify({ error: 'id y usuarioId requeridos' }), { status: 400 });

    // Solo permitir eliminar si el registro pertenece al usuario que solicita la eliminación
    const result = await prisma.redSocial.deleteMany({ where: { id, usuarioId } });
    if (result.count === 0) {
      return new Response(JSON.stringify({ error: 'No autorizado o no encontrado' }), { status: 403 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error('DELETE /api/redes-sociales error', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
}
