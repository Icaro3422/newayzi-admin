import { UsersList } from "@/components/admin/UsersList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usuarios y roles"
        subtitle="Asigna rol (super_admin, visualizador, comercial, operador) y operador a cada usuario. Solo el super-admin puede ver y editar esta sección."
      />
      <UsersList />
    </div>
  );
}
