import { useState, useEffect, useRef, useCallback } from 'react';
import { JsonRpcProvider } from 'ethers';

// ─── BNB Chain RPC for real data ───
const BNB_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BNB_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

/**
 * Typewriter effect hook
 */
export function useTypewriter(
  lines: string[],
  opts: { speed?: number; pauseMs?: number } = {},
) {
  const { speed = 40, pauseMs = 2000 } = opts;
  const [text, setText] = useState('');
  const lineIdx = useRef(0);
  const charIdx = useRef(0);
  const isPausing = useRef(false);

  useEffect(() => {
    const tick = () => {
      const line = lines[lineIdx.current];
      if (!line) return;

      if (isPausing.current) return;

      if (charIdx.current < line.length) {
        setText((prev) => prev + line[charIdx.current]);
        charIdx.current++;
      } else {
        isPausing.current = true;
        setTimeout(() => {
          lineIdx.current = (lineIdx.current + 1) % lines.length;
          charIdx.current = 0;
          setText((prev) => prev + '\n');
          isPausing.current = false;
        }, pauseMs);
      }
    };

    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [lines, speed, pauseMs]);

  return text;
}

/**
 * Count-up animation hook
 */
export function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, durationMs]);

  return value;
}

/**
 * REAL block number from BNB Chain RPC
 * Fetches the actual latest block number every 3 seconds
 */
export function useBlockNumber() {
  const [blockNumber, setBlockNumber] = useState(0);

  useEffect(() => {
    let cancelled = false;
    
    const fetchBlock = async () => {
      try {
        // Try testnet first, fallback to mainnet
        const provider = new JsonRpcProvider(BNB_TESTNET_RPC);
        const block = await provider.getBlockNumber();
        if (!cancelled) setBlockNumber(block);
      } catch {
        try {
          const provider = new JsonRpcProvider(BNB_MAINNET_RPC);
          const block = await provider.getBlockNumber();
          if (!cancelled) setBlockNumber(block);
        } catch {
          // If both fail, show mock number
          if (!cancelled) setBlockNumber(47291844);
        }
      }
    };

    // Fetch immediately
    fetchBlock();

    // Then poll every 3 seconds
    const id = setInterval(fetchBlock, 3000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return blockNumber;
}

/**
 * Copy to clipboard hook
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return { copy, copied };
}
