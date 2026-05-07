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

### T1.1 — Delete chat confirmation modal
- **STATUS: NO-OP** — File `web/src/layouts/app-layouts.tsx` lines 290–302 already fully use `t()` calls (likely from a prior wave). The aria-label at line 335 is out of T1.1 scope per plan, deferred to T3.2.
- No commit produced for this task.

### T1.3 — Credentials modals
- Implementer dispatched, returned with claim that unused `tValidation` was removed; in fact it was still present. Caught by IDE diagnostic. Fixed in-place via amend (one-line removal). Final commit `6d00501ee0`.
- Validation strings (lines 235/239/244 in manifest) DID NOT EXIST in current file — manifest was stale. Keys were still added to JSON because parity-test would otherwise reject; reserved for future use by error-handling refactor.
- **Pre-existing (NOT introduced by this run):** `ModifyCredential.tsx:88:46 'ind' is declared but its value is never read`. Pre-dates this wave; suggest a separate lint cleanup.

### T1.4 — Federated connector window.confirm
- Clean implementation, commit `68734269e7`. One key added (`modals.deleteFederatedConnector.body`).
- **Pre-existing (not introduced):** `FederatedConnectorForm.tsx:415:40 'FormEvent' is deprecated`. Pre-dates this wave.

### T2.1 — HooksPage main (combined with T3.3 HooksPage portion)
- Commit `d4836575bf`. 32 new keys.
- **Deviation noted:** Implementer left a few tooltips/aria-labels on the inactive-card branch (`tooltip="Manage"`, `aria-label="Configure hook"`, possibly `aria-label="Delete hook"`). These were not in the manifest entries explicitly. To be picked up by T3.2 (aria/title sweep) or a final residual scan in T4.1.

### T2.2 — HookFormModal (combined with T3.3 portion)
- Commit `4204718af1`. 39 new keys.
- **Deviation A:** Implementer used `modals.hookForm` (not `modals.hooks` which collided with T2.1's disconnect/delete sub-object). Acceptable — different sub-objects under `modals`. Component uses `useTranslations("modals.hookForm")`.
- **Deviation B:** New top-level namespace `errors` was created (count 14→15). Parity test bumped accordingly. Foreseen — plan calls for `errors.somethingWentWrong`.
- **Deviation C:** `messages.parity.test.ts` was outside whitelist but had to be edited to keep baseline green. Acceptable.

### T2.4 — Popover placeholders + tile aria
- Commit `36955d9c04`. 14 new keys.
- **Deviation:** `FileTile.tsx` added `"use client"` directive (required for `useTranslations` hook).
- **Pre-existing (not introduced):** `ModelListContent.tsx:112:11 'disabled' unused` — pre-dates wave (verified by diff). `OptionsList.tsx:49:3 'allowCreate' unused` — same. Suggest separate dead-code cleanup pass.

### T2.5 — Misc placeholders & titles
- Commit `e679486306`. 11 new keys.
- **Deviation:** Used `admin.groupsList.noGroupsFound` (not `admin.groups`) because `admin.groups` already exists with admin-route metadata.
- **Pre-existing (not introduced):** `IsPublicGroupSelector.tsx:2:8 'React' unused`. Pre-dates wave.

### T3.1 — User-visible Error messages
- Commit `f4d6d8bbab`. 3 new user-visible keys.
- Implementer's caller-trace classification: 6 of 7 `throw new Error` entries deemed **internal** (caller swallows or doesn't surface `err.message`); only the JSX table cell at CSVContent.tsx:153 was user-visible. Internal throws kept English with `// internal:` comments.
- **Pre-existing (not introduced):** `UserProvider.tsx:7:3 'useMemo' unused` (already present in import list before this wave).

### T3.2 — aria-label / title sweep
- Commit `3672293782`. 12 new keys.
- Implementer skipped `ActionsPopover/index.tsx` (manageActions already done by T2.4) and noted 1 stray match in `ChatPanel.tsx` outside whitelist (deferred to a later sweep).
- **Pre-existing (not introduced):**
  - `InputFile.tsx:52:10 'selectedFileName' unused`
  - `AppPage.tsx:34:36 'UserRole' unused`
  - `AppPage.tsx:541:9 'toggleDocumentSidebar' unused`
  - `app-layouts.tsx:49:1 'Interactive' unused`

