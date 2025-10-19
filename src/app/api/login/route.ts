import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // parsear body con tolerancia a JSON inválido
    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("POST /api/login - JSON inválido:", e);
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Acepta "email" o "correo"
    const email = (body?.email ?? body?.correo ?? "") as string;
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan credenciales (correo y password)" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { correo: email } }).catch((e: unknown) => {
      console.error("POST /api/login - prisma error al buscar usuario:", e);
      return null;
    });

    if (!usuario) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // Comparar password: si está hasheada con bcrypt (prefijo $2), usar bcryptjs; si no, comparar plano
    let match = false;
    const stored = usuario.password ?? "";
    try {
      if (typeof stored === "string" && stored.startsWith("$2")) {
        // import dinámico de bcryptjs (no rompe si no está instalado)
        const bcrypt = await import("bcryptjs").catch(() => null);
        if (bcrypt && typeof bcrypt.compare === "function") {
          match = await bcrypt.compare(password, stored);
        } else {
          // fallback inseguro
          match = password === stored;
        }
      } else {
        match = password === stored;
      }
    } catch (e) {
      console.error("POST /api/login - error comparando password:", e);
      return NextResponse.json({ error: "Error en autenticación" }, { status: 500 });
    }

    if (!match) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // Autenticación OK -> crear token de sesión (temporal: id de usuario)
    // RECOMENDACIÓN: reemplazar por JWT en producción
    const tokenValue = String(usuario.id);

    const res = NextResponse.json({ ok: true, id: usuario.id, rol: usuario.rol });
    // set cookie HttpOnly
    res.cookies.set("token", tokenValue, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    console.log("POST /api/login -> user", usuario.id, "cookie set");
    return res;
  } catch (err: any) {
    console.error("POST /api/login error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
