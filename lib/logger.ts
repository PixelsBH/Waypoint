export function logEvent(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, timestamp: Date.now(), ...data }));
}
