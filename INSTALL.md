# dsh-thinking-levels-settings — 官方形态 client 插件

> **完整图文教程见本目录的 [`INSTALL.html`](INSTALL.html)（安装、导出、验证、卸载、常见问题）。**
> 以下为文字版速查。

## 这是什么

给 DSH Web 的 **设置 -> 思考级别** 新增一页，为自定义 `llm-pi-ai` 提供商的每个模型配置
`reasoningEfforts`（off/minimal/low/medium/high/xhigh/max），通过官方 Settings wire
持久化到 `~/.dsh/settings.yaml`。

纯客户端插件：node 半（`lib/index.js`）`apply` 为空；浏览器半（`lib/client.js`）以官方
`window.__ModuleLoader__.load` 闭包工厂注册 `settings.section` 槽位贡献。安装不需要改
`dsh.profile.bundles`，也不需要 `dsh.bundle` —— 以一行 patch 挂载，与官方 `dsh plugin add` 语义一致。

## 包结构

```
package.json        # dsh.client 清单、exports(./client、./invariant、./src/*)、files
src/index.ts        # node 半：host loader entry（空 apply，纯 UI 页）
src/client/index.ts # 浏览器半：settings.section 槽注册 + 设置页组件 + CSS
src/invariant.ts    # 配套 invariant companion（注册包所有权）
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

### 方式 A：git 直装（官方 git 托管安装，最简；需要 dsh CLI + pnpm）

**前提：本机需要 `dsh` CLI 和 `pnpm`**（`dsh plugin` 是 pnpm 转发器；安装时 pnpm 负责克隆仓库、
运行构建）。没有 pnpm 请看方式 C。

```sh
dsh plugin --profile web add github:blackteaYES/dsh-thinking-levels-settings
```

pnpm 自动：克隆仓库 → 运行 `prepare` 脚本（`npm run bundle`，自包含构建，产出 `lib/`）→
reconcile 识别 `dsh.bundle` → 自动加入 `dsh.profile.bundles`。无需下载 tarball；pnpm ≥10 首次安装
需要完成下面的一次性构建授权。

#### pnpm ≥10：首次 git 构建授权

官方依据：[从 GitHub 安装：构建脚本这道坎](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish#%E4%BB%8E-github-%E5%AE%89%E8%A3%85-%E6%9E%84%E5%BB%BA%E8%84%9A%E6%9C%AC%E8%BF%99%E9%81%93%E5%9D%8E)

第一次 `add` 出现 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 是官方预期的安全拦截，不是插件、代理或
`dsh.bundle` 配置故障。它表示 pnpm 已下载源码并识别到 `prepare`，但尚未获准执行构建代码。

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

这项授权允许插件源码在 agent 沙箱之外于本机执行。只对可信源码授权并锁定 commit；如果 main
更新为新的 commit，pnpm 可能要求对新的完整包键重新授权。不想授权时使用方式 B 的预构建 tarball，
它已经包含 `lib/`，不需要 git `prepare` 构建权限。

> 其他兼容性：**pnpm 8/9 + dsh rc.6** 如遇 `ERR_PNPM_ADDING_TO_ROOT`，加 `-w`：
> `dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings`。

### 方式 B：tarball 安装（官方 tarball 交付，需要 dsh CLI + pnpm）

从 [Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases) 下载
`dsh-thinking-levels-settings-<version>.tgz`，然后：

```sh
dsh plugin --profile web add ./dsh-thinking-levels-settings-2.0.0.tgz
# 如遇 ERR_PNPM_ADDING_TO_ROOT 加 -w：dsh plugin --profile web add -w ./dsh-thinking-levels-settings-2.0.0.tgz
```

### 方式 C：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-2.0.0.tgz -C /tmp/rel
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

完整的一键安装脚本（`install-plugin.sh`）见 `INSTALL.html` 第 5 节。

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

写路径：`api.settings.mutate({ ns: 'llm-pi-ai', ops: [{ op: 'set',
path: ['providers', <provider>, 'models'], value: <models with reasoningEfforts> }],
expectedRevision })`；冲突（`settings-conflict`）会提示刷新重试。

`reasoningEfforts` 取值：`false`（关闭思考）/ 对象（档位 → 协议值，`null` 表示不发送参数）。

## 已知限制

- 只作用于 `llm-pi-ai` 命名空间（`dsh-llm-pi-ai` 注册的 provider 模型）。
- 本页要求 `llm-pi-ai` 命名空间已暴露（未加载时页内提示“尚未加载”）。