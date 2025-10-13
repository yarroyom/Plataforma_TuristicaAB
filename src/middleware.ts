import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const url = req.nextUrl.pathname;

  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Solo emprendedor puede acceder a editar/eliminar/nuevo
    const esRutaExclusivaEmprendedor =
      url === "/emprendedores/nuevo" ||
      (url.startsWith("/emprendedores/") && (url.endsWith("/editar") || url.endsWith("/eliminar")));

    if (esRutaExclusivaEmprendedor && payload.rol !== "EMPRENDEDOR") {
      return NextResponse.redirect(new URL("/emprendedores", req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
   
    "/dashboard/:path*",
  ],
};
