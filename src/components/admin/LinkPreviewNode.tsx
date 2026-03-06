"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

function LinkPreviewComponent({ node }: ReactNodeViewProps) {
  const attrs = node.attrs as { url: string; title: string; description: string; image: string };
  const { url, title, description, image } = attrs;
  const displayUrl = (url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <NodeViewWrapper as="div" className="my-3 link-preview-wrapper" contentEditable={false}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-newayzi-han-purple/40 hover:shadow-md transition-all no-underline"
      >
        {image && (
          <div className="aspect-video bg-gray-100 overflow-hidden">
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="p-4">
          {title && (
            <div className="font-semibold text-newayzi-jet text-base mb-1 line-clamp-2">
              {title}
            </div>
          )}
          {description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{description}</p>
          )}
          <span className="text-xs text-newayzi-han-purple font-medium">{displayUrl}</span>
        </div>
      </a>
    </NodeViewWrapper>
  );
}

export const LinkPreviewExtension = Node.create({
  name: "linkPreview",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="link-preview"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            url: el.getAttribute("data-url") || "",
            title: el.getAttribute("data-title") || "",
            description: el.getAttribute("data-description") || "",
            image: el.getAttribute("data-image") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": "link-preview" },
        {
          "data-url": HTMLAttributes.url,
          "data-title": HTMLAttributes.title,
          "data-description": HTMLAttributes.description,
          "data-image": HTMLAttributes.image,
        }
      ),
      [
        "a",
        {
          href: HTMLAttributes.url,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "link-preview-card block rounded-xl border border-gray-200 bg-white overflow-hidden no-underline",
        },
        HTMLAttributes.image
          ? [
              "div",
              { class: "aspect-video bg-gray-100 overflow-hidden" },
              ["img", { src: HTMLAttributes.image, alt: "", class: "w-full h-full object-cover" }],
            ]
          : null,
        [
          "div",
          { class: "p-4" },
          HTMLAttributes.title
            ? ["div", { class: "font-semibold text-newayzi-jet text-base mb-1" }, HTMLAttributes.title]
            : null,
          HTMLAttributes.description
            ? ["p", { class: "text-sm text-gray-600 mb-2" }, HTMLAttributes.description]
            : null,
          ["span", { class: "text-xs text-newayzi-han-purple font-medium" }, HTMLAttributes.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || ""],
        ].filter(Boolean),
      ].filter(Boolean),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewComponent);
  },
});
