import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/eventos?month=YYYY-MM
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // e.g. "2025-09"
  try {
    if (!month) {
      // devuelve todos los eventos si no se especifica mes (limit opcional)
      const all = await prisma.evento.findMany({ orderBy: { date: "asc" } });
      return NextResponse.json(all);
    }
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const m = Number(monthStr) - 1;
    if (Number.isNaN(year) || Number.isNaN(m)) {
      return NextResponse.json({ error: "month inválido" }, { status: 400 });
    }

    // Use UTC bounds para evitar problemas con zonas horarias
    const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, m + 1, 1, 0, 0, 0));

    const eventos = await prisma.evento.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(eventos);
  } catch (err: any) {
    console.error("GET /api/eventos error:", err);
    return NextResponse.json({ error: err.message || "error" }, { status: 500 });
  }
}

// POST /api/eventos
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Resolver usuario usando el endpoint /api/me (pasa cookies para que use la misma sesión)
    let usuario: any = null;
    try {
      const meUrl = new URL("/api/me", req.url).toString();
      const meRes = await fetch(meUrl, { headers: { cookie: req.headers.get("cookie") || "" } });
      if (meRes.ok) {
        usuario = await meRes.json();
      }
    } catch (e) {
      // ignore, fallback below
    }

    // Fallback: si tu sistema realmente guarda token en Usuario, intentar buscarlo
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

    const body = await req.json();
    const { title, date } = body;
    if (!title || !date) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    // Parsear fecha con cuidado: si es "YYYY-MM-DD" o "YYYY-MM" construir Date en UTC
    let parsedDate: Date;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, mo, da] = date.split("-").map(Number);
      parsedDate = new Date(Date.UTC(y, mo - 1, da, 0, 0, 0));
    } else if (typeof date === "string" && /^\d{4}-\d{2}$/.test(date)) {
      const [y, mo] = date.split("-").map(Number);
      parsedDate = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0));
    } else {
      // Si viene ISO con hora, usarlo tal cual (espera que cliente envíe ISO correcto)
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    const created = await prisma.evento.create({
      data: {
        title,
        date: parsedDate,
        creadoPor: usuario.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/eventos error:", err);
    return NextResponse.json({ error: err.message || "error" }, { status: 500 });
  }
}
