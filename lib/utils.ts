import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn/ui className helper — v0-generated components expect this to exist at lib/utils.ts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
