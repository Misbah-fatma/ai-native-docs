import { describe, expect, it } from "vitest";
import {
  canComment,
  canDeleteComment,
  canDeleteDocument,
  canEdit,
  canManageSharing,
  canRead,
  canRename,
  canResolveComment,
  canRestoreVersion,
  canReviewSuggestion,
  canSuggest,
  getAccessRole,
} from "../lib/access.js";

const doc = {
  ownerId: "alex",
  shares: [
    { userId: "jordan", role: "editor" },
    { userId: "sam", role: "viewer" },
  ],
};

describe("document access", () => {
  it("gives owners full control", () => {
    const role = getAccessRole("alex", doc);
    expect(role).toBe("owner");
    expect(canRead(role)).toBe(true);
    expect(canEdit(role)).toBe(true);
    expect(canRename(role)).toBe(true);
    expect(canManageSharing(role)).toBe(true);
    expect(canDeleteDocument(role)).toBe(true);
  });

  it("lets editors write but not share or delete", () => {
    const role = getAccessRole("jordan", doc);
    expect(role).toBe("editor");
    expect(canRead(role)).toBe(true);
    expect(canEdit(role)).toBe(true);
    expect(canManageSharing(role)).toBe(false);
    expect(canDeleteDocument(role)).toBe(false);
  });

  it("lets viewers read but not edit", () => {
    const role = getAccessRole("sam", doc);
    expect(role).toBe("viewer");
    expect(canRead(role)).toBe(true);
    expect(canEdit(role)).toBe(false);
    expect(canRename(role)).toBe(false);
    expect(canManageSharing(role)).toBe(false);
  });

  it("lets viewers comment and suggest but not restore or resolve", () => {
    const role = getAccessRole("sam", doc);
    expect(canComment(role)).toBe(true);
    expect(canSuggest(role)).toBe(true);
    expect(canReviewSuggestion(role)).toBe(false);
    expect(canResolveComment(role)).toBe(false);
    expect(canRestoreVersion(role)).toBe(false);
    expect(canDeleteComment(role, "sam", "sam")).toBe(true);
    expect(canDeleteComment(role, "jordan", "sam")).toBe(false);
  });

  it("hides documents from everyone else", () => {
    const role = getAccessRole("other", doc);
    expect(role).toBe("none");
    expect(canRead(role)).toBe(false);
    expect(canEdit(role)).toBe(false);
    expect(canComment(role)).toBe(false);
  });
});
