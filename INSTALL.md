# dsh-thinking-levels-settings — 官方形态 client 插件

> **完整图文教程见本目录的 [`INSTALL.html`](INSTALL.html)（安装、导出、验证、卸载、常见问题）。**
> 以下为文字版速查。

## 这是什么

给 DSH Web 的 **设置 -> 思考级别** 新增一页，为自定义 `llm-pi-ai` 提供商的每个模型配置
`reasoningEfforts`（off/minimal/low/medium/high/xhigh/max），通过官方 Settings wire
持久化到 `~/.dsh/settings.yaml`。

图标为内联 16px 线性 SVG（与平台图标同款画法），均 aria-hidden 且始终伴随文字，不使用 emoji。
页脚显示当前插件版本（构建时从 package.json 注入，可确认安装是否生效）。
页面支持：逐模型三种推理模式（继承目录 / 非推理 / 启用档位，非法形态在 UI 层即被拦下）、
`text`/`image` 输入能力勾选、协议预设、双层折叠（提供方 + 模型行）、搜索 + 快捷筛选片
（`全部`/`支持图片`）与「更多 ▾」菜单（低级筛选 + JSON 导出导入）、
按提供方批量「一次数组写」保存（带 revision 冲突检测）、实时预览、JSON 导出/导入（导入只填草稿），
以及接入 DSH 自带 locale 服务的 `zh`/`en` 双语。

纯客户端插件：node 半（`lib/index.js`）`apply` 为空；浏览器半（`lib/client.js`）以官方
`window.__ModuleLoader__.load` 闭包工厂注册 `settings.section` 槽位贡献。安装不需要改
`dsh.profile.bundles`，也不需要 `dsh.bundle` —— 以一行 patch 挂载，与官方 `dsh plugin add` 语义一致。

## 包结构

```
package.json        # dsh.client 清单、exports(./client、./invariant、./src/*)、files
src/index.ts                # node 半：host loader entry（空 apply，纯 UI 页）
src/client/index.ts         # 浏览器半：槽注册 + 页面外壳 + 搜索筛选 + 保存 + CSS
src/client/levels.ts        # 纯逻辑：档位词表、投影、校验、摘要、预设、JSON 导入导出
src/client/locale.ts        # {zh, en} 字典 + locale 服务缺席时的回退 translator
src/client/model-form.ts    # 模型展开区：三种推理模式 + 档位 + 输入能力 + 预览
src/client/provider-group.ts# 提供方分组与双层折叠渲染
src/client/menu.ts          # 「更多 ▾」溢出菜单（低频筛选 + 导出/导入）
src/client/settings-wire.ts # 版本容错 settings 通道（纯逻辑，可独立测试）
src/invariant.ts            # 配套 invariant companion（注册包所有权）
tsdown.config.ts    # 官方 tsdown.client.ts 形态（clientBundle + node twin）
lib/index.js        # 构建产物：node 半（apply=空）
lib/client.js       # 构建产物：window.__ModuleLoader__.load({id, factory}) 闭包工厂
lib/invariant.js    # 构建产物：invariant companion
lib/types/**/*.d.ts # tsc 生成的类型声明
INSTALL.md          # 本文件（文字版）
INSTALL.html        # 完整图文教程
cordis.patch.yml   # 一行 patch：把本插件挂进 profile 的 cordis.patch.yml
```

## 在新 DSH 中安装

### 先安装 pnpm（方式 A / B 的前置要求）

先检查：

```sh
pnpm --version
```

没有 pnpm 时，优先使用 Node.js 自带的 Corepack：

