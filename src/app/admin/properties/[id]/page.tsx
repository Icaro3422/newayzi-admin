import { PropertyEditClient } from "@/components/admin/PropertyEditClient";

export default function AdminPropertyEditPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Editar propiedad
      </h1>
      <PropertyEditClient />
    </div>
  );
}
