import type { Draft, Block } from "@/types";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function blockToMarkdown(b: Block): string {
  const text = (b.content || "").trim();
  switch (b.type) {
    case "title":      return `# ${text || "Untitled"}\n`;
    case "prologue":   return `> ${text}\n`;
    case "image":      return `![${b.imageAlt || "image"}](${b.imageUrl || "https://placehold.co/1200x630"})\n\n*${b.caption || ""}*\n`;
    case "key-facts":  return `### Key Facts\n${text}\n`;
    case "tips":       return `### Tips\n${text}\n`;
    case "pros-cons":  return `### Pros & Cons\n${text}\n`;
    case "table":      return `${text}\n`;
    case "cta":        return `${text}\n`;
    case "conclusion": return `## Conclusion\n${text}\n`;
    case "resources":  return `### Resources\n${text}\n`;
    case "references": return `### References\n${text}\n`;
    case "affiliate":  return `> ${text}\n`;
    default:           return `${text}\n`;
  }
}

export function toMarkdown(d: Draft): string {
  const titleBlock = d.blocks.find(b => b.type === "title");
  const title = titleBlock?.content?.trim() || d.brief.topic || "Untitled";
  const parts: string[] = [];
  if (d.headerImage.url || d.headerImage.prompt) {
    parts.push(`![${d.headerImage.alt || title}](${d.headerImage.url || "https://placehold.co/1200x630"})\n`);
  }
  for (const b of d.blocks) parts.push(blockToMarkdown(b));
  return parts.join("\n");
}

// Very small markdown renderer (good enough for previews — no XSS-safe; sanitize at boundary)
export function mdToHtml(md: string): string {
  if (!md) return "";
  let html = escapeHtml(md);
  // tables
  html = html.replace(/((?:^\|.*\|\s*$\n?){2,})/gm, (block) => {
    const lines = block.trim().split("\n");
    const head = lines[0].split("|").slice(1, -1).map(c => `<th>${c.trim()}</th>`).join("");
    const body = lines.slice(2).map(l => `<tr>${l.split("|").slice(1, -1).map(c => `<td>${c.trim()}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  });
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>")
             .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
             .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
             .replace(/^### (.*)$/gm, "<h3>$1</h3>")
             .replace(/^## (.*)$/gm, "<h2>$1</h2>")
             .replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^[-*] (.*)$/gm, "<li>$1</li>")
             .replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m.replace(/<\/li>\n?(?=<li>)/g, "</li>")}</ul>`);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
             .replace(/\*(.+?)\*/g, "<em>$1</em>")
             .replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // paragraphs (lines not already wrapped)
  html = html.split(/\n{2,}/).map(p => {
    const t = p.trim();
    if (!t) return "";
    if (/^<(h[1-6]|ul|ol|blockquote|table|img|p)/.test(t)) return t;
    return `<p>${t.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

export function toHtml(d: Draft): string {
  const titleBlock = d.blocks.find(b => b.type === "title");
  const title = titleBlock?.content?.trim() || d.brief.topic || "Untitled";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(d.brief.metaDescription)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(d.brief.metaDescription)}" />
${d.headerImage.url ? `<meta property="og:image" content="${escapeHtml(d.headerImage.url)}" />` : ""}
${d.brief.tags.length ? `<meta name="keywords" content="${escapeHtml(d.brief.tags.join(", "))}" />` : ""}
</head>
<body>
<article>
${d.headerImage.url || d.headerImage.prompt ? `<img alt="${escapeHtml(d.headerImage.alt || title)}" src="${escapeHtml(d.headerImage.url || "https://placehold.co/1200x630")}" />` : ""}
${mdToHtml(toMarkdown(d))}
</article>
</body>
</html>`;
}

export function toMdx(d: Draft): string {
  const titleBlock = d.blocks.find(b => b.type === "title");
  const title = titleBlock?.content?.trim() || d.brief.topic || "Untitled";
  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `description: "${d.brief.metaDescription.replace(/"/g, '\\"')}"`,
    d.brief.focusKeyword ? `focusKeyword: "${d.brief.focusKeyword}"` : "",
    `categories: [${d.brief.categories.map(c => `"${c}"`).join(", ")}]`,
    `tags: [${d.brief.tags.map(t => `"${t}"`).join(", ")}]`,
    d.headerImage.url ? `headerImage: "${d.headerImage.url}"` : "",
    d.headerImage.alt ? `headerImageAlt: "${d.headerImage.alt.replace(/"/g, '\\"')}"` : "",
    `og:`,
    `  title: "${title.replace(/"/g, '\\"')}"`,
    `  description: "${d.brief.metaDescription.replace(/"/g, '\\"')}"`,
    d.headerImage.url ? `  image: "${d.headerImage.url}"` : "",
    `createdAt: "${new Date(d.createdAt).toISOString()}"`,
    "---",
    "",
  ].filter(Boolean).join("\n");
  return frontmatter + "\n" + toMarkdown(d);
}

