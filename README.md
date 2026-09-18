# dsh-thinking-levels-settings

[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/)

给 DSH Web 的 **设置 → 思考级别** 新增一页：为自定义 `llm-pi-ai` 提供商的每个模型配置
**thinking levels（推理档位）** —— `off / minimal / low / medium / high / xhigh / max`，
通过官方 Settings wire 持久化到 `~/.dsh/settings.yaml`（`llm-pi-ai.providers.*.models[*].reasoningEfforts`）。

官方 client-plugin 形态（DeepSeek Harness 插件系统的自定义插件）。

## ✨ 功能

- **按模型配置**：为每个模型单独设置推理档位。档位词表从 DSH settings schema 发现
  （`off / minimal / low / medium / high / xhigh / max`，DSH 未来新增档位会自动跟随），
  发现失败时回退内置七个
- **三种推理模式**（对应 `reasoningEfforts` 的三种合法形态，非法组合无法写出）：
  - `继承目录` —— 省略该字段，沿用内置目录对该模型的能力声明
  - `非推理` —— 写入 `reasoningEfforts: false`，模型菜单不提供任何档位
  - `启用档位` —— 逐档声明协议值；除 `Off` 外至少需要一个档位（DSH 硬校验）
- **输入能力**：勾选 `text` / `image`。两个都不勾 = 省略该字段，沿用目录；
  这是对端点的断言而非检查，端点不接受的输入由提供方拒绝
- **预设档位**：DeepSeek / OpenAI / Grok 三套协议的预置映射（按当前可用档位取子集）
- **双层折叠**：提供方分组 + 模型行两级折叠，折叠行仍显示档位摘要与 `文/图` 徽章；
  折叠状态记入 localStorage
- **搜索与筛选**：按模型名/ID/提供方搜索；快捷筛选片 `全部 / 支持图片`，其余筛选
  （`已配置 / 未配置 / 非推理 / 未保存`）与 JSON 导出导入一起收进「更多 ▾」菜单，
  选中后按钮上直接显示筛选名；筛选只展开命中分组，**不会自动铺开模型卡片**
- **保存与预览**：工具栏一个「保存全部」按钮写入当前所有未保存改动；内部按提供方分组，
  每个提供方恰好一次整段数组写（`set path:["providers",<id>,"models"]`），所以不会半成功；
  展开区实时预览「模型菜单将提供哪些档位」；写入带 `expectedRevision`，冲突时提示重读而非覆盖
- **导出 / 导入 JSON**：导出当前草稿（含未保存改动）为 JSON，导入只填草稿供确认，
  导入永远不会直接写 `settings.yaml`
- **国际化**：接入 DSH 自带 locale 服务（`zh` / `en`），跟随设置里的语言偏好；
  locale 服务缺席时回退内置中文文案，页面不会显示裸 key
- **持久化**：写入 `~/.dsh/settings.yaml`，重启后保留
- **组件化**：作为 `settings.section` 槽位贡献注册，挂在设置页「思考级别」分节

### 写入策略（为什么是整段替换）

