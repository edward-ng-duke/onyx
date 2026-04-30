# Onyx 私有化部署 · 上手指南

本指南面向只熟悉 Docker、不了解 Onyx 的运维。从一份干净的代码 checkout 到一套跑起来的栈，预期 ~5 分钟主动操作（首次镜像拉取另算）。开始前请先阅读 [`RESOURCES.md`](RESOURCES.md)，了解架构、API 依赖、容量基线与网络隔离思路；本文件只讲怎么动手。

---

## §1 前置要求

| 项目 | 最小要求 | 备注 |
| --- | --- | --- |
| Docker Engine + Compose plugin (v2) | 24.0+ | 用 `docker compose version` 验证；不能是老的 `docker-compose` (v1) |
| 内存（host 整机） | 16 GiB+ | 状态层加无状态层最小基线，详见 RESOURCES.md §3 |
| 磁盘 | 150 GiB+ 可用 | 持久卷（Postgres / Vespa / MinIO）+ 镜像 |
| GPU | 不需要 | 本地不跑 embedding / LLM 推理 |
| 内网 LLM 代理 | 必需 | OpenAI 兼容，支持 chat + embeddings（LiteLLM / One-API / 企业 gateway 均可） |
| 出网带宽 | 仅 SearXNG 容器需要 | 私有化部署唯一出网通道；其他容器全部不出公网 |

部署姿态说明：Onyx 默认不依赖 GPU；本地 `inference_model_server` / `indexing_model_server` 仅做协议适配，不跑模型；所有 LLM / Embedding 调用都通过内网 OpenAI 兼容代理完成。GPU 节点、模型权重盘、显存额度都不需要在容量申请里出现。

---

## §2 三步启动

```bash
# 1. 一次性初始化（生成 .env 并填随机密钥）
make init

# 2. 编辑 deployment/docker_compose/.env，至少填以下三项：
#    - POSTGRES_PASSWORD           （替换 <REQUIRED>）
#    - GEN_AI_API_KEY              （取消注释并填 bearer token）
#    - 如使用 SaaS 搜索，填 SERPER_API_KEY / BRAVE_API_KEY / GOOGLE_PSE_API_KEY / EXA_API_KEY 之一
$EDITOR deployment/docker_compose/.env

# 3. 拉起整套栈
make up
make logs   # 跟踪首次启动；首次拉镜像约 5–15 分钟
```

`make init` 会把 `deployment/docker_compose/.env.private.example` 复制为 `.env`，并用 `openssl rand -hex 32` 自动填上 `USER_AUTH_SECRET` 与 `ENCRYPTION_KEY_SECRET`。该命令幂等，已填值不会被覆盖。`make up` 会带上 `docker-compose.yml` + `docker-compose.private.override.yml` 两层 compose 文件以及 `.env`，等价于 `docker compose -f docker-compose.yml -f docker-compose.private.override.yml --env-file .env up -d`。

---

## §3 首次登录与管理员配置

### 3.1 浏览器访问

- 打开 `http://<host>`（nginx 默认 80 端口）。
- 创建第一个管理员账号；这是首个注册的账号，自动获得 admin 角色。
- 后续用户走 `AUTH_TYPE=basic` 注册即可；如需限制邮箱后缀，在 `.env` 取消注释 `VALID_EMAIL_DOMAINS`。

### 3.2 LLM Provider 配置

- 进入 admin UI → Configuration → LLM Provider → Add Provider。
- Provider 类型选 **OpenAI**（或 **LiteLLM**，视代理协议而定；OpenAI 兼容协议二者皆可）。
- **API Base** 填内网代理 URL，例如 `http://llm-gateway.corp:8080/v1`。
- **API Key** 填 bearer token，与 `.env` 中的 `GEN_AI_API_KEY` 保持一致。
- **模型清单**：建议至少配置一个 `default model` + 一个 `fast model`；agentic / Deep Research 流量大时 fast model 选择更快档位（如 GPT-4o-mini / Haiku 同等级）。
- 保存后点 "Test" 验证连通性。