export function toJson(d: Draft): string {
  return JSON.stringify(d, null, 2);
}

export function toNewsletterMarkdown(d: Draft): string {
  const n = d.newsletter;
  const header = n.useArticleHeader ? d.headerImage : n.headerImage;
  const lines: string[] = [];
  if (header.url || header.prompt) {
    lines.push(`![${header.alt || "Newsletter header"}](${header.url || "https://placehold.co/1200x600"})\n`);
  }
  if (n.introText) lines.push(`${n.introText}\n`);
  n.previews.forEach((p, i) => {
    lines.push(`---\n`);
    lines.push(`## ${i + 1}. ${p.title}\n`);
    lines.push(`${p.summary}\n`);
    lines.push(`[${p.ctaText || "Read more"}](${p.ctaLink || "#"})\n`);
  });
  if (n.outroText) {
    lines.push(`---\n`);
    lines.push(`${n.outroText}\n`);
  }
  return lines.join("\n");
}

export function toNewsletterHtml(d: Draft): string {
  const n = d.newsletter;
  const header = n.useArticleHeader ? d.headerImage : n.headerImage;
  const previews = n.previews.map((p, i) => `
    <tr><td style="padding:24px 0;border-top:1px solid #e5e0d7;">
      <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px;color:#2C1E16;">${i + 1}. ${escapeHtml(p.title)}</h2>
      <p style="font-size:15px;line-height:1.6;color:#5C4D43;margin:0 0 12px;">${escapeHtml(p.summary)}</p>
      <a href="${escapeHtml(p.ctaLink || "#")}" style="display:inline-block;background:#C86F53;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(p.ctaText || "Read more")}</a>
    </td></tr>`).join("");
  return `<!doctype html>
<html><body style="margin:0;background:#F9F7F1;font-family:-apple-system,Helvetica,sans-serif;color:#2C1E16;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;padding:32px 20px;">
  ${header.url || header.prompt ? `<tr><td><img src="${escapeHtml(header.url || "https://placehold.co/1200x600")}" alt="${escapeHtml(header.alt || "")}" style="width:100%;border-radius:12px;display:block;"/></td></tr>` : ""}
  ${n.introText ? `<tr><td style="padding:24px 0;font-size:16px;line-height:1.7;">${escapeHtml(n.introText).replace(/\n/g, "<br/>")}</td></tr>` : ""}
  ${previews}
  ${n.outroText ? `<tr><td style="padding:24px 0;border-top:1px solid #e5e0d7;font-size:15px;line-height:1.7;color:#5C4D43;">${escapeHtml(n.outroText).replace(/\n/g, "<br/>")}</td></tr>` : ""}
</table>
</body></html>`;
}

export function buildLlmPrompt(d: Draft, styleSystem: string): string {
  const lines: string[] = [];
  lines.push("SYSTEM:\n" + styleSystem + "\n");
  lines.push("BRIEF:");
  lines.push(JSON.stringify(d.brief, null, 2));
  lines.push("\nBLOCK ORDER:");
  d.blocks.forEach((b, i) => lines.push(`${i + 1}. ${b.type} — ${b.note || ""}`));
  lines.push("\nAFFILIATE:");
  lines.push(JSON.stringify(d.affiliate, null, 2));
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function wordCount(d: Draft): number {
  const all = d.blocks.map(b => (b.content || "")).join(" ");
  return all.trim() ? all.trim().split(/\s+/).length : 0;
}

export function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 220));
}
