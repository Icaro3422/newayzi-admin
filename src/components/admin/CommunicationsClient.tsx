"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
  Spinner,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  adminApi,
  type CommunicationTemplate,
  type CommunicationGroup,
} from "@/lib/admin-api";
import { useAdmin } from "@/contexts/AdminContext";
import { EmailRichEditor } from "./EmailRichEditor";

type RecipientMode = "group" | "custom";

export function CommunicationsClient() {
  const { canAccess } = useAdmin();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("group");
  const [groupId, setGroupId] = useState<string>("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [greeting, setGreeting] = useState("Hola,");
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);

  const canSend = canAccess("communications");

  useEffect(() => {
    Promise.all([
      adminApi.getCommunicationTemplates(),
      adminApi.getCommunicationGroups(),
    ]).then(([tRes, gRes]) => {
      setTemplates(tRes?.templates ?? []);
      setGroups(gRes?.groups ?? []);
      if ((tRes?.templates?.length ?? 0) > 0 && !templateId) {
        setTemplateId(tRes!.templates[0].id);
      }
      const groupList = gRes?.groups ?? [];
      const firstGroup = groupList.find((g) => g.id !== "custom");
      if (firstGroup && !groupId) {
        setGroupId(firstGroup.id);
      }
      setLoading(false);
    });
  }, []);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const isCustomMode = recipientMode === "custom" || groupId === "custom";

  const customEmailsList = customEmails
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e.includes("@"));

  const recipientsCount = isCustomMode
    ? customEmailsList.length
    : selectedGroup?.recipients_count ?? 0;

  const hasContent = bodyText.trim().length > 0 || bodyHtml.replace(/<[^>]*>/g, "").trim().length > 0;
  const canSubmit =
    templateId &&
    subject.trim().length > 0 &&
    hasContent &&
    ((isCustomMode && customEmailsList.length > 0) ||
      (!isCustomMode && groupId && groupId !== "custom" && recipientsCount > 0));

  async function handlePreview() {
    if (!templateId) return;
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewOpen(true);
    try {
      const res = await adminApi.getCommunicationPreview({
        template_id: templateId,
        body_text: bodyText.trim() || undefined,
        body_html: bodyHtml.trim() || undefined,
        greeting: greeting.trim() || "Hola,",
      });
      setPreviewHtml(res.html);
    } catch (e) {
      setPreviewHtml(
        `<p class="text-red-600">Error al cargar vista previa: ${e instanceof Error ? e.message : "Error desconocido"}</p>`
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSend() {
    if (!canSubmit) return;
    setSending(true);
    setResult(null);
    try {
      const res = await adminApi.sendMassCommunication({
        template_id: templateId,
        ...(isCustomMode
          ? { custom_emails: customEmails.trim() }
          : { group_id: groupId }),
        subject: subject.trim(),
        body_text: bodyText.trim() || undefined,
        body_html: bodyHtml.trim() || undefined,
        greeting: greeting.trim() || "Hola,",
      });
      setResult(res);
    } catch (e) {
      setResult({
        sent: 0,
        failed: 0,
        total: 0,
        errors: [e instanceof Error ? e.message : "Error al enviar"],
      });
    } finally {
      setSending(false);
    }
  }

  if (!canSend) {
    return (
      <Card className="border border-semantic-surface-border">
        <CardBody>
          <p className="text-semantic-text-muted">
            No tienes permiso para acceder a comunicaciones. Solo el super-admin puede enviar emails masivos.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plantillas disponibles */}
      <Card className="border border-semantic-surface-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold text-newayzi-jet">
            Plantillas de email
          </h2>
          {templateId && (
            <Chip
              color="secondary"
              variant="flat"
              startContent={<Icon icon="solar:document-text-bold" width={16} />}
            >
              {templates.find((t) => t.id === templateId)?.name ?? "Seleccionada"}
            </Chip>
          )}
        </CardHeader>
        <CardBody>
          {templates.length === 0 ? (
            <p className="text-sm text-semantic-text-muted">
              No hay plantillas disponibles. Verifica el backend.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {templates.map((t) => (
                  <Card
                    key={t.id}
                    className={`w-full max-w-md border ${
                      templateId === t.id
                        ? "border-newayzi-han-purple bg-newayzi-han-purple/5 ring-2 ring-newayzi-han-purple/20"
                        : "border-semantic-surface-border"
                    }`}
                    isPressable
                    onPress={() => setTemplateId(t.id)}
                  >
                    <CardBody className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-newayzi-jet">{t.name}</p>
                          <p className="text-sm text-semantic-text-muted">
                            {t.description}
                          </p>
                        </div>
                        {templateId === t.id && (
                          <Icon
                            icon="solar:check-circle-bold"
                            className="text-newayzi-han-purple flex-shrink-0"
                            width={24}
                          />
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
              <Button
                color="primary"
                variant="solid"
                size="md"
                startContent={<Icon icon="solar:eye-bold" width={20} />}
                onPress={handlePreview}
                isDisabled={!templateId}
                className="font-semibold shadow-sm"
              >
                Vista previa de la plantilla
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal vista previa */}
      <Modal
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Vista previa del email</ModalHeader>
          <ModalBody>
            {previewLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="primary" />
              </div>
            ) : previewHtml ? (
              <div
                className="rounded-lg border border-semantic-surface-border bg-white p-4 max-h-[70vh] overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Formulario de envío */}
      <Card className="border border-semantic-surface-border">
        <CardHeader>
          <h2 className="text-lg font-semibold text-newayzi-jet">
            Enviar comunicación
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Plantilla"
            selectedKeys={templateId ? [templateId] : []}
            onSelectionChange={(s) => setTemplateId(Array.from(s)[0] as string)}
            items={templates}
          >
            {(t) => <SelectItem key={t.id}>{t.name}</SelectItem>}
          </Select>

          {/* Destinatarios: selector claro */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-newayzi-jet">
              Destinatarios
            </p>
            <Select
              label="¿A quién enviar?"
              placeholder="Selecciona un grupo o personas"
              selectedKeys={groupId ? [groupId] : []}
              onSelectionChange={(s) => {
                const val = Array.from(s)[0] as string;
                setGroupId(val);
                setRecipientMode(val === "custom" ? "custom" : "group");
              }}
              items={groups}
              description="El grupo seleccionado se muestra debajo"
            >
              {(g) => (
                <SelectItem key={g.id} textValue={g.name}>
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span>{g.name}</span>
                    {g.id !== "custom" && (
                      <Chip size="sm" variant="flat">
                        {g.recipients_count}
                      </Chip>
                    )}
                  </div>
                </SelectItem>
              )}
            </Select>

            {/* Resumen visible del destino */}
            {groupId && (
              <div
                className={`rounded-lg border p-3 ${
                  groupId === "custom"
                    ? "border-amber-300 bg-amber-50"
                    : "border-newayzi-han-purple/30 bg-newayzi-han-purple/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:users-group-rounded-outline"
                    width={20}
                    className="text-newayzi-han-purple"
                  />
                  <div>
                    <p className="font-medium text-newayzi-jet">
                      {groupId === "custom"
                        ? "Personas específicas"
                        : selectedGroup?.name}
                    </p>
                    <p className="text-sm text-semantic-text-muted">
                      {groupId === "custom"
                        ? "Ingresa los emails en el campo de abajo"
                        : `${selectedGroup?.recipients_count ?? 0} destinatarios recibirán el email`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Campo para emails cuando es "Personas específicas" */}
            {groupId === "custom" && (
              <Textarea
                label="Emails de destinatarios"
                placeholder="un@email.com o varios: email1@ejemplo.com, email2@ejemplo.com (separados por coma o salto de línea)"
                value={customEmails}
                onValueChange={setCustomEmails}
                minRows={3}
                description="Un solo email o varios. Separa con coma, punto y coma o salto de línea."
              />
            )}
          </div>

          <Input
            label="Asunto"
            placeholder="Ej: Nuevo aviso importante"
            value={subject}
            onValueChange={setSubject}
            isRequired
          />

          <Input
            label="Saludo"
            placeholder="Hola,"
            value={greeting}
            onValueChange={setGreeting}
            description="Saludo inicial del email (ej. Hola, / Estimados,)"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-newayzi-jet">
              Mensaje <span className="text-red-500">*</span>
            </label>
            <EmailRichEditor
              value={bodyHtml || bodyText}
              onChange={(html, text) => {
                setBodyHtml(html);
                setBodyText(text);
              }}
              placeholder="Escribe el contenido del email. Usa negrita, listas numeradas y títulos para comunicaciones empresariales profesionales."
              minHeight="320px"
            />
            <p className="text-xs text-semantic-text-muted">
              El contenido se enviará con el formato de la plantilla Newayzi (logo, políticas, etc.)
            </p>
          </div>

          <Button
            color="primary"
            onPress={handleSend}
            isLoading={sending}
            isDisabled={!canSubmit}
            startContent={
              !sending ? (
                <Icon icon="solar:letter-bold" width={20} />
              ) : undefined
            }
          >
            {sending
              ? "Enviando..."
              : `Enviar${recipientsCount > 0 ? ` a ${recipientsCount} destinatarios` : ""}`}
          </Button>

          {result && (
            <Card
              className={`border ${
                result.failed > 0
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-300 bg-emerald-50"
              }`}
            >
              <CardBody>
                <div className="flex items-center gap-2">
                  <Icon
                    icon={
                      result.failed > 0
                        ? "solar:danger-triangle-bold"
                        : "solar:check-circle-bold"
                    }
                    width={24}
                    className={
                      result.failed > 0 ? "text-amber-600" : "text-emerald-600"
                    }
                  />
                  <div>
                    <p className="font-medium">
                      Enviados: {result.sent} de {result.total}
                      {result.failed > 0 && ` (${result.failed} fallidos)`}
                    </p>
                    {result.errors.length > 0 && (
                      <ul className="mt-1 text-sm text-amber-700">
                        {result.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
