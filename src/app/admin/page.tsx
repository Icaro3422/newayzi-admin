import { Card, CardBody } from "@heroui/react";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
        Dashboard
      </h1>
      <AdminDashboardClient />
    </div>
  );
}
