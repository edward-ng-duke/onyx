"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface VaultChatComposerProps {
  onSend: (q: string, opts: { mode: string; vlmEnhanced: boolean }) => void;
  onCancel: () => void;
  isStreaming: boolean;
}

export function VaultChatComposer({ onSend, onCancel, isStreaming }: VaultChatComposerProps) {
  const t = useTranslations("vault.chat");
  const [text, setText] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [vlm, setVlm] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 p-3 border-t"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || isStreaming) return;
        onSend(text.trim(), { mode, vlmEnhanced: vlm });
        setText("");
      }}
    >
      <textarea
        className="w-full border rounded px-2 py-1 resize-none"
        rows={2}
        placeholder={t("composerPlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isStreaming}
      />
      <div className="flex items-center gap-2 text-xs">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="hybrid">{t("modeHybrid")}</option>
          <option value="local">{t("modeLocal")}</option>
          <option value="global">{t("modeGlobal")}</option>
          <option value="naive">{t("modeNaive")}</option>
          <option value="mix">{t("modeMix")}</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={vlm} onChange={(e) => setVlm(e.target.checked)} />
          {t("vlmEnhanced")}
        </label>
        <div className="ml-auto flex gap-2">
          {isStreaming ? (
            <button type="button" onClick={onCancel}
                    className="px-3 py-1 rounded bg-muted">{t("stop")}</button>
          ) : (
            <button type="submit" disabled={!text.trim()}
                    className="px-3 py-1 rounded bg-primary text-primary-foreground">
              ↑
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
