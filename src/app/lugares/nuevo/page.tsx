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
    <div className="nuevo-form-bg">
      {/* Layout: imagen a la izquierda, formulario a la derecha (apila en móvil) */}
      <div className="nuevo-form-layout">
        <div className="nuevo-form-image" aria-hidden="true">
          {/* imagen decorativa: se carga desde CSS background */}
        </div>

        <div className="nuevo-form-container p-6">
          {/* Back button fijo en esquina superior izquierda con texto */}
          <button type="button" onClick={() => router.back()} aria-label="Regresar" className="back-fixed">
            ← Regresar
          </button>

          <div className="form-card relative">

            <header className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="text-2xl font-extrabold">Registrar nuevo lugar turístico / Cultura</h1>

            </header>

            <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label className="form-label">Nombre</label>
            <input
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              className="border p-2 rounded input-shadow w-full"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Descripción / Historia</label>
            <textarea
              name="descripcion"
              placeholder="Descripción / Historia"
              value={form.descripcion}
              onChange={handleChange}
              className="border p-2 rounded input-shadow w-full"
              rows={4}
              required
            />
          </div>

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">URL de imagen</label>
              <input
                name="imagen_url"
                placeholder="URL de imagen"
                value={form.imagen_url}
                onChange={handleChange}
                className="border p-2 rounded input-shadow w-full"
              />
            </div>
            {form.imagen_url && (
              <div className="image-preview-wrap">
                <img src={form.imagen_url} alt="preview" className="image-preview" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
              </div>
            )}
          </div>

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Latitud</label>
              <input
                name="latitud"
                placeholder="Latitud"
                value={form.latitud}
                onChange={handleChange}
                className="border p-2 rounded input-shadow w-full"
                type="number"
                step="any"
              />
            </div>
            <div style={{ width: 16 }} />
            <div style={{ flex: 1 }}>
              <label className="form-label">Longitud</label>
              <input
                name="longitud"
                placeholder="Longitud"
                value={form.longitud}
                onChange={handleChange}
                className="border p-2 rounded input-shadow w-full"
                type="number"
                step="any"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Tipo de lugar</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className="border p-2 rounded input-shadow w-full"
            >
              <option value="TURISTICO">Lugar turístico</option>
              <option value="CULTURAL">Lugar cultural</option>
            </select>
          </div>

          {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => router.push('/lugares')}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Guardando..." : "Registrar lugar"}
            </button>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}