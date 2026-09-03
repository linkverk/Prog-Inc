type LogClass = "" | "good" | "bad" | "hi";
type Listener = (text: string, cls: LogClass) => void;

const listeners: Listener[] = [];

/** Minimal pub/sub so core never imports the UI. */
export function onLog(fn: Listener): void {
  listeners.push(fn);
}

export function log(text: string, cls: LogClass = ""): void {
  for (const fn of listeners) fn(text, cls);
}
