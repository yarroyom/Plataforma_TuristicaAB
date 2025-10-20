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
    const res = await fetch("/api/perfil", {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      alert("Usuario eliminado correctamente");
      router.push("principal"); // <-- redirige a página principal en vez de /login
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar usuario");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto relative">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Mi Cuenta</h1>
        <div className="flex items-center gap-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow"
            onClick={() => window.open("/redes-sociales", "_blank")}
            style={{ zIndex: 50 }}
          >
            Redes sociales
          </button>

          {/* Botón: regresar a la página principal */}
          <button
            className="ml-2 bg-gray-200 text-gray-800 px-3 py-1 rounded"
            onClick={() => router.push("principal")}
            aria-label="Ir a inicio"
          >
            ← Inicio
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center mb-6">
        {usuario.foto ? (
          <>
            <img src={usuario.foto} alt="Foto de perfil" className="w-32 h-32 object-cover rounded-full mb-2" />
            <button
              className="bg-red-600 text-white px-3 py-1 rounded mb-2"
              onClick={handleEliminarFoto}
              disabled={loading}
            >
              Eliminar foto
            </button>
          </>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center mb-2 text-gray-500">
            Sin foto
          </div>
        )}
        <div className="font-bold">{usuario.nombre}</div>
        <div className="text-gray-600">{usuario.correo}</div>
      </div>
      <form onSubmit={handleFotoSubmit} className="mb-6 flex flex-col gap-2">
        <label className="font-semibold">Cambiar foto de perfil:</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
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
      <button
        className="bg-red-600 text-white px-4 py-2 rounded mt-4"
        onClick={handleEliminarUsuario}
      >
        Eliminar usuario
      </button>
    </div>
  );
}