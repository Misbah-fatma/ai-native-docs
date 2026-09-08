const TTL_MS = 20_000;
const rooms = new Map();

function prune(room) {
  const cutoff = Date.now() - TTL_MS;
  for (const [userId, entry] of room) {
    if (entry.seenAt < cutoff) room.delete(userId);
  }
}

export function heartbeat(documentId, user) {
  let room = rooms.get(documentId);
  if (!room) {
    room = new Map();
    rooms.set(documentId, room);
  }
  room.set(user.id, {
    id: user.id,
    name: user.name,
    email: user.email,
    seenAt: Date.now(),
  });
  prune(room);
  return listViewers(documentId);
}

export function listViewers(documentId) {
  const room = rooms.get(documentId);
  if (!room) return [];
  prune(room);
  return [...room.values()].map(({ id, name, email }) => ({ id, name, email }));
}
