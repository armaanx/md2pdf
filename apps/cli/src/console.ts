const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const CYAN = "\u001b[36m";
const YELLOW = "\u001b[33m";

function colorize(color: string, text: string) {
  return `${color}${text}${RESET}`;
}

export function heading(text: string) {
  return colorize(CYAN, text);
}

export function success(text: string) {
  return colorize(GREEN, text);
}

export function warning(text: string) {
  return colorize(YELLOW, text);
}

export function failure(text: string) {
  return colorize(RED, text);
}

export function muted(text: string) {
  return colorize(DIM, text);
}
