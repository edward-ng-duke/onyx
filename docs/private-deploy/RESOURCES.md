# 私有化部署资源清单（RESOURCES）

本文档面向准备在企业内网（fully air-gapped 或半隔离环境）部署 Onyx 的运维与技术负责人，作为容量规划与资源申请的参照。它只盘点「需要哪些资源」，不涉及具体安装步骤（详见 `SETUP.md`）。

阅读对象：负责申请基础设施额度、对接安全合规、规划网络出网策略的同学。

---

## 1. 架构总览

Onyx 整体可拆分为三层。所有跨层调用都走容器网络（service name DNS），对外只通过 `nginx` 暴露 web 端口；唯一允许主动出公网的容器是 `searxng`（Web 搜索代理）。

```
+--------------------------------------------------------------------+
|                       唯一出网层 (Egress)                            |
|                                                                    |
|   +------------+      （可选）  +-------------------------+         |
|   |  searxng   |  --外网-->    | google / bing / ddg ... |         |
|   |  :8080     |                +-------------------------+         |
|   +-----^------+                                                    |
|         | http  (json)                                              |
+---------|----------------------------------------------------------+
          |
          |    （前端流量入口）
          |
+---------|----------------------------------------------------------+
|         |                  无状态计算层 (Stateless)                  |
|         |                                                          |
|   +-----+--------+   +--------------+   +--------------------+     |
|   |  api_server  |   |  web_server  |   |     nginx          |     |
|   |  (FastAPI)   |<->|  (Next.js)   |<->|  反向代理 / TLS    |     |
|   +------+-------+   +--------------+   +--------------------+     |
|          |                                                         |
|          v                                                         |
|   +---------------+    +--------------+    +------------------+    |
|   | background    |    | inference_   |    | indexing_        |    |
|   | (celery x9    |    | model_server |    | model_server     |    |
|   | via supervisord)|  | (proxy 模式) |    | (proxy 模式)     |    |
|   +------+--------+    +------+-------+    +---------+--------+    |
|          |                    |                      |             |
|          |                    +----------+-----------+             |
|          |                               |                         |
|          |                               v                         |
|          |                   +-----------------------+             |
|          |                   |  内网 LiteLLM proxy   |             |
|          |                   |  (Chat / Embed /Vision)|            |
|          |                   +-----------------------+             |
|          |                                                         |
|   +------+--------+                                                |
|   | code-         |                                                |
|   | interpreter   |   (可禁用，Python 沙盒)                        |
|   +---------------+                                                |
+--------------------------------------------------------------------+
          |
+---------|----------------------------------------------------------+
|         v                  状态层 (Stateful)                        |
|                                                                    |
|   +-----------+   +--------+   +--------+   +-------+   +-------+  |
|   | postgres  |   | vespa  |   | minio  |   | redis |   | open  |  |
|   | (主关系库) |   | (向量+ |   | (S3 对 |   |（无持 |   | search|  |
|   |           |   | 混合)  |   | 象存储) |   | 久化）|   |（可选）|  |
|   +-----------+   +--------+   +--------+   +-------+   +-------+  |
+--------------------------------------------------------------------+
```

部署姿态简述：**整套 Onyx 不依赖 GPU**。所有 LLM / Embedding / Vision / Rerank 模型推理都通过内网的 OpenAI 兼容代理（LiteLLM 桥接）完成，本地 `inference_model_server` / `indexing_model_server` 容器仅作 proxy 协议适配，几乎不消耗算力。计算层（api / web / background / model_server / nginx / code-interpreter）全部为无状态容器，可水平扩容；只有状态层（Postgres / Vespa / MinIO / OpenSearch）需要持久卷与备份策略。出网仅 `searxng` 一个容器，便于在防火墙策略上做最小化白名单。

### 三层职责速查

