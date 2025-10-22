import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NextApiRequest } from "next";

// Re-implementar getRoleFromReq similar al handler principal para autorizar
async function getRoleFromReq(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get("token")?.value ?? null;
    if (!token) return null;
    if (/^\d+$/.test(token)) {
      const usuario = await prisma.usuario.findUnique({ where: { id: Number(token) }, select: { rol: true } });
      return usuario?.rol ?? null;
    }
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64").toString() || "{}");
      const maybeId = payload?.id ?? payload?.sub ?? null;
      if (maybeId) {
        const usuario = await prisma.usuario.findUnique({ where: { id: Number(maybeId) }, select: { rol: true } });
        return usuario?.rol ?? null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  } catch (e) {
    console.warn("getRoleFromReq error:", e);
    return null;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const idRaw = params?.id;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const role = await getRoleFromReq(req);
  if (String(role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    // Marcar inactiva en vez de eliminar físicamente
    const updated = await prisma.notificacion.update({ where: { id }, data: { activo: false } }).catch(() => null);
    if (!updated) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notificaciones/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
