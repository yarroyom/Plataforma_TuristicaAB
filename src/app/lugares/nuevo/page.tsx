"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Usuario {
  rol: string;
}

interface FormState {
  nombre: string;
  descripcion: string;
  imagen_url: string;
  latitud: string;
  longitud: string;
  tipo: "TURISTICO" | "CULTURAL";
}

export default function NuevoLugar() {
  const router = useRouter();
  const [usuarioLogueado, setUsuarioLogueado] = useState<Usuario>({ rol: "" });
  const [form, setForm] = useState<FormState>({
    nombre: "",
    descripcion: "",
    imagen_url: "",
    latitud: "",
    longitud: "",
    tipo: "TURISTICO",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rol) setUsuarioLogueado({ rol: data.rol });
        else setUsuarioLogueado({ rol: "" });
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
      };
      console.log("Enviando /api/lugares payload:", payload);

      const res = await fetch("/api/lugares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      // intentar parsear JSON; si falla, leer texto
      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        const txt = await res.text().catch(() => "");
        console.warn("Respuesta no JSON:", txt);
        data = { _raw: txt };
      }

      if (res.ok) {
        alert("Lugar registrado correctamente");
        router.push("/lugares");
        return;
      }

      // mostrar error devuelto por backend si existe
      const remoteMsg = data?.error || data?.message || data?._raw || "Error al registrar";
      console.warn("POST /api/lugares respuesta no ok:", res.status, remoteMsg, data);
      setErrorMsg(String(remoteMsg));
    } catch (err) {
      console.error("Error creando lugar:", err);
      setErrorMsg("Error de conexión al registrar lugar");
    } finally {
      setSaving(false);
    }
  };

  if (usuarioLogueado.rol !== "ADMIN") {
    return <div className="p-8 text-red-600">Acceso solo para administradores</div>;
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Registrar nuevo lugar turístico</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <textarea
          name="descripcion"
          placeholder="Descripción / Historia"
          value={form.descripcion}
          onChange={handleChange}
          className="border p-2 rounded"
          rows={3}
          required
        />
        <input
          name="imagen_url"
          placeholder="URL de imagen"
          value={form.imagen_url}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          name="latitud"
          placeholder="Latitud"
          value={form.latitud}
          onChange={handleChange}
          className="border p-2 rounded"
          type="number"
          step="any"
        />
        <input
          name="longitud"
          placeholder="Longitud"
          value={form.longitud}
          onChange={handleChange}
          className="border p-2 rounded"
          type="number"
          step="any"
        />
        <label className="block">
          Tipo de lugar:
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="border p-2 rounded w-full mt-1"
          >
            <option value="TURISTICO">Lugar turístico</option>
            <option value="CULTURAL">Lugar cultural</option>
          </select>
        </label>
        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
          {saving ? "Guardando..." : "Registrar lugar"}
        </button>
      </form>
    </div>
  );
}