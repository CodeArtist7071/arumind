import React from "react";

type HtmlContentProps = {
  html?: unknown;
};

const ALLOWED_TAGS = new Set([
  "B",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "U",
  "UL",
]);

const DROP_CONTENT_TAGS = new Set([
  "IFRAME",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
]);

/** Renders a small allowlist of backend HTML tags without forwarding attributes. */
export function HtmlContent({ html }: HtmlContentProps) {
  const markup = getHtmlMarkup(html);
  if (!markup) return null;

  const body = new DOMParser().parseFromString(markup, "text/html").body;
  return <>{Array.from(body.childNodes, (node, index) => renderNode(node, `${index}`))}</>;
}

export function getHtmlMarkup(value: unknown): string {
  if (typeof value === "string") {
    // Backend/imported content may contain escaped HTML markers. Normalize only
    // the tags this component permits; rendering still goes through the allowlist.
    return value
      .replace(/\\(?=<\/?(?:b|br|div|em|i|li|ol|p|span|strong|sub|sup|u|ul)\b)/gi, "")
      .replace(/&lt;(\/)?(b|br|div|em|i|li|ol|p|span|strong|sub|sup|u|ul)\s*&gt;/gi, "<$1$2>");
  }
  if (Array.isArray(value)) return value.map(getHtmlMarkup).join("");
  if (!value || typeof value !== "object") return "";

  const content = value as Record<string, unknown>;
  for (const key of ["html", "content", "text", "question", "question_text", "value", "children", "root", "insert"]) {
    if (key in content) return getHtmlMarkup(content[key]);
  }
  return "";
}

function renderNode(node: Node, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement) || DROP_CONTENT_TAGS.has(node.tagName)) return null;

  const children = Array.from(node.childNodes, (child, index) =>
    renderNode(child, `${key}.${index}`),
  );

  if (!ALLOWED_TAGS.has(node.tagName)) return children;
  return React.createElement(node.tagName.toLowerCase(), { key }, ...children);
}
