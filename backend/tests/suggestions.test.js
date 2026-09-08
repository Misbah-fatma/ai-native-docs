import { describe, expect, it } from "vitest";
import { applySuggestionContent } from "../lib/suggestions.js";
import { canReviewSuggestion, canSuggest, getAccessRole } from "../lib/access.js";

const doc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Keep it easy to reopen." }],
    },
  ],
};

describe("suggestions", () => {
  it("lets anyone with access suggest, but only owners and editors review", () => {
    const shared = {
      ownerId: "alex",
      shares: [{ userId: "sam", role: "viewer" }],
    };
    expect(canSuggest(getAccessRole("sam", shared))).toBe(true);
    expect(canReviewSuggestion(getAccessRole("sam", shared))).toBe(false);
    expect(canReviewSuggestion(getAccessRole("alex", shared))).toBe(true);
  });

  it("replaces the quoted phrase when accepted", () => {
    const next = applySuggestionContent(doc, "easy to reopen", "easy to find later");
    expect(next.content[0].content[0].text).toBe("Keep it easy to find later.");
  });

  it("appends a paragraph when the quote is missing", () => {
    const next = applySuggestionContent(doc, "not in the page", "Add this line.");
    expect(next.content.at(-1).content[0].text).toBe("Add this line.");
  });
});
