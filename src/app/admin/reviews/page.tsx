"use client";

import { ReviewsList } from "@/components/admin/ReviewsList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reseñas"
        subtitle="Modera las reseñas enviadas por los huéspedes. Aprueba o rechaza cada una antes de que sea publicada en la plataforma."
      />
      <ReviewsList />
    </div>
  );
}