```sh
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

如果系统没有 `corepack`，通过 npm 安装：

```sh
npm install --global pnpm
pnpm --version
```

最后确认 `dsh` 所在的同一环境能从 `PATH` 找到 pnpm：

```sh
command -v pnpm
```

> WSL 用户必须在 WSL 发行版内部执行这些命令；只在 Windows 主机安装 pnpm，不保证 WSL 中的
> `dsh plugin` 能找到它。无权限全局安装时优先使用 Corepack，或选择方式 C。

### 方式 A：#master 直装（推荐，最简；需要 dsh CLI + pnpm）

**前提：本机需要 `dsh` CLI 和 `pnpm`**（`dsh plugin` 是 pnpm 转发器）。没有 pnpm 请看方式 C。

```sh
dsh plugin --profile web add github:blackteaYES/dsh-thinking-levels-settings#master
```

`master` 分支由 CI 自动维护为**预构建产物分支**（只含 `lib/` 与包元数据，无源码、没有
`prepare` 脚本），安装即用，reconcile 自动加入 `dsh.profile.bundles`：

- **无需本地构建**，pnpm ≥10 也**不再需要 `allowBuilds` 构建授权**
- 合并到 main 后自动更新；之后 `pnpm update` 即升级到最新构建
- 如遇 `ERR_PNPM_ADDING_TO_ROOT` 加 `-w`：
  `dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings#master`

> 想锁定确定版本？用方式 B 的 Release tarball（不可变的版本锚点）。

#### 开发者路径：从 main 源码安装（需构建授权，普通用户勿用）

