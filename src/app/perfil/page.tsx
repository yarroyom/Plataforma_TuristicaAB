"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState({ nombre: "", correo: "", foto: "" });
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.correo) setUsuario({ nombre: data.nombre || "", correo: data.correo, foto: data.foto || "" });
        else router.push("/"); // <-- redirige a página principal en vez de /login
      });
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return usuario.foto;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "default");
    const res = await fetch("https://api.cloudinary.com/v1_1/dcbeuxme4/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleFotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fotoUrl = await handleUpload();
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ foto: fotoUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      // Vuelve a cargar los datos del usuario desde el backend
      fetch("/api/me", { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setUsuario({ nombre: data.nombre || "", correo: data.correo, foto: data.foto || "" });
        });
      alert("Foto actualizada correctamente");
    } else {
      alert(data.error || "Error al actualizar la foto");
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    setPassword("");
    setLoading(false);
    alert("Contraseña actualizada");
  };

  const handleEliminarFoto = async () => {
    setLoading(true);
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ foto: "" }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsuario({ ...usuario, foto: "" });
      alert("Foto eliminada correctamente");
    } else {
      alert(data.error || "Error al eliminar la foto");
    }
    setLoading(false);
  };

  const handleEliminarUsuario = async () => {
    if (!confirm("¿Seguro que quieres eliminar tu usuario? Esta acción no se puede deshacer.")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/perfil", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // eliminar sesión/redirect: llevar al usuario a login
        alert(data.message || "Usuario eliminado correctamente");
        // redirigir a /login para que inicie sesión o confirme salida
        router.push("/login");
        return;
      } else {
        alert(data.error || "Error al eliminar usuario");
      }
    } catch (err) {
      console.error("handleEliminarUsuario error:", err);
      alert("Error al eliminar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto relative perfil-page">
      <div className="flex items-center justify-between mb-4">
        {/* Botón: regresar a la página principal ubicado a la izquierda */}
        <div>
          <button
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded"
            onClick={() => router.push("principal")}
            aria-label="Ir a inicio"
          >
            ← Inicio
          </button>
        </div>

        {/* Título ubicado al extremo derecho */}
        <h1 className="text-2xl font-bold">Mi Cuenta</h1>
      </div>

      {/* Perfil: hero con foto centrada */}
      <section className="profile-hero mb-6">
        <div className="profile-hero-inner container">
          <div className="profile-photo-wrap">
            {usuario.foto ? (
              <img src={usuario.foto} alt="Foto de perfil" className="profile-photo" />
            ) : (
              <div className="profile-photo" style={{ background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Sin foto</div>
            )}
          </div>
        </div>
      </section>

      <section className="profile-details container">
        <div className="profile-card">
          <div className="flex flex-col items-center mb-4">
            {/* Mantengo botones y textos tal cual, solo cambio clases visuales */}
            {usuario.foto && (
              <button
                className="btn-delete mb-2"
                onClick={handleEliminarFoto}
                disabled={loading}
              >
                Eliminar foto
              </button>
            )}
            <div className="font-bold">{usuario.nombre}</div>
            <div className="text-gray-600">{usuario.correo}</div>
          </div>

          <form onSubmit={handleFotoSubmit} className="mb-6 flex flex-col gap-2">
            <label className="font-semibold">Cambiar foto de perfil:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading}>
              {loading ? "Guardando..." : "Actualizar foto"}
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-2">
            <label className="font-semibold">Cambiar contraseña:</label>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border p-2 rounded"
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading}>
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              className="btn-delete px-4 py-2"
              onClick={handleEliminarUsuario}
            >
              Eliminar usuario
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}