"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Emprendedor {
  id: number;
  nombre: string;
  descripcion?: string;
  telefono?: string;
  direccion?: string;
  foto?: string;
  usuario: { id: number; nombre: string; correo: string; rol: string };
}

export default function Emprendedores() {
  const [emprendedores, setEmprendedores] = useState<Emprendedor[]>([]);

  // Simulación de usuario logueado
  const usuarioLogueado = { id: 2, rol: "TURISTA" }; // Cambia a "EMPRENDEDOR" para probar

  useEffect(() => {
    fetch("/api/emprendedores")
      .then(res => res.json())
      .then(setEmprendedores);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Emprendedores</h1>
      {usuarioLogueado.rol === "EMPRENDEDOR" && (
        <Link
          href="/emprendedores/nuevo"
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4 inline-block"
        >
          Nuevo Perfil
        </Link>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emprendedores.map(e => (
          <div key={e.id} className="border p-4 rounded shadow hover:shadow-lg transition">
            <h2 className="font-semibold text-lg">{e.nombre}</h2>
            {e.foto && <img src={e.foto} alt={e.nombre} className="w-full h-40 object-cover mt-2 mb-2 rounded" />}
            <p>{e.descripcion}</p>
            <p className="text-sm">Tel: {e.telefono}</p>
            <p className="text-sm">Dirección: {e.direccion}</p>
            <p className="text-sm">Usuario: {e.usuario.nombre} ({e.usuario.correo})</p>
            {usuarioLogueado.rol === "EMPRENDEDOR" && usuarioLogueado.id === e.usuario.id && (
              <div className="flex gap-2 mt-2">
                <Link
                  href={`/emprendedores/${e.id}/editar`}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Editar
                </Link>
                <Link
                  href={`/emprendedores/${e.id}/eliminar`}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Eliminar
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
