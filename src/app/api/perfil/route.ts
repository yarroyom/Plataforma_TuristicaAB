import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

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

export async function PUT(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('; ')
      .find(row => row.startsWith('token='))?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const data = await req.json();

    // ✅ VERIFICACIÓN DE ROL - SOLO EMPRENDEDORES PUEDEN EDITAR
    if (decoded.rol !== 'emprendedor') {
      return NextResponse.json({ 
        error: "No tienes permisos para editar. Solo los emprendedores pueden modificar su perfil." 
      }, { status: 403 });
    }

    const perfilActualizado = await prisma.usuario.update({
      where: { id: decoded.id },
      data: data,
      select: {
        id: true,
        correo: true,
        nombre: true,
        rol: true,
      }
    });

    return NextResponse.json(perfilActualizado);
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('; ')
      .find(row => row.startsWith('token='))?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // ✅ VERIFICACIÓN DE ROL - SOLO EMPRENDEDORES PUEDEN ELIMINAR
    if (decoded.rol !== 'emprendedor') {
      return NextResponse.json({ 
        error: "No tienes permisos para eliminar. Solo los emprendedores pueden eliminar su perfil." 
      }, { status: 403 });
    }

    await prisma.usuario.delete({
      where: { id: decoded.id }
    });

    return NextResponse.json({ message: "Perfil eliminado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error eliminando perfil" }, { status: 500 });
  }
}