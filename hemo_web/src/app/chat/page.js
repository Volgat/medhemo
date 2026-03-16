"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );
}
