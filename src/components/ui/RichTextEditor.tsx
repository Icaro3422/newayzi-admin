"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  variant?: "light" | "dark";
}

const TOOLBAR_ICONS = {
  undo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h10a5 5 0 0 1 5 5v2" />
      <path d="M7 6 3 10l4 4" />
    </svg>
  ),
  redo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10H11a5 5 0 0 0-5 5v2" />
      <path d="M17 6 21 10l-4 4" />
    </svg>
  ),
  bold: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  underline: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  ),
  strike: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  h1: <span className="text-xs font-bold">H1</span>,
  h2: <span className="text-xs font-bold">H2</span>,
  h3: <span className="text-xs font-bold">H3</span>,
  paragraph: <span className="text-base font-bold leading-none">p</span>,
  listBullet: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  listOrdered: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6h11" />
      <path d="M10 12h11" />
      <path d="M10 18h11" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  alignLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  ),
  alignCenter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </svg>
  ),
  alignRight: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="6" y1="18" x2="20" y2="18" />
    </svg>
  ),
  clear: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};

function ToolbarButton({
  onClick,
  active,
  title,
  icon,
  disabled = false,
  label,
  dark = false,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
  label?: string;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[44px] transition-all duration-200 [&_svg]:shrink-0 ${
        dark
          ? active
            ? "bg-[#5e2cec] text-white shadow-sm"
            : "text-white/70 hover:bg-white/[0.12] hover:text-white"
          : active
            ? "bg-newayzi-majorelle text-white shadow-sm"
            : "text-newayzi-jet hover:bg-newayzi-majorelle/10 hover:text-newayzi-majorelle"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      {icon}
      {label && <span className="text-[10px] font-medium leading-tight">{label}</span>}
    </button>
  );
}

function ToolbarDivider({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`h-8 w-px ${dark ? "bg-white/20" : "bg-gray-200"}`}
      aria-hidden
    />
  );
}

function Toolbar({ editor, dark = false }: { editor: Editor | null; dark?: boolean }) {
  if (!editor) return null;

  return (
    <div
      className={`flex flex-wrap items-stretch gap-1 border-b px-3 py-2 ${
        dark
          ? "border-white/[0.08] bg-white/[0.06]"
          : "border-gray-200/60 bg-gray-50/50"
      }`}
    >
      {/* Historial */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Deshacer (Ctrl+Z)"
        icon={TOOLBAR_ICONS.undo}
        disabled={!editor.can().undo()}
        label="Deshacer"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Rehacer (Ctrl+Y)"
        icon={TOOLBAR_ICONS.redo}
        disabled={!editor.can().redo()}
        label="Rehacer"
        dark={dark}
      />
      <ToolbarDivider dark={dark} />

      {/* Formato de texto */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Negrita (Ctrl+B)"
        icon={TOOLBAR_ICONS.bold}
        label="Negrita"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Cursiva (Ctrl+I)"
        icon={TOOLBAR_ICONS.italic}
        label="Cursiva"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Subrayado (Ctrl+U)"
        icon={TOOLBAR_ICONS.underline}
        label="Subrayado"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Tachado"
        icon={TOOLBAR_ICONS.strike}
        label="Tachado"
        dark={dark}
      />
      <ToolbarDivider dark={dark} />

      {/* Títulos y párrafo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Título principal"
        icon={TOOLBAR_ICONS.h1}
        label="Título 1"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Subtítulo"
        icon={TOOLBAR_ICONS.h2}
        label="Título 2"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Subtítulo menor"
        icon={TOOLBAR_ICONS.h3}
        label="Título 3"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
        title="Párrafo normal"
        icon={TOOLBAR_ICONS.paragraph}
        label="Párrafo"
        dark={dark}
      />
      <ToolbarDivider dark={dark} />

      {/* Listas */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Lista con viñetas"
        icon={TOOLBAR_ICONS.listBullet}
        label="Viñetas"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Lista numerada"
        icon={TOOLBAR_ICONS.listOrdered}
        label="Numerada"
        dark={dark}
      />
      <ToolbarDivider dark={dark} />

      {/* Alineación */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Alinear a la izquierda"
        icon={TOOLBAR_ICONS.alignLeft}
        label="Izq."
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Centrar texto"
        icon={TOOLBAR_ICONS.alignCenter}
        label="Centro"
        dark={dark}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Alinear a la derecha"
        icon={TOOLBAR_ICONS.alignRight}
        label="Der."
        dark={dark}
      />
      <ToolbarDivider dark={dark} />

      {/* Limpiar formato */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Quitar todo el formato"
        icon={TOOLBAR_ICONS.clear}
        label="Limpiar"
        dark={dark}
      />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe la descripción...",
  minHeight = "200px",
  disabled = false,
  variant = "light",
}: RichTextEditorProps) {
  const dark = variant === "dark";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: dark
          ? "prose prose-sm prose-invert max-w-none min-w-0 px-4 py-3 focus:outline-none font-sans text-white/90 rich-text-dark"
          : "prose prose-sm max-w-none min-w-0 px-4 py-3 focus:outline-none font-sans text-newayzi-jet",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  return (
    <div
      className={`overflow-hidden rounded-xl transition-shadow ${
        dark
          ? `border border-white/[0.12] bg-white/[0.06] focus-within:ring-2 focus-within:ring-[#5e2cec]/30 focus-within:border-[#5e2cec]/50 ${
              disabled ? "opacity-60" : ""
            }`
          : `border border-gray-200/60 bg-white shadow-sm focus-within:ring-2 focus-within:ring-newayzi-majorelle/30 focus-within:border-newayzi-majorelle/50 ${
              disabled ? "opacity-60" : ""
            }`
      }`}
    >
      <Toolbar editor={editor} dark={dark} />
      <EditorContent editor={editor} style={{ minHeight }} className={dark ? "rich-text-content rich-text-dark" : "rich-text-content"} />
    </div>
  );
}