### T3.3 — Catch-all (FederatedConnectorForm + UserRoleDropdown + DeactivateUserButton + ChatPanel stray)
- Commit `984d37af4c`. 17 new keys. Also fixed T3.2-leftover `aria-label="Scroll to bottom"` in ChatPanel.tsx.
- **Discovered inconsistency:** T1.2's summary claimed it added `modals.changeCuratorRole.title`, but actual location was `components.changeCuratorRole.title`. T3.3 surfaced this and made everything consistent under `components.changeCuratorRole.*`. (Possible reviewer follow-up: rename to `modals.*` for stylistic alignment, or leave as-is since `components.*` is also a valid namespace per glossary.)
- **Pre-existing (not introduced):**
  - `FederatedConnectorForm.tsx:419:40 'FormEvent' deprecated` (already noted in T1.4 follow-up — line shift due to translation work)
  - `ChatPanel.tsx:253 'files' / 'demoDataEnabled' unused`

### T4.1 — Automated verification
- ✅ Parity test 4/4 pass
- ✅ `npx tsc --noEmit` clean (no NEW errors introduced — pre-existing unused-var warnings on 4 files documented above are not blocking)
- ✅ 13 task commits + 1 baseline commit on branch `i18n/cn-display-cleanup`
- ✅ 41 files changed, +840 / −238 lines
- All hardcoded English strings on the manifest have been moved to next-intl keys; both `en.json` and `zh.json` updated identically; ICU variables consistent.

## Manual steps deferred (T4.2 — needs human eyes / live browser)

These are **non-automatable** verifications that need a person to walk through the UI and visually confirm Chinese rendering. To run:

1. Start dev server (already running per project context).
2. Open `http://localhost:3000` and log in (`a@example.com` / `a`).
3. Switch language to 中文 via LanguageSelect (sidebar / settings menu).
4. Walk through these flows and confirm **all toast messages, modal titles+bodies, button labels, placeholders, empty states, and aria-labels are in Chinese**:

**High-frequency / user-facing**
- [ ] Chat sidebar → right-click a chat → Delete confirmation modal renders 中文 (T1.1)
- [ ] Admin → Users → click Invite/Uninvite/Delete on rows → confirm modals + toasts in 中文 (T1.2)
- [ ] Admin → Users → switch role on a Curator → warning modal in 中文 (T3.3 / changeCuratorRole)
- [ ] Admin → Users → Deactivate / Activate → toast in 中文 (T3.3 / DeactivateUserButton)
- [ ] Admin → Users → click "Edit" on a row → "编辑用户的用户组与角色" modal title (T2.5)
- [ ] Settings → leave team → toast in 中文
- [ ] Federated connector setup → click delete → confirm modal in 中文 (T1.4)
- [ ] Federated connector form → all section headings, button labels, validation errors in 中文 (T3.3)
- [ ] NoAgentModal trigger flow → modal in 中文 (T1.5)
- [ ] EE Search UI → time filter dropdown options + empty state in 中文 (T1.6)

**Admin pages**
- [ ] Admin → Hooks → page description, search placeholder, all toasts (validate/delete/disconnect/reconnect) in 中文 (T2.1)
- [ ] Admin → Hooks → click "Set Up Hook Extension" → form modal labels/placeholders in 中文 (T2.2)
- [ ] Admin → Hooks → status popover (Connection Lost / Most Recent Errors) + logs modal in 中文 (T2.3)
- [ ] Admin → Performance → analytics chart title/description/placeholders in 中文 (T2.5)
- [ ] Admin → Groups → empty state in 中文 (T2.5)

**Generic**
- [ ] Model list popover → search placeholder + empty in 中文 (T2.4)
- [ ] Actions popover → search placeholder, "Manage Actions" tooltip in 中文 (T2.4)
- [ ] Combo box → "No options found" in 中文 (T2.4)
- [ ] Hover any image attachment → "移除图片" aria/tooltip (T3.2)
- [ ] Announcement banner (if visible) → "关闭" dismiss button (T3.2)
- [ ] Hover file attachment → "附加文件" / "展开文档" / "下载" / "查看完整内容" tooltips (T3.2)
- [ ] Theme settings → notice toggles → 中文 aria-labels (T3.2)
- [ ] Trigger CSV upload error → table cell shows "CSV 加载错误" + "暂无数据" (T3.1)

**Regression to English**
- [ ] Switch back to English → all the above flows still render correct English copy (regression test)

After completing these, mark the task done in this followups file.
