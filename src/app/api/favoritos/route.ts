import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

/* Helper: resuelve userId desde cookie o header Authorization (JWT o id numérico) */
async function getUserIdFromReq(req: NextRequest): Promise<number | null> {
	// similares heurísticas que en otros endpoints
	try {
		let token = req.cookies.get("token")?.value ?? null;
		const authHeader = (req.headers.get("authorization") || req.headers.get("Authorization") || "").toString();
		if (!token && authHeader.toLowerCase().startsWith("bearer ")) token = authHeader.split(" ")[1];
		if (!token) return null;
		// si es número puro
		if (/^\d+$/.test(token)) return Number(token);
		// intentar JWT si está configurado
		if (process.env.JWT_SECRET) {
			try {
				const payload: any = jwt.verify(token, process.env.JWT_SECRET);
				const maybe = payload?.id ?? payload?.sub ?? null;
				const idNum = maybe != null ? Number(maybe) : NaN;
				if (Number.isFinite(idNum) && idNum > 0) return idNum;
			} catch (e) {
				// jwt malformed u otros: ignorar y continuar con fallback
				console.debug("getUserIdFromReq: JWT verify fallo (ignored):", (e as any)?.message ?? e);
			}
		}
		// fallback: buscar usuario por token en la BD
		try {
			const u = await prisma.usuario.findFirst({ where: { token } }).catch(() => null);
			if (u?.id) return u.id;
		} catch (e) {
			// ignore
		}
		// fallback: session table si existe
		try {
			const hasSession = (prisma as any).session && typeof (prisma as any).session.findUnique === "function";
			if (hasSession) {
				const s = await (prisma as any).session.findUnique({ where: { token } }).catch(() => null);
				if (s?.usuarioId) return Number(s.usuarioId);
				if (s?.userId) return Number(s.userId);
			}
		} catch (e) {
			// ignore
		}
		return null;
	} catch (e) {
		console.error("getUserIdFromReq error:", e);
		return null;
	}
}

/* Util: resolver modelo favorito en prisma (nombres comunes) */
function resolveFavoritoModel(prismaClient: any) {
	const candidates = ["favorito", "favoritos", "Favorito", "Favoritos"];
	for (const name of candidates) {
		const m = (prismaClient as any)[name];
		if (m && (typeof m.delete === "function" || typeof m.deleteMany === "function")) return m;
	}
	return null;
}

/* Util: buscar un Lugar por id en modelos comunes o por consulta raw si hace falta */
async function findLugarById(id: number): Promise<any | null> {
	try {
		if (!Number.isFinite(id) || id <= 0) return null;
		const candidates = ["lugar", "lugares", "Lugar", "Lugares"];
		for (const name of candidates) {
			const m = (prisma as any)[name];
			if (!m) continue;
			// try findUnique / findFirst if available
			if (typeof m.findUnique === "function") {
				const r = await m.findUnique({ where: { id } }).catch(() => null);
				if (r) return r;
			}
			if (typeof m.findFirst === "function") {
				const r = await m.findFirst({ where: { id } }).catch(() => null);
				if (r) return r;
			}
		}

		// fallback raw query against a table named 'lugares' or 'lugar'
		try {
			const rows = await prisma.$queryRawUnsafe?.(`SELECT * FROM lugares WHERE id = ${Number(id)} LIMIT 1`) ?? [];
			if (Array.isArray(rows) && rows.length > 0) return rows[0];
		} catch (e) { /* ignore */ }

		try {
			const rows2 = await prisma.$queryRawUnsafe?.(`SELECT * FROM "lugar" WHERE id = ${Number(id)} LIMIT 1`) ?? [];
			if (Array.isArray(rows2) && rows2.length > 0) return rows2[0];
		} catch (e) { /* ignore */ }

		return null;
	} catch (e) {
		return null;
	}
}

