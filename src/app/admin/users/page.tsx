import { UsersList } from "@/components/admin/UsersList";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Usuarios y roles
      </h1>
      <p className="text-sm text-semantic-text-muted">
        Asigna rol (super_admin, visualizador, comercial, operador) y operador a cada usuario. Solo el super-admin puede ver y editar esta sección.
      </p>
      <UsersList />
    </div>
  );
}
