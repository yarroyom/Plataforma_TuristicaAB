"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditarEmprendedor() {
  const router = useRouter();
  const { id } = useParams();
  const [perfil, setPerfil] = useState<any>({ nombre: "", descripcion: "", telefono: "", direccion: "", foto: "" });

  useEffect(() => {
    fetch(`/api/emprendedores/${id}`)
      .then(res => res.json())
      .then(setPerfil);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/emprendedores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(perfil),
    });
    router.push("/emprendedores");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Editar Emprendedor</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input className="border p-2 rounded" placeholder="Nombre" value={perfil.nombre} onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Descripción" value={perfil.descripcion} onChange={(e) => setPerfil({ ...perfil, descripcion: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Teléfono" value={perfil.telefono} onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Dirección" value={perfil.direccion} onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })} />
        <input className="border p-2 rounded" placeholder="URL Foto" value={perfil.foto} onChange={(e) => setPerfil({ ...perfil, foto: e.target.value })} />
        <button className="bg-yellow-500 text-white px-4 py-2 rounded" type="submit">Actualizar Perfil</button>
      </form>
    </div>
  );
}
