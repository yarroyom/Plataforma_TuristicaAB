"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoEmprendedor() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [foto, setFoto] = useState("");
  const [usuarioId, setUsuarioId] = useState(1); // ejemplo: usuario logueado

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/emprendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, nombre, descripcion, telefono, direccion, foto }),
    });
    router.push("/emprendedores");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Nuevo Emprendedor</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input className="border p-2 rounded" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        <input className="border p-2 rounded" placeholder="URL Foto" value={foto} onChange={(e) => setFoto(e.target.value)} />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Crear Perfil</button>
      </form>
    </div>
  );
}
