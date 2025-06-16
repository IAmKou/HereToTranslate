import { resolveMx } from 'dns';
import { promisify } from 'util';

export function validateName(name: string): boolean {
  if (!name) return false;

  const trimmedName = name.trim();
  if (!trimmedName) return false;

  // Check for special characters and emojis
  const specialCharRegex = /[@#]/;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]/u;

  return !specialCharRegex.test(trimmedName) && !emojiRegex.test(trimmedName);
}

export function sanitizeName(name: string): string {
  return name.trim();
}

export async function validateEmail(email: string) {
  const domain = email.split('@')[1];
  const mxRecords = await promisify(resolveMx)(domain);
  return mxRecords.length > 0;
}