### 3.3 Embedding 配置

- admin UI → Search Settings。
- Provider 选 **LiteLLM**（兼容任何 OpenAI 风格的 `/v1/embeddings`）。
- API Base / API Key 与 LLM Provider 同一组（共用内网代理）。
- 模型档位推荐 `text-embedding-3-large` 同等级，维度在 1024–3072 之间。
- 注意：切换 embedding 模型需要重建 Vespa 索引（admin UI 提供 swap 流程）。

### 3.4 Web 搜索 Provider 配置

- admin UI → Connectors → Web Search Provider。
- 默认推荐 **SearXNG**：base URL 填 `http://searxng:8080/`（容器内 service-name DNS）。
- 也可选 **Serper / Brave / Google PSE / Exa** 并填入对应 API key——注意这种方式会让 `api_server` 直接出网到 SaaS 域名，需要在防火墙层单独白名单。
- 私有化场景默认推荐 SearXNG 方案，把出网面收敛到一个容器。

---

## §4 网络强化检查清单

应用层「不配 token 即不出网」是软约束；网络层 deny-by-default + SearXNG 白名单才是硬约束。部署完成后逐容器跑一遍下面的 curl 探测，确认硬隔离已生效。

```bash
# 应该成功（searxng 是唯一出网容器）：
docker compose -f deployment/docker_compose/docker-compose.yml \
  -f deployment/docker_compose/docker-compose.private.override.yml \
  exec searxng curl -m 5 -o /dev/null -w "%{http_code}\n" https://duckduckgo.com

# 应该超时 / 拒绝（私有化场景下其他容器都不该出网）：
for svc in api_server background web_server cache relational_db; do
  echo "==> testing $svc"
  docker compose -f deployment/docker_compose/docker-compose.yml \
    -f deployment/docker_compose/docker-compose.private.override.yml \
    exec "$svc" curl -m 5 -o /dev/null -w "%{http_code}\n" https://www.google.com 2>&1 | tail -1
done
```

判读方式：

