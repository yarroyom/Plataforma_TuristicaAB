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
  usuario: { id: number; correo: string; nombre: string; rol: string };
}

export default function ListaEmprendedores() {
  const [emprendedores, setEmprendedores] = useState<Emprendedor[]>([]);
  const [usuarioLogueado, setUsuarioLogueado] = useState<{ id: number; rol: string } | null>(null);
  const router = useRouter();

  // Obtener usuario logueado desde backend (cookie HttpOnly)
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();

        // Log para depuración
        console.log("Respuesta /api/me:", data);

        if (data.error) {
          console.log("Redirigiendo a login por error:", data.error);
          router.push("/login"); // Redirige si no hay token válido
        } else {
          setUsuarioLogueado({ id: data.id, rol: data.rol.toUpperCase() });
        }
      } catch (err) {
        console.log("Error en fetchUsuario:", err);
        router.push("/login");
      }
    };

    fetchUsuario();
  }, []);

  // Traer lista de emprendedores
  useEffect(() => {
    const fetchEmprendedores = async () => {
      try {
        const res = await fetch("/api/emprendedores");
        const data = await res.json();
        setEmprendedores(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEmprendedores();
  }, []);

  if (!usuarioLogueado) return <div>Verificando usuario...</div>;

  return (
    <div className="p-8">
      <button
        className="text-blue-600 underline mb-4"
        onClick={() => router.push("/principal")}
      >
        ← Regresar
      </button>
      <h1 className="text-2xl font-bold mb-4">Emprendedores</h1>

      {/* Nuevo Perfil solo para EMPRENDEDOR */}
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
            usuarioLogueado.rol === "EMPRENDEDOR" && usuarioLogueado.id === e.usuario.id;
          const esAdmin = usuarioLogueado.rol === "ADMIN";

          return (
            <div key={e.id} className="border p-4 rounded shadow hover:shadow-lg transition">
              <h2 className="font-semibold text-lg">{e.nombre}</h2>
              {e.foto && <img src={e.foto} alt={e.nombre} className="w-full h-40 object-cover mt-2 mb-2 rounded" />}
              <p>{e.descripcion}</p>
              <p className="text-sm">Tel: {e.telefono}</p>
              <p className="text-sm">Dirección: {e.direccion}</p>
              <p className="text-sm">Usuario: {e.usuario.nombre} ({e.usuario.correo})</p>

              <div className="flex gap-2 mt-2">
                <button
                  className="bg-green-500 text-white px-2 py-1 rounded"
                  onClick={() => router.push(`/emprendedores/${e.id}/ver`)}
                >
                  Ver Perfil
                </button>
                {(esPropietario || esAdmin) && (
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
