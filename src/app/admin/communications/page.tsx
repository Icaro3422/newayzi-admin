import { CommunicationsClient } from "@/components/admin/CommunicationsClient";

export default function AdminCommunicationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Comunicaciones
      </h1>
      <p className="text-sm text-semantic-text-muted">
        Envía emails masivos a grupos de usuarios usando las plantillas disponibles. Solo super-admin puede acceder.
      </p>
      <CommunicationsClient />
    </div>
  );
}
