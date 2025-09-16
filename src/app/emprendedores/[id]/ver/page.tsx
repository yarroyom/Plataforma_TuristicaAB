"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VerEmprendedor() {
  const { id } = useParams();
  const numericId = parseInt(id as string);
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [usuarioLogueado, setUsuarioLogueado] = useState<{ id: number; rol: string } | null>(null);

  // Obtener usuario logueado desde backend (cookie HttpOnly)
  useEffect(() => {
    fetch("/api/me")
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push("/login"); // Redirigir si no hay token válido
        } else {
          setUsuarioLogueado({ id: data.id, rol: data.rol.toUpperCase() });
        }
      })
      .catch(() => router.push("/login"));
  }, []);

  // Traer perfil del emprendedor
  useEffect(() => {
    fetch(`/api/emprendedores/${numericId}`)
      .then(res => {
        if (!res.ok) throw new Error("Perfil no encontrado");
        return res.json();
      })
      .then(setPerfil)
      .catch(err => console.error(err));
  }, [numericId]);

  if (!perfil) return <div>Cargando perfil...</div>;
  if (!usuarioLogueado) return <div>Verificando usuario...</div>;

  const esPropietario = usuarioLogueado.rol === "EMPRENDEDOR" && usuarioLogueado.id === perfil.usuario.id;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{perfil.nombre}</h1>
      {perfil.foto && <img src={perfil.foto} alt={perfil.nombre} className="w-64 h-64 object-cover rounded mb-4" />}
      <p>{perfil.descripcion}</p>
      <p>Tel: {perfil.telefono}</p>
      <p>Dirección: {perfil.direccion}</p>
      <p>Correo: {perfil.usuario.correo}</p>

      {esPropietario && (
        <div className="flex gap-2 mt-4">
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded"
            onClick={() => router.push(`/emprendedores/${perfil.id}/editar`)}
          >
            Editar
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={() => router.push(`/emprendedores/${perfil.id}/eliminar`)}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
