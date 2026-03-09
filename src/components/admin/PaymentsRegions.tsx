"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  Spinner,
} from "@heroui/react";
import { adminApi, type PaymentMethod, type Region, type RegionPaymentMethod } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function PaymentsRegions() {
  const { canAccess } = useAdmin();
  const canEdit = canAccess("payments");
  const [regions, setRegions] = useState<Region[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [regionMethods, setRegionMethods] = useState<Record<string, Record<number, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getRegions(),
      adminApi.getPaymentMethods(),
    ]).then(([regs, meths]) => {
      setRegions(regs ?? []);
      setMethods(meths ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (regions.length === 0) return;
    const key = `${regions.length}-${methods.length}`;
    let cancelled = false;
    const loads = regions.map(async (r) => {
      const list = await adminApi.getRegionPaymentMethods(r.id);
      if (cancelled) return;
      setRegionMethods((prev) => {
        const next = { ...prev };
        next[r.id] = {};
        list?.forEach((rm) => {
          if (rm.payment_method_id) next[r.id][rm.payment_method_id] = rm.is_active;
          else if (rm.payment_method) next[r.id][rm.payment_method.id] = rm.is_active;
        });
        return next;
      });
    });
    Promise.all(loads);
    return () => {
      cancelled = true;
    };
  }, [regions.length, methods.length]);

  async function toggle(regionId: number, methodId: number, is_active: boolean) {
    if (!canEdit) return;
    const k = `${regionId}-${methodId}`;
    setToggling(k);
    try {
      await adminApi.patchRegionPaymentMethod(regionId, methodId, is_active);
      setRegionMethods((prev) => ({
        ...prev,
        [regionId]: { ...prev[regionId], [methodId]: is_active },
      }));
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (regions.length === 0 || methods.length === 0) {
    return (
      <Card className="border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-sm">
        <CardBody>
          <p className="text-gray-500">
            No hay regiones o métodos de pago configurados en el backend. Crea los modelos Region, PaymentMethod y RegionPaymentMethod.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200/60 bg-white/90 backdrop-blur-sm rounded-[20px] shadow-sm">
      <CardBody>
        <p className="text-sm text-gray-500 mb-4">
          Activa o desactiva cada método de pago por región. Solo super-admin.
        </p>
        <Table aria-label="Pagos por región" classNames={{ wrapper: "border border-gray-200/60 rounded-lg overflow-hidden" }}>
          <TableHeader>
            {[
              <TableColumn key="region">Región</TableColumn>,
              ...methods.map((m) => (
                <TableColumn key={m.id}>{m.name}</TableColumn>
              )),
            ]}
          </TableHeader>
          <TableBody>
            {regions.map((r) => (
              <TableRow key={r.id}>
                {[
                  <TableCell key="region" className="font-medium">{r.name} {r.country_code && `(${r.country_code})`}</TableCell>,
                  ...methods.map((m) => (
                    <TableCell key={m.id}>
                      <Switch
                        isSelected={regionMethods[r.id]?.[m.id] ?? false}
                        onValueChange={(v) => toggle(r.id, m.id, v)}
                        isDisabled={!canEdit || toggling === `${r.id}-${m.id}`}
                      />
                    </TableCell>
                  )),
                ]}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
