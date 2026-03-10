import { OperatorDetailClient } from "@/components/admin/OperatorDetailClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminOperatorDetailPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Detalle de operador"
        subtitle="Edita la información y estado del operador"
      />
      <OperatorDetailClient />
    </div>
  );
}
