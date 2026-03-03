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
        <p className="text-sm font-medium text-newayzi-jet mb-1">Tipos PMS disponibles</p>
        <p className="text-sm text-semantic-text-muted">
          {types.map((t) => `${t.label} (${t.code})`).join(" · ")}
        </p>
      </CardBody>
    </Card>
  );
}
