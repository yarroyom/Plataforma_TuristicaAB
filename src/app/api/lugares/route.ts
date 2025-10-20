import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

async function getUserIdFromReq(req: NextRequest): Promise<number | null> {
  try {
    let token = req.cookies.get("token")?.value ?? null;
    const authHeader = req.headers.get("authorization") || "";
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) token = authHeader.split(" ")[1];
    if (!token) return null;
    if (/^\d+$/.test(token)) return Number(token);
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
    const num = Number(token);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch (e) {
    console.error("getUserIdFromReq error:", e);
    return null;
  }
}

function resolveLugarModel(prismaClient: any) {
  const candidates = [
    "lugar",
    "lugares",
    "lugarTuristico",
    "lugar_turistico",
    "lugarTuristicos",
    "lugar_turisticos",
    "Lugar",
    "LugarTuristico"
  ];
  for (const name of candidates) {
    const m = (prismaClient as any)[name];
    if (m && typeof m.create === "function" && typeof m.findMany === "function") return m;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const lugarModel = resolveLugarModel(prisma);
    if (!lugarModel) {
      const available = Object.keys(prisma).filter(k => typeof (prisma as any)[k] === "object").join(", ");
      console.error("Modelo de lugar no encontrado en prisma. Disponibles:", available);
      return NextResponse.json({ error: "Modelo de lugar no encontrado en Prisma. Revisar schema.prisma. Modelos: " + available }, { status: 500 });
    }

    // Obtener usuario (si aplica)
    const userId = await getUserIdFromReq(req);
    // opcional: exigir userId para crear; si quieres forzar autorización devuelve 401
    // if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // aceptar campos alternativos
    const nombre = String(body?.nombre ?? body?.titulo ?? "").trim();
    const descripcion = String(body?.descripcion ?? body?.historia ?? "").trim();
    const imagen_url = String(body?.imagen_url ?? body?.imagen ?? body?.foto ?? "") || null;
    const tipo = String(body?.tipo ?? "TURISTICO").toUpperCase() === "CULTURAL" ? "CULTURAL" : "TURISTICO";
    const latitud = body?.latitud != null ? Number(body.latitud) : null;
    const longitud = body?.longitud != null ? Number(body.longitud) : null;

    if (!nombre) {
      return NextResponse.json({ error: "El campo 'nombre' es requerido" }, { status: 400 });
    }

    // construir data respetando campos existentes en el modelo
    const dataAny: any = { nombre, descripcion, tipo };
    if (imagen_url) dataAny.imagen_url = imagen_url;
    if (Number.isFinite(latitud)) dataAny.latitud = latitud;
    if (Number.isFinite(longitud)) dataAny.longitud = longitud;
    // opcional: asociar usuario solo si el modelo acepta ese campo.
    // Intentamos crear con usuarioId y, si falla porque el campo no existe, reintentamos sin él.
    if (userId) dataAny.usuarioId = userId;

    console.log("Creando lugar con data:", dataAny);

    let creado: any;
    try {
      creado = await lugarModel.create({ data: dataAny });
    } catch (createErr: any) {
      const msg = String(createErr?.message ?? createErr);
      // si el error indica que usuarioId no es un argumento válido, lo quitamos y reintentamos
      if (msg.includes("Unknown argument") && msg.includes("usuarioId") ) {
        console.warn("El modelo no acepta 'usuarioId'; reintentando sin ese campo.");
        delete dataAny.usuarioId;
        creado = await lugarModel.create({ data: dataAny });
      } else {
        // re-lanzar para ser manejado por el catch exterior
        throw createErr;
      }
    }

    return NextResponse.json({ message: "Lugar creado", lugar: creado }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/lugares error:", err);
    // intentar devolver detalle cuando sea seguro
    const msg = err?.message ?? "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const lugares = await prisma.lugarTuristico.findMany();
    return NextResponse.json(lugares);
  } catch (err) {
    return NextResponse.json(
      { error: "Error al obtener lugares", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) },
      { status: 500 }
    );
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
    if (payload.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede registrar lugares" }, { status: 403 });
    }
    const { id, nombre, descripcion, imagen_url, latitud, longitud } = await req.json();
    const lugar = await prisma.lugarTuristico.update({
      where: { id },
      data: { nombre, descripcion, imagen_url, latitud, longitud },
    });
    return NextResponse.json({ message: "Lugar actualizado", lugar });
  } catch (err) {
    return NextResponse.json({ error: "Error al actualizar lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) }, { status: 500 });
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
    if (payload.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede eliminar lugares" }, { status: 403 });
    }
    const { id } = await req.json();
    await prisma.lugarTuristico.delete({ where: { id } });
    return NextResponse.json({ message: "Lugar eliminado" });
  } catch (err) {
    return NextResponse.json({ error: "Error al eliminar lugar", detalle: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const indicador = await prisma.indicador.findFirst({
    where: { nombre: "Número de veces que se usa 'Cómo llegar'" }
  });
  if (indicador) {
    const ultimo = await prisma.valorIndicador.findFirst({
      where: { indicadorId: indicador.id, fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
    });
    const nuevoValor = ultimo ? ultimo.valorActual + 1 : 1;
    await prisma.valorIndicador.create({
      data: {
        indicadorId: indicador.id,
        valorActual: nuevoValor,
        fecha: new Date(),
      },
    });
  }
  return NextResponse.json({ message: "Registro actualizado" });
}
