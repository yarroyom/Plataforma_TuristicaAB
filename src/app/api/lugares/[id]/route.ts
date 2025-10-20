import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma"; // ...existing import si ya lo tienes

// helper para resolver userId (acepta id numérico en cookie o JWT en Authorization)
async function getUserIdFromReq(req: NextRequest): Promise<number | null> {
  try {
    let token = req.cookies.get("token")?.value ?? null;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) token = authHeader.split(" ")[1];
    if (!token) return null;
    if (/^\d+$/.test(token)) return Number(token);
    if (process.env.JWT_SECRET) {
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET);
        const maybe = payload?.id ?? payload?.sub ?? null;
        const idNum = maybe != null ? Number(maybe) : NaN;
        if (Number.isFinite(idNum) && idNum > 0) return idNum;
      } catch (e) {
        console.warn("getUserIdFromReq: JWT verify falló:", e);
      }
    }
    const num = Number(token);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch (e) {
    console.error("getUserIdFromReq error:", e);
    return null;
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lugarId = Number(params.id);
    if (!Number.isFinite(lugarId) || lugarId <= 0) {
      return NextResponse.json({ error: "ID de lugar inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    // Campos permitidos para actualizar
    const updates: any = {};
    if (typeof body.descripcion === "string") updates.descripcion = body.descripcion;
    if (typeof body.nombre === "string") updates.nombre = body.nombre;
    if (typeof body.imagen_url === "string") updates.imagen_url = body.imagen_url;
    if (typeof body.tipo === "string") updates.tipo = body.tipo.toUpperCase() === "CULTURAL" ? "CULTURAL" : "TURISTICO";
    if (body.latitud !== undefined && body.latitud !== null && !Number.isNaN(Number(body.latitud))) updates.latitud = Number(body.latitud);
    if (body.longitud !== undefined && body.longitud !== null && !Number.isNaN(Number(body.longitud))) updates.longitud = Number(body.longitud);
    if (typeof body.direccion === "string") updates.direccion = body.direccion;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    // Autorización: permitir solo autor o ADMIN si aplica
    const userId = await getUserIdFromReq(req);
    // intentar obtener lugar actual para comprobar propietario (si existe campo usuarioId)
    const existente = await prisma.lugares?.findUnique ? await (prisma as any).lugares.findUnique({ where: { id: lugarId } }) : await prisma.lugar?.findUnique ? await (prisma as any).lugar.findUnique({ where: { id: lugarId } }) : null;
    // si no encontró por nombres probados, intentar buscar entre posibles modelos (fallback genérico)
    // (si tu prisma usa otro nombre para el modelo, ajusta arriba)
    if (!existente) {
      // intentar con 'lugar' singular
      try {
        // nada: si no existe, seguir y dejar que update falle con mensaje claro
      } catch {}
    }

    if (existente && existente.usuarioId && userId) {
      // permitir solo al autor o admin
      if (Number(existente.usuarioId) !== Number(userId)) {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!usuario || String(usuario.rol).toUpperCase() !== "ADMIN") {
          return NextResponse.json({ error: "No autorizado para editar este lugar" }, { status: 403 });
        }
      }
    } else if (userId) {
      // si no hay propietario, exigir ADMIN para editar
      const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
      if (!usuario || String(usuario.rol).toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    } else {
      // sin userId: rechazar
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Realizar update en el modelo correcto; probar nombres comunes
    const modelCandidates = ["lugares", "lugar", "lugarTuristico", "Lugar"];
    let actualizado = null;
    let lastErr: any = null;
    for (const m of modelCandidates) {
      const model = (prisma as any)[m];
      if (!model || typeof model.update !== "function") continue;
      try {
        actualizado = await model.update({
          where: { id: lugarId },
          data: updates,
        });
        break;
      } catch (e) {
        lastErr = e;
        // si falla por campo desconocido o where fail, intentamos siguiente candidato
      }
    }
    if (!actualizado) {
      console.error("PUT /api/lugares update falló:", lastErr);
      return NextResponse.json({ error: "No se pudo actualizar: " + (lastErr?.message ?? "error interno") }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lugar: actualizado });
  } catch (err) {
    console.error("PUT /api/lugares/[id] error:", err);
    return NextResponse.json({ error: "Error interno al actualizar lugar" }, { status: 500 });
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