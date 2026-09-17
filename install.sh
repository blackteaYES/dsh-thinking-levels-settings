#!/usr/bin/env bash
#
# dsh-thinking-levels-settings — 一键安装脚本
#
# 路径 A（官方推荐）：dsh CLI + pnpm 可用时，走官方 "dsh plugin add" 流程：
#   打包 tarball -> dsh plugin --profile <name> add <tarball>
#   - pnpm 安装依赖
#   - reconcilePlugins 识别 dsh.bundle 并把本包自动加入 dsh.profile.bundles
#   - 无需手写 cordis.patch.yml
# 路径 B（回退）：dsh CLI / pnpm 不可用时，等效手工安装：
#   包目录就位 -> package.json 声明 file: 依赖 -> cordis.patch.yml 追加挂载行
#
# 用法:
#   bash install.sh                      # 默认 profile: web
#   DSH_PROFILE=web bash install.sh
#   DSH_HOME=/path bash install.sh       # 覆盖 DSH home（默认 ~/.dsh）
#   SKIP_PNPM=1 bash install.sh          # 强制走回退路径 B
#
# 幂等: 重复运行安全（已安装则跳过/备份）。安装后需重启 dsh 服务并硬刷新浏览器。
set -euo pipefail

# --- 定位包目录（支持软链调用） ---
SOURCE=${BASH_SOURCE[0]}
while [ -L "$SOURCE" ]; do
  DIR=$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE
done
PKG_DIR=$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)

PKG_NAME="dsh-thinking-levels-settings"
VERSION=$(node -p "require('$PKG_DIR/package.json').version" 2>/dev/null || echo "0.0.0")
PROFILE="${DSH_PROFILE:-web}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
PACKAGES_DIR="$PROFILE_DIR/packages"
TARBALL="$PKG_DIR/${PKG_NAME}-${VERSION}.tgz"

echo "==> 安装 $PKG_NAME v$VERSION 到 profile '$PROFILE' (DSH home: $DSH_HOME)"
echo "    插件目录: $PKG_DIR"

# --- 前置检查 ---
if ! command -v node >/dev/null 2>&1; then
  echo "错误: 未找到 node。DSH 需要 Node.js 22.19+ / 24+。" >&2; exit 1
fi
if [ ! -f "$PROFILE_DIR/package.json" ]; then
  echo "错误: 找不到 $PROFILE_DIR/package.json。" >&2
  echo "      profile 尚不存在，请先启动一次 dsh 生成它（如 npx @deepseek-ai/dsh web）。" >&2
  exit 1
fi

# --- 构建产物就位 ---
# `lib/` 是 gitignore 的，所以从 GitHub clone 下来的仓库里没有它。两条路径都
# 假定产物存在（路径 A 直接打包、路径 B 直接拷贝），缺了就会装出一个加载不
# 起来的空插件 —— 而且没有任何报错，最坏的一种失败。这里先补上。
# 从 `master` 产物分支或 Release tarball 装的用户已有 `lib/`，直接跳过。
if [ -f "$PKG_DIR/lib/client.js" ]; then
  echo "==> 构建产物已存在，跳过构建"
else
  echo "==> 未找到 lib/client.js（源码仓库 clone 的典型情况），开始构建 ..."
  if [ ! -f "$PKG_DIR/package.json" ]; then
    echo "错误: 找不到 $PKG_DIR/package.json。" >&2; exit 1
  fi
  # npm 的 prepare 会在 npm ci 后自动跑 bundle，但 prepare 是否触发取决于
  # npm 版本与 --ignore-scripts，所以显式再跑一次 bundle 兜底，不依赖它。
  ( cd "$PKG_DIR" && npm ci --no-audit --no-fund && npm run bundle )
  if [ ! -f "$PKG_DIR/lib/client.js" ]; then
    echo "错误: 构建后仍未生成 $PKG_DIR/lib/client.js。" >&2
    echo "      请在该目录手动运行 npm ci && npm run bundle 查看详细报错。" >&2
    exit 1
  fi
  echo "==> 构建完成"
fi

# --- 判断走哪条路径 ---
DSH_BIN=""
if command -v dsh >/dev/null 2>&1; then
  DSH_BIN=$(command -v dsh)
elif [ -n "${DSH_CLI:-}" ] && [ -x "$DSH_CLI" ]; then
  DSH_BIN="$DSH_CLI"
fi
HAS_PNPM=0
command -v pnpm >/dev/null 2>&1 && HAS_PNPM=1

if [ "${SKIP_PNPM:-0}" = "1" ]; then
  echo "==> SKIP_PNPM=1，强制走回退路径 B"
fi

