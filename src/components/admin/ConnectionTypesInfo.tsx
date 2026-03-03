"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { adminApi, type PMSConnectionType } from "@/lib/admin-api";

export function ConnectionTypesInfo() {
  const [types, setTypes] = useState<PMSConnectionType[]>([]);

  useEffect(() => {
    adminApi.getConnectionTypes().then((res) => {
      setTypes(res?.results ?? []);
    });
  }, []);

  if (types.length === 0) return null;

  return (
    <Card className="border border-semantic-surface-border">
      <CardBody>
        <p className="text-sm font-medium text-newayzi-jet mb-1">Tipos de conexión PMS</p>
        <p className="text-sm text-semantic-text-muted">
          {types.map((t) => `${t.label} (${t.code})`).join(" · ")}
        </p>
        <p className="text-xs text-semantic-text-muted mt-2">
          <strong>API genérica:</strong> permite conectar cualquier PMS con URL de API, usuario y contraseña (Booking, OTAs, sistemas propios, etc.).
        </p>
      </CardBody>
    </Card>
  );
}
