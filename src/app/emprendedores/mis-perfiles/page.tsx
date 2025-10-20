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

export default function MisPerfilesPage() {
  const [misPerfiles, setMisPerfiles] = useState<Emprendedor[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        // obtener usuario
        const meRes = await fetch("/api/me", { credentials: "include" });
        const meData = await meRes.json();
        if (meData.error) {
          router.push("/login");
          return;
        }
        const uid = Number(meData.id);
        setUsuarioId(uid);

        // obtener emprendedores y filtrar por usuarioId
        const res = await fetch("/api/emprendedores");
        const data = await res.json();
        const list: Emprendedor[] = Array.isArray(data) ? data : [];
        const mine = list.filter((e) => e.usuario?.id === uid);
        setMisPerfiles(mine);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [router]);

  if (usuarioId === null) return <div className="p-6">Verificando usuario...</div>;

  return (
    <div className="emprendedores-page py-8 p-4">
      <div className="container max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/emprendedores")}
          className="text-sm mb-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ← Volver a emprendedores
        </button>

        <h1 className="text-2xl font-bold mb-4">Mis perfiles</h1>

        {misPerfiles.length === 0 ? (
          <p className="text-gray-600">No tienes perfiles creados.</p>
        ) : (
          <div className="space-y-4">
            {misPerfiles.map((e) => (
              <div key={e.id} className="bg-white rounded-lg shadow p-4 flex items-start gap-4">
                <img
                  src={e.foto ?? "/images/lugares/AB.jpeg"}
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
                    <button
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={() => router.push(`/emprendedores/${e.id}/editar`)}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
