export function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}

export function serializeComment(comment) {
  const author = comment.author;
  return {
    id: comment._id.toString(),
    body: comment.body,
    quote: comment.quote || "",
    resolved: Boolean(comment.resolved),
    createdAt: comment.createdAt.toISOString(),
    author: author?._id ? publicUser(author) : { id: String(author), email: "", name: "Unknown" },
  };
}

export function serializeVersion(version) {
  const savedBy = version.savedBy;
  return {
    id: version._id.toString(),
    title: version.title,
    label: version.label || "Edit",
    createdAt: version.createdAt.toISOString(),
    savedBy: savedBy?._id ? publicUser(savedBy) : { id: String(savedBy), email: "", name: "Unknown" },
  };
}

export function serializeAttachment(file) {
  const uploader = file.uploadedBy;
  return {
    id: file._id.toString(),
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: (file.createdAt || new Date()).toISOString(),
    uploadedBy: uploader?._id
      ? publicUser(uploader)
      : { id: String(uploader || ""), email: "", name: "Unknown" },
  };
}

export function serializeSuggestion(suggestion) {
  const author = suggestion.author;
  return {
    id: suggestion._id.toString(),
    quote: suggestion.quote || "",
    proposed: suggestion.proposed,
    note: suggestion.note || "",
    status: suggestion.status || "pending",
    createdAt: suggestion.createdAt.toISOString(),
    author: author?._id ? publicUser(author) : { id: String(author), email: "", name: "Unknown" },
  };
}

export function openSuggestionCount(doc) {
  return (doc.suggestions || []).filter((item) => item.status === "pending").length;
}

export function openCommentCount(doc) {
  return (doc.comments || []).filter((comment) => !comment.resolved).length;
}

export function shareEntries(doc) {
  const ownerId = doc.owner._id ? doc.owner._id.toString() : String(doc.owner);
  const shares = (doc.shares || []).map((entry) => {
    const person = entry.user;
    const userId = person?._id ? person._id.toString() : String(person);
    return {
      userId,
      role: entry.role === "viewer" ? "viewer" : "editor",
      user: person?._id ? publicUser(person) : { id: userId, email: "", name: "" },
    };
  });
  return { ownerId, shares };
}
