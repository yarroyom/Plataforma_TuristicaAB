"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NuevoLugar() {
  const router = useRouter();
  const [usuarioLogueado, setUsuarioLogueado] = useState({ rol: "" });
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    imagen_url: "",
    latitud: "",
    longitud: "",
  });

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.rol) setUsuarioLogueado({ rol: data.rol });
        else setUsuarioLogueado({ rol: "" });
      });
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetch("/api/lugares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Lugar registrado correctamente");
      router.push("/lugares");
    } else {
      alert(data.error || "Error al registrar");
    }
  };

  if (usuarioLogueado.rol !== "ADMIN") {
    return <div className="p-8 text-red-600">Acceso solo para administradores</div>;
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Registrar nuevo lugar turístico</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} className="border p-2 rounded" required />
        <textarea name="descripcion" placeholder="Descripción / Historia" value={form.descripcion} onChange={handleChange} className="border p-2 rounded" rows={3} required />
        <input name="imagen_url" placeholder="URL de imagen" value={form.imagen_url} onChange={handleChange} className="border p-2 rounded" />
        <input name="latitud" placeholder="Latitud" value={form.latitud} onChange={handleChange} className="border p-2 rounded" type="number" step="any" />
        <input name="longitud" placeholder="Longitud" value={form.longitud} onChange={handleChange} className="border p-2 rounded" type="number" step="any" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Registrar lugar</button>
      </form>
    </div>
  );
}
