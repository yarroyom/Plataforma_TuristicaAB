// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		// Intentar obtener token desde cookies
		const cookieToken = req.cookies.get("token")?.value ?? null;
		// También aceptar Authorization Bearer como fallback
		const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
		const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.split(" ")[1] : null;
		const token = cookieToken ?? bearer;

		console.log("GET /api/me called; tokenFound=", !!token);

		if (!token) {
			return NextResponse.json({ error: "No autenticado" }, { status: 401 });
		}

		let usuario: any = null;

		// Si el token es un número (id), buscar por id
		const maybeId = Number(token);
		if (Number.isFinite(maybeId) && maybeId > 0) {
			usuario = await prisma.usuario.findUnique({ where: { id: maybeId } }).catch(() => null);
			if (usuario) console.log("Resolved user by numeric id:", usuario.id, usuario.rol);
		}

		// Si no se resolvió, intentar buscar por campo token en Usuario (si existe)
		if (!usuario) {
			try {
				usuario = await prisma.usuario.findFirst({ where: { token } }).catch(() => null);
				if (usuario) console.log("Resolved user via usuario.token:", usuario.id, usuario.rol);
			} catch (e) {
				// ignore
			}
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
