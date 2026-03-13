"use client";

import { BookingsList } from "@/components/admin/BookingsList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reservas"
        subtitle="Visualiza y gestiona todas las reservas de la plataforma. Cancela reservas y consulta el detalle de pagos."
      />
      <BookingsList />
    </div>
  );
}
