"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";
import { Button, Popover, PopoverTrigger, PopoverContent, Input } from "@heroui/react";
import { LinkPreviewExtension } from "./LinkPreviewNode";
import { adminApi } from "@/lib/admin-api";

const iconSize = 18;

const ToolbarIcons = {
  bold: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  ),
  italic: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
    </svg>
  ),
  strike: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
    </svg>
  ),
  h2: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h2v7h6V4h2v16h-2v-7H6v7H4V4zm14 9h2l-2 4 2 4h-2l-1.5-2 1.5-2z" />
    </svg>
  ),
  h3: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h2v7h6V4h2v16h-2v-7H6v7H4V4zm14 9h2v2h-2v2h2v2h-2v2h-2v-4h4z" />
    </svg>
  ),
  paragraph: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h10v2H4v-2z" />
    </svg>
  ),
  bulletList: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
    </svg>
  ),
  orderedList: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
    </svg>
  ),
  quote: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
    </svg>
  ),
  hr: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 11h16v2H4z" />
    </svg>
  ),
  link: (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  ),
};

const MenuBar = ({ editor, dark }: { editor: ReturnType<typeof useEditor>; dark?: boolean }) => {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (linkPopoverOpen) {
      const href = editor?.getAttributes("link")?.href ?? "";
      setLinkUrl(href);
    }
  }, [linkPopoverOpen, editor]);

  const [linkLoading, setLinkLoading] = useState(false);

  const handleSetLink = async () => {
    const url = linkUrl.trim();
    if (url) {
      const withProtocol = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      editor?.chain().focus().setLink({ href: withProtocol, target: "_blank", rel: "noopener noreferrer" }).run();
      const insertPos = editor?.state.selection.$from.after();

      setLinkLoading(true);
      setLinkPopoverOpen(false);

      let title = "";
      let description = "";
      let image = "";
      let finalUrl = withProtocol;

      try {
        const og = await adminApi.fetchOgMetadata(withProtocol);
        if (!og.error) {
          title = og.title || "";
          description = og.description || "";
          image = og.image || "";
          finalUrl = og.url || withProtocol;
        }
      } catch {
        // Fetch falló (CORS, red, etc.) - usamos fallback
      }

      // Fallback: extraer dominio como título si no hay OG
      if (!title) {
        try {
          const domain = new URL(withProtocol).hostname.replace(/^www\./, "");
          title = domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch {
          title = "Enlace";
        }
      }

      if (editor) {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: "linkPreview",
            attrs: {
              url: finalUrl,
              title,
              description,
              image,
            },
          })
          .run();
      }

      setLinkLoading(false);
    } else {
      if (editor?.isActive("link")) {
        editor?.chain().focus().unsetLink().run();
      }
      setLinkPopoverOpen(false);
    }
  };

  const handleUnsetLink = () => {
    editor?.chain().focus().unsetLink().run();
    setLinkPopoverOpen(false);
  };

  if (!editor) return null;

  const btnBase = dark ? "text-white/70 hover:bg-white/10" : "text-gray-700";
  const btnActive = dark ? "bg-[#5e2cec]/30 text-[#b89eff]" : "bg-newayzi-han-purple/20 text-newayzi-han-purple";

  return (
    <div className={`flex flex-wrap gap-1 border-b p-2 rounded-t-lg ${
      dark ? "border-white/[0.12] bg-white/[0.04]" : "border-semantic-surface-border bg-gray-50/80"
    }`}>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? btnActive : btnBase}
        aria-label="Negrita"
      >
        {ToolbarIcons.bold}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? btnActive : btnBase}
        aria-label="Cursiva"
      >
        {ToolbarIcons.italic}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive("strike") ? btnActive : btnBase}
        aria-label="Tachado"
      >
        {ToolbarIcons.strike}
      </Button>
      <div className={`w-px h-6 mx-1 ${dark ? "bg-white/20" : "bg-gray-200"}`} />
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive("heading", { level: 2 }) ? btnActive : btnBase}
        aria-label="Título"
      >
        {ToolbarIcons.h2}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive("heading", { level: 3 }) ? btnActive : btnBase}
        aria-label="Subtítulo"
      >
        {ToolbarIcons.h3}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().setParagraph().run()}
        className={editor.isActive("paragraph") ? btnActive : btnBase}
        aria-label="Párrafo"
      >
        {ToolbarIcons.paragraph}
      </Button>
      <div className={`w-px h-6 mx-1 ${dark ? "bg-white/20" : "bg-gray-200"}`} />
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? btnActive : btnBase}
        aria-label="Lista"
      >
        {ToolbarIcons.bulletList}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? btnActive : btnBase}
        aria-label="Lista numerada"
      >
        {ToolbarIcons.orderedList}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive("blockquote") ? btnActive : btnBase}
        aria-label="Cita"
      >
        {ToolbarIcons.quote}
      </Button>
      <div className={`w-px h-6 mx-1 ${dark ? "bg-white/20" : "bg-gray-200"}`} />
      <Popover isOpen={linkPopoverOpen} onOpenChange={setLinkPopoverOpen} placement="bottom-start">
        <PopoverTrigger>
          <Button
            type="button"
            size="sm"
            variant="flat"
            isIconOnly
            className={editor.isActive("link") ? btnActive : btnBase}
            aria-label="Insertar enlace"
          >
            {ToolbarIcons.link}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={`w-80 ${dark ? "bg-[#0f1220] border border-white/[0.1]" : ""}`}>
          <div className="p-3 space-y-3">
              <Input
                label="URL del enlace"
                placeholder="https://ejemplo.com"
                value={linkUrl}
                onValueChange={setLinkUrl}
                onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
                autoFocus
                classNames={dark ? {
                  inputWrapper: "rounded-xl border bg-white/[0.08] border-white/[0.14]",
                  input: "!text-white/95 placeholder:!text-white/38",
                  label: "!text-white/70",
                } : undefined}
              />
              <div className="flex gap-2 justify-end">
                {editor.isActive("link") && (
                  <Button size="sm" variant="flat" color="danger" onPress={handleUnsetLink}>
                    Quitar enlace
                  </Button>
                )}
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleSetLink}
                  isLoading={linkLoading}
                  className={dark ? "bg-[#5e2cec] hover:bg-[#6d3cf5] text-white" : ""}
                >
                  {linkLoading ? "Obteniendo vista previa…" : "Aplicar"}
                </Button>
              </div>
            </div>
        </PopoverContent>
      </Popover>
      <div className={`w-px h-6 mx-1 ${dark ? "bg-white/20" : "bg-gray-200"}`} />
      <Button
        type="button"
        size="sm"
        variant="flat"
        isIconOnly
        onPress={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnBase}
        aria-label="Línea horizontal"
      >
        {ToolbarIcons.hr}
      </Button>
    </div>
  );
};

