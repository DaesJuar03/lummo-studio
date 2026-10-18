import { useState, useCallback } from 'react';

export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState<boolean>(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        setCopied(false);
        return false;
      }
    },
    [timeout]
  );

  return { copied, copy, copyToClipboard: copy };
}

export default useClipboard;
