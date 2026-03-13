import { redirect } from "next/navigation";

export default function AccountPage() {
  // La gestión de correo y contraseña se hace directamente en el perfil
  redirect("/admin/profile");
}
