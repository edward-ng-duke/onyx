# Web i18n Wave F — Followups

## Run metadata

- Branch: `web-i18n-zh-en` (feature branch on main checkout)
- Isolation: branch (not worktree) — chosen because web/node_modules and backend .venv are heavy and reusable; current branch already has 7 i18n waves of work; creating a fresh worktree would force ~1 GB+ of dep reinstalls without any isolation benefit
- Plan: `/home/edward/.claude/plans/cryptic-marinating-eich.md`
- Baseline parity test: ✅ 4/4 pass (pre-T1)
- Pre-T1 setup commit: existing in-progress infra changes (NextIntlClientProvider scope, locale validation, ICU plural for inviteModalSuccess/updatedChannelsCount, jest setup, tsconfig) → committed as `chore(web/i18n): pre-Wave-F infrastructure tightening`

## Critical (environment, pre-existing — not introduced by Wave F)

- **ESLint 9.39.1 cannot load `.eslintrc.json`** — the legacy config extends `next/core-web-vitals` whose plugin graph hits "TypeError: Converting circular structure to JSON" on eslint 9, and `next lint` was removed in Next 16. Setting `ESLINT_USE_FLAT_CONFIG=false` does not help. Net effect: `formatjs/no-literal-string-in-jsx` (added in commit 8f9ddd5246) **never actually runs**.
  - Mitigation for Wave F verification: replace eslint check with a residual-string grep on each task's modified files plus `tsc --noEmit`. Parity test still authoritative.
  - Recommend a separate task: migrate `.eslintrc.json` → `eslint.config.js` flat config so the formatjs rule actually surfaces new violations going forward.

## Followups by task

### T1 — Onboarding sweep (commit 9da36d77e2)

- **medium / out-of-scope-but-justified:** `web/src/sections/onboarding/steps/FinalStep.tsx` was edited (3-line touchup) because it is the sole consumer of `FINAL_SETUP_CONFIG`, which was refactored from a static export into a `getFinalSetupConfig(t)` factory. Without this touch the build would fail. Minimum-impact change. No further action.
- **info:** `web/src/sections/onboarding/reducer.ts` reads `STEP_CONFIG[...].index` only; preserved on the kept constant, no edits required.
- **medium / pre-existing UX:** `sections.onboarding.name.stepTitle` is identical to `sections.onboarding.welcome.title` ("Let's take a moment to get you set up." / "让我们花点时间帮你完成设置。"). Faithfully preserved from the original `constants.ts`, where both step entries had the same title string verbatim (see `git show 3f9da9bcca:web/src/sections/onboarding/constants.ts`). Means the header title does not change as the user advances Welcome → Name. Likely a product/UX gap rather than an i18n issue. Suggest a separate UX task to write a distinct string for the Name step (e.g., en "Tell us your name" / zh "告诉我们你的名字"), then update both message files.
- **low / pre-existing AGENTS.md style:** `web/src/sections/onboarding/steps/LLMStep.tsx` defines `StackedProviderIcons` as an arrow-function component (lines 49-83). `web/AGENTS.md` mandates regular function declarations for React components. Pre-existing pattern in the file; T1 only added two `t(...)` calls inside it. Suggest a lint/style sweep separate from the i18n waves.

### T2 — LLM config: shared + Azure / Bedrock / Bifrost (commit e85f65ea51)

- **medium / scope-leak risk:** `web/src/sections/modals/llmConfig/shared.tsx` `APIKeyField` has English-fallback `subDescription` strings (`"Paste your API key from ${providerName} to access your models."` plus a no-providerName branch) used when the caller passes neither `subDescription` nor `providerName`. None of T2's modals hit this branch. To-be-checked-by T12 sweep: any modal in T3 / T4 that omits both props will surface English text. Translate at T12 if any caller is affected.
- ~~Bedrock auth-method `<InputSelect.Item>` children~~ — fixed in `98d41edede`.
- ~~APIKeyField fallback subDescription~~ — fixed in `98d41edede`.
- **low / shared.tsx residual:** `Group ${id}` / `Agent ${id}` identifier prefixes at shared.tsx:295/334 may surface in combobox labels. Out of T2 enumerated scope; revisit in T12.

### T2-fix — missed shared/Bedrock/Bifrost strings (commit 98d41edede)

- All four quality-review clusters resolved (APIKeyField fallback descriptions, Bedrock auth-method labels, Bifrost API key markdown description, ModalWrapperInner tooltips/header). Parity + tsc both green.

### T3 — LLM config: LiteLLM/LMStudio/Ollama/OpenAICompatible (commit af6165b79c)

