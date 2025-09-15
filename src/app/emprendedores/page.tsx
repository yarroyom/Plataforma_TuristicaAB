"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  // --- Usuario simulado para pruebas ---
  // Cambia id y rol para probar diferentes vistas
  const usuarioLogueado = { id: 1, rol: "EMPRENDEDOR" }; // "TURISTA" para turista

  useEffect(() => {
    fetch("/api/emprendedores")
      .then(res => res.json())
      .then(setEmprendedores);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Emprendedores</h1>

      {/* Nuevo Perfil solo para emprendedor */}
      {usuarioLogueado.rol === "EMPRENDEDOR" && (
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
          onClick={() => router.push("/emprendedores/nuevo")}
        >
          Nuevo Perfil
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emprendedores.map(e => {
          const esPropietario =
            usuarioLogueado.rol === "EMPRENDEDOR" &&
            usuarioLogueado.id === e.usuario.id;

          return (
            <div key={e.id} className="border p-4 rounded shadow hover:shadow-lg transition">
              <h2 className="font-semibold text-lg">{e.nombre}</h2>
              {e.foto && (
                <img
                  src={e.foto}
                  alt={e.nombre}
                  className="w-full h-40 object-cover mt-2 mb-2 rounded"
                />
              )}
              <p>{e.descripcion}</p>
              <p className="text-sm">Tel: {e.telefono}</p>
              <p className="text-sm">Dirección: {e.direccion}</p>
              <p className="text-sm">
                Usuario: {e.usuario.nombre} ({e.usuario.correo})
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  className="bg-green-500 text-white px-2 py-1 rounded"
                  onClick={() => router.push(`/emprendedores/${e.id}/ver`)}
                >
                  Ver Perfil
                </button>

                {esPropietario && (
                  <>
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded"
                      onClick={() => router.push(`/emprendedores/${e.id}/editar`)}
                    >
                      Editar
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => router.push(`/emprendedores/${e.id}/eliminar`)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
