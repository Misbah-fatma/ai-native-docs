import { describe, expect, it } from "vitest";
import {
  appendTiptapContent,
  isAllowedAttachment,
  isAllowedFilename,
  markdownToHtml,
  safeFilename,
  textToHtml,
  titleFromFilename,
} from "../lib/importFile.js";

describe("file import helpers", () => {
  it("accepts the documented file types and rejects others", () => {
    expect(isAllowedFilename("notes.txt")).toBe(true);
    expect(isAllowedFilename("brief.MD")).toBe(true);
    expect(isAllowedFilename("spec.docx")).toBe(true);
    expect(isAllowedFilename("photo.png")).toBe(false);
    expect(isAllowedFilename("archive.zip")).toBe(false);
  });

  it("turns filenames into readable titles", () => {
    expect(titleFromFilename("weekly-update.md")).toBe("Weekly Update");
    expect(titleFromFilename("Q3_notes.txt")).toBe("Q3 Notes");
  });

  it("preserves plain-text paragraphs and line breaks", () => {
    const html = textToHtml("Hello\nthere\n\nSecond paragraph");
    expect(html).toContain("<p>Hello<br>there</p>");
    expect(html).toContain("<p>Second paragraph</p>");
    expect(html).not.toContain("<script>");
  });

  it("converts markdown headings, emphasis, and lists into HTML", async () => {
    const html = await markdownToHtml(`# Launch notes

This is **bold** and *italic*.

- First
- Second
`);
    expect(html).toContain("<h1>");
    expect(html).toContain("Launch notes");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toMatch(/<ul>[\s\S]*<li>/);
  });

  it("escapes HTML in uploaded text files", () => {
    const html = textToHtml('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("allows document attachments and appends imported draft content", () => {
    expect(isAllowedAttachment("brief.pdf")).toBe(true);
    expect(isAllowedAttachment("shot.png")).toBe(true);
    expect(isAllowedAttachment("virus.exe")).toBe(false);
    expect(safeFilename("../../secret notes.pdf")).toBe("secret notes.pdf");
    const merged = appendTiptapContent(
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Keep" }] }] },
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Added" }] }] },
    );
    expect(merged.content).toHaveLength(2);
    expect(merged.content[1].content[0].text).toBe("Added");
  });
});
