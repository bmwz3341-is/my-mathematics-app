"use client";

import { useEffect, useState } from "react";
import type { Challenge } from "@/config/challenges";
import { consumePendingChallenge } from "@/lib/dailyChallengeSession";

export function useDailyChallengeAutoFill(toolId: string, apply: (challenge: Challenge) => void): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const challenge = consumePendingChallenge();
    if (!challenge || challenge.toolId !== toolId) return;
    apply(challenge);
    setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  return active;
}
