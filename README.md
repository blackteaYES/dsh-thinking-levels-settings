# dsh-thinking-levels-settings

[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/)

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

### 方式 A：#master 直装（推荐，最简；需要 dsh CLI + pnpm）

```sh
dsh plugin --profile web add github:blackteaYES/dsh-thinking-levels-settings#master
```

`master` 分支由 CI（`.github/workflows/ci.yml`）自动维护为**预构建产物分支**——只含 `lib/`
与包元数据，不含源码、没有 `prepare` 脚本，安装即用：

- **无需本地构建**，pnpm ≥10 也**不再需要 `allowBuilds` 构建授权**
- 合并到 main 后自动更新；之后 `dsh plugin --profile web update` 即升级到最新构建
- 如遇 `ERR_PNPM_ADDING_TO_ROOT`，加 `-w`：
  `dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings#master`

> 想锁定确定版本、避免「最新即变」？用方式 B 的 Release tarball（不可变的版本锚点）。

### 方式 B：Release tarball 安装（稳定通道，版本可锁定；需要 dsh CLI + pnpm）

从 **[Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases)** 下载
`dsh-thinking-levels-settings-<version>.tgz`，或直接用直链一步安装：

```sh
dsh plugin --profile web add https://github.com/blackteaYES/dsh-thinking-levels-settings/releases/download/v2.1.0/dsh-thinking-levels-settings-2.1.0.tgz
```

- 自动加入 `dsh.profile.bundles`（reconcile 识别 `dsh.bundle`）
- **无需手动编辑任何文件，无需构建授权**
- 完成后重启 dsh，浏览器硬刷新（Ctrl+Shift+R）

tarball 由 CI 在打 `v*` tag 时自动构建并附加到 Release（`.github/workflows/release.yml`）。

### 方式 C：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-2.1.0.tgz -C /tmp/rel
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

### 从 ≤2.0 旧版升级：先清理被污染的 profile

**2.0 及更早版本把 `@deepseek-ai/*` 声明为普通 dependencies**，pnpm 安装时会往 profile 里物化
一套旧版本副本，遮蔽 dsh 本体提供的模块，导致 **所有对话报
`history unavailable for session "...": TypeError: Cannot read properties of undefined (reading 'parse')`**
等新旧版本混跑故障。升级到 2.1+ 前请先清理一次：

```sh
cd ~/.dsh/profiles/web
dsh plugin --profile web remove dsh-thinking-levels-settings   # 或 pnpm remove dsh-thinking-levels-settings
```

然后核对三处残留：

1. `~/.dsh/profiles/web/package.json`：`dependencies` 与 `dsh.profile.bundles` 数组里都不应再有
   `dsh-thinking-levels-settings`（`remove` 不会动 bundles 字段，需手工删）
2. `ls ~/.dsh/profiles/web/node_modules/@deepseek-ai` —— **应不存在或为空**。若还有真实目录
   （非符号链接），它们是旧插件拖入的副本，整棵删掉：
   `rm -rf ~/.dsh/profiles/web/node_modules/@deepseek-ai`
3. `ls ~/.dsh/profiles/web/node_modules | grep -E '^(zod|immer|zustand|fflate)$'`
   同为旧版拖入的残留则一并删除（宿主自己的依赖在上一级 `~/.dsh/profiles/node_modules`，
   是指向安装的符号链接，不受影响）

清理完成后重启 dsh web，再按方式 A / B 安装 2.1+。2.1 起宿主包改为 optional peerDependencies，
任何环境都不会再物化副本。

## 🧩 前提

- DSH（DeepSeek Harness）0.1.x 同架构版本及后续兼容版本（平台模块由宿主 module table 提供）
- profile 里配置了自定义 `llm-pi-ai` 提供方（否则页面提示「尚未加载」）
- 方式 A / 方式 B 需要本机有 **pnpm**（`dsh plugin` 是 pnpm 转发器）

## 🚀 开发

```sh
npm install        # 安装 tsdown / typescript / @deepseek-ai client 依赖（devDependencies）
npm run bundle     # 构建: tsdown 产出 lib/ + tsc 产出 lib/types
npm run watch      # 开发模式: 自动重建
```

> 开发者路径：想直接从源码安装到 profile（git 直装 `main`，pnpm 会在本机跑 `prepare` 构建），
> 需按 pnpm ≥10 提示在 `~/.dsh/profiles/web/pnpm-workspace.yaml` 配置 `allowBuilds` 授权。
> 官方依据：[从 GitHub 安装：构建脚本这道坎](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish#%E4%BB%8E-github-%E5%AE%89%E8%A3%85-%E6%9E%84%E5%BB%BA%E8%84%9A%E6%9C%AC%E8%BF%99%E9%81%93%E5%9D%8E)。
> 普通用户请使用方式 A / B 的预构建产物，无需任何授权。

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

推送 `v<version>` tag 即可，CI 自动构建并把 `.tgz` 附到 GitHub Release（`release.yml`）：

```sh
git tag v2.1.0 && git push origin v2.1.0
```

本地出包仍可用 `bash release.sh`。

## 🙌 致谢

- [@Dave-12138](https://github.com/Dave-12138) —— CI 自动构建发布方案与宿主包 peer 化（#1）

## 📄 License

MIT
