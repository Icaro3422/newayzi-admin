import Link from "next/link";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { PropertiesList } from "@/components/admin/PropertiesList";

export default function AdminPropertiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sora text-2xl font-semibold text-newayzi-jet">
          Propiedades
        </h1>
      </div>
      <PropertiesList />
    </div>
  );
}
