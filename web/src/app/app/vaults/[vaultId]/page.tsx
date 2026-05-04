import type { Route } from "next";
import { redirect } from "next/navigation";

export interface PageProps {
  params: Promise<{ vaultId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { vaultId } = await params;
  redirect(`/app/vaults/${vaultId}/chat` as Route);
}
