// Image identity comes from Lucy, so replaying an SSE event cannot add a card.
export function imageCard(payload, { id, role }) {
  return {
    id: payload.image_id ? `image:${payload.image_id}` : payload.message_id || id,
    role,
    kind: "image",
    image_id: payload.image_id,
    image_url: payload.image_url || null,
    download_url: payload.download_url,
    alt: payload.alt || "",
    format: payload.format || "png",
    error: payload.message || null,
  };
}

export function addImageCard(cards, card) {
  const existing = cards.find(item => item.kind === "image" && item.id === card.id);
  if (existing) return { card: existing, created: false };
  cards.push(card);
  // Read back through Vue's reactive array instead of mutating the raw object.
  return { card: cards[cards.length - 1], created: true };
}
