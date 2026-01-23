export function createId(prefix: string) {
  const part = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(16).slice(2)
  return `${prefix}_${part}`
}

export function createShortId() {
  return Math.random().toString(36).slice(2, 8)
}