interface EmailRichEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
  theme?: "light" | "dark";
}

export function EmailRichEditor({
  value,
  onChange,
  placeholder = "Escribe el contenido del email. Usa negrita, listas y títulos para comunicaciones profesionales.",
  minHeight = "280px",
  theme = "light",
}: EmailRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: "text-newayzi-han-purple underline hover:text-newayzi-han-purple/80",
        },
      }),
      LinkPreviewExtension,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          theme === "dark"
            ? "prose prose-sm prose-invert max-w-none focus:outline-none px-4 py-3 min-h-[200px] text-white/90"
            : "prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[200px] text-newayzi-jet",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        theme === "dark"
          ? "border-white/[0.12] bg-white/[0.04]"
          : "border-semantic-surface-border bg-white"
      }`}
      style={{ minHeight }}
    >
      {editor && <MenuBar editor={editor} dark={theme === "dark"} />}
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: inherit;
        }
        .ProseMirror h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.75em 0 0.4em;
          color: inherit;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #9b74ff;
          padding-left: 1em;
          margin: 1em 0;
          color: inherit;
          font-style: italic;
          opacity: 0.9;
        }
        .ProseMirror a {
          color: #9b74ff;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: #b89eff;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.15);
          margin: 1.5em 0;
        }
        .ProseMirror:not(.prose-invert) hr {
          border-top-color: #e5e7eb;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror.prose-invert p.is-editor-empty:first-child::before {
          color: rgba(255,255,255,0.4);
        }
        .ProseMirror:not(.prose-invert) p.is-editor-empty:first-child::before {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
