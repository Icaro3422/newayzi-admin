"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
  Spinner,
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

const inputDark = "rounded-xl border";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.065] ${className}`}
    >
      {children}
    </div>
  );
}

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
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
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
    ])
      .then(([tRes, gRes]) => {
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
      })
      .catch(() => {
        // 403 u otro error: dejar arrays vacíos para mostrar mensaje de permisos
      })
      .finally(() => setLoading(false));
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
        cta_text: ctaText.trim() || undefined,
        cta_url: ctaUrl.trim() || undefined,
      });
      setPreviewHtml(res.html);
    } catch (e) {
      setPreviewHtml(
        `<p class="text-red-400">Error al cargar vista previa: ${e instanceof Error ? e.message : "Error desconocido"}</p>`
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
        cta_text: ctaText.trim() || undefined,
        cta_url: ctaUrl.trim() || undefined,
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
      <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-4">
          <Icon icon="solar:shield-warning-bold-duotone" className="text-amber-400 text-2xl" />
        </div>
        <p className="font-sora font-bold text-white text-base">Sin permiso</p>
        <p className="mt-2 text-sm text-white/50">
          Solo el super-admin puede enviar emails masivos.
        </p>
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className="flex justify-center items-center py-16">
        <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plantillas disponibles */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
              <Icon icon="solar:document-text-bold-duotone" className="text-[#9b74ff] text-base" />
            </div>
            <div>
              <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Plantillas</p>
              <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
                Plantillas de email
              </p>
            </div>
          </div>
          {templateId && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[#5e2cec]/25 border border-[#5e2cec]/30 text-[#b89eff]">
              <Icon icon="solar:document-text-bold" width={14} />
              {templates.find((t) => t.id === templateId)?.name ?? "Seleccionada"}
            </span>
          )}
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-white/50">
            No hay plantillas disponibles. Verifica el backend.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`w-full max-w-md text-left rounded-2xl border p-4 transition-all ${
                    templateId === t.id
                      ? "border-[#5e2cec]/50 bg-[#5e2cec]/15 ring-2 ring-[#5e2cec]/25"
                      : "border-white/[0.1] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-sora font-semibold text-white">{t.name}</p>
                      <p className="text-sm text-white/60 mt-1">
                        {t.description}
                      </p>
                    </div>
                    {templateId === t.id && (
                      <Icon
                        icon="solar:check-circle-bold"
                        className="text-[#9b74ff] flex-shrink-0"
                        width={24}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <Button
              className="btn-newayzi-primary"
              size="md"
              startContent={<Icon icon="solar:eye-bold" width={20} />}
              onPress={handlePreview}
              isDisabled={!templateId}
            >
              Vista previa de la plantilla
            </Button>
          </div>
        )}
      </GlassCard>

      {/* Modal vista previa */}
      <Modal
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "admin-modal-dark !bg-[#0f1220] rounded-[28px] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col",
          header: "border-b border-white/[0.08] !text-white font-sora font-bold text-lg shrink-0",
          body: "!text-white/95 !bg-transparent overflow-y-auto",
          closeButton: "!text-white/90 hover:!bg-white/10 hover:!text-white rounded-full",
          backdrop: "!bg-black/70 backdrop-blur-md",
          wrapper: "!bg-transparent",
        }}
      >
        <ModalContent>
          <ModalHeader>Vista previa del email</ModalHeader>
          <ModalBody>
            {previewLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" classNames={{ circle1: "border-b-[#5e2cec]", circle2: "border-b-[#5e2cec]" }} />
              </div>
            ) : previewHtml ? (
              <div
                className="rounded-xl border border-white/[0.1] bg-white p-4 max-h-[70vh] overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Formulario de envío */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#5e2cec]/25 flex items-center justify-center shrink-0">
            <Icon icon="solar:letter-bold-duotone" className="text-[#9b74ff] text-base" />
          </div>
          <div>
            <p className="text-white/40 text-[0.6rem] uppercase tracking-[0.15em] font-semibold">Envío</p>
            <p className="font-sora font-bold text-white text-base leading-tight mt-0.5">
              Enviar comunicación
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <Select
            label="Plantilla"
            selectedKeys={templateId ? [templateId] : []}
            onSelectionChange={(s) => setTemplateId(Array.from(s)[0] as string)}
            items={templates}
            classNames={{
              trigger: inputDark,
              value: "!text-white/92",
              label: "!text-white/70",
              selectorIcon: "!text-white/50",
              popoverContent: "bg-[#0f1220] border border-white/[0.1]",
            }}
          >
            {(t) => <SelectItem key={t.id} className="text-white">{t.name}</SelectItem>}
          </Select>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white/80">Destinatarios</p>
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
              classNames={{
                trigger: inputDark,
                value: "!text-white/92",
                label: "!text-white/70",
                selectorIcon: "!text-white/50",
                description: "!text-white/50",
                popoverContent: "bg-[#0f1220] border border-white/[0.1]",
              }}
            >
              {(g) => (
                <SelectItem key={g.id} textValue={g.name} className="text-white">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span>{g.name}</span>
                    {g.id !== "custom" && (
                      <span className="text-xs text-white/50">({g.recipients_count})</span>
                    )}
                  </div>
                </SelectItem>
              )}
            </Select>

            {groupId && (
              <div
                className={`rounded-xl border p-4 ${
                  groupId === "custom"
                    ? "border-amber-400/30 bg-amber-500/15"
                    : "border-[#5e2cec]/30 bg-[#5e2cec]/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:users-group-rounded-outline"
                    width={20}
                    className={groupId === "custom" ? "text-amber-400" : "text-[#9b74ff]"}
                  />
                  <div>
                    <p className="font-medium text-white">
                      {groupId === "custom"
                        ? "Personas específicas"
                        : selectedGroup?.name}
                    </p>
                    <p className="text-sm text-white/60">
                      {groupId === "custom"
                        ? "Ingresa los emails en el campo de abajo"
                        : `${selectedGroup?.recipients_count ?? 0} destinatarios recibirán el email`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {groupId === "custom" && (
              <Textarea
                label="Emails de destinatarios"
                placeholder="un@email.com o varios: email1@ejemplo.com, email2@ejemplo.com (separados por coma o salto de línea)"
                value={customEmails}
                onValueChange={setCustomEmails}
                minRows={3}
                description="Un solo email o varios. Separa con coma, punto y coma o salto de línea."
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                  description: "!text-white/50",
                }}
              />
            )}
          </div>

          <Input
            label="Asunto"
            placeholder="Ej: Nuevo aviso importante"
            value={subject}
            onValueChange={setSubject}
            isRequired
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/70",
            }}
          />

          <Input
            label="Saludo"
            placeholder="Hola,"
            value={greeting}
            onValueChange={setGreeting}
            description="Saludo inicial del email (ej. Hola, / Estimados,)"
            classNames={{
              inputWrapper: inputDark,
              input: "!text-white/95 placeholder:!text-white/38",
              label: "!text-white/70",
              description: "!text-white/50",
            }}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Mensaje <span className="text-red-400">*</span>
            </label>
            <EmailRichEditor
              value={bodyHtml || bodyText}
              onChange={(html, text) => {
                setBodyHtml(html);
                setBodyText(text);
              }}
              placeholder="Escribe el contenido del email. Usa negrita, listas numeradas y títulos para comunicaciones empresariales profesionales."
              minHeight="320px"
              theme="dark"
            />
            <p className="text-xs text-white/50">
              El contenido se enviará con el formato de la plantilla Newayzi (logo, políticas, etc.)
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:link-circle-bold" width={20} className="text-[#9b74ff]" />
              <span className="text-sm font-medium text-white/80">
                Botón CTA (opcional)
              </span>
            </div>
            <p className="text-xs text-white/50">
              Añade un botón de llamada a la acción debajo del mensaje. Si ambos campos están vacíos, no se mostrará.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Texto del botón"
                placeholder="Ej: Visitar sitio"
                value={ctaText}
                onValueChange={setCtaText}
                description="Ej: Ver más, Registrarse, Descargar"
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                  description: "!text-white/50",
                }}
              />
              <Input
                label="URL del botón"
                placeholder="https://ejemplo.com"
                value={ctaUrl}
                onValueChange={setCtaUrl}
                description="Enlace al que llevará el botón"
                classNames={{
                  inputWrapper: inputDark,
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                  description: "!text-white/50",
                }}
              />
            </div>
            {(ctaText.trim() || ctaUrl.trim()) && !(ctaText.trim() && ctaUrl.trim()) && (
              <p className="text-xs text-amber-400">
                Completa ambos campos para que el botón se muestre en el email.
              </p>
            )}
          </div>

          <Button
            className="btn-newayzi-primary"
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
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                result.failed > 0
                  ? "border-amber-400/30 bg-amber-500/15"
                  : "border-emerald-400/30 bg-emerald-500/15"
              }`}
            >
              <Icon
                icon={
                  result.failed > 0
                    ? "solar:danger-triangle-bold"
                    : "solar:check-circle-bold"
                }
                width={24}
                className={
                  result.failed > 0 ? "text-amber-400 shrink-0" : "text-emerald-400 shrink-0"
                }
              />
              <div>
                <p className="font-medium text-white">
                  Enviados: {result.sent} de {result.total}
                  {result.failed > 0 && ` (${result.failed} fallidos)`}
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-1 text-sm text-amber-300">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