/* DELETE handler robusto: acepta /api/favoritos/:id o DELETE /api/favoritos with { lugarId } */
export async function DELETE(req: NextRequest, context: any = {}) {
	try {
		// 1) obtener id desde params (App Router), query, path o body
		let idRaw: any = null;
		try { const ctx = await context; idRaw = ctx?.params?.id ?? null; } catch {}
		if (!idRaw) idRaw = req.nextUrl?.searchParams?.get("id") ?? null;
		if (!idRaw) {
			const pathname = typeof req.url === "string" ? new URL(req.url).pathname : "";
			const last = pathname.split("/").filter(Boolean).pop();
			if (last) idRaw = last;
		}
		let body: any = {};
		try { body = await req.json().catch(() => ({})); } catch {}
		const lugarIdFromBody = body?.lugarId ?? body?.id ?? null;

		// preferir body.lugarId si existe; luego params/path
		let targetRaw = lugarIdFromBody ?? idRaw ?? null;
		if (targetRaw === null) {
			return NextResponse.json({ error: "falta id/lugarId en petición" }, { status: 400 });
		}

		const targetNum = Number(targetRaw);
		if (!Number.isFinite(targetNum) || targetNum <= 0) {
			return NextResponse.json({ error: "ID inválido" }, { status: 400 });
		}

		// 2) resolver usuario
		const userId = await getUserIdFromReq(req);
		if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

		// 3) resolver modelo favorito
		const favModel = resolveFavoritoModel(prisma);
		// intentar borrar con modelo/prisma o fallback raw
		// casos:
		// - si target corresponde al id del registro favorito -> borrar por id
		// - si target corresponde al lugarId -> borrar por lugarId+usuarioId
		let deleted = false;
		let deletedCount = 0;
		let lastErr: any = null;

		// 3.a) intentar borrar por id de favorito si el modelo tiene delete
		if (favModel && typeof favModel.delete === "function") {
			try {
				// intentar como id de registro favorito
				await favModel.delete({ where: { id: targetNum } });
				deleted = true;
			} catch (e) {
				// no encontrado o error: ignorar y probar como lugarId
				lastErr = e;
				deleted = false;
			}
		}

		// 3.b) si no se borró, intentar borrar por lugarId + usuarioId (deleteMany)
		if (!deleted && favModel && typeof favModel.deleteMany === "function") {
			try {
				const res = await favModel.deleteMany({ where: { lugarId: targetNum, usuarioId: userId } }).catch(() => ({ count: 0 }));
				deletedCount = (res?.count ?? res) || 0;
				if (deletedCount > 0) deleted = true;
			} catch (e) {
				lastErr = e;
			}
		}

		// 3.c) fallback raw SQL (silencioso) si prisma model no existe o falló
		if (!deleted && !favModel) {
			try {
				// intentar borrar por favorito.id = targetNum
				const try1 = await prisma.$executeRawUnsafe?.(`DELETE FROM favoritos WHERE id = ${targetNum}`) ?? null;
				if (try1) { deleted = true; }
			} catch (e) { /* ignore */ }
			if (!deleted) {
				try {
					const try2 = await prisma.$executeRawUnsafe?.(`DELETE FROM favoritos WHERE "lugarId" = ${targetNum} AND "usuarioId" = ${Number(userId)}`) ?? null;
					if (try2) deleted = true;
				} catch (e) { /* ignore */ }
			}
		}

		// 4) resultado
		if (deleted || deletedCount > 0) {
			return NextResponse.json({ ok: true });
		}

		// si llegamos aquí no se borró nada: devolver 404 o detalle del último error
		if (lastErr) {
			console.error("DELETE /api/favoritos lastErr:", lastErr);
			return NextResponse.json({ error: lastErr?.message ?? "Error al eliminar favorito" }, { status: 500 });
		}
		return NextResponse.json({ error: "Favorito no encontrado" }, { status: 404 });
	} catch (err: any) {
		console.error("DELETE /api/favoritos unexpected error:", err);
		return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
	}
}

