"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditarEmprendedor() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState<any>({ nombre: "", descripcion: "", telefono: "", direccion: "", foto: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // cargar datos actuales
    (async () => {
      try {
        const res = await fetch(`/api/emprendedores/${id}`);
        if (!res.ok) throw new Error("No se pudo cargar");
        const data = await res.json();
        setPerfil({
          nombre: data.nombre || "",
          descripcion: data.descripcion || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          foto: data.foto || "",
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  const handleUpload = async (): Promise<string> => {
    if (!file) return perfil.foto;
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) throw new Error("Upload failed");
    const payload = await up.json();
    return payload.url ?? "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let fotoUrl = perfil.foto;
      if (file) {
        try {
          fotoUrl = await handleUpload();
        } catch (uErr) {
          console.error("Error subida:", uErr);
          setError("Error al subir la imagen");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/emprendedores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...perfil, foto: fotoUrl }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("API error:", body);
        setError(body.error || "Error al actualizar perfil");
        setLoading(false);
        return;
      }

      // éxito
      router.push("/emprendedores");
    } catch (err) {
      console.error("handleSubmit error:", err);
      setError("Error inesperado al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Editar Emprendedor</h1>

        {error && <div className="text-red-600 mb-3">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Preview (col 1 on md) */}
          <div className="md:col-span-1 flex flex-col items-center">
            <div className="w-full">
              <img
                src={file ? URL.createObjectURL(file) : perfil.foto ?? "/images/lugares/AB.jpeg"}
                alt="Preview"
                className="w-full h-48 md:h-64 object-cover rounded-md shadow-sm"
              />
            </div>
            <div className="mt-3 w-full">
              <label className="block text-sm mb-1">Cambiar foto (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-2">Tamaño recomendado: 800x600. JPG/PNG</p>
            </div>
          </div>

          {/* Formulario (cols 2) */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  placeholder="Nombre"
                  value={perfil.nombre}
                  onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea
                  placeholder="Descripción"
                  value={perfil.descripcion}
                  onChange={(e) => setPerfil({ ...perfil, descripcion: e.target.value })}
                  className="w-full border p-2 rounded h-28 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Teléfono</label>
                <input
                  placeholder="Teléfono"
                  value={perfil.telefono}
                  onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Dirección</label>
                <input
                  placeholder="Dirección"
                  value={perfil.direccion}
                  onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Actualizar Perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
