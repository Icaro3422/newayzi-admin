"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminApi, type PMSConnectionType, type Operator } from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";

export function ConnectionCreateButton({ onCreated }: { onCreated?: () => void }) {
  const { canAccess } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pmsType, setPmsType] = useState("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [connectionTypes, setConnectionTypes] = useState<PMSConnectionType[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    if (open) {
      adminApi.getConnectionTypes().then((r) => setConnectionTypes(r?.results ?? []));
      adminApi.getOperators().then((r) => setOperators(r?.results ?? []));
    }
  }, [open]);

  if (!canAccess("connections")) return null;

  async function handleCreate() {
    if (!pmsType.trim()) return;
    setSaving(true);
    try {
      await adminApi.createConnection({
        name: name.trim() || undefined,
        pms_type: pmsType.trim(),
        operator_id: operatorId && operatorId !== "none" ? parseInt(operatorId, 10) : undefined,
      });
      setOpen(false);
      setName("");
      setPmsType("");
      setOperatorId("");
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        color="primary"
        onPress={() => setOpen(true)}
        startContent={<Icon icon="solar:add-circle-outline" width={20} />}
      >
        Nueva conexión
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>Nueva conexión PMS</ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              label="Tipo PMS"
              selectedKeys={pmsType ? [pmsType] : []}
              onSelectionChange={(s) => setPmsType(Array.from(s)[0] as string ?? "")}
              isRequired
            >
              {connectionTypes.map((t) => (
                <SelectItem key={t.code}>{t.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="Nombre (opcional)"
              placeholder="Ej: Mi conexión Kunas"
              value={name}
              onValueChange={setName}
            />
            <Select
              label="Operador (opcional)"
              items={[{ id: "none", name: "Sin asignar" }, ...operators]}
              selectedKeys={operatorId ? [operatorId] : ["none"]}
              onSelectionChange={(s) => {
                const v = Array.from(s)[0] as string;
                setOperatorId(v === "none" ? "" : v ?? "");
              }}
              placeholder="Sin asignar"
            >
              {(item) => (
                <SelectItem key={String(item.id)}>{item.name}</SelectItem>
              )}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleCreate}
              isLoading={saving}
              isDisabled={!pmsType.trim()}
            >
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
