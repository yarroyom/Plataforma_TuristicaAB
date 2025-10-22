import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function resolveUserFromToken(token: string | null) {
  if (!token) return null;
  try {
    const maybeId = Number(token);
    if (Number.isFinite(maybeId) && maybeId > 0) {
      const u = await prisma.usuario.findUnique({ where: { id: maybeId } });
      if (u) return u;
    }
    const byToken = await prisma.usuario.findFirst({ where: { token } }).catch(() => null);
    if (byToken) return byToken;
    const hasSession = (prisma as any).session && typeof (prisma as any).session.findUnique === 'function';
    if (hasSession) {
      const session = await (prisma as any).session.findUnique({ where: { token } }).catch(() => null);
      if (session?.usuarioId) {
        const u2 = await prisma.usuario.findUnique({ where: { id: session.usuarioId } }).catch(() => null);
        if (u2) return u2;
      }
    }
  } catch (e) {
    console.error('resolveUserFromToken error', e);
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Requerir token en cookie o header
    const cookieToken = req.cookies.get('token')?.value ?? null;
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null;
    const token = cookieToken ?? bearer;

    const user = await resolveUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Usuario autenticado -> devolver lista de usuarios (todos los roles)
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nombre: true, foto: true, correo: true, creadoEn: true, rol: true },
      orderBy: { creadoEn: 'desc' },
    });

    return NextResponse.json(usuarios);
  } catch (err) {
    console.error('GET /api/usuarios error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('token')?.value ?? null;
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null;
    const token = cookieToken ?? bearer;

    const user = await resolveUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (String(user.rol).toUpperCase() !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    if (id === user.id) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });

    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/usuarios error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
