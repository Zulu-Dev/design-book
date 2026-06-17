"use client";

import { useEffect, useState } from "react";
import { TeammatePresence } from "@/components/teammate-presence";
import { useTeammatePresence } from "@/hooks/use-teammate-presence";
import { getStoredVoter } from "@/lib/voter";

export function HeaderPresence() {
  const [voter, setVoter] = useState<ReturnType<typeof getStoredVoter>>(null);
  const { teammateName, teammateOnline } = useTeammatePresence(voter);

  useEffect(() => {
    setVoter(getStoredVoter());
  }, []);

  if (!voter) return null;

  return <TeammatePresence name={teammateName} online={teammateOnline} />;
}
