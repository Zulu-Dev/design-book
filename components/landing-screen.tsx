"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredVoter, type VoterName } from "@/lib/voter";

const VOTERS: VoterName[] = ["Ryan", "Jackson"];

export function LandingScreen() {
  const router = useRouter();
  const [stored, setStored] = useState<VoterName | null>(null);

  useEffect(() => {
    setStored(getStoredVoter());
  }, []);

  function continueAs(voter: VoterName) {
    localStorage.setItem("design-book-voter", voter);
    router.push("/swipe");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
          7EGN Studio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Design Book</h1>
        <p className="mt-3 text-zinc-400">
          Swipe through jersey mockups together. A like from either of you keeps
          the design.
        </p>

        <div className="mt-10 grid gap-3">
          {VOTERS.map((voter) => (
            <button
              key={voter}
              type="button"
              onClick={() => continueAs(voter)}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-lg font-medium transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              Continue as {voter}
            </button>
          ))}
        </div>

        {stored && (
          <button
            type="button"
            onClick={() => continueAs(stored)}
            className="mt-6 text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            Resume as {stored}
          </button>
        )}

        <LinkRow />
      </div>
    </main>
  );
}

function LinkRow() {
  return (
    <div className="mt-8 space-y-2 text-sm text-zinc-500">
      <p>
        <a href="/catalog" className="text-zinc-300 underline-offset-4 hover:underline">
          Browse catalog
        </a>
        {" · "}
        <a href="/library" className="text-zinc-300 underline-offset-4 hover:underline">
          View keepers
        </a>
      </p>
    </div>
  );
}