直接 `github:blackteaYES/dsh-thinking-levels-settings`（不带 `#master`）会克隆源码并在本机执行
git 依赖的 `prepare` 构建。官方依据：[从 GitHub 安装：构建脚本这道坎](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish#%E4%BB%8E-github-%E5%AE%89%E8%A3%85-%E6%9E%84%E5%BB%BA%E8%84%9A%E6%9C%AC%E8%BF%99%E9%81%93%E5%9D%8E)

第一次 `add` 出现 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 是官方预期的安全拦截。处理：

1. 打开当前 profile 的 `pnpm-workspace.yaml`：

   ```sh
   nano ~/.dsh/profiles/web/pnpm-workspace.yaml
   ```

2. 将错误中 `allowBuilds:` 下方打印的**完整包键原样复制**到该文件顶层。pnpm v11 的键通常包含
   包名、codeload URL 和 commit，不能缩写成包名：

   ```yaml
   allowBuilds:
     "<粘贴 pnpm 错误中打印的完整包键>": true
   ```

   如果文件已经有 `allowBuilds`，把新条目合并到现有对象下，不要创建第二个同名 YAML 键。

3. 锁定并重新安装错误中对应的同一个 commit：

   ```sh
   dsh plugin --profile web add "github:blackteaYES/dsh-thinking-levels-settings#<sha>"
   ```

这项授权允许插件源码在 agent 沙箱之外于本机执行。只对可信源码授权并锁定 commit。
**普通用户请使用方式 A / B 的预构建产物，不需要任何授权。**

> 其他兼容性：**pnpm 8/9 + dsh rc.6** 如遇 `ERR_PNPM_ADDING_TO_ROOT`，加 `-w`：
> `dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings#master`。

### 方式 B：Release tarball 安装（稳定通道，版本可锁定；需要 dsh CLI + pnpm）

从 [Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases) 下载
`dsh-thinking-levels-settings-<version>.tgz`，或直接直链一步安装：

```sh
dsh plugin --profile web add https://github.com/blackteaYES/dsh-thinking-levels-settings/releases/download/v3.0.0/dsh-thinking-levels-settings-3.0.0.tgz
# 如遇 ERR_PNPM_ADDING_TO_ROOT 加 -w：dsh plugin --profile web add -w <上面的 URL 或本地路径>
```

tarball 由 CI 在打 `v*` tag 时自动构建附加；包含 `lib/` 预构建产物与 `install.sh`，
无需任何构建授权。完成后重启 dsh，浏览器硬刷新（Ctrl+Shift+R）。

### 从 ≤2.0 旧版升级：先清理被污染的 profile

**2.0 及更早版本把 `@deepseek-ai/*` 声明为普通 dependencies**，pnpm 安装时会往 profile 的
`node_modules` 里物化一套旧版本副本（约 30 个 `@deepseek-ai/*` 包 + zod/immer/zustand 等）。
cordis 以 profile 目录为解析锚点，这些近端旧副本会遮蔽 dsh 本体提供的模块，造成新旧混跑：
**所有对话报 `history unavailable for session "...": TypeError: Cannot read properties of
undefined (reading 'parse')`**、设置页异常等。升级前先清理一次：

```sh
cd ~/.dsh/profiles/web
dsh plugin --profile web remove dsh-thinking-levels-settings    # 等价 pnpm remove
```

核对三处残留：

1. **package.json**：`dependencies` 与 `dsh.profile.bundles` 数组里都不应再有
   `dsh-thinking-levels-settings`（remove 不会动 bundles 字段，有则手工删该行）
2. **影子目录**：`ls node_modules/@deepseek-ai` 应报不存在或为空；若还有真实目录（非符号链接），
   全是旧插件拖入的副本，整棵删除：`rm -rf node_modules/@deepseek-ai`
3. **拖入的散包**：`ls node_modules | grep -E '^(zod|immer|zustand|fflate|use-sync-external-store|@standard-schema)$'`
   有则一并删除

> 宿主自己的依赖在上一级 `~/.dsh/profiles/node_modules`，是指向 dsh 安装的符号链接，不受影响；
> 删的只是 `profiles/web/node_modules` 这一层被插件拖进来的旧副本。

清理完成后重启 dsh web，确认历史会话恢复正常，再按方式 A / B 安装 2.2+。
2.1 起宿主包改为 optional peerDependencies，2.2 起不再声明任何 @deepseek-ai 包
（dev/peer 全无），任何 pnpm 配置下都不会再物化副本。

### 方式 C：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-3.0.0.tgz -C /tmp/rel
cd /tmp/rel/package
bash install.sh            # 默认 profile: web；DSH_PROFILE=xxx 可指定
```

脚本自动检测：有 `dsh`+`pnpm` 走官方路径（dsh plugin add，失败自动 `-w` 重试），
否则走手工路径（复制包目录 + `package.json` 注入 `file:` 依赖 + `cordis.patch.yml` 追加挂载行）。
幂等，可重复运行。手工方式本身如下：

### 方式 D：手工（与官方 client 插件同构）

1. 把插件目录复制到 profile 的 packages 下（目录名必须是 `dsh-thinking-levels-settings`）：

   ```sh
   mkdir -p ~/.dsh/profiles/web/packages
   cp -r dsh-thinking-levels-settings ~/.dsh/profiles/web/packages/
   # 确认 lib/client.js、lib/index.js、lib/invariant.js、lib/types/ 都在
   ```

2. 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 加：

   ```json
   "dsh-thinking-levels-settings": "file:./packages/dsh-thinking-levels-settings"
   ```

3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 追加（内容见 `cordis.patch.yml`）：

   ```yaml
   - insert:
       - id: ui-thinking-levels-settings
         name: dsh-thinking-levels-settings
   ```

4. 安装依赖并重启：

   ```sh
   cd ~/.dsh/profiles/web && npm install --package-lock=false --ignore-scripts
   # 重启 dsh web，硬刷新浏览器（Ctrl+Shift+R）
   ```

加载后 `dsh-client-modules` 会扫描 loader 条目，读到本包的 `dsh.client`（platform: web）
+ `exports["./client"]`，把 `lib/client.js` 作为 `/plugins/dsh-thinking-levels-settings/client.js`
提供给浏览器，浏览器端 `window.__ModuleLoader__.load` 工厂注册 `apply`/`inject`。

## 在新 DSH 中安装（源码法：可继续开发）

前三步与上面相同；第 4 步改为在插件目录内构建：

```sh
cd ~/.dsh/profiles/web/packages/dsh-thinking-levels-settings
npm install --ignore-scripts   # 安装 tsdown/typescript/@deepseek-ai client 依赖
npm run bundle                 # tsdown 产出 lib/index.js + lib/client.js(+map)，随后 tsc 生成 lib/types
npm run watch                  # 开发模式：改 src/ 后自动重建（client-modules HMR 会刷新 rev）
```

然后回到第 4 步做 profile 级 `npm install` 并重启。要求 Node.js 22.19+ / 24+。

## 导出给其他 DSH

```sh
# 1) 确保 lib/ 是最新构建产物
cd ~/.dsh/profiles/web/packages/dsh-thinking-levels-settings && npm run bundle
# 2) 打包目录本身（保证解包后目录名正确）
cd ~/.dsh/profiles/web/packages
tar -czf dsh-thinking-levels-settings.tar.gz dsh-thinking-levels-settings
# 3) 在新机器解包到 ~/.dsh/profiles/web/packages/ 下，然后重复“构建产物法”的第 2-4 步
```

发布包（Release tarball）自带一键安装脚本 `install.sh`：解包后在 `package/` 目录内运行
`bash install.sh`，自动检测环境选择官方路径或手工路径。

## 验证安装

| 检查 | 命令 | 期望 |
|---|---|---|
| 包目录 | `ls ~/.dsh/profiles/web/packages/dsh-thinking-levels-settings/lib/` | client.js / index.js / invariant.js / types |
| 符号链接 | `ls -la ~/.dsh/profiles/web/node_modules/ \| grep thinking` | 指向 `../packages/dsh-thinking-levels-settings` |
| patch 行 | `grep -A1 ui-thinking-levels-settings ~/.dsh/profiles/web/cordis.patch.yml` | id + name 两行 |
| boot 暴露 | `curl -s http://127.0.0.1:3080/ \| grep -o '"id":"dsh-thinking-levels-settings"[^}]*}'` | 有 `/plugins/.../client.js?rev=…` |
| bundle | `curl -s http://127.0.0.1:3080/plugins/dsh-thinking-levels-settings/client.js \| head -c 60` | 以 `window.__ModuleLoader__.load({` 开头 |

## 覆盖更新 / 卸载

更新：备份旧目录 → 放入新版 → （依赖没变则无需重装）重启 + 硬刷新。
卸载：从 `package.json` 删依赖、从 `cordis.patch.yml` 删 patch 行、删包目录与链接，重启。
详见 `INSTALL.html` 第 6、7 节。

## 数据形状

写路径经运行时探测到的 settings 通道（现行 DSH 为 `remote.settings.mutate(ns, ops, expectedRevision)`，
旧版 `connection.api.settings` 对象参数形状自动回退），ops 形如：

```js
[{ op: "set", path: ["providers", <provider>, "models"], value: <models with reasoningEfforts> }]
```

revision 冲突（`settings/conflict` / 旧版 `settings-conflict`）会提示刷新后重试，不会自动重写。

`reasoningEfforts` 取值：`false`（关闭思考）/ 对象（档位 → 协议值，`null` 表示不发送参数）。
档位词表优先从该命名空间的 settings schema 里发现，发现失败回退内置 off…max。

## 版本兼容与故障定位

v2.2.0 起不再写死平台契约（包名、服务键、响应信封、参数形状全部运行时探测/归一，见 README
「版本兼容」）。DSH 升级后一般无需重装本插件。若页面显示红色错误面板：

1. 括号里 `settings 通道：…` 标出实际命中的 holder 路径 —— 显示"未识别"说明候选表需要补充，
   把该行报文反馈即可定位。
2. 页签完全不出现：`curl -s http://127.0.0.1:3080/ | grep -o '"id":"dsh-thinking-levels-settings"[^}]*}'`
   确认 boot 行还在（patch 行被删 / profile 换了会缺）。
3. boot 日志出现 `pending (waiting for service: slots)`：说明该 DSH 版本连 slots 服务都没挂载，
   属于宿主组合问题而非本插件。

## 已知限制

- 默认编辑 `llm-pi-ai` 命名空间（`dsh-llm-pi-ai` 注册的 provider 模型）；若该名字改变，
  页面会按"含 providers 段 + 档位词表"的形状寻找替代命名空间，找不到时报错并列出可见命名空间。
- 只读 provider（`writable: false`）下所有保存按钮禁用，页面仍可查看全部配置。