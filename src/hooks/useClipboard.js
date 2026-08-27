import { useState, useCallback } from 'react';

/**
 * Custom hook for copying text to clipboard with automatic temporary feedback state.
 * @param {number} resetTimeoutMs Duration before resetting copied state back to false (default 2000ms)
 * @returns {{ copied: boolean, copyToClipboard: (text: string) => Promise<boolean> }}
 */
export function useClipboard(resetTimeoutMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text) => {
    if (!text && text !== '') return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
        setCopied(true);
        setTimeout(() => setCopied(false), resetTimeoutMs);
        return true;
      }
    } catch (err) {
      console.warn('Error copying to clipboard:', err);
    }
    return false;
  }, [resetTimeoutMs]);

  return { copied, copyToClipboard };
}

export default useClipboard;