if [ -n "$DSH_BIN" ] && [ "$HAS_PNPM" = "1" ] && [ "${SKIP_PNPM:-0}" != "1" ]; then
  # ============ 路径 A：官方 dsh plugin add ============
  echo "==> 路径 A：官方 dsh plugin add（dsh=$DSH_BIN, pnpm 可用）"
  if [ ! -f "$TARBALL" ]; then
    echo "==> 打包 tarball ($TARBALL) ..."
    # 不用 npm pack：它会触发 prepare（=完整构建），发布包消费者没有
    # node_modules 必失败（--ignore-scripts 在部分 npm 版本也不生效）。
    # 包内 lib/ 已是预构建产物，直接按 files 白名单等价内容打 tar。
    STAGE=$(mktemp -d)
    trap 'rm -rf "$STAGE"' EXIT
    cp -R "$PKG_DIR" "$STAGE/package"
    rm -rf "$STAGE/package/node_modules" "$STAGE/package/.git"
    (cd "$STAGE" && tar -czf "$TARBALL" package)
    [ -f "$TARBALL" ] || { echo "错误: tarball 生成失败" >&2; exit 1; }
  fi
  # -w 是必需的：dsh 的 profile 目录是 pnpm workspace 根（dsh 会写入
  # pnpm-workspace.yaml），不加 -w 必定 ERR_PNPM_ADDING_TO_ROOT。
  echo "==> dsh plugin --profile $PROFILE add -w $TARBALL ..."
  if "$DSH_BIN" plugin --profile "$PROFILE" add -w "$TARBALL"; then
    echo ""
    echo "✔ 安装完成（官方 bundle 方式）。"
    echo ""
    echo "  下一步:"
    echo "    1. 重启 dsh $PROFILE 服务"
    echo "    2. 浏览器硬刷新 (Ctrl+Shift+R)"
    echo "    3. 设置 -> 思考级别 确认页面"
    echo ""
    echo "  验证（token 取自 dsh web 启动输出里那条 http://…/?token=… 的 URL）:"
    echo "    curl -s \"http://127.0.0.1:3080/?token=<TOKEN>\" | grep -o '\"id\":\"$PKG_NAME\"[^}]*}'"
    exit 0
  fi
  echo "==> dsh plugin add -w 失败，回退路径 B ..."
fi

# ============ 路径 B：手工安装（file: 依赖 + cordis.patch.yml） ============
echo "==> 路径 B：手工安装（file: 依赖 + cordis.patch.yml）"

# 1) 包目录就位（幂等：旧版本备份为 .previous）
mkdir -p "$PACKAGES_DIR"
TARGET="$PACKAGES_DIR/$PKG_NAME"
if [ -e "$TARGET" ]; then
  SAME=$(cd -P "$TARGET" >/dev/null 2>&1 && pwd)
  if [ "$SAME" = "$PKG_DIR" ]; then
    echo "==> 包目录已在目标位置，跳过拷贝"
  else
    echo "==> 检测到已安装版本，备份为 $PKG_NAME.previous"
    rm -rf "$PACKAGES_DIR/$PKG_NAME.previous"
    mv "$TARGET" "$PACKAGES_DIR/$PKG_NAME.previous"
    cp -R "$PKG_DIR" "$TARGET"
    rm -rf "$TARGET/.git" "$TARGET/node_modules"
    echo "==> 已复制到 $TARGET"
  fi
else
  cp -R "$PKG_DIR" "$TARGET"
  rm -rf "$TARGET/.git" "$TARGET/node_modules"
  echo "==> 已复制到 $TARGET"
fi

# 2) profile package.json 注入依赖（幂等）
MANIFEST="$PROFILE_DIR/package.json"
if grep -q "\"$PKG_NAME\"" "$MANIFEST"; then
  echo "==> package.json 已包含依赖，跳过"
else
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    j.dependencies = j.dependencies ?? {};
    j.dependencies[process.argv[2]] = "file:./packages/" + process.argv[2];
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  ' "$MANIFEST" "$PKG_NAME"
  echo "==> package.json 已注入依赖"
fi

# 3) cordis.patch.yml 追加挂载行（幂等）
PATCH="$PROFILE_DIR/cordis.patch.yml"
if [ -f "$PATCH" ] && grep -q "name: $PKG_NAME" "$PATCH"; then
  echo "==> cordis.patch.yml 已包含挂载行，跳过"
else
  printf '\n# dsh-thinking-levels-settings (install.sh 自动追加)\n- insert:\n    - id: ui-thinking-levels-settings\n      name: %s\n' "$PKG_NAME" >> "$PATCH"
  echo "==> cordis.patch.yml 已追加挂载行"
fi

# 4) 建立 node_modules 链接
cd "$PROFILE_DIR"
echo "==> npm install（建立 file: 链接）..."
npm install --package-lock=false --ignore-scripts --no-audit --no-fund

# 5) 校验
if [ -e "$PROFILE_DIR/node_modules/$PKG_NAME" ]; then
  echo ""
  echo "✔ 安装完成（手工路径）。"
  echo ""
  echo "  下一步:"
  echo "    1. 重启 dsh $PROFILE 服务"
  echo "    2. 浏览器硬刷新 (Ctrl+Shift+R)"
  echo "    3. 设置 -> 思考级别 确认页面"
  echo ""
  echo "  快速验证（token 取自 dsh web 启动输出里那条 http://…/?token=… 的 URL）:"
  echo "    curl -s \"http://127.0.0.1:3080/?token=<TOKEN>\" | grep -o '\"id\":\"$PKG_NAME\"[^}]*}'"
else
  echo "警告: node_modules/$PKG_NAME 未建立，请检查上方 npm install 输出。" >&2
  exit 1
fi