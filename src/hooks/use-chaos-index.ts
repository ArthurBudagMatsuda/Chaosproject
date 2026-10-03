"use client";

import { useEffect, useState } from "react";
import { liveChaosSource, unavailableSnapshot, validateLiveSnapshot, type LiveChaosSource } from "@/lib/live-chaos-source";

export function useChaosIndex(source: LiveChaosSource = liveChaosSource) {
  const [live, setLive] = useState(unavailableSnapshot);
  const [liveError, setLiveError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      try {
        const snapshot = validateLiveSnapshot(await source.readSnapshot(controller.signal));
        if (!controller.signal.aborted) { setLive(snapshot); setLiveError(false); }
      } catch {
        if (!controller.signal.aborted) { setLive(unavailableSnapshot); setLiveError(true); }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(read, 15000);
      }
    };
    void read();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [source]);

  return { live, liveError };
}
