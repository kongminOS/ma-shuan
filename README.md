# Ma-Shuan（马栓）· KeyBox

> Key-value vault for DeepSeek Harness agent credentials — **encrypted at rest, agent-cannot-read, usage ledger**.

马栓 = DeepSeek Harness（DSH）的**密钥保险箱 + 使用台账插件**。给客户存自选位置的密钥：key 值 AES-256-GCM 加密落盘，agent 物理读不到，带使用台账（谁/何时/哪个 key）、平台识别、到期提醒、更换指引。

> ⚠️ 品牌仓为 **Open Core** 结构：壳/打包层 MIT，治理运行层（密钥管理逻辑）BSL 1.1 —— 可看、可改、个人学习研究免费；面向第三方客户/商业环境的生产部署需授权。

## 分层表（Open Core）

| 目录/文件 | 许可 | 说明 |
|---|---|---|
| `LICENSE` | MIT | 仓库骨架、文档、示例 |
| `LICENSE-BSL-1.1` | BSL 1.1 | 治理运行层：密钥管理逻辑（`lib/` 插件代码） |
| `lib/client.js` | BSL 1.1 | 前端密钥箱面板（注入 sidebar slot，React 组件） |
| `lib/index.js` | BSL 1.1 | host 数据层（`/ma-shuan/*` 路由 + AES-256 加解密 + 台账） |
| `lib/platform.js` | BSL 1.1 | 平台前缀识别（API key 归属检测） |
| `package.json` | MIT | 包元数据 / cordis bundle 声明 |
| `cordis.patch.yml` | MIT | DSH 插件装配配置示例 |

## 核心特性

- **加密落盘**：key 值 AES-256-GCM（随机 iv + 完整性 tag），manifest 只存元数据 + 打码快照，**明文零落盘**
- **agent 不可读**：存储位由客户自选，agent（DSH）物理读不到 key 明文；完整值仅用户主动"查看"时解密
- **使用台账**：`last_used` / `granted_to` / ledger，记录每次揭示/使用，可追溯
- **平台识别**：自动识别 GitHub / Anthropic / OpenAI / Stripe / AWS / DeepSeek 等 key 前缀
- **到期提醒**：过期 / 即将到期一目了然
- **查找**：按名称 / 备注 / 平台实时过滤


## 国内镜像（Gitee）

- 国内镜像仓库：https://gitee.com/kongminos/ma-shuan （免代理，国内下载/克隆更快）
- GitHub 原仓：https://github.com/kongminOS/ma-shuan
## 快速开始

1. 把 `@kongmin/ma-shuan` 作为 DSH 插件装入 profile（cordis patch）
2. 配 `vaultRoot`（默认空 → 首次由客户引导自选存储位）+ `encryptionEnabled: true`
3. 打开 DSH 客户端，侧栏出现锁图标 → 点开密钥箱
4. 登记密钥 → 显示打码 + 平台标签 + 调用状态 → 用到时手动揭示

## 数据存储

```
<vaultRoot>/
├── keys.enc       # AES-256-GCM 加密的 key 值（无明文）
├── manifest.json  # 元数据（名称/平台/备注/到期/打码快照）
└── ledger.jsonl   # 台账（揭示/使用/拍板记录）
```

## License

- **MIT**：`LICENSE`（骨架/文档/配置）
- **Business Source License 1.1**：`LICENSE-BSL-1.1`（治理运行层，见文件参数 Additional Use Grant 与 Change Date）