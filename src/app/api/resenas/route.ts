import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { incrementIndicadorByName } from "@/lib/indicadores";
import jwt from "jsonwebtoken";

/* Helper: resuelve userId desde cookie o header Authorization (JWT o id numérico) */
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

/** Intenta resolver dinámicamente el modelo de reseñas en prisma */
function resolveResenaModel(prismaClient: any) {
  const candidates = ["resena", "resenas", "reseña", "reseñas", "resena", "review", "reviews"];
  for (const name of candidates) {
    const m = (prismaClient as any)[name];
    if (m && typeof m.create === "function" && typeof m.findMany === "function") {
      return m;
    }
  }
  return null;
}

/* Buscar lugar por id probando nombres comunes de modelo */
async function findLugarById(id: number) {
  const candidates = ["lugar", "lugares", "lugarTuristico", "Lugar", "LugarTuristico"];
  for (const name of candidates) {
    const model = (prisma as any)[name];
    if (model && typeof model.findUnique === "function") {
      try {
        const found = await model.findUnique({ where: { id } });
        if (found) return found;
      } catch {
        // ignorar y probar siguiente candidato
      }
    }
  }
  return null;
}

/* Determina si un registro representa contenido cultural */
function isCulturalRecord(record: any) {
  if (!record) return false;
  const fields = [
    String(record.tipo ?? ""),
    String(record.tipoLugar ?? ""),
    String(record.categoria ?? ""),
    String(record.esCultural ?? ""),
  ];
  return fields.some(f => f && f.toUpperCase().includes("CULTUR"));
}

