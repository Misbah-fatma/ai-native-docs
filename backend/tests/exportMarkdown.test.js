import { describe, expect, it } from "vitest";
import { tiptapToMarkdown } from "../../frontend/src/exportMarkdown.js";

describe("markdown export", () => {
  it("turns headings, emphasis, and lists into markdown", () => {
    const md = tiptapToMarkdown({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Notes" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "short" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "honest" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Share as viewer" }] },
              ],
            },
          ],
        },
      ],
    });
    expect(md).toContain("# Notes");
    expect(md).toContain("**short**");
    expect(md).toContain("*honest*");
    expect(md).toContain("- Share as viewer");
  });
});
