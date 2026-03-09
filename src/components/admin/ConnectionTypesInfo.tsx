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
    <Card className="border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-sm">
      <CardBody className="p-5">
        <p className="text-sm font-semibold text-newayzi-jet mb-1">Tipos de conexión PMS</p>
        <p className="text-sm text-gray-600">
          {types.map((t) => `${t.label} (${t.code})`).join(" · ")}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <strong>API genérica:</strong> permite conectar cualquier PMS con URL de API, usuario y contraseña (Booking, OTAs, sistemas propios, etc.).
        </p>
      </CardBody>
    </Card>
  );
}
