import { describe, expect, it } from "vitest";
import { fingerprint, previewFromContent, recordVersion, VERSION_LIMIT } from "../lib/versions.js";

const paragraph = (text) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("version history", () => {
  it("builds a short preview from TipTap JSON", () => {
    expect(previewFromContent(paragraph("Keep the page quiet"))).toBe("Keep the page quiet");
  });

  it("collapses rapid saves from the same person", () => {
    const doc = { versions: [] };
    const t1 = new Date("2026-09-08T12:00:00Z");
    recordVersion(doc, {
      userId: "alex",
      title: "Notes",
      content: paragraph("one"),
      now: t1,
    });
    recordVersion(doc, {
      userId: "alex",
      title: "Notes",
      content: paragraph("two"),
      now: new Date(t1.getTime() + 10_000),
    });
    expect(doc.versions).toHaveLength(1);
    expect(previewFromContent(doc.versions[0].content)).toBe("two");
  });

  it("starts a new version after a pause or a different author", () => {
    const doc = { versions: [] };
    const t1 = new Date("2026-09-08T12:00:00Z");
    recordVersion(doc, {
      userId: "alex",
      title: "Notes",
      content: paragraph("one"),
      now: t1,
    });
    recordVersion(doc, {
      userId: "jordan",
      title: "Notes",
      content: paragraph("two"),
      now: new Date(t1.getTime() + 5_000),
    });
    expect(doc.versions).toHaveLength(2);
  });

  it("caps stored versions", () => {
    const doc = { versions: [] };
    for (let i = 0; i < VERSION_LIMIT + 5; i += 1) {
      recordVersion(doc, {
        userId: "alex",
        title: "Notes",
        content: paragraph(`v${i}`),
        now: new Date(Date.UTC(2026, 0, 1, 0, i * 3)),
        force: true,
      });
    }
    expect(doc.versions).toHaveLength(VERSION_LIMIT);
    expect(previewFromContent(doc.versions[0].content)).toBe("v5");
  });

  it("fingerprints title and content together", () => {
    expect(fingerprint("A", paragraph("x"))).not.toBe(fingerprint("B", paragraph("x")));
  });
});
