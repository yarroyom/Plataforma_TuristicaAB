// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

 /** Comprueba rápidamente si la BD responde (timeout en ms) */
 //prueba vercel, caida
async function checkDbAvailable(timeoutMs = 1500): Promise<boolean> {
  try {
	// Ejecuta una consulta muy ligera; si falla o tarda más del timeout consideramos la BD no disponible
	const op = (prisma as any).$queryRaw`SELECT 1` as Promise<any>;
	const to = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs));
	await Promise.race([op, to]);
	return true;
  } catch (e) {
	console.warn("DB availability check failed:", (e as any)?.message ?? e);
	return false;
  }
}

export async function GET(req: NextRequest) {
 	try {
		// Logs básicos para diagnóstico en Deployments
		console.log("GET /api/me - env DB present?", !!process.env.DATABASE_URL, "NODE_ENV=", process.env.NODE_ENV);
 
		// Leer token primero (si no hay token devolvemos 401 sin comprobar BD)
		const cookieToken = req.cookies.get("token")?.value ?? null;
		const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
		const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.split(" ")[1] : null;
		const token = cookieToken ?? bearer;
		console.log("GET /api/me called; tokenFound=", !!token);
 
		if (!token) {
			return NextResponse.json({ error: "No autenticado" }, { status: 401 });
		}
 
		// Comprobar DB rápidamente pero no devolver 503 inmediatamente; solo logear la degradación
		const dbOk = await checkDbAvailable(1500).catch(() => false);
		if (!dbOk) {
			console.warn("GET /api/me - DB availability check failed (will attempt direct queries).");
			// no retornamos 503 aquí: intentaremos resolver usuario y solo si las consultas a Prisma fallan,
			// devolveremos 503 con detalle.
		}
 
		let usuario: any = null;
 
		// Intentar resolver el usuario con manejo de errores claros: si Prisma falla por timeout/conn, devolver 503
		try {
			const maybeId = Number(token);
			if (Number.isFinite(maybeId) && maybeId > 0) {
				usuario = await prisma.usuario.findUnique({ where: { id: maybeId } });
				if (usuario) console.log("Resolved user by numeric id:", usuario.id, usuario.rol);
			}
			// Si no se resolvió, intentar buscar por campo token en Usuario (si existe)
			if (!usuario) {
				usuario = await prisma.usuario.findFirst({ where: { token } }).catch(() => null);
				if (usuario) console.log("Resolved user via usuario.token:", usuario.id, usuario.rol);
			}
			// Si aún no, intentar resolver sesión si existe ese modelo
			if (!usuario) {
				const hasSessionModel = (prisma as any).session && typeof (prisma as any).session.findUnique === "function";
				if (hasSessionModel) {
					const session = await (prisma as any).session.findUnique({ where: { token } }).catch(() => null);
					if (session?.usuarioId) {
						usuario = await prisma.usuario.findUnique({ where: { id: session.usuarioId } }).catch(() => null);
						if (usuario) console.log("Resolved user via session.usuarioId:", usuario.id, usuario.rol);
					} else if (session?.userId) {
						usuario = await prisma.usuario.findUnique({ where: { id: session.userId } }).catch(() => null);
						if (usuario) console.log("Resolved user via session.userId:", usuario.id, usuario.rol);
					}
				}
			}
		} catch (prismaErr: any) {
			// Si la causa es de conectividad/timeout, devolver 503 indicando degradación
			const msg = String(prismaErr?.message ?? prismaErr).toLowerCase();
			console.error("GET /api/me - Prisma query failed:", prismaErr);
			if (msg.includes("timeout") || msg.includes("connect") || msg.includes("could not") || msg.includes("p200")) {
				return NextResponse.json({ error: "Servicio temporalmente degradado (DB). Intenta de nuevo más tarde." }, { status: 503, headers: { "Retry-After": "30" } });
			}
			// si es otro error, lanzar para ser capturado por catch exterior
			throw prismaErr;
		}
 
		if (!usuario) {
			console.warn("GET /api/me: usuario no encontrado para token");
			return NextResponse.json({ error: "No autenticado" }, { status: 401 });
		}
 
 		// Devolver solo campos públicos necesarios
 		const safe = {
 			id: usuario.id,
 			nombre: usuario.nombre,
 			correo: usuario.correo,
 			rol: usuario.rol,
 			foto: usuario.foto ?? null,
 		};
 
 		return NextResponse.json(safe);
 	} catch (err: any) {
 		console.error("GET /api/me error:", err);
 		return NextResponse.json({ error: "Error interno" }, { status: 500 });
 	}
 }
