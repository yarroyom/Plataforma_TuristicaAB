import { NextRequest, NextResponse } from "next/server";
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

export async function PUT(req: NextRequest) {
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
    const body = await req.json();
    const data: any = {};

    // Permite eliminar la foto si el valor es ""
    if ("foto" in body) data.foto = body.foto;

    if (body.password) {
      // ...existing code para cambiar contraseña...
    }

    await prisma.usuario.update({
      where: { id: payload.id },
      data,
    });

    return NextResponse.json({ message: "Perfil actualizado" });
  } catch (err) {
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    await prisma.usuario.delete({
      where: { id: payload.id },
    });
    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (err) {
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}