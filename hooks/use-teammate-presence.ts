"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { VoterName } from "@/lib/voter";

const TEAMMATE: Record<VoterName, VoterName> = {
  Ryan: "Jackson",
  Jackson: "Ryan",
};

export function useTeammatePresence(voter: VoterName | null) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!voter) return;

    const teammate = TEAMMATE[voter];
    const channel = supabase.channel("design-book-presence", {
      config: { presence: { key: voter } },
    });

    function syncPresence() {
      const state = channel.presenceState<{ voter: VoterName }>();
      let teammatePresent = false;
      for (const presences of Object.values(state)) {
        for (const entry of presences) {
          if (entry.voter === teammate) teammatePresent = true;
        }
      }
      setOnline(teammatePresent);
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ voter, at: Date.now() });
        }
      });

    const heartbeat = setInterval(() => {
      void channel.track({ voter, at: Date.now() });
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      void supabase.removeChannel(channel);
    };
  }, [supabase, voter]);

  return {
    teammateName: voter ? TEAMMATE[voter] : null,
    teammateOnline: online,
  };
}
