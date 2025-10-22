import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { incrementIndicadorByName } from "@/lib/indicadores";
import nodemailer from "nodemailer";

// Helper: resolver userId desde cookie o header Authorization (JWT o id numérico)
async function getUserIdFromReq(req: NextRequest): Promise<number | null> {
  try {
    let token = req.cookies.get("token")?.value ?? null;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) return null;

    // si es un id numérico guardado como token
    if (/^\d+$/.test(token)) return Number(token);

    // si hay secret, intentar verificar JWT
    if (process.env.JWT_SECRET) {
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET);
        const maybe = payload?.id ?? payload?.sub ?? null;
        const idNum = maybe != null ? Number(maybe) : NaN;
        if (Number.isFinite(idNum) && idNum > 0) return idNum;
      } catch (e) {
        console.warn("getUserIdFromReq: JWT verify falló:", e);
        // fallback: intentar parsear token como número
        const num = Number(token);
        if (Number.isFinite(num) && num > 0) return num;
      }
    }

    // último recurso: intentar convertir a número
    const num = Number(token);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch (e) {
    console.error("getUserIdFromReq error:", e);
    return null;
  }
}

export async function GET() {
  const emprendedores = await prisma.emprendedorPerfil.findMany({
    include: { usuario: true },
  });
  return NextResponse.json(emprendedores);
}

export async function POST(req: NextRequest) {
  // resolver usuario de forma segura
  const userId = await getUserIdFromReq(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { nombre, descripcion, telefono, direccion, foto } = body;

  try {
    // Obtén el correo del usuario logueado
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { correo: true },
    });

    const perfil = await prisma.emprendedorPerfil.create({
      data: {
        usuarioId: userId,
        nombre,
        descripcion,
        telefono,
        direccion,
        foto,
      },
    });

    // Crear una notificación de tipo 'negocio' — la API de notificaciones filtrará
    // para que ADMIN no la vea en su lista, mientras que TURISTA y EMPRENDEDOR sí.
    await prisma.notificacion.create({
      data: {
        mensaje: `El emprendedor ${perfil.nombre} ha creado un nuevo negocio.`,
        tipo: "negocio",
      },
    });

    // Obtener el correo del administrador
    const admin = await prisma.usuario.findFirst({
      where: { rol: "ADMIN" },
      select: { correo: true },
    });

    // Enviar correo solo a la administradora
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `"Agua Blanca" <${process.env.SMTP_USER}>`,
        to: "ferarroyo0102@gmail.com", // solo a la administradora
        subject: "Nuevo negocio en Agua Blanca",
        text: `El emprendedor ${perfil.nombre} ha creado un nuevo negocio en Agua Blanca.`,
      });
      console.log("Correo enviado:", info);
    } catch (error) {
      console.error("Error al enviar correo:", error);
    }

    // Registro de contenido agregado en el periodo (incremental por día)
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
      console.warn("Error registrando contenido agregado en emprendedores:", e);
    }

    // Registrar base: usuarios que crearon negocio (no bloqueante)
    (async () => {
      try {
        await incrementIndicadorByName("Usuarios que crearon negocio");
      } catch (e) {
        console.warn("No se pudo registrar indicador 'Usuarios que crearon negocio':", e);
      }
    })();

    return NextResponse.json({ perfil }); // <-- Faltaba este return
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error creando perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, descripcion, telefono, direccion, foto } = body;

    // Actualiza el perfil del emprendedor
    const perfil = await prisma.emprendedorPerfil.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        telefono,
        direccion,
        foto,
      },
    });

    // Llama al endpoint de actualizaciones
    await prisma.valorIndicador.create({
      data: {
        indicadorId: 57,
        valorActual: 1,
        fecha: new Date(),
      },
    });

    return NextResponse.json({ perfil });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
  }
}


