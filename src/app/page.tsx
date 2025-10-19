import { redirect } from "next/navigation";

export default function Page() {
	// Cambia '/login' por '/principal' si prefieres abrir la página principal.
	redirect("/login");
}
