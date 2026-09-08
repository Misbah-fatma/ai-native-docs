import { fileSlug } from "./exportMarkdown.js";

function inlinePlain(nodes = []) {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      if (node.type !== "text") return inlinePlain(node.content);
      return node.text || "";
    })
    .join("");
}

function listItemText(item) {
  const first = item.content?.[0];
  if (first?.type === "paragraph") return inlinePlain(first.content);
  return inlinePlain(item.content);
}

function collectBlocks(node, out = []) {
  if (!node) return out;
  if (node.type === "heading") {
    out.push({
      kind: "heading",
      level: Math.min(Math.max(node.attrs?.level || 1, 1), 3),
      text: inlinePlain(node.content),
    });
    return out;
  }
  if (node.type === "paragraph") {
    out.push({ kind: "paragraph", text: inlinePlain(node.content) });
    return out;
  }
  if (node.type === "bulletList") {
    (node.content || []).forEach((item) => {
      out.push({ kind: "bullet", text: listItemText(item) });
    });
    return out;
  }
  if (node.type === "orderedList") {
    (node.content || []).forEach((item, index) => {
      out.push({ kind: "ordered", text: listItemText(item), index: index + 1 });
    });
    return out;
  }
  (node.content || []).forEach((child) => collectBlocks(child, out));
  return out;
}

function pdfSafe(text) {
  return Array.from(text || "")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (char === "•") return "-";
      if (code === 10 || code === 13) return " ";
      if (code < 32 || code > 255) return "?";
      return char;
    })
    .join("");
}

function escapePdf(text) {
  return pdfSafe(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text, fontSize, maxWidth) {
  const widthOf = (value) => value.length * fontSize * 0.5;
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (widthOf(next) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function buildPdf(title, content) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const lines = [];

  function addBlock(text, font, size, gap) {
    wrapLine(text, size, maxWidth).forEach((line) => {
      lines.push({ text: line, font, size, gap: 2 });
    });
    if (lines.length) lines[lines.length - 1].gap = gap;
  }

  addBlock(title || "Untitled", "B", 20, 16);
  collectBlocks(content).forEach((block) => {
    if (block.kind === "heading") {
      const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 12;
      addBlock(block.text || " ", "B", size, 10);
      return;
    }
    if (block.kind === "bullet") {
      addBlock(`-  ${block.text || ""}`, "R", 11, 6);
      return;
    }
    if (block.kind === "ordered") {
      addBlock(`${block.index}.  ${block.text || ""}`, "R", 11, 6);
      return;
    }
    addBlock(block.text || " ", "R", 11, 10);
  });

  const pages = [];
  let y = pageHeight - margin;
  let page = [];
  lines.forEach((line) => {
    const height = line.size + line.gap;
    if (y - height < margin) {
      pages.push(page);
      page = [];
      y = pageHeight - margin;
    }
    page.push({ ...line, y });
    y -= height;
  });
  if (page.length) pages.push(page);

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
  const contentIds = pages.map((pageLines) => {
    const stream = pageLines
      .map((line) => {
        const font = line.font === "B" ? "F2" : "F1";
        return `BT /${font} ${line.size} Tf 56 ${line.y.toFixed(2)} Td (${escapePdf(line.text)}) Tj ET`;
      })
      .join("\n");
    return add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const pageIds = contentIds.map((contentId) =>
    add(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ),
  );
  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  pageIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  });
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let offset = 0;
  const chunks = ["%PDF-1.4\n"];
  offset = chunks[0].length;
  const xref = [0];
  objects.forEach((body, index) => {
    xref.push(offset);
    const object = `${index + 1} 0 obj\n${body}\nendobj\n`;
    chunks.push(object);
    offset += object.length;
  });
  const xrefStart = offset;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  xref.slice(1).forEach((value) => {
    chunks.push(`${String(value).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return chunks.join("");
}

export function downloadPdf(title, content) {
  const pdf = buildPdf(title, content);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${fileSlug(title)}.pdf`;
  link.click();
  URL.revokeObjectURL(href);
}
