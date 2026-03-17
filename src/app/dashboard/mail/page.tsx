"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const MailPage = dynamic(
  () => import("../../../components/features/mail/MailPage").then((m) => m.MailPage),
  { loading: () => <div className="flex h-full items-center justify-center">Loading mail...</div> }
);

export default function MailPageRoute() {
  return (
    <div className="flex-1 overflow-hidden">
      <Suspense fallback={<div>Loading mail...</div>}>
        <MailPage />
      </Suspense>
    </div>
  );
}