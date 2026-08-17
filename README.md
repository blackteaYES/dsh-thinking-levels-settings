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

### 方式 A：官方 `dsh plugin add`（推荐，需要 dsh CLI + pnpm）

从 **[Releases](https://github.com/blackteaYES/dsh-thinking-levels-settings/releases)** 下载
`dsh-thinking-levels-settings-<version>.tgz`，然后：

```sh
dsh plugin --profile web add ./dsh-thinking-levels-settings-2.0.0.tgz
```

- 自动加入 `dsh.profile.bundles`（reconcile 识别 `dsh.bundle`）
- **无需手动编辑任何文件**
- 完成后重启 dsh，浏览器硬刷新（Ctrl+Shift+R）

### 方式 B：一键脚本（无 pnpm 环境）

解包后运行：

```sh
tar -xzf dsh-thinking-levels-settings-2.0.0.tgz -C /tmp/rel
cd /tmp/rel/package
bash install.sh            # 默认 profile: web；DSH_PROFILE=xxx 可指定
```

脚本自动检测：有 `dsh`+`pnpm` 走官方路径 A，否则手工路径 B（复制包目录 +
`package.json` 注入 `file:` 依赖 + `cordis.patch.yml` 追加挂载行）。幂等，可重复运行。

### 方式 C：手工（与官方 client 插件同构）

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
- 方式 A 需要本机有 **pnpm**（`dsh plugin` 是 pnpm 转发器）

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
profile.patch.yml   # 一行 patch 模板（dsh.bundle 引用它）
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