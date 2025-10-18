import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params?: { id?: string } } = {}) {
  // extraer id de params o, si no existe, desde la propia URL (fallback)
  const idFromParams = params?.id;
  const pathname = typeof req.url === "string" ? new URL(req.url).pathname : "";
  const idFromPath = pathname.split("/").filter(Boolean).pop(); // último segmento
  const id = idFromParams ?? idFromPath;

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Resolver usuario via /api/me (pasa cookies)
    let usuario: any = null;
    try {
      const meUrl = new URL("/api/me", req.url).toString();
      const meRes = await fetch(meUrl, { headers: { cookie: req.headers.get("cookie") || "" } });
      if (meRes.ok) {
        usuario = await meRes.json();
      }
    } catch {
      // ignore and fallback
    }

    // fallback: buscar por token en Usuario / Session si aplica
    if (!usuario) {
      usuario = await prisma.usuario.findFirst({ where: { token } }).catch(() => null);
      if (!usuario) {
        const hasSessionModel = (prisma as any).session && typeof (prisma as any).session.findUnique === "function";
        if (hasSessionModel) {
          const session = await (prisma as any).session.findUnique({ where: { token } }).catch(() => null);
          if (session?.usuarioId) {
            usuario = await prisma.usuario.findUnique({ where: { id: session.usuarioId } }).catch(() => null);
          } else if (session?.userId) {
            usuario = await prisma.usuario.findUnique({ where: { id: session.userId } }).catch(() => null);
          }
        }
      }
    }

    if (!usuario || usuario.rol !== "ADMIN") {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }

    // Intentar eliminar el evento
    await prisma.evento.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/eventos/[id] error:", err);
    return NextResponse.json({ error: err.message || "error" }, { status: 500 });
  }
}
