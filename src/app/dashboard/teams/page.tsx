"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const TeamsPage = dynamic(
  () => import("../../../components/features/teams/TeamsPage").then((m) => m.TeamsPage),
  { loading: () => <div className="flex h-full items-center justify-center">Loading Teams...</div> }
);

export default function TeamsPageRoute() {
  return (
    <div className="flex-1 overflow-hidden">
      <Suspense fallback={<div>Loading Teams...</div>}>
        <TeamsPage />
      </Suspense>
    </div>
  );
}
