# dsh-thinking-levels-settings — 官方形态 client 插件

> 状态：**已按 deepseek-harness 的 client 插件文档（`packages/client/AGENTS.md`、
> `docs/cookbook/adding-a-package.md`、`packages/client/tsdown.client.ts`）改造为官方标准形态。**

给 DSH Web 的 **设置 -> 思考级别** 新增一页，为自定义 `llm-pi-ai` 提供商的每个模型配置
`reasoningEfforts`（off/minimal/low/medium/high/xhigh/max），通过官方 Settings wire
持久化到 `~/.dsh/settings.yaml`。

## 包结构（官方契约）

```
package.json        # dsh.client 清单、exports(./client、./invariant、./src/*)、files
src/index.ts        # node 半：host loader entry（空 apply，纯 UI 页）
src/client/index.ts # 浏览器半：settings.section 槽注册 + 设置页组件 + CSS
src/invariant.ts    # 配套 invariant companion（注册包所有权）
tsdown.config.ts    # 官方 tsdown.client.ts 形态（clientBundle + node twin）
lib/index.js        # 构建产物：node 半（apply=空）
lib/client.js       # 构建产物：window.__ModuleLoader__.load({id, factory}) 闭包工厂
lib/types/**        # tsc 生成的类型声明
INSTALL.md          # 本文件
profile.patch.yml   # 一行 patch：把本插件挂进 profile 的 cordis.patch.yml
```

## 安装到 DSH profile

1. 把本目录复制到 profile（例如 `~/.dsh/profiles/web/` 下）的
   `packages/dsh-thinking-levels-settings/`（保留目录名，`file:` 依赖按名字解析）：

   ```sh
   cp -r dsh-thinking-levels-settings ~/.dsh/profiles/web/packages/
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
   # 重启 dsh web，刷新浏览器
   ```

加载后 `dsh-client-modules` 会扫描 loader 条目，读到本包的 `dsh.client`（platform: web）
+ `exports["./client"]`，把 `lib/client.js` 作为 `/plugins/dsh-thinking-levels-settings/client.js`
 提供给浏览器，浏览器端 `window.__ModuleLoader__.load` 工厂注册 `apply`/`inject`。

## 开发与构建

```sh
npm install     # 安装 tsdown / typescript / @deepseek-ai client 依赖
npm run bundle  # tsdown 产出 lib/index.js + lib/client.js(+map)，随后 tsc 生成 lib/types
npm run watch   # tsdown --watch（改 bundle 后 client-modules 的 HMR 会重新哈希 rev）
```

构建约束与官方一致：

- `lib/client.js` 是 **CJS 闭包工厂**（`window.__ModuleLoader__.load({id, factory})`），
  platform 模块（react 等）通过注入的 `require` 从模块表解析（external），其余 wire 层内联。
- client 包纯 UI：node 半 `apply` 为空；无 host 服务、无事件。
- `dsh.client.inject` 仅声明模块依赖边（preflight/HMR 差集），不驱动激活顺序。

## 数据形状

写路径：`api.settings.mutate({ ns: 'llm-pi-ai', ops: [{ op: 'set',
path: ['providers', <provider>, 'models'], value: <models with reasoningEfforts> }],
expectedRevision })`；冲突（`settings-conflict`）会提示刷新重试。

`reasoningEfforts` 取值：`false`（关闭思考）/ 对象（档位 → 协议值，`null` 表示不发送参数）。

## 已知限制

- 只作用于 `llm-pi-ai` 命名空间（`dsh-llm-pi-ai` 注册的 provider 模型）。
- 本页要求 `llm-pi-ai` 命名空间已暴露（未加载时页内提示“尚未加载”）。