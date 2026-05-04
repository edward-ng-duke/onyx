"use client";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const { vaultId } = useParams<{ vaultId: string }>();
  return <div className="p-4">Chat tab for vault {vaultId}</div>;
}
