"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Usuario {
  id: number;
  rol: string;
  correo: string;
}

export default function NuevoEmprendedor() {
  const router = useRouter();
  const [usuarioLogueado, setUsuarioLogueado] = useState<Usuario | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    telefono: "",
    direccion: "",
    foto: "",
  });
  const [file, setFile] = useState<File | null>(null);

  // Obtener usuario logueado desde backend
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();

        if (data.error) {
          router.push("/login");
        } else if (
          data.rol.toUpperCase() !== "EMPRENDEDOR" &&
          data.rol.toUpperCase() !== "ADMIN" // <-- permite acceso a ADMIN
        ) {
          router.push("/acceso-denegado");
        } else {
          setUsuarioLogueado({ id: data.id, rol: data.rol.toUpperCase(), correo: data.correo });
        }
      } catch {
        router.push("/login");
      }
    };

    fetchUsuario();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "default"); // Usa el nombre de tu preset

    const res = await fetch("https://api.cloudinary.com/v1_1/dcbeuxme4/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let fotoUrl = form.foto;
    if (file) {
      fotoUrl = await handleUpload();
    }
    if (!usuarioLogueado) return;

    const res = await fetch("/api/emprendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuarioId: usuarioLogueado.id,
        nombre: form.nombre,
        descripcion: form.descripcion,
        telefono: form.telefono,
        direccion: form.direccion,
        foto: fotoUrl,
      }),
    });

    // Llama al endpoint de indicador de tareas completadas
    await fetch("/api/indicadores/tareas-completadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuarioId: usuarioLogueado.id,
      }),
    });

    console.log("Respuesta fetch:", res); // <-- log para depuración

    if (res.ok) {
      router.push("/emprendedores");
    } else {
      const errorData = await res.json();
      console.error("Error creando perfil:", errorData);
      alert(errorData.error || "Error creando perfil");
    }
  };

  if (!usuarioLogueado) return <div>Verificando usuario...</div>;

  return (
    <div className="nuevo-form-bg nuevo-emprendedor-page">
      <div className="nuevo-form-layout">
        <div className="nuevo-form-container">
          <button
            className="back-fixed"
            onClick={() => router.back()}
            aria-label="Volver"
          >
            ← Volver
          </button>

          <div className="form-card nuevo-emprendedor-card">
            <h1 className="text-2xl font-bold mb-2">Nuevo Emprendedor</h1>
            <p className="text-gray-600 mb-4">Crea tu perfil público para que los turistas te encuentren.</p>

            <form onSubmit={handleSubmit} className="form-grid">
              <input
                name="nombre"
                placeholder="Nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
              <textarea
                name="descripcion"
                placeholder="Descripción"
                value={form.descripcion}
                onChange={handleChange}
              />
              <input
                name="telefono"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={handleChange}
              />
              <input
                name="direccion"
                placeholder="Dirección"
                value={form.direccion}
                onChange={handleChange}
              />

              <div className="span-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="form-actions span-2">
                <button className="btn-register" type="submit">
                  Crear Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
