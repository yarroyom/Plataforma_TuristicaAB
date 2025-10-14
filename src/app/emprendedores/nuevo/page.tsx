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
    <div className="p-8">
      <button
        className="text-blue-600 underline mb-4"
        onClick={() => router.push("/emprendedores")}
      >
        ← Regresar
      </button>
      <h1 className="text-2xl font-bold mb-4">Nuevo Emprendedor</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input
          name="nombre"
          className="border p-2 rounded"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          required
        />
        <textarea
          name="descripcion"
          className="border p-2 rounded"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={handleChange}
        />
        <input
          name="telefono"
          className="border p-2 rounded"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
        />
        <input
          name="direccion"
          className="border p-2 rounded"
          placeholder="Dirección"
          value={form.direccion}
          onChange={handleChange}
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          type="submit"
        >
          Crear Perfil
        </button>
      </form>
    </div>
  );
}
