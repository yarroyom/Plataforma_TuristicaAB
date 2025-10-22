import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { incrementIndicadorByName } from "@/lib/indicadores";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

async function getUserIdFromReq(req: NextRequest): Promise<number | null> {
  try {
    let token = req.cookies.get("token")?.value ?? null;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) return null;

    // token ya es id numérico
    if (/^\d+$/.test(token)) return Number(token);

    // si hay JWT_SECRET intentar verificar
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

    // fallback: intentar convertir a número
    const num = Number(token);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch (e) {
    console.error("getUserIdFromReq error:", e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('; ')
      .find(row => row.startsWith('token='))?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const perfil = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        correo: true,
        nombre: true,
        rol: true,
        // Agrega más campos según tu modelo
      }
    });

    return NextResponse.json(perfil);
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo perfil" }, { status: 500 });
  }
}

/* { changed code } */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

  const body = await req.json().catch(() => ({}));
    // Aceptar campos comunes: nombre, correo, telefono, foto, descripcion (ajusta según tu modelo)
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : undefined;
    const correo = typeof body.correo === "string" ? body.correo.trim() : undefined;
    const telefono = typeof body.telefono === "string" ? body.telefono.trim() : undefined;
    const foto = typeof body.foto === "string" ? body.foto.trim() : undefined;
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;

    const updates: any = {};
    if (typeof nombre === "string" && nombre.length) updates.nombre = nombre;
    if (typeof correo === "string" && correo.length) updates.correo = correo;
    if (typeof telefono === "string") updates.telefono = telefono;
    if (typeof foto === "string") updates.foto = foto;
    if (typeof descripcion === "string") updates.descripcion = descripcion;

    // manejar password por separado (no incluirla en `updates` en texto plano)
    if (!password && Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    // validar existencia del usuario
    const usuarioExistente = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // prevenir cambios no permitidos (por ejemplo rol) -- password se maneja aparte y se guarda hasheada

    // si hay password, validarlo y hashearlo
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(password, 10);
      updates.password = hashed;
    }

    // actualizar en DB (incluye password hasheada si se proporcionó)
    const actualizado = await prisma.usuario.update({
      where: { id: userId },
      data: updates,
    });

    // Registrar actualización (no bloqueante)
    (async () => {
      try {
        await incrementIndicadorByName("Número de actualizaciones realizadas");
      } catch (e) {
        console.warn("No se pudo registrar indicador de actualizaciones (perfil):", e);
      }
    })();

    // devolver datos públicos
    const publico = {
      id: actualizado.id,
      nombre: actualizado.nombre,
      correo: actualizado.correo,
      telefono: actualizado.telefono ?? null,
      foto: actualizado.foto ?? null,
      descripcion: actualizado.descripcion ?? null,
    };

    return NextResponse.json({ ok: true, perfil: publico });
  } catch (err) {
    console.error("PUT /api/perfil error:", err);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
/* { /changed code } */

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // verificar existencia
    const usuarioExistente = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // eliminar dependencias en orden: tablas que referencean usuario
    await prisma.$transaction([
      prisma.favorito.deleteMany({ where: { usuarioId: userId } }),
      prisma.reseña.deleteMany({ where: { usuarioId: userId } }),
      prisma.emprendedorPerfil.deleteMany({ where: { usuarioId: userId } }),
      prisma.redSocial.deleteMany({ where: { usuarioId: userId } }),
      prisma.rating.deleteMany({ where: { usuarioId: userId } }),
      // eventosCreados: si los eventos tienen creadoPor referenciando al usuario
      prisma.evento.updateMany({ where: { creadoPor: userId }, data: { creadoPor: null } }),
    ]);

    // finalmente eliminar el usuario
    await prisma.usuario.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true, message: "Usuario eliminado" });
  } catch (err) {
    console.error("DELETE /api/perfil error:", err);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}