- **状态层（Stateful）**：保存所有持久化数据，重启后必须保留。Postgres 存关系型元数据（用户、Chat、Persona、Connector 配置、索引任务记录、KG 实体边等）；Vespa 存向量与全文索引；MinIO 存原始文件二进制；OpenSearch 仅在显式启用日志/审计场景时才部署。
- **无状态计算层（Stateless）**：进程崩溃可直接重启，状态全部位于 Postgres / Vespa / Redis / MinIO。`background` 容器由 supervisord 同时拉起 7 个 celery worker + beat 调度器 + 看门狗，分工监听不同队列。`inference_model_server` 和 `indexing_model_server` 在私有部署中走 proxy 模式，是 LLM/embedding 调用的容器内入口。
- **唯一出网层（Sole Egress）**：默认仅 `searxng` 容器具备出公网能力，用作 Web 搜索代理。如果选择第三方 Web 搜索 SaaS（Serper / Brave / Google PSE / Exa）则 `api_server` 也需要加白名单出网；推荐优先 SearXNG 方案，把出网面收敛到一个容器。

### `background` 容器内的 celery worker

`background` 容器由 supervisord 同时拉起多个 celery worker 进程，每个 worker 监听不同的队列：

- **primary**：核心调度，处理 connector 删除、Vespa 同步、定时检查、LLM 模型更新等。
- **light**：轻量任务，如 Vespa metadata 同步、checkpoint 清理、index attempt 清理。
- **heavy**：重 IO/CPU 任务，如 connector pruning、权限同步、CSV 生成。
- **docfetching**：从外部数据源抓取文档；附带 watchdog 监控卡住的 connector。
- **docprocessing**：把抓取到的文档分块、调用 embedding、写入 Vespa；嵌入吞吐瓶颈在这里。
- **user_file_processing**：处理用户上传文件、用户级项目同步。
- **monitoring**：系统健康度采集（队列、内存、节拍）。
- **beat**：定时器；只触发任务，不执行实际工作。

> 注：`CLAUDE.md` 提及的 `kg_processing` 在 OSS 镜像的 `supervisord.conf` 中并不作为独立 worker 程序存在；KG 抽取和聚类任务由 `primary`（或在 EE 部署中由专门的 KG worker，私有化场景一般不启用）调度。

容量规划上，文档量大时优先扩 docprocessing 副本；agentic 检索 / Deep Research 流量大时优先扩 `api_server` 副本。

### 主要数据流

- **索引链路**：`docfetching` 拉文档 → 暂存到 MinIO（原始字节）+ Postgres（元数据） → `docprocessing` 拉块、调用 embedding（→ `indexing_model_server` → 远端 LiteLLM proxy） → 写入 Vespa。
- **检索链路**：用户在前端发问 → `web_server` → `api_server` → 检索（Vespa BM25 + 向量） → 可选 rerank → 调用 LLM（→ `inference_model_server` → 远端 LiteLLM proxy） → 流式回写前端。
- **Web 搜索链路**：`api_server` 命中 web search 工具 → 内网调 `searxng` → SearXNG 出公网到搜索引擎 → 返回结果回到 `api_server`。

---

## 2. API 依赖清单

下表罗列 Onyx 运行需要对接的「外部 API」。所有 LLM / Embedding 类调用建议统一指向企业内的 OpenAI 兼容代理（LiteLLM、One-API、企业 LLM gateway 等），从 Onyx 视角看就是同一个 `api_base` 加一个 bearer key。

> 「网络」列的语义：**内网 proxy** = 容器到容器之间的 HTTP 调用，不出公网；**出网** = 该容器需要连接公网或企业出口；**N/A** = Onyx 当前未使用，无需准备。

