"use client";
import { useParams } from "next/navigation";

export default function KgPage() {
  const { vaultId } = useParams<{ vaultId: string }>();
  return <div className="p-4">KG tab for vault {vaultId}</div>;
}
