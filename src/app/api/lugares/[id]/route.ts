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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Verificar cookie/token de sesión
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Intentar resolver usuario a partir del token.
  // ADAPTA según tu esquema: aquí probamos dos opciones comunes:
  // 1) Usuario tiene un campo `token`
  // 2) Existe tabla `Session`/`session` que referencia a usuarioId / userId
  let usuario: any = null;

  try {
    usuario = await prisma.usuario.findFirst({ where: { token } });
  } catch (_) { usuario = null; }

  if (!usuario) {
    // intentar sesión
    try {
      const session = await prisma.session.findUnique({ where: { token } }).catch(() => null);
      if (session?.usuarioId) {
        usuario = await prisma.usuario.findUnique({ where: { id: session.usuarioId } }).catch(() => null);
      } else if (session?.userId) {
        usuario = await prisma.usuario.findUnique({ where: { id: session.userId } }).catch(() => null);
      }
    } catch (_) {
      usuario = null;
    }
  }

  // Si no encontramos usuario o no es ADMIN, denegamos
  if (!usuario || usuario.rol !== "ADMIN") {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  // Usuario verificado como ADMIN -> proceder a eliminar
  try {
    await prisma.lugarTuristico.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error al eliminar lugar:", err);
    return NextResponse.json({ error: err.message || "Error al eliminar" }, { status: 500 });
  }
}