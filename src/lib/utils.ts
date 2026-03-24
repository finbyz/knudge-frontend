import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91 ' + digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+1 ' + digits.slice(1);
  }
  if (digits.length > 10) {
    return '+' + digits.slice(0, 2) + ' ' + digits.slice(2);
  }
  return phone;
}
