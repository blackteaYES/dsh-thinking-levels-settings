# dsh-thinking-levels-settings

给 DSH Web 的 **设置 → 思考级别** 新增一页：为自定义 `llm-pi-ai` 提供商的每个模型配置
**thinking levels（推理档位）** —— `off / minimal / low / medium / high / xhigh / max`，
通过官方 Settings wire 持久化到 `~/.dsh/settings.yaml`（`llm-pi-ai.providers.*.models[*].reasoningEfforts`）。

官方 client-plugin 形态（DeepSeek Harness 插件系统的自定义插件）。

## ✨ 功能

- **按模型配置**：为每个模型单独设置推理档位（7 档 + 关闭）
- **预设档位**：DeepSeek / OpenAI / Grok 三套协议的预置映射
- **表格编辑**：勾选启用、输入框改值、撤销/保存即时生效（带冲突检测）
- **持久化**：写入 `~/.dsh/settings.yaml`，重启后保留
- **组件化**：作为 `settings.section` 槽位贡献注册，挂在设置页「思考级别」分节

## 📦 安装

### 先安装 pnpm（方式 A / B 的前置要求）

先检查是否已有 pnpm：

```sh
pnpm --version
```

没有 pnpm 时，优先使用 Node.js 自带的 Corepack：

```sh
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

如果系统没有 `corepack`，可通过 npm 安装：

```sh
npm install --global pnpm
pnpm --version
```

确认 `dsh` 能在同一环境的 `PATH` 中找到 pnpm：

```sh
command -v pnpm
```

> WSL 用户必须在 **WSL 发行版内部**执行上述命令；只在 Windows 主机安装 pnpm，不保证 WSL 中的
> `dsh plugin` 能找到它。若无权限全局安装，使用 Corepack，或直接选择方式 C。

### 方式 A：git 直装（官方 publish 文档的 git 托管安装，最简；需要 dsh CLI + pnpm）

```sh
dsh plugin --profile web add github:blackteaYES/dsh-thinking-levels-settings
```

**前提：本机需要 `dsh` CLI 和 `pnpm`**（`dsh plugin` 是 pnpm 转发器；安装时 pnpm 负责克隆仓库、
运行构建）。安装流程：pnpm 自动克隆仓库 → 运行 `prepare` 脚本（`npm run bundle` 自包含构建，
产出 `lib/`）→ reconcile 识别 `dsh.bundle` → 自动加入 `dsh.profile.bundles`。
**无需下载 tarball；pnpm ≥10 首次安装需要完成下面的一次性构建授权。** 没有 pnpm 请看方式 C。

> ⚠️ **pnpm 兼容性与构建授权**
>
> 官方依据：[从 GitHub 安装：构建脚本这道坎](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish#%E4%BB%8E-github-%E5%AE%89%E8%A3%85-%E6%9E%84%E5%BB%BA%E8%84%9A%E6%9C%AC%E8%BF%99%E9%81%93%E5%9D%8E)
>
> - **pnpm 8/9 + dsh rc.6**：如遇 `ERR_PNPM_ADDING_TO_ROOT`（workspace-root 保护），加 `-w`：
>   `dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings`
> - **pnpm ≥10**：第一次 `add` 出现 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 是官方预期的安全拦截，
>   不是插件或代理故障。pnpm 已下载源码，但在用户授权前不会运行 git 依赖的 `prepare`。
> - 将错误中 `allowBuilds:` 下方打印的**完整包键原样复制**到
>   `~/.dsh/profiles/web/pnpm-workspace.yaml`。pnpm v11 的键通常包含包名、codeload URL 和 commit，
>   不能擅自缩写成包名；如果文件已有 `allowBuilds`，合并条目，不要创建第二个同名 YAML 键：
>
>   ```yaml
>   allowBuilds:
>     "<粘贴 pnpm 错误中打印的完整包键>": true
>   ```
>
> - 然后锁定并重试错误中同一个 commit：
>   `dsh plugin --profile web add "github:blackteaYES/dsh-thinking-levels-settings#<sha>"`。
> - 这项授权允许插件源码在 agent 沙箱之外于本机执行。只对可信源码授权并锁定 commit；
>   不想授权时使用方式 B 的预构建 tarball，它不需要 git `prepare` 构建权限。

### 方式 B：tarball 安装（官方 tarball 交付，需要 dsh CLI + pnpm）

从 **[Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases)** 下载
`dsh-thinking-levels-settings-<version>.tgz`，然后：

```sh
dsh plugin --profile web add ./dsh-thinking-levels-settings-2.0.0.tgz
```

- 自动加入 `dsh.profile.bundles`（reconcile 识别 `dsh.bundle`）
- **无需手动编辑任何文件**
- 完成后重启 dsh，浏览器硬刷新（Ctrl+Shift+R）

### 方式 C：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-2.0.0.tgz -C /tmp/rel
cd /tmp/rel/package
bash install.sh            # 默认 profile: web；DSH_PROFILE=xxx 可指定
```

脚本自动检测：有 `dsh`+`pnpm` 走官方路径（dsh plugin add，失败自动 `-w` 重试），否则手工路径（复制包目录 +
`package.json` 注入 `file:` 依赖 + `cordis.patch.yml` 追加挂载行）。幂等，可重复运行。

### 方式 D：手工（与官方 client 插件同构）

```sh
# 1) 包目录 -> ~/.dsh/profiles/web/packages/dsh-thinking-levels-settings/
# 2) profile package.json 添加依赖:
#    "dsh-thinking-levels-settings": "file:./packages/dsh-thinking-levels-settings"
# 3) cordis.patch.yml 追加:
#    - insert:
#        - id: ui-thinking-levels-settings
#          name: dsh-thinking-levels-settings
# 4) cd ~/.dsh/profiles/web && npm install --package-lock=false --ignore-scripts
# 5) 重启 dsh web，硬刷新浏览器
```

> 完整安装/导出/验证/卸载教程见 [INSTALL.html](INSTALL.html)（图文）与 [INSTALL.md](INSTALL.md)（文字版）。

## 🧩 前提

- DSH（DeepSeek Harness）rc.6 及同架构版本
- profile 里配置了自定义 `llm-pi-ai` 提供方（否则页面提示「尚未加载」）
- 方式 A / 方式 B 需要本机有 **pnpm**（`dsh plugin` 是 pnpm 转发器）

## 🚀 开发

```sh
npm install        # 安装 tsdown / typescript / @deepseek-ai client 依赖
npm run bundle     # 构建: tsdown 产出 lib/ + tsc 产出 lib/types
npm run watch      # 开发模式: 自动重建
```

结构：

```
src/index.ts        # node 半入口（空 apply，纯 UI 页）
src/client/index.ts # 浏览器半: settings.section 槽注册 + 设置页组件 + CSS
src/invariant.ts    # invariant companion（包所有权注册）
tsdown.config.ts    # 官方 tsdown.client.ts 形态（clientBundle + node twin）
lib/                # 构建产物（npm run bundle 生成）
cordis.patch.yml   # 一行 patch 模板（dsh.bundle 引用它）
release.sh          # 一键产出 npm pack 形态发布包 .tgz
install.sh          # 一键安装脚本（双路径）
```

## 📤 发布新版本

```sh
bash release.sh     # 产出 dsh-thinking-levels-settings-<version>.tgz
```

然后把 `.tgz` 作为 GitHub Release 资产上传（tag 建议 `v<version>`）。

## 📄 License

MIT