/* GET: listar favoritos del usuario (asegura Content-Type: application/json) */
export async function GET(req: NextRequest) {
	try {
		// resolver usuario
		const userId = await getUserIdFromReq(req);
		if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

		// resolver modelo favorito y obtener registros
		const favModel = resolveFavoritoModel(prisma);
		let favRecords: any[] = [];

		if (favModel && typeof favModel.findMany === "function") {
			try {
				// intentar incluir relación 'lugar' si existe
				favRecords = await favModel.findMany({ where: { usuarioId: userId }, include: { lugar: true } }).catch(() => null) ?? [];
				// si include no funcionó, intentar sin include
				if (!Array.isArray(favRecords) || favRecords.length === 0) {
					favRecords = await favModel.findMany({ where: { usuarioId: userId } }).catch(() => []);
				}
			} catch (e) {
				console.warn("GET /api/favoritos - favModel.findMany fallo:", (e as any)?.message ?? e);
				favRecords = [];
			}
		} else {
			// fallback raw: intentar consulta directa por tabla 'favoritos'
			try {
				const rows = await prisma.$queryRawUnsafe?.(`SELECT * FROM favoritos WHERE "usuarioId" = ${Number(userId)}`) ?? [];
				favRecords = Array.isArray(rows) ? rows : [];
			} catch (e) {
				console.warn("GET /api/favoritos - raw query fallo:", (e as any)?.message ?? e);
				favRecords = [];
			}
		}

		// Normalizar a array de Lugares { id, nombre, imagen_url }
		const favoritos: any[] = [];
		for (const fr of favRecords) {
			// caso: include.lugar presente
			if (fr?.lugar) {
				favoritos.push({ id: fr.lugar.id, nombre: fr.lugar.nombre ?? "", imagen_url: fr.lugar.imagen_url ?? null });
				continue;
			}
			// caso: registro tiene lugarId
			const lid = fr?.lugarId ?? fr?.lugar_id ?? fr?.LugarId ?? null;
			if (lid) {
				const lugarDb = await findLugarById(Number(lid)).catch(() => null);
				if (lugarDb) {
					favoritos.push({ id: lugarDb.id, nombre: lugarDb.nombre ?? "", imagen_url: (lugarDb.imagen_url ?? lugarDb.imagen) ?? null });
					continue;
				}
			}
			// caso: el favorito se guardó como referencia al lugar directamente en el registro
			const maybeId = fr?.id ?? fr?.lugarId ?? fr?.lugar?.id ?? null;
			if (maybeId) {
				// intentar obtener nombre simple si está disponible en el registro
				favoritos.push({ id: Number(maybeId), nombre: fr?.nombre ?? fr?.titulo ?? ("Lugar " + maybeId), imagen_url: fr?.imagen_url ?? null });
			}
		}

		return NextResponse.json(favoritos);
	} catch (err: any) {
		console.error("GET /api/favoritos unexpected error:", err);
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}

/* POST: agregar un lugar a favoritos para el usuario autenticado */
export async function POST(req: NextRequest) {
	try {
		// resolver usuario
		const userId = await getUserIdFromReq(req);
		if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

		// body
 		let body: any = {};
		try { body = await req.json().catch(() => ({})); } catch {}
		const lugarIdRaw = body?.lugarId ?? body?.id ?? null;
		if (lugarIdRaw === null) return NextResponse.json({ error: "falta lugarId en petición" }, { status: 400 });
		const lugarId = Number(lugarIdRaw);
		if (!Number.isFinite(lugarId) || lugarId <= 0) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

		// opcional: comprobar que el lugar existe (no estrictamente necesario)
		const lugarExists = await findLugarById(lugarId).catch(() => null);
		if (!lugarExists) {
			// permitir creación incluso si no se encuentra el lugar para compatibilidad, pero advertir
			// return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
		}

		const favModel = resolveFavoritoModel(prisma);
		// comprobar duplicado
		if (favModel && typeof favModel.findFirst === "function") {
			const existing = await favModel.findFirst({ where: { usuarioId: userId, lugarId } }).catch(() => null);
			if (existing) return NextResponse.json({ error: "Favorito ya existe", favorito: existing }, { status: 409 });
		}

		// intentar crear con prisma
		let created: any = null;
		if (favModel && typeof favModel.create === "function") {
			try {
				created = await favModel.create({ data: { usuarioId: userId, lugarId }, include: { lugar: true } }).catch(async (e: any) => {
					// algunos modelos no aceptan include; intentar sin include
					try { return await favModel.create({ data: { usuarioId: userId, lugarId } }); } catch (_) { throw e; }
				});
			} catch (e: any) {
				console.error("POST /api/favoritos prisma.create fallo:", e?.message ?? e);
				created = null;
			}
		}

		// fallback raw SQL (Postgres) si no hay modelo prisma o falló
		if (!created && !favModel) {
			try {
				const rows = await prisma.$queryRawUnsafe?.(
					`INSERT INTO "Favorito" ("usuarioId","lugarId") VALUES (${Number(userId)}, ${Number(lugarId)}) RETURNING *`
				) ?? null;
				if (Array.isArray(rows) && rows.length > 0) created = rows[0];
			} catch (e) {
				try {
					// intentar tabla 'favoritos' lowercase
					const rows2 = await prisma.$queryRawUnsafe?.(
						`INSERT INTO favoritos ("usuarioId","lugarId") VALUES (${Number(userId)}, ${Number(lugarId)}) RETURNING *`
					) ?? null;
					if (Array.isArray(rows2) && rows2.length > 0) created = rows2[0];
				} catch (e2) {
					console.error("POST /api/favoritos raw insert fallo:", e2);
				}
			}
		}

		// si no se creó, intentar crear con executeRaw (sin RETURNING) y devolver un objeto simple
		if (!created) {
			try {
				const exec = await prisma.$executeRawUnsafe?.(
					`INSERT INTO favoritos ("usuarioId","lugarId") VALUES (${Number(userId)}, ${Number(lugarId)})`
				) ?? null;
				if (exec !== null) {
					created = { usuarioId: Number(userId), lugarId: Number(lugarId) };
				}
			} catch (e) {
				console.error("POST /api/favoritos fallback executeRaw fallo:", e);
			}
		}

		if (!created) return NextResponse.json({ error: "No se pudo crear favorito" }, { status: 500 });

		return NextResponse.json({ ok: true, favorito: created }, { status: 201 });
	} catch (err: any) {
		console.error("POST /api/favoritos unexpected error:", err);
		return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
	}
}