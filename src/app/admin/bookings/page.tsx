"use client";

import { BookingsList } from "@/components/admin/BookingsList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminBookingsPage() {
  const { role } = useAdmin();
  const isOperador = role === "operador";
  const isAgente = role === "agente";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isOperador || isAgente ? "Mis reservas" : "Reservas"}
        subtitle={
          isOperador
            ? "Reservas en tus alojamientos. Visualiza el detalle, cancela si es necesario y consulta el estado de pagos."
            : isAgente
              ? "Reservas que has realizado como agencia. Visualiza el detalle, cancela si es necesario y consulta el estado de pagos."
              : "Visualiza y gestiona todas las reservas de la plataforma. Cancela reservas y consulta el detalle de pagos."
        }
      />
      <BookingsList />
    </div>
  );
}
