"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Switch, useToast } from "./ui";

/** Pause / resume taking orders (customer holds and ONDC). */
export default function StoreOpenToggle({ initial }: { initial: boolean }) {
  const [open, setOpen] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { toast, node } = useToast();
  const router = useRouter();

  async function change(next: boolean) {
    setBusy(true);
    setOpen(next);
    try {
      await api("/api/vendor/store", { method: "PATCH", json: { isOpen: next } });
      toast(next ? "Store is open for orders" : "Store paused — new orders are blocked");
      router.refresh();
    } catch (e) {
      setOpen(!next);
      toast(e instanceof Error ? e.message : "Could not update", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Switch checked={open} disabled={busy} onChange={change} label={open ? "Open for orders" : "Paused"} />
      {node}
    </>
  );
}
