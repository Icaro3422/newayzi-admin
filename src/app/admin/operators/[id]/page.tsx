import { OperatorDetailClient } from "@/components/admin/OperatorDetailClient";

export default function AdminOperatorDetailPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Detalle de operador
      </h1>
      <OperatorDetailClient />
    </div>
  );
}
