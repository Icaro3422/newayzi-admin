import { AdminProfileClient } from "@/components/admin/AdminProfileClient";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-semantic-text-muted">
          Información personal, rol y datos de Newayzi Rewards según tu cuenta.
        </p>
      </div>
      <AdminProfileClient />
    </div>
  );
}
