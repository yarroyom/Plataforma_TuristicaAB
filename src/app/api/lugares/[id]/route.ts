import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let token = req.cookies.get("token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
  }
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (payload.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede editar la historia" }, { status: 403 });
    }
    const { descripcion } = await req.json();

    // Log para depuración
    console.log("ID recibido:", id);
    console.log("Descripción recibida:", descripcion);

    // Verifica si el lugar existe antes de actualizar
    const lugarExistente = await prisma.lugarTuristico.findUnique({
      where: { id: Number(id) },
    });
    if (!lugarExistente) {
      console.error("Lugar no encontrado en la base de datos");
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
    }

    const lugar = await prisma.lugarTuristico.update({
      where: { id: Number(id) },
      data: { descripcion },
    });

    // Log para depuración
    console.log("Lugar actualizado:", lugar);

    return NextResponse.json({ message: "Historia actualizada", lugar });
  } catch (err) {
    // Log para depuración
    console.error("Error al actualizar:", err);
    return NextResponse.json(
      { error: "Error al actualizar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lugar = await prisma.lugarTuristico.findUnique({
      where: { id: Number(id) },
    });
    if (!lugar) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
    }
    return NextResponse.json(lugar);
  } catch (err) {
    return NextResponse.json(
      { error: "Error al obtener lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: any = {}) {
  // await context to safely access params (Next requires this in dynamic route handlers)
  const ctx = await context;
  const idFromParams = ctx?.params?.id;
  const pathname = typeof req.url === "string" ? new URL(req.url).pathname : "";
  const idFromPath = pathname.split("/").filter(Boolean).pop();
  const id = idFromParams ?? idFromPath;

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    // Obtener token (cookie o Authorization) - intentos múltiples
    const cookieHeader = req.headers.get("cookie") || "";
    let token = req.cookies.get("token")?.value ?? null;
    if (!token) {
      const altNames = ["session", "sid", "auth", "sessionId"];
      for (const name of altNames) {
        const v = req.cookies.get(name)?.value;
        if (v) { token = v; break; }
      }
    }
    if (!token) {
      const auth = req.headers.get("authorization") || req.headers.get("Authorization");
      if (auth?.toLowerCase().startsWith("bearer ")) token = auth.split(" ")[1];
    }

    console.log("DELETE /api/lugares/[id] called; id=", id, " tokenFound=", !!token);

    // Resolver usuario via /api/me con las cookies del request
    let usuario: any = null;
    try {
      const meUrl = new URL("/api/me", req.url).toString();
      const meRes = await fetch(meUrl, { headers: { cookie: cookieHeader } });
      if (meRes.ok) {
        usuario = await meRes.json();
        console.log("Resolved user via /api/me:", usuario?.id, usuario?.rol);
      } else {
        console.log("/api/me responded:", meRes.status);
      }
    } catch (e) {
      console.log("Error calling /api/me:", e);
    }

    // Fallback: buscar por token en Usuario / Session si aplica
    if (!usuario && token) {
      try {
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
        } else {
          console.log("Resolved user via usuario.token:", usuario.id, usuario.rol);
        }
      } catch (e) {
        console.log("Error resolving user fallback:", e);
      }
    }

    if (!usuario) {
      console.warn("DELETE denied: no usuario identificado");
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (usuario.rol !== "ADMIN") {
      console.warn("DELETE denied: usuario no es ADMIN - rol:", usuario.rol);
      return NextResponse.json({ error: "Permiso denegado: requiere rol ADMIN", role: usuario.rol }, { status: 403 });
    }

    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Eliminar dependencias que provocan la FK antes de borrar el lugar
    try {
      // Borrar reseñas, favoritos, ratings asociados (usar queries parametrizadas)
      await prisma.$executeRaw`DELETE FROM "Reseña" WHERE "lugarId" = ${idNum}`;
      await prisma.$executeRaw`DELETE FROM "Favorito" WHERE "lugarId" = ${idNum}`;
      await prisma.$executeRaw`DELETE FROM "Rating" WHERE "lugarId" = ${idNum}`;
    } catch (e) {
      // Si alguna tabla no existe o falla, lo intentamos por modelos Prisma como fallback
      console.log("Warning: raw delete dependents failed, trying Prisma deleteMany fallback", e);
      try {
        await (prisma as any).reseña?.deleteMany?.({ where: { lugarId: idNum } }).catch(() => null);
        await (prisma as any).favorito?.deleteMany?.({ where: { lugarId: idNum } }).catch(() => null);
        await (prisma as any).rating?.deleteMany?.({ where: { lugarId: idNum } }).catch(() => null);
      } catch (ee) {
        console.log("Fallback deleteMany also failed:", ee);
      }
    }

    // Finalmente eliminar el lugar
    try {
      await prisma.lugarTuristico.delete({ where: { id: idNum } });
      console.log("Lugar eliminado id=", idNum, "por admin=", usuario.id);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("Error al eliminar lugar:", err);
      // Si sigue siendo una violación de FK, informar claramente
      if (err?.code === "P2003") {
        return NextResponse.json({ error: "No se pudo eliminar: existen registros relacionados (reseñas, favoritos, ratings)." }, { status: 409 });
      }
      return NextResponse.json({ error: err.message || "Error al eliminar" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("DELETE /api/lugares/[id] unexpected error:", err);
    return NextResponse.json({ error: err.message || "error" }, { status: 500 });
  }
}