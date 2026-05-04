"use client";
import { useParams } from "next/navigation";

export default function DocsPage() {
  const { vaultId } = useParams<{ vaultId: string }>();
  return <div className="p-4">Docs tab for vault {vaultId}</div>;
}
