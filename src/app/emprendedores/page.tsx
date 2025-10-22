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
  usuario?: { id: number; correo: string; nombre: string; rol: string };
}

export default function EmprendedoresPage() {
  const [emprendedores, setEmprendedores] = useState<Emprendedor[]>([]);
  const [usuarioLogueado, setUsuarioLogueado] = useState<{ id: number; rol: string } | null>(null);
  const router = useRouter();

  // Obtener usuario logueado desde backend (cookie HttpOnly)
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();

        if (data.error) {
          router.push("/login");
        } else {
          setUsuarioLogueado({ id: data.id, rol: data.rol.toUpperCase() });
        }
      } catch (err) {
        console.error("Error en fetchUsuario:", err);
        router.push("/login");
      }
    };

    fetchUsuario();
  }, [router]);

  // Traer lista de emprendedores
  useEffect(() => {
    const fetchEmprendedores = async () => {
      try {
        const res = await fetch("/api/emprendedores");
        const data = await res.json();
        setEmprendedores(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setEmprendedores([]);
      }
    };

    fetchEmprendedores();
  }, []);

  if (!usuarioLogueado) return <div>Verificando usuario...</div>;

  return (
    <div className="emprendedores-page py-8">
      <div className="emprendedores-bg">
        <div className="container">
        <button
          onClick={() => router.push("/principal")}
          className="text-sm inline-block mb-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ← Regresar
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Emprendedores</h1>

        {/* Controles: sólo visibles para usuarios con rol EMPRENDEDOR */}
        {usuarioLogueado.rol === "EMPRENDEDOR" && (
          <div className="flex items-center gap-3 mb-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => router.push("/emprendedores/nuevo")}
            >
              Nuevo Perfil
            </button>

            <button
              className="bg-gray-800 text-white px-3 py-2 rounded hover:bg-gray-700"
              onClick={() => router.push("/emprendedores/mis-perfiles")}
            >
              Mis perfiles
            </button>
          </div>
        )}

        {emprendedores.length === 0 ? (
          <p className="text-gray-600">No hay emprendedores registrados.</p>
        ) : (
          <div className="space-y-4">
                {emprendedores.map((e) => {
              const canEdit =
                usuarioLogueado!.rol === "ADMIN" ||
                (usuarioLogueado!.rol === "EMPRENDEDOR" && usuarioLogueado!.id === e.usuario?.id);

                return (
                <div key={e.id} className="negocio-card glass">
                  {/* Evitar pasar "" a src: usar foto solo si tiene contenido */}
                  <img
                    src={(typeof e.foto === "string" && e.foto.trim()) ? e.foto : "/images/lugares/AB.jpeg"}
                    alt={e.nombre}
                    className="w-24 h-24 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{e.nombre}</h3>
                    {e.descripcion && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{e.descripcion}</p>}

                    <div className="mt-3 flex gap-2">
                      <button
                        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => router.push(`/emprendedores/${e.id}/ver`)}
                      >
                        Ver Perfil
                      </button>

                      {canEdit && (
                        <>
                          <button
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            onClick={() => router.push(`/emprendedores/${e.id}/editar`)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => router.push(`/emprendedores/${e.id}/eliminar`)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
