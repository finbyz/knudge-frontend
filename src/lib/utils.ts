import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  if (!phone) return phone;
  // If already formatted (has spaces/dashes/parens), return as-is
  if (phone.includes(' ') || phone.includes('-') || phone.includes('(')) return phone;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;
  // India: 91 + 10 digits = 12 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91 ' + digits.slice(2);
  }
  // US/Canada: 1 + 10 digits = 11 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+1 ' + digits.slice(1);
  }
  // Long digit blobs without a validated country code — do not fake "+…" (matches backend)
  if (digits.length > 10) {
    return digits;
  }
  return phone;
}

export function formatSenderName(name: string): string {
  if (!name) return 'Unknown';

  // Backend sends real names, "WhatsApp · …", or formatted international numbers
  if (/WhatsApp|[·•]|[a-zA-Z\u00C0-\u024F]/.test(name)) {
    return name;
  }

  // JID with numeric local: do not prepend "+" to long locals (LID / opaque ids).
  if (name.includes('@')) {
    const [local] = name.split('@');
    if (/^\d+$/.test(local)) {
      if (local.length <= 10) return name;
      if (local.length === 11 && local.startsWith('1')) {
        return '+1 ' + local.slice(1);
      }
      return local;
    }
  }

  // Raw digits only: never fake "+…" for long blobs (LID / internal ids are often 12–15 digits).
  if (/^\d+$/.test(name)) {
    if (name.length <= 10) return name;
    if (name.length === 11 && name.startsWith('1')) {
      return '+1 ' + name.slice(1);
    }
    if (name.length >= 12) {
      return `WhatsApp · …${name.slice(-4)}`;
    }
    return name;
  }

  return name;
}