设置项的路径操作**不支持数组下标**：`applyPathOp` 会把数组当作非对象，于是
`path: ["providers", id, "models", "0", "input"]` 会把整个 `models` **列表降级成
`{"0": {...}}`**，等于摧毁数据。因此本插件每次保存都是：克隆整个 `models` 数组 →
只改自己负责的条目 → 用**一个** `set` 操作写回整段数组，并带上 `expectedRevision`。
DSH 在落盘前先校验，revision 不匹配则拒绝而非覆盖。

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
dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings#master
```

**`-w` 要不要加，取决于你的 pnpm 版本**——但加上永远没错，所以统一带上：

| 你的 pnpm | 不加 `-w` | 加 `-w` |
| --- | --- | --- |
| < 10.5.0（如 8.x / 9.x / 10.4.x） | ✗ `ERR_PNPM_ADDING_TO_ROOT` | ✓ 正常安装 |
| ≥ 10.5.0（如 10.5+/11/12） | ✓ 正常安装 | ✓ 正常安装（无害） |

原因是 pnpm 在 10.5.0 放宽了这条检查。dsh 初始化 profile 时会写入
`pnpm-workspace.yaml`（内容是 `packages: [- .]`，只有一条 pattern，且 profile 目录自己就是
workspace 根），旧版 pnpm 只要检测到"往 workspace 根加依赖"就拦截：

```js
// pnpm 10.4.1
if (!opts.recursive && opts.workspaceDir === opts.dir && !opts.ignoreWorkspaceRootCheck && !opts.workspaceRoot) {
// pnpm 10.5.0 起多了一个条件
if (… && opts.workspacePackagePatterns && opts.workspacePackagePatterns.length > 1) {
```

新条件要求 workspace 里有**多于一条** pattern 才拦截。dsh 写的正好只有一条，所以新 pnpm 不再
报错。**加 `-w` 在两种版本上都是 rc=0**，因此文档统一带 `-w`，你不必先查版本。

注意别把 `-w` 写成 `--workspace`：`-w` / `--workspace-root` 才是"在 workspace 根上执行"，
`--workspace` 的含义是"仅当依赖已存在于 workspace 时才添加"。位置也要对：`add -w <包>`。

`master` 分支由 CI（`.github/workflows/ci.yml`）自动维护为**预构建产物分支**——只含 `lib/`
与包元数据，不含源码、没有 `prepare` 脚本，安装即用：

- **无需本地构建**，pnpm ≥10 也**不再需要 `allowBuilds` 构建授权**
- 合并到 main 后自动更新；之后 `dsh plugin --profile web update` 即升级到最新构建
  （它会重新 `git ls-remote` 查询 `master`，不需要 `-w`）
- 安装过程需要联网访问 GitHub（可选走代理：`HTTPS_PROXY=… dsh plugin …`）

> `github:` 简写与显式 `git+https://github.com/….git` 地址是等价的（pnpm 会归一到同一形态），
> 用哪个都行。注意两者在 HTTPS 不可达时都会回退尝试 SSH（`git@github.com:`），所以网络受限的
> 环境请把代理配好。

> 想锁定确定版本、避免「最新即变」？用方式 B 的 Release tarball（不可变的版本锚点）。

### 方式 B：Release tarball 安装（稳定通道，版本可锁定；需要 dsh CLI + pnpm）

从 **[Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases)** 下载
`dsh-thinking-levels-settings-<version>.tgz`，或直接用直链一步安装：

```sh
dsh plugin --profile web add -w https://github.com/blackteaYES/dsh-thinking-levels-settings/releases/download/v3.0.0/dsh-thinking-levels-settings-3.0.0.tgz
```

- **`-w` 同样统一带上**（旧 pnpm < 10.5.0 必需，新版无害；理由见方式 A）
- 自动加入 `dsh.profile.bundles`（reconcile 识别 `dsh.bundle`）
- **无需手动编辑任何文件，无需构建授权**
- 完成后重启 dsh，浏览器硬刷新（Ctrl+Shift+R）

tarball 由 CI 在打 `v*` tag 时自动构建并附加到 Release（`.github/workflows/release.yml`）。

### 方式 C：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-3.0.0.tgz -C /tmp/rel
cd /tmp/rel/package
bash install.sh            # 默认 profile: web；DSH_PROFILE=xxx 可指定
```

脚本自动检测：有 `dsh`+`pnpm` 走官方路径（`dsh plugin add -w`，`-w` 统一带上），否则手工路径（复制包目录 +
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
   `dsh-thinking-levels-settings`。`dsh plugin remove` 会自动同步 `dsh.profile.bundles`；
   只有你改用 `pnpm remove` 绕过 dsh 时才需手工删那一行（reconcile 不会跑）
2. `ls ~/.dsh/profiles/web/node_modules/@deepseek-ai` —— **应不存在或为空**。若还有真实目录
   （非符号链接），它们是旧插件拖入的副本，整棵删掉：
   `rm -rf ~/.dsh/profiles/web/node_modules/@deepseek-ai`
3. `ls ~/.dsh/profiles/web/node_modules | grep -E '^(zod|immer|zustand|fflate)$'`
   同为旧版拖入的残留则一并删除（宿主自己的依赖在上一级 `~/.dsh/profiles/node_modules`，
   是指向安装的符号链接，不受影响）

清理完成后重启 dsh web，再按方式 A / B 安装 2.2+。2.1 起宿主包改为 optional peerDependencies，2.2 起
不再声明任何 @deepseek-ai 包（dev/peer 全无），任何环境都不会再物化副本。

## 🧩 前提

- DSH（DeepSeek Harness）Web 任意近版本（见下「版本兼容」）
- profile 里配置了自定义 `llm-pi-ai` 提供方（否则页面提示「没有找到可编辑的提供方」）
- 方式 A / 方式 B 需要本机有 **pnpm**（`dsh plugin` 是 pnpm 转发器）

## 🧭 版本兼容（不写死平台契约）

本插件曾在 rc.6 → rc.2 升级中失效，原因是三处写死的平台契约：`dsh.client.inject`
里的包名、`ctx.connection.api` 服务键、`{result:{ok}}` 响应信封。当前版本改为：

- **settings 通道运行时探测**：按 `remote.settings → api.settings → connection.api.settings`
  与 `describe/getSettings → mutate/mutateSettings` 的候选名逐个探测，能返回带命名空间列表的
  文档才算命中；信封支持 `{ok,value|error}` / `{result:{…}}` / `{success,data}` / 裸文档。
- **调用形状回退**：先按现行 `mutate(ns, ops, rev)` 位置参数，失败且属装配错误时回退旧版
  `mutate({ns, ops, expectedRevision})`；业务失败（冲突/校验）绝不换形重试，避免双写。
- **档位词表从 settings schema 发现**：读取 `reasoningEfforts` 键联合节点；发现失败时回退内置
  `off/minimal/low/medium/high/xhigh/max`。DSH 以后加档位无需升级本插件。
- **写入语义白名单**：只调用以 ops 为第二参数的 `mutate`；`update/replace` 的第二参数是整段
  section，语义不同，绝不作为候选（防脏写）。
- `dsh.client.inject` 只作为**到达顺序提示**（loader 对未知名静默跳过，服务本身靠 ctx.get 探测）。
- 硬依赖只剩 `slots`（官方插件也这么用，且 fiber 停在 pending 时 boot 有明确报错）。

升级 DSH 后通常**无需重装本插件**；若页面显示错误面板，括号里会标出实际命中的 settings 通道，
便于对照此处候选表补充。

## 🚀 开发

```sh
npm install        # 安装 tsdown / typescript / react 类型（无平台运行时依赖）
npm run bundle     # 构建: tsdown 产出 lib/ + tsc 产出 lib/types
npm run watch      # 开发模式: 自动重建
```

> 开发者路径：想直接从源码安装到 profile（git 直装 `main`，pnpm 会在本机跑 `prepare` 构建），
> 需按 pnpm ≥10 提示在 `~/.dsh/profiles/web/pnpm-workspace.yaml` 配置 `allowBuilds` 授权。
> 官方依据：[从 GitHub 安装：构建脚本这道坎](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish#%E4%BB%8E-github-%E5%AE%89%E8%A3%85-%E6%9E%84%E5%BB%BA%E8%84%9A%E6%9C%AC%E8%BF%99%E9%81%93%E5%9D%8E)。
> 普通用户请使用方式 A / B 的预构建产物，无需任何授权。

结构：

```
src/index.ts                # node 半入口（空 apply，纯 UI 页）
src/client/index.ts         # 浏览器半: 槽注册、页面外壳、搜索/筛选、保存、i18n 接入 + CSS
#                             (含页脚版本号：构建时由 tsdown 注入 package.json 的 version)
src/client/levels.ts        # 纯逻辑: 档位词表、投影、校验、摘要、预设、JSON 导入导出
src/client/locale.ts        # {zh, en} 字典 + 无 locale 服务时的回退 translator
src/client/model-form.ts    # 模型展开区：三种推理模式 + 七个档位 + 输入能力 + 预览
src/client/icons.ts         # 内联 SVG 图标（16px 线性，与平台同款；不 import 平台图标包）
src/client/provider-group.ts# 提供方分组与双层折叠渲染
src/client/menu.ts          # 「更多 ▾」溢出菜单：低频筛选 + 导出/导入（Esc/点外关闭、单选态）
src/client/settings-wire.ts # 版本容错 settings 通道（未改动，纯逻辑，可独立测试）
src/invariant.ts            # invariant companion（包所有权注册）
tsdown.config.ts            # 官方 tsdown.client.ts 形态（clientBundle + node twin）
lib/                        # 构建产物（npm run bundle 生成）
cordis.patch.yml            # 一行 patch 模板（dsh.bundle 引用它）
release.sh                  # 一键产出 npm pack 形态发布包 .tgz
install.sh                  # 一键安装脚本（双路径）
```

### 验证构建产物

仓库不含测试套件，`lib/` 是构建产物（已 gitignore），所以校验分两层：

```sh
npm run bundle               # tsdown 打包 + tsc 声明生成，两者都必须零错误
node --check lib/client.js   # 产物语法有效，可被 loader 装载
```

运行时按 `INSTALL.md` / `INSTALL.html` 里那几条 `curl` 检查：启动图里有插件行、`client.js`
能下载、页脚版本号与 `package.json` 一致。

> 改完源码必须重跑 `npm run bundle`，再**重启 dsh + 硬刷新浏览器（Ctrl+Shift+R）**：
> `dsh-client-modules` 在启动时读取 `lib/client.js`，不重启不生效。

## 📤 发布新版本

推送 `v<version>` tag 即可，CI 自动构建并把 `.tgz` 附到 GitHub Release（`release.yml`）：

```sh
git tag v3.0.0 && git push origin v3.0.0
```

本地出包仍可用 `bash release.sh`。

## 🙌 致谢

- [@Dave-12138](https://github.com/Dave-12138) —— CI 自动构建发布方案与宿主包 peer 化（#1）

## 📄 License

MIT