/* POST: crear reseña */
export async function POST(req: NextRequest) {
  try {
    const resenaModel = resolveResenaModel(prisma);
    if (!resenaModel) {
      const available = Object.keys(prisma).filter(k => typeof (prisma as any)[k] === "object").join(", ");
      console.error("Modelo de reseña no encontrado en prisma. Disponibles:", available);
      return NextResponse.json({ error: "Modelo de reseña no encontrado en Prisma. Disponibles: " + available }, { status: 500 });
    }

    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lugarId = Number(body?.lugarId ?? body?.lugar?.id ?? NaN);
    const comentario = String(body?.comentario ?? "").trim();
    if (!Number.isFinite(lugarId) || lugarId <= 0) return NextResponse.json({ error: "lugarId inválido" }, { status: 400 });
    if (!comentario) return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });

    const resena = await resenaModel.create({
      data: {
        lugarId,
        usuarioId: userId,
        comentario,
        creadoEn: new Date(),
      },
      include: { usuario: true },
    });

    // indicador (no crítico): registrar "Contenido agregado en el periodo" como incremento por día
    try {
      const indicadorNombre = "Contenido agregado en el periodo";
      const indicador = await prisma.indicador.findFirst({ where: { nombre: indicadorNombre } });
      if (indicador) {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const ultimo = await prisma.valorIndicador.findFirst({ where: { indicadorId: indicador.id, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } });
        const nuevoValor = ultimo ? (ultimo.valorActual ?? 0) + 1 : 1;
        await prisma.valorIndicador.create({ data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() } });
      } else {
        await prisma.valorIndicador.create({ data: { indicadorId: 58, valorActual: 1, fecha: new Date() } });
      }
    } catch (e) {
      console.warn("Indicador reseña create falló:", e);
    }

    // --- NUEVO: en background actualizar indicador "Cantidad de comentarios sobre eventos culturales"
    (async () => {
      try {
        const lid = Number(resena.lugarId ?? lugarId);
        console.log("Background indicador: procesando comentario para lugarId=", lid);
        if (!Number.isFinite(lid) || lid <= 0) return;
        const lugarDb = await findLugarById(lid);
        if (!lugarDb) {
          console.log("Background indicador: lugar no encontrado para id=", lid);
          return;
        }
        if (!isCulturalRecord(lugarDb)) {
          console.log("Background indicador: registro no cultural, omitiendo indicador para lugarId=", lid);
          return;
        }

        const indicadorNombre = "Cantidad de comentarios sobre eventos culturales";
        // obtener o crear indicador (meta opcional)
        let indicador = await prisma.indicador.findFirst({ where: { nombre: indicadorNombre } });
        if (!indicador) {
          try {
            indicador = await prisma.indicador.create({
              data: { nombre: indicadorNombre, categoria: "Promoción Cultural" }
            });
            console.log("Background indicador: indicador creado", indicador?.id);
          } catch (err) {
            console.warn("Background indicador: fallo al crear indicador (intentando fallback):", err);
            try {
              indicador = await prisma.indicador.create({ data: { nombre: indicadorNombre } });
            } catch (inner) {
              console.warn("Background indicador: fallback de creación falló:", inner);
            }
          }
        }

        if (indicador && indicador.id) {
          const hoy = new Date(); hoy.setHours(0,0,0,0);
          const ultimo = await prisma.valorIndicador.findFirst({
            where: { indicadorId: indicador.id, fecha: { gte: hoy } },
            orderBy: { fecha: "desc" },
          });
          const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
          const created = await prisma.valorIndicador.create({
            data: { indicadorId: indicador.id, valorActual: nuevoValor, fecha: new Date() }
          });
          console.log("Background indicador: valor creado", { indicadorId: indicador.id, nuevoValor, createdId: created?.id });
        } else {
          // como último recurso, intentar usar helper incrementIndicadorByName si existe
          try {
            // @ts-ignore - may be defined elsewhere
            const { incrementIndicadorByName } = await import("@/lib/indicadores");
            await incrementIndicadorByName(indicadorNombre);
            console.log("Background indicador: incrementIndicadorByName fallback ejecutado para", indicadorNombre);
          } catch (fallbackErr) {
            console.warn("Background indicador: no se pudo actualizar indicador de comentarios culturales (background):", fallbackErr);
          }
        }
      } catch (e) {
        console.warn("No se pudo actualizar indicador de comentarios culturales (background):", e);
      }
    })();

    return NextResponse.json({
      resena: {
        id: resena.id,
        usuarioId: resena.usuarioId,
        usuario: resena.usuario?.nombre ?? null,
        foto: resena.usuario?.foto ?? null,
        comentario: resena.comentario,
        fecha: resena.creadoEn?.toISOString().slice(0, 10) ?? null,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/resenas error:", err);
    return NextResponse.json({ error: "Error al guardar reseña" }, { status: 500 });
  }
}

/* GET: listar reseñas por lugar */
export async function GET(req: NextRequest) {
  try {
    const resenaModel = resolveResenaModel(prisma);
    if (!resenaModel) {
      const available = Object.keys(prisma).filter(k => typeof (prisma as any)[k] === "object").join(", ");
      console.error("Modelo de reseña no encontrado en prisma. Disponibles:", available);
      return NextResponse.json([], { status: 200 });
    }

    const q = req.nextUrl.searchParams.get("lugarId");
    let resenas;
    if (q === null) {
      resenas = await resenaModel.findMany({ include: { usuario: true }, orderBy: { creadoEn: "desc" } });
    } else {
      const lugarId = Number(q);
      if (!Number.isFinite(lugarId) || lugarId <= 0) return NextResponse.json([]);
      resenas = await resenaModel.findMany({ where: { lugarId }, include: { usuario: true }, orderBy: { creadoEn: "desc" } });
    }

    const payload = Array.isArray(resenas)
      ? resenas.map((r: any) => ({
          id: r.id,
          usuarioId: r.usuarioId,
          usuario: r.usuario?.nombre ?? "",
          foto: r.usuario?.foto ?? "",
          comentario: r.comentario,
          fecha: r.creadoEn?.toISOString().slice(0, 10) ?? "",
        }))
      : [];

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/resenas error:", err);
    return NextResponse.json({ error: "Error al obtener reseñas" }, { status: 500 });
  }
}

/* PUT: actualizar reseña (autor o ADMIN) */
export async function PUT(req: NextRequest) {
  try {
    const resenaModel = resolveResenaModel(prisma);
    if (!resenaModel) {
      const available = Object.keys(prisma).filter(k => typeof (prisma as any)[k] === "object").join(", ");
      console.error("Modelo de reseña no encontrado en prisma. Disponibles:", available);
      return NextResponse.json({ error: "Modelo de reseña no encontrado en Prisma. Disponibles: " + available }, { status: 500 });
    }

    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const resenaId = Number(body?.id ?? body?.resenaId ?? body?.reviewId ?? NaN);
    const nuevoComentario = String(body?.comentario ?? body?.contenido ?? body?.nuevoComentario ?? "").trim();

    if (!Number.isFinite(resenaId) || resenaId <= 0) return NextResponse.json({ error: "reseña id inválido" }, { status: 400 });
    if (!nuevoComentario) return NextResponse.json({ error: "Comentario vacío o inválido" }, { status: 400 });

    const existente = await resenaModel.findUnique({ where: { id: resenaId } });
    if (!existente) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

    if (existente.usuarioId !== userId) {
      const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
      if (!usuario || String(usuario.rol).toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado para editar esta reseña" }, { status: 403 });
      }
    }

    const actualizado = await resenaModel.update({ where: { id: resenaId }, data: { comentario: nuevoComentario }, include: { usuario: true } });

    try {
      // usado para contar "Número de actualizaciones realizadas"
      (async () => {
        try {
          await incrementIndicadorByName("Número de actualizaciones realizadas");
        } catch (e) {
          console.warn("No se pudo registrar indicador de actualizaciones (resenas):", e);
          // fallback: crear un registro unitario para mantener compatibilidad
          try {
            await prisma.valorIndicador.create({ data: { indicadorId: 57, valorActual: 1, fecha: new Date() } });
          } catch (inner) {
            console.warn("Fallback indicador 57 also failed:", inner);
          }
        }
      })();
    } catch (e) {
      console.warn("Indicador update reseña outer try falló:", e);
    }

    return NextResponse.json({
      ok: true,
      reseña: {
        id: actualizado.id,
        comentario: actualizado.comentario,
        usuarioId: actualizado.usuarioId,
        usuario: actualizado.usuario?.nombre ?? null,
        foto: actualizado.usuario?.foto ?? null,
        actualizadoEn: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("PUT /api/resenas error:", err);
    return NextResponse.json({ error: "Error al actualizar reseña" }, { status: 500 });
  }
}

/* DELETE: eliminar reseña (autor o ADMIN) */
export async function DELETE(req: NextRequest, context: any = {}) {
  try {
    // 1) obtener id desde params (App Router), query, path o body
    let idRaw: any = null;
    try { const ctx = await context; idRaw = ctx?.params?.id ?? null; } catch {}
    if (!idRaw) idRaw = req.nextUrl?.searchParams?.get("id") ?? null;
    if (!idRaw) {
      const pathname = typeof req.url === "string" ? new URL(req.url).pathname : "";
      idRaw = pathname.split("/").filter(Boolean).pop();
    }
    if (!idRaw) {
      try { const body = await req.json().catch(() => ({})); idRaw = body?.id ?? body?.resenaId ?? null; } catch {}
    }
    const resenaId = Number(idRaw);
    if (!Number.isFinite(resenaId) || resenaId <= 0) {
      return NextResponse.json({ error: "reseña id inválido" }, { status: 400 });
    }

    // 2) resolver usuario y comprobar autorización
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const resenaModel = resolveResenaModel(prisma);
    if (!resenaModel) {
      return NextResponse.json({ error: "Modelo de reseña no encontrado en Prisma" }, { status: 500 });
    }

    const existente = await resenaModel.findUnique({ where: { id: resenaId } });
    if (!existente) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

    if (Number(existente.usuarioId) !== Number(userId)) {
      const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
      if (!usuario || String(usuario.rol).toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado para eliminar esta reseña" }, { status: 403 });
      }
    }

    // 3) intentar limpiar dependencias comunes que puedan causar FK constraint
    const candidateDeletes = [
      { model: "respuesta", field: "resenaId" },
      { model: "respuestas", field: "resenaId" },
      { model: "like", field: "resenaId" },
      { model: "likes", field: "resenaId" },
      { model: "imagen", field: "resenaId" },
      { model: "imagenes", field: "resenaId" },
      { model: "favorito", field: "resenaId" },
      { model: "favoritos", field: "resenaId" },
      { model: "comentario", field: "resenaId" },
      { model: "comentarios", field: "resenaId" },
    ];
    for (const c of candidateDeletes) {
      try {
        const m = (prisma as any)[c.model];
        if (m && typeof m.deleteMany === "function") {
          await m.deleteMany({ where: { [c.field]: resenaId } }).catch(() => null);
        } else {
          // fallback raw (silencioso) - no rompe si tabla inexistente
          await prisma.$executeRawUnsafe?.(`DELETE FROM ${String(c.model)} WHERE ${String(c.field)} = ${resenaId}`).catch(() => null);
        }
      } catch {
        // ignore
      }
    }

    // 4) intentar delete físico en el modelo de reseña
        // preparar variable fuera del try para estar disponible en el catch para diagnóstico
        let rawPresence: Record<string, any> | undefined = undefined;
        try {
          // --- NUEVO: inspección rápida en tablas candidatas para diagnóstico ---
          const tableCandidates = ['"Reseña"', '"resena"', '"resenas"', "resena", "resenas", "Resena", "review", "reviews"];
          rawPresence = {};
          for (const t of tableCandidates) {
            try {
              // usar $queryRawUnsafe solo para diagnóstico (resenaId es Number)
              const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${t} WHERE id = ${Number(resenaId)} LIMIT 1`).catch(() => null);
              rawPresence[t] = Array.isArray(rows) ? (rows.length > 0 ? rows[0] : null) : rows;
            } catch (selErr) {
              rawPresence[t] = null;
            }
          }
          console.log("DELETE /api/resenas - raw presence check:", rawPresence);
    
          await resenaModel.delete({ where: { id: resenaId } });
          return NextResponse.json({ ok: true });
        } catch (deleteErr: any) {
          // Logging y respuesta diagnóstica ampliada
          console.error("DELETE /api/resenas - delete fallo:", deleteErr);
          const code = deleteErr?.code ?? null;
          const message = String(deleteErr?.message ?? deleteErr ?? "Error al eliminar reseña");
    
          // Respuesta con detalle limitado; stack solo en dev
          const payload: any = { error: message.slice(0, 1000), code };
          try {
            // incluir hint de tablas donde la fila fue encontrada (puede ayudar)
            payload.rawPresence = typeof rawPresence !== "undefined" ? rawPresence : null;
          } catch {}
          if (process.env.NODE_ENV !== "production") {
            payload.stack = deleteErr?.stack ? String(deleteErr.stack).slice(0, 2000) : undefined;
          }
    
          // Si parece FK, devolver 409 para que el cliente lo trate como conflicto de dependencias
          const low = message.toLowerCase();
          if (low.includes("foreign") || String(code).toLowerCase().includes("p2003") || low.includes("constraint")) {
            return NextResponse.json({ ...payload, error: "No se pudo eliminar: existen registros relacionados." }, { status: 409 });
          }
    
          return NextResponse.json(payload, { status: 500 });
        }
  } catch (err: any) {
    console.error("DELETE /api/resenas unexpected error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}