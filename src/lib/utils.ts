import { clsx } from 'clsx';

export function cn(...inputs: Array<string | null | undefined | false>) {
  return clsx(inputs);
}