- **DNS 解析成功 ≠ 能出网**。如果你看到 `curl: (28) Operation timed out`（connect timeout）或 `curl: (7) Failed to connect ... Connection refused`，说明 TCP 出方向被防火墙拦住了，符合预期；如果直接拿到一个 200 / 301 / 403 等 HTTP 状态码，说明该容器能成功出网，**未达到硬隔离**。
- **如果 searxng 之外的容器都能出网**，说明宿主机或 K8s 防火墙规则尚未生效。参考 [`RESOURCES.md` §5.2](RESOURCES.md#52-docker-主机层-iptables--ufw-思路)（Docker 主机 iptables / ufw）或 [`RESOURCES.md` §5.3](RESOURCES.md#53-kubernetes-networkpolicy-思路)（K8s NetworkPolicy），落地 deny-by-default + searxng 白名单。
- **如果配置了 SaaS 搜索（Serper / Brave / Google PSE / Exa）**，那么 `api_server` 也必须可达对应 SaaS 域名。建议用 egress gateway（或 Cilium FQDN policy）做域名级白名单，而不是直接给 `api_server` 放 `0.0.0.0/0` 出网。

---

## §5 常用运维

| 操作 | 命令 |
| --- | --- |
| 查看全栈日志 | `make logs` |
| 查看 api_server 日志 | `make logs-api` |
| 查看 celery（background）日志 | `make logs-celery` |
| 查看 web_server 日志 | `make logs-web` |
| 查看 SearXNG 日志 | `make logs-search` |
| 列出当前服务状态 | `make ps` |
| 重启全栈 | `make restart` |
| 重启 celery | `make restart-celery` |
| 进入 api_server 容器 | `make shell-api` |
| 进入 psql shell | `make shell-db` |
| 跑 alembic 迁移 | `make migrate` |
| 停止（保留容器与卷） | `make stop` |
| 停止并移除容器（保留卷） | `make down` |
| 销毁（含卷，需输入 yes） | `make clean-all` |

补充说明：

- **celery 没有 hot reload**（参见 `CLAUDE.md`）。改了 background 任务代码或 `.env` 中的 celery 相关变量，必须 `make restart-celery` 才会生效。
- **Postgres 备份**：`docker exec onyx-relational_db-1 pg_dump -U postgres > backup.sql`（容器名以 `make ps` 实际输出为准）。
- **Vespa 备份**：使用 [`vespa-export`](https://docs.vespa.ai/en/operations/admin-procedures.html) 做集群级 dump；私有化场景下 Vespa 也可在低峰停机后直接打包持久卷。
- **MinIO 备份**：`mc mirror minio/onyx-file-store-bucket /backup/minio/`，需要先 `mc alias set minio http://<host>:9000 minioadmin minioadmin`。
- **首次启动迁移**：第一次 `make up` 时 alembic 会自动跑；如卡住可手动 `make migrate` 触发一次。
- **本地开发模式**：如果要在本地以 hot-reload 方式跑 api_server / web_server，仅启动依赖服务用 `make dev-deps`（带起 db / cache / index / minio / searxng），然后参考 `make dev-api` / `make dev-celery` / `make dev-web` 的提示。

---

## §6 故障排查

- **Vespa 启动 OOM**：表现为 `index` 容器反复重启；调高 `vespaengine/vespa` 容器的内存 limit 至 16Gi（在 `docker-compose.yml` 或自定义 override 中加 `mem_limit: 16g`）。RESOURCES.md §3 列出了不同文档量级对应的内存推荐。
- **OpenSearch 启动慢 / OOM**：私有化部署默认建议禁用，确保 `.env` 里 `OPENSEARCH_FOR_ONYX_ENABLED=false`。Onyx 主搜索路径靠 Vespa，OpenSearch 只在显式启用日志/审计场景时才需要。
- **LLM 代理超时（504 / chunked stream 中断）**：检查 nginx 超时（`.env` 中 `NGINX_PROXY_CONNECT_TIMEOUT` / `NGINX_PROXY_SEND_TIMEOUT` / `NGINX_PROXY_READ_TIMEOUT`）；deep-research 类长流式调用建议 ≥ 600s。
- **SearXNG 启动反复重启 / 拒绝请求**：进入 `deployment/docker_compose/searxng/settings.yml`，确认 `secret_key` 已替换占位符，且 `limiter: false` 仍打开（私有部署下没有 Redis-backed limiter）；用 `make logs-search` 看 uwsgi 报错。
- **首次启动卡在 alembic migrate**：手动跑 `make migrate`；查看 `make logs-api` 中是否有 schema 冲突或 PG 连不上。
- **Embedding 维度不匹配**：换 embedding 模型后报错 dimension mismatch；这是预期——admin UI → Search Settings 提供 embedding model swap 流程，会重建 Vespa schema 并重新索引。
- **`api_server` 出网请求被防火墙拦了**：如果你启用了 SaaS 搜索（Serper / Brave / 等），需要在防火墙白名单里放行 `api_server` → SaaS 域名；只放 SearXNG 是不够的。

---

## §7 下一步

- 容量规划与镜像清单：参见 [`RESOURCES.md`](RESOURCES.md) §3（基础设施依赖、备份优先级、共置/拆分建议）。
- 网络隔离落地：参见 [`RESOURCES.md`](RESOURCES.md) §5（Docker 主机层与 K8s NetworkPolicy 思路）。
- 业务接入：进入 admin UI → Connectors 配置本地文件 / 内网 wiki / 内网 Confluence 等 connector；进入 Personas 配置定制化 prompt 与可见数据范围；进入 Document Sets 做检索范围切分。