- **low / consistency:** OllamaModal.tsx:107 keeps `"Ollama Cloud"` as a literal JSX text node (per the T3 brief's explicit "keep as product name" instruction). Quality reviewer suggested wrapping in `t("cloudTabLabel")` (with same value in both locales) for symmetry with how `"API Key"` is wrapped. Cosmetic; renders correctly in both locales. Optional T12 polish.

### T4 — remaining LLM modals (commit 67de52b4a6)

- **low / shared.tsx residual:** `web/src/sections/modals/llmConfig/shared.tsx` contains `suffix={optional ? "optional" : undefined}` — a raw English literal that escaped both T2 and T2-fix. T12 should pick up. Maps to a "(optional)" affix on field titles.
- **info:** CustomModal / AnthropicModal / OpenAIModal needed no changes — either already translated or only proper-noun props remain.

### T6 — MCP action modals (commit ec323edf23)

- **info:** MCPAuthenticationModal had a pre-existing unused `dirty` Formik destructure that surfaced as TS6133 only via IDE diagnostics (project's `tsc --noEmit` config doesn't enforce it). Folded a 1-line cleanup into T6's amended commit.
- **upstream copy bug:** `oauthDesc` source string says "Each user need to authenticate" (should be "needs"); `clientCredentialsRegisterInfo` says "you need register" (missing "to"). Translations preserve source verbatim — fix at the English source level in a separate copy-cleanup pass.

### T7 — OpenAPI action modals (commit e9044bf0d7)

- **low / pre-existing TS6133 (IDE-only):** OpenAPIAuthenticationModal.tsx has 3 unused-symbol warnings the IDE flags but the project's `tsc --noEmit` config does not (`React` default import, `entityName` prop, `isEditMode` local). All present in the pre-T7 file as well. Cleanup belongs to a separate code-hygiene pass, not the i18n wave.

### T8 — admin connector detail (commit 695187e06a)

- **low / consistency:** several keys in `admin.connectorDetail.fileManagement` (`edit`, `cancel`, `saving`) and `admin.connectorDetail.header.delete` could have reused `common.actions.{edit,cancel,saving,delete}`. Functional + parity-clean as-is; T12 polish if desired.
- **low / convention drift:** `filesCountSingular`/`filesCountPlural` (and similar pairs) in `admin.connectorDetail.fileManagement` use string-pair keys instead of ICU plural. Other Wave F sites (e.g., `sections.onboarding.llm.modelsConnected`) use ICU. Not a bug — Chinese has no plural morphology so both branches collapse to the same string in zh.json. Optional cleanup.

### T9 — admin billing (commit 6dc3492f02)

- **low / pre-existing TS6133 (IDE-only):** `BillingDetailsView.tsx:545` defines `PaymentSection` whose only call site at line 725 is JSX-commented-out. Pre-T9 file already had this state. Hygiene cleanup belongs to a separate pass.
- **info:** `licenseActiveUntil` previously had inline `<Text color="text04">` styling around the date; T9 collapsed the text into a single ICU-templated string for translation, so date-segment styling is lost. Functionally equivalent.

### T10 — admin embeddings (commit 90b631d4e3)

- **low / pre-existing IDE diagnostics:** `EmbeddingFormPage.tsx` has 6 pre-existing IDE-only warnings (TS6385 deprecations on `WarningCircle`/`Warning` from `@phosphor-icons/react`; TS6133 on `isLoadingCurrentModel`, `isLoadingSearchSettings`, `changedResource`). All present in the pre-T10 file. AGENTS.md prescribes using only icons from `web/src/icons/`, so the phosphor-icons deprecation should be migrated separately. Project's `tsc --noEmit` config does not enforce these.

### T11 — SCIM / Slack channels / Memories (commit bcd6165c29)

- **low / pre-existing TS6133 (IDE-only):** SlackChannelConfigFormFields.tsx:58-59 (`slack_bot_id`, `formikProps` destructured but unused) and Memories.tsx:7 (`SvgFilter`, `SvgMenu` imported but unused). All present in pre-T11 files. Hygiene cleanup belongs to a separate pass.
- **info:** `admin/scim/page.tsx` was opened but not modified — its `title="SCIM"` is a standalone proper-noun acronym; remaining strings already wired.

### T12 — Final sweep + verification

- **deferred / large surface:** `web/src/app/admin/embeddings/pages/AdvancedEmbeddingFormPage.tsx` still contains many hardcoded English strings (`label="Multipass Indexing"`, `label="Contextual RAG"`, `label="Contextual RAG LLM"`, `label="Embedding Precision"`, `label="Reduced Dimension"`, plus `subtext=...`, Yup error messages, and inline JSX cost-info text). The file uses the legacy `@/components/Field` API (`BooleanFormField`, `SelectorFormField`, `Label`, `SubLabel`) which lives in the deprecated `web/src/components/` directory — translating in-place would significantly entangle this work with the eventual migration to refresh-components/Opal. Recommend a dedicated follow-up task that translates and migrates simultaneously, rather than translating now and re-translating after migration.
- **fixed in T12:**
  - `web/src/sections/modals/llmConfig/shared.tsx` — `suffix={optional ? "optional" : undefined}` → `t("optionalSuffix")` at both APIKeyField:108 and APIBaseField:135 (key `modals.llmConfig.shared.optionalSuffix`, en `"optional"` / zh `"可选"`).
  - `web/src/sections/modals/PreviewModal/variants/shared.tsx` — Download / Copy content / Zoom Out / Zoom In tooltips wired through `modals.preview.{download,copyContent,zoomOut,zoomIn}`.
  - `web/src/app/admin/connector/[ccPairId]/DeletionErrorStatus.tsx` — "Deletion Error" header + tooltip body wired through `admin.connectorDetail.deletionError.{title,description}`.
  - `web/src/app/admin/connector/[ccPairId]/ConfigDisplay.tsx` — true/false rendering, "Show less", "Show all (X items)", "Pruning Frequency", "Refresh Frequency", "Indexing Start", and the `${X} hour(s)/minute(s)/day(s)` formatters wired through `admin.connectorDetail.configDisplay.*` (with ICU plurals); Edit tooltip uses `common.actions.edit`.
  - `web/src/app/admin/embeddings/modals/AlreadyPickedModal.tsx` — title (with markdown italics on the model name) + description + Close button wired through `admin.embeddings.alreadyPickedModal.*` and `common.actions.close`.
- **info:** `OllamaModal.tsx:107 "Ollama Cloud"` literal kept verbatim per T3 spec / followup. Cosmetic-only.

## Manual playwright checklist (T12 deferred)

This is a manual verification pass — Wave F changes touched a large number of UI surfaces and only a human walking through both locales can confirm copy quality and absence of overflow. Suggested walkthrough:

- Log in at `http://localhost:3000` with `a@example.com` / `a`.
- Switch language to 中文 via the LanguageSelect component (sidebar / settings menu).
- **Onboarding** (if reachable; otherwise reset onboarding state from a fresh tenant): walk Welcome → Name → LLM provider step → Final step. Confirm step titles, descriptions, button labels, and the "Models Connected" pluralized count render in zh.
- **LLM admin page** (`/admin/configuration/llm`): open the "Set up" / "Edit" modal for each provider — OpenAI, Anthropic, Azure, Bedrock, Bifrost, Ollama (incl. its tabs — `Ollama Cloud` is intentionally English), LiteLLM, LMStudio, OpenAI-Compatible, Custom. Verify titles, field labels, sub-descriptions, optional `(可选)` suffix on optional API keys, models list, access dropdown, footer buttons.
- **Agent share / view modals** — open from any agent: ShareAgentModal and AgentViewerModal title/description/button labels.
- **MCP / OpenAPI action add+auth modals** — admin → Actions → Add MCP server / Add OpenAPI action; walk through the auth method flows.
- **Connector detail page** (`/admin/indexing/status` → click any connector): reIndex / pause / resume / delete buttons + tooltips, errors-modal, attempts table column headers + tooltips, stage-metrics modal, file-management table (incl. plural `filesCount` / `filesAdded` / `filesRemoved`), config display (boolean True/False, "Show all (X items)", "Pruning Frequency"/"Refresh Frequency"/"Indexing Start" labels, plural hour/minute/day values). If a deletion has actually failed, verify the red `DeletionErrorStatus` header + tooltip body in zh.
- **Billing** (`/admin/billing` — only with cloud-tier license): subscription status card, license-active-until line, payment section (if present), invoice / cancel flows.
- **Embeddings** (`/admin/embeddings`): step labels (Select / Reranking / Advanced), `AlreadyPickedModal` (click an already-selected provider), API-key-config modal, advanced search config — note `AdvancedEmbeddingFormPage` is logged as deferred and will still surface English.
- **SCIM** (`/admin/scim`): page title is `SCIM` (proper noun, intentionally English); user/group sections.
- **Slack channel config** (`/admin/bots/[bot-id]/channels`): personas dropdown, document set dropdown, response settings, restricted-users-only switch.
- **Settings → Memories**: empty state, list rendering, add/edit/delete flows.
- **Generic**: confirm no untranslated English remains beyond declared exemptions (proper nouns: Onyx, MCP, SCIM, OAuth, JSON, URL, "Ollama Cloud" tab; e.g. examples; raw API identifiers; etc.).


---

# Wave G — CN Display Cleanup Run (2026-05-02)

## Run metadata

- Branch: `i18n/cn-display-cleanup` (feature branch on main checkout)
- Isolation: branch (not worktree) — same rationale as Wave F (heavy node_modules + .venv, frontend-only work)
- Plan: `/home/edward/.claude/plans/review-review-proud-toucan.md`
- Baseline parity test: ⚠ FAILED before run — pre-existing condition (see below); fixed before T0
- Pre-T0 setup commit: `chore(web/i18n): bump parity test top-level count to 14`

## Pre-existing baseline issue (resolved)

- Parity test hardcoded `toHaveLength(13)` but commit `3f9da9bcca chore(web/i18n): pre-Wave-F infrastructure tightening` introduced a 14th top-level namespace `agent` (singular, alongside existing `agents`). Other 3 parity assertions still passed — so this was purely the literal count being out of date.
  - Fix taken: bumped `13 → 14` in `web/src/i18n/messages.parity.test.ts` so baseline is green.
  - **Open question for reviewer:** is `agent.knowledgePane` intentionally separated from `agents.*`? If not, recommend a follow-up wave to merge them.

## Critical

(none yet)

## Per-task followups

(filled in as tasks run)

## Manual steps deferred

(filled in by T4.2 — anything that needs human eyes / browser)
