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
profile.patch.yml   # 一行 patch：把本插件挂进 profile 的 cordis.patch.yml
```

## 在新 DSH 中安装（构建产物法：只需要使用）

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

3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 追加（内容见 `profile.patch.yml`）：

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