| API | 用途 | 必需性 | 调用方 | 网络 | 关键变量/配置点 |
| --- | --- | --- | --- | --- | --- |
| OpenAI 兼容 Chat Completions | 主 LLM 对话生成（含 Agent / Deep Research / 摘要） | 必需 | api_server / celery | 内网 proxy | admin UI → LLM Provider 配 `api_base`；`GEN_AI_API_KEY` 为 bearer token |
| OpenAI 兼容 Embeddings | 文档 / 查询向量化 | 必需 | api_server / celery (docprocessing) | 内网 proxy | admin UI → Search Settings → 选 LiteLLM provider |
| OpenAI 兼容 Vision Chat | 图像理解（PDF 内嵌图、截图等） | 可选 | celery (docprocessing) | 内网 proxy | 与主 LLM 同一 provider 即可，模型名指向支持 vision 的档位 |
| Cohere / LiteLLM Rerank | 检索结果重排 | 可选 | api_server | 内网 proxy 或彻底关闭 | admin UI → Search Settings → Rerank Provider |
| TTS / STT（语音） | 语音输入输出 | N/A | — | — | Onyx 当前版本未内置，无需准备 |
| Web 搜索 SaaS API（Serper / Brave / Google PSE / Exa） | 联网搜索（替代 SearXNG 的另一种方案） | 可选 | api_server | **出网** | `SERPER_API_KEY` / `BRAVE_API_KEY` / `EXA_API_KEY` 等 |
| SearXNG `/search?format=json` | 联网搜索（推荐方案，唯一出网容器） | 可选 | api_server | 内网（SearXNG 自身出网） | `SEARXNG_BASE_URL=http://searxng:8080/` |
| SMTP（邮件验证 / 邀请） | 用户注册验证、邀请邮件 | 可选 | api_server | 内网 | `SMTP_SERVER` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` 等 |

### 实施提示

- **LLM 模型档位**：主对话模型推荐选用 GPT-4o-mini / Claude Haiku / Qwen-Plus 同等级或更强；Agent / Deep Research 场景建议保留一个更强的「fast model」+「default model」组合（admin UI 可分别指定）。
- **Embedding 模型**：推荐 OpenAI `text-embedding-3-large` 同等级、维度在 1024–3072 之间的模型；维度需与 Vespa schema 协调，切换 embedding 模型需要重建索引。
- **OpenAI 兼容即可**：Onyx 通过 LiteLLM 桥接，任何只要支持 OpenAI 协议（`/v1/chat/completions`、`/v1/embeddings`）的代理都可用，无需 Onyx 侧改代码。
- **Vision 模型可降级**：如果企业代理暂不提供 vision 档位，直接跳过；docprocessing 中的图像处理会在缺少 vision 能力时退化为占位（不影响文本索引）。
- **Rerank 是可选项**：admin UI 中可一键关闭。如果暂时没有 rerank API，先关掉，搜索质量会略有下降但完全可用，后续随时启用。
- **Web 搜索二选一**：内网常见做法是部署 SearXNG 容器并把 `searxng` 作为「唯一出网容器」，让 `api_server` 通过 `SEARXNG_BASE_URL` 内网访问；如果不允许任何容器出网，可以彻底关闭联网搜索功能，仅保留企业内部知识库检索。
- **Bearer Key 收敛**：建议在企业 LLM 网关侧统一管理 key 与配额，Onyx 只持有一个 token；这样后续切换底层模型供应商不需要改 Onyx 配置。
- **代理可观测性**：Onyx 自身只记录调用是否成功与耗时；如果需要按租户/用户统计 token 用量、调用记录，应在 LiteLLM/网关层落审计日志。

### 已确认不需要的外部 API

为避免审批阶段误申请，下面这些「类似产品里常见、Onyx 当前不依赖」的 API 列在此明示：

- 无独立的图像生成 API（DALL·E / SD / Imagen 等）：Onyx 当前不内置图片生成入口。
- 无独立 OCR API：PDF / 图片中的文字依赖 vision LLM 或 PDF 解析库本地处理。
- 无独立向量数据库 SaaS 调用（Pinecone / Weaviate / Qdrant Cloud 等）：使用本地部署的 Vespa。
- 无外部监控 SaaS 强依赖（Datadog / Sentry 不是必需）：可选接入但默认关闭。

---

## 3. 基础设施依赖

下表给出每个容器的镜像版本（来自 `deployment/docker_compose/docker-compose.yml` 与 `docker-compose.private.override.yml`）以及最小推荐资源。「磁盘」列指容器需要的持久卷大小；无状态容器只需镜像本身的少量临时空间。

> 镜像 tag 中的 `<tag>` 表示与本仓库构建一致的 Onyx 版本号（默认 `latest`，可通过 `IMAGE_TAG` 环境变量固定到具体版本）。资源数值是「最小推荐」基线，对应小规模 demo 场景，生产规模下需按下文「资源伸缩建议」放大。

| 服务 | 镜像 | 状态 | CPU | 内存 | 磁盘 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| PostgreSQL | `postgres:15.2-alpine` | 有状态 | 2c | 4Gi | 50Gi | Onyx 主关系库（用户、Persona、Chat、Connector 元数据） |
| Vespa | `vespaengine/vespa:8.609.39` | 有状态 | 4c | 8Gi（limit 16Gi） | 30–100Gi | 向量 + 混合（BM25）搜索引擎 |
| MinIO | `minio/minio:RELEASE.2025-07-23T15-54-02Z-cpuv1` | 有状态 | 1c | 1Gi | 按文件量 | S3 对象存储；如选 PG 文件存储模式可不部署 |
| Redis | `redis:7.4-alpine` | 无（持久化已关闭） | 0.5c | 1Gi | — | Celery broker + 缓存；重启即清空 |
| OpenSearch | `opensearchproject/opensearch:3.4.0` | 有状态（可选） | 2c | 8Gi | 30Gi | `OPENSEARCH_FOR_ONYX_ENABLED=false` 时不部署 |
| api_server | `onyxdotapp/onyx-backend:<tag>` | 无状态 | 1c | 2Gi | — | FastAPI 主入口 |
| web_server | `onyxdotapp/onyx-web-server:<tag>` | 无状态 | 0.5c | 1Gi | — | Next.js 前端 |
| background（celery via supervisord） | `onyxdotapp/onyx-backend:<tag>` | 无状态 | 2c | 4Gi | — | 单容器内含 primary / light / heavy / docprocessing / docfetching / user_file_processing / monitoring 共 7 个 celery worker，外加 beat 调度器与 watchdog |
| inference_model_server（proxy 模式） | `onyxdotapp/onyx-model-server:<tag>` | 无状态 | 0.5c | 1Gi | — | 几乎闲置；走 LiteLLM provider 后可考虑 `DISABLE_MODEL_SERVER=true`，但保留更兼容 |
| indexing_model_server（proxy 模式） | `onyxdotapp/onyx-model-server:<tag>` | 无状态 | 0.5c | 1Gi | — | 同上，索引侧入口 |
| nginx | `nginx:1.25.5-alpine` | 无状态 | 0.2c | 256Mi | — | 反向代理；超时已为 deep-research 长流式响应调高 |
| code-interpreter | `onyxdotapp/code-interpreter:<tag>` | 无状态 | 0.5c | 1Gi | — | Python 沙盒；不需要时可禁用 |
| **searxng** | `searxng/searxng:latest` | 无状态 | 0.2c | 256Mi | — | **唯一出网容器**，Web 搜索代理 |

### 总计最小配置

约 **14–15 cores / ~30Gi RAM / ~110Gi 持久磁盘**（不含 OpenSearch；含则再 +2c / +8Gi RAM / +30Gi disk）。这是「冷启动可跑」的下限，可顺利完成 demo 与小规模索引（<10 万文档）。实际生产负载下需要根据文档量与并发情况上调：docprocessing worker 的 CPU/内存（嵌入吞吐瓶颈）、Vespa 内存（与索引文档数 + 维度强相关）、MinIO 磁盘（与原始文件总量一致）。Postgres 一般是最不吃资源的一项。

### 关于持久卷

- **Postgres**：50Gi 起步通常对应数十万会话量级；KG 启用、长期保留 chat 历史会显著增长。建议接管理员级备份（`pg_dump` 或托管 PG 的 PITR）。
- **Vespa**：磁盘按「文档数 × 平均块长 × 维度」线性增长；30Gi 适用于 10 万级文档，100Gi 起对应百万级。Vespa 进程对内存敏感，推荐至少 8Gi 起，超过 50 万文档建议 16Gi+。
- **MinIO**：与原始文件总大小一致即可（注意 PDF / 视频 / 图片体积）。如果选择 PG 文件存储模式，可不部署 MinIO，但 Postgres 体积会相应扩大，仅推荐小规模场景。
- **Redis**：持久化已关闭（仅作 broker + 缓存），不需要持久卷；重启即清空。
- **OpenSearch**：仅在 `OPENSEARCH_FOR_ONYX_ENABLED=true` 时才部署；私有部署默认建议关闭，避免增加运维负担。

### 资源伸缩建议

- **横向扩容点**：`api_server`、`web_server`、`background`（celery）、`inference_model_server`、`indexing_model_server`、`code-interpreter` 都可以多副本部署；负载点通常落在 `background`（索引高峰）和 `api_server`（聊天并发）。
- **首要瓶颈**：大规模索引时 docprocessing 的并发数和 embedding 调用 RPS 是决定吞吐的核心；可优先扩 `background` 副本数 + 上调 docprocessing concurrency 环境变量。
- **冷数据建议**：Vespa 与 MinIO 的卷应使用 SSD（搜索延迟敏感），而 Postgres / Redis 对盘的要求较低。
- **GPU 不需要**：本部署模式下所有模型推理都在远端代理完成，本地容器不需要 GPU 节点，极大简化集群规划。

### 镜像拉取与离线建议

- **公网镜像**：上表中的所有镜像默认来自 Docker Hub / 各官方仓库；离线环境需要预先把镜像 mirror 到企业内的 registry，并在 compose 文件里通过 `ONYX_BACKEND_IMAGE` / `ONYX_WEB_SERVER_IMAGE` / `ONYX_MODEL_SERVER_IMAGE` 等环境变量覆盖。
- **`latest` tag 风险**：MinIO / SearXNG / code-interpreter 在仓库默认配置中使用 `latest` 或滚动 tag。建议在企业 registry 内固定到一个具体 sha 后再分发，避免不同节点拉到不同版本。
- **Onyx 镜像版本一致性**：`api_server`、`background`、两个 `model_server` 必须共用同一个 `IMAGE_TAG`，否则可能因 schema/任务定义差异出现兼容问题。

### 容器对外暴露端口

私有部署下，进入集群的入口只有 nginx；其他容器互访都走 docker / k8s 服务发现。建议安全组只放行 nginx 暴露的 HTTP/HTTPS 端口，其他容器端口仅在容器网络内可达。

### 备份与恢复优先级

- **必须备份**：Postgres（连同业务数据全量恢复必须依赖）。
- **强烈建议备份**：MinIO（原始文件，丢失后只能从源 connector 重新拉取）。
- **可重建**：Vespa（丢失后可通过重新索引文档恢复，但耗时与 embedding 调用量成正比，对外部 API 用量产生明显冲击）。
- **不需要备份**：Redis（无持久化），SearXNG（无状态），所有计算层容器。

### 共置部署 vs. 拆分部署

最简部署可以把所有容器放在一台 16c / 32Gi / 200Gi SSD 的服务器上跑（compose 单机模式）。生产推荐至少把状态层（Postgres / Vespa / MinIO）拆出去到独立节点或托管服务，计算层（api / web / background）按副本数横向扩展。OpenSearch 与 SearXNG 体量小，可与计算层共置。

---

## 4. 功能模块清单

下表盘点 Onyx 主要可见功能在私有化场景下的「默认状态」。`✅ 启用`表示开箱即用且无外部依赖；`⚠️ 可选`表示功能存在但需要管理员显式打开或额外资源；`❌ 不启用`表示默认关闭，启用会带来出网或外部账号依赖；`🚫 不内置`表示当前 Onyx 版本未提供该能力，需自行集成。

| 模块 | 状态 | 说明 / 私有化建议 |
| --- | --- | --- |
| LLM Chat | ✅ 启用 | 走内网 OpenAI 兼容代理；通过 LiteLLM 桥接，任何兼容 endpoint（One-API、企业 LLM gateway、自建 LiteLLM proxy 等）均可直接对接。 |
| Embedding | ✅ 启用 | 通过 admin UI 选 LiteLLM provider 指向同一代理；不走本地 `model_server` 推理，仅做协议适配。 |
| Reranker | ⚠️ 可选 | 可走 Cohere / LiteLLM 兼容 rerank API，或在 admin UI 中关闭。关闭后搜索质量会略有下降，但不影响整体可用性。 |
| Vision（图像理解） | ⚠️ 可选 | 如果 enterprise proxy 支持 vision 模型则启用，否则索引图像时自动跳过（不影响纯文本索引链路）。 |
| 文本提取 / OCR | ⚠️ 部分支持 | PDF 走 `pypdf` 做文本层抽取（不做 OCR，扫描版 PDF 无法提取文本）。可选启用 `unstructured` 处理复杂文档，但 **`unstructured` 是 SaaS 调用**（需 `UNSTRUCTURED_API_KEY`，会让 `api_server` / `docprocessing` 出网，与「仅 SearXNG 出网」约束冲突），私有化场景默认关闭。如需 OCR 能力请自行集成 tesseract / paddleocr 等离线方案。 |
| TTS / STT | 🚫 不内置 | Onyx 当前版本未内置语音功能；如确需语音，需自行集成（不在私有化资源清单内）。 |
| Web 搜索 | ⚠️ 可选 | 推荐 SearXNG（容器内可控、唯一出网容器）；可叠加 Serper / Brave / Google PSE / Exa SaaS API（注意会让 `api_server` 也出网）。 |
| Web Connector（爬虫式索引） | ⚠️ 可选 | 谨慎启用；会出网爬指定 URL，与「仅 SearXNG 出网」的安全约束冲突；私有化场景一般禁用，仅在白名单内网站点使用。 |
| OAuth Connectors（GDrive / Slack / Confluence / Jira / Notion / GitHub 等） | ❌ 不启用 | 默认禁用；不配 OAuth client id / secret 即不工作，连接器在 admin UI 中也不会显示授权按钮。 |
| 本地文件 Connector | ✅ 启用 | 上传压缩包 / Markdown / PDF 等到 MinIO，由 `docprocessing` worker 索引，全程不出网。 |
| 本地 Wiki / 自建 Discourse / MediaWiki | ✅ 启用 | 走 connector 内部 HTTP 调用，不出公网；与企业内网知识库直连即可。 |
| Knowledge Graph | ⚠️ 可选 | 需要 Postgres `pg_trgm` 扩展；OSS 私有化场景建议默认关闭以避免额外资源（KG 抽取/聚类对 LLM 调用量贡献明显）。 |
| Slack Bot / Discord Bot | ❌ 不启用 | 默认不启用；启用后会出网到 Slack / Discord API，与「仅 SearXNG 出网」约束冲突。 |
| MCP Server | ⚠️ 可选 | 不影响出网（默认仅本地 MCP client 接入）；通过 `MCP_SERVER_ENABLED=true` 打开，可暴露 Onyx 检索能力给外部 MCP 客户端。 |
| 遥测 / PostHog / Sentry | ❌ 不启用 | 关闭；保持 `DISABLE_TELEMETRY=true`，`POSTHOG_API_KEY` 留空即可，避免任何使用数据外发。 |

### 状态约定与默认收敛

表格中的颜色/符号约定如下：`✅ 启用`= 上线即可用，无需任何外部 SaaS；`⚠️ 可选`= 默认关闭或半启用，需要管理员有意识地开启并评估出网/资源影响；`❌ 不启用`= 默认关闭、与私有化目标冲突、不建议在不放白名单的前提下开启；`🚫 不内置`= Onyx 当前版本压根没有该能力，列在此处只是为了在审批阶段澄清「不要按其他产品的 feature 列表来对照」。

需要强调的是：**默认状态已经针对私有化做了收敛，无需主动禁用即可达到最小出网面**。换言之，只要按 `docker-compose.private.override.yml` 的默认配置部署、不去 admin UI 主动配置 OAuth client / Slack bot token / 联网搜索 SaaS key，整套系统的出网面就只有 `searxng` 一个容器。表中所有 `❌`、`🚫` 行无需运维额外做事，只要「不去打开它」即可。

---

## 5. 网络隔离建议

### 5.1 目标

在主机层 / Kubernetes NetworkPolicy 层**强制**收敛出网面，仅放行 SearXNG（必要时再放行 `api_server`，前提是配置了 Serper / Brave / Google PSE / Exa 等 SaaS 搜索）。理由：应用层的「不配 token 即不出网」是软约束（依赖管理员不去 admin UI 启用相关功能），而硬隔离（防火墙 / NetworkPolicy）是最后一道闸门——即使后续误配置或遭到攻击篡改了 admin 设置，出方向也仍然被网络层兜住。

### 5.2 Docker 主机层（iptables / ufw 思路）

具体规则代码示例放在 `SETUP.md` 中，这里仅给思路（按部署顺序）：

1. **网段隔离**：给 `searxng` 容器分配独立的 docker network 或独立 IP（`compose` 中可加 `networks:` 段把 searxng 单独挂到一个 bridge），方便后续按 IP 做白名单。
2. **默认 deny outbound**：在主网卡（或 docker bridge 出口）上挂 `iptables -P FORWARD DROP` / `ufw default deny outgoing`，仅放行 docker bridge → public 的指定来源 IP（即 SearXNG 容器 IP）。
3. **SearXNG 出方向放行**：明确允许 SearXNG 容器出方向 80/443/53（HTTP/HTTPS + DNS）；搜索引擎域名通过 DNS 解析自然命中。
4. **审计日志**：其他容器尝试出公网应被防火墙日志记录（`-j LOG --log-prefix "[onyx-egress-block]"`），用作合规审计与事中告警。
5. **SaaS 搜索特例**：如果配置了 Serper / Brave / Google PSE / Exa 等 SaaS 搜索，单独放行 `api_server` → 对应 SaaS API 域名的 443 出方向（建议固定到具体域名而不是放全网）。

### 5.3 Kubernetes NetworkPolicy 思路

具体 YAML 放在 `SETUP.md`，这里仅列规则结构：

- **默认 deny**：在 Onyx 所在的 namespace 加一条 `default-deny-egress` NetworkPolicy，匹配所有 pod，`policyTypes: [Egress]`，`egress: []`。
- **SearXNG 放行**：给 `searxng` pod 加一条 `allow-egress-internet` NetworkPolicy（`to: [{ ipBlock: { cidr: 0.0.0.0/0 } }]`，或在企业有 egress namespace 时改为 `egress to namespaceSelector`）。
- **api_server 内网 LLM**：给 `api_server` pod 加一条 `allow-egress-internal-llm-proxy`，指向企业内部 LLM 代理 service / IP（CIDR 限定到企业内网段）；同时放行集群内 DNS、Postgres / Vespa / MinIO / Redis 等 service。
- **SaaS 搜索单独放行**：如启用 SaaS 搜索，给 `api_server` 单独加一条 NetworkPolicy 放行对应 SaaS 域名（建议用 egress gateway / Cilium FQDN policy 收敛域名白名单，而不是放全 0.0.0.0/0）。

### 5.4 验证清单

部署完成后，逐个容器跑一遍连通性测试，确认硬隔离生效。

在每个容器里执行 `docker exec <container> curl -m 5 https://www.google.com`（或 k8s 下的 `kubectl exec`）。预期只有 `searxng`（以及按需放行的 `api_server`）能成功，其余容器应当超时或被拒绝；详细命令与排错路径见 [SETUP.md](SETUP.md)。

---

更详细的部署上手步骤、admin UI 配置流程和故障排查见 [SETUP.md](SETUP.md)。
