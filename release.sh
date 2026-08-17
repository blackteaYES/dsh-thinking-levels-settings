#!/usr/bin/env bash
#
# 一键产出官方形态 release 发布包（npm tarball，等价 pnpm pack）
#
# 用法:
#   bash release.sh                 # 产出 dsh-thinking-levels-settings-<version>.tgz
#   OUT_DIR=/path bash release.sh   # 输出到指定目录（默认当前目录）
#
# 发布包遵循官方 publish 文档的分发形态:
#   - npm tarball（.tgz），遵循 package.json 的 files 白名单
#   - 含 dsh.bundle 声明 -> 目标机可 "dsh plugin add ./xxx.tgz" 一步安装
#   - 含构建产物 lib/（无需目标机构建工具）
#   - 含 install.sh（无 pnpm/dsh CLI 环境的回退一键安装）
#
set -euo pipefail
cd "$(dirname "$0")"

# npm 缓存可写覆盖（如 ~/.npm 为只读挂载的环境）
CACHE_DIR="${NPM_CACHE_DIR:-$HOME/.npm-cache}"
mkdir -p "$CACHE_DIR"
export npm_config_cache="$CACHE_DIR"

VERSION=$(node -p "require('./package.json').version")
OUT_DIR="${OUT_DIR:-.}"
OUT="$OUT_DIR/dsh-thinking-levels-settings-$VERSION.tgz"

echo "==> 构建 (npm run bundle) ..."
npm run bundle >/dev/null

# 关键产物检查
for f in lib/client.js lib/index.js lib/invariant.js lib/types/client/index.d.ts install.sh INSTALL.html cordis.patch.yml; do
  [ -f "$f" ] || { echo "错误: 缺少 $f，请先检查构建" >&2; exit 1; }
done

mkdir -p "$OUT_DIR"
rm -f "$OUT"
echo "==> npm pack ..."
npm pack --pack-destination "$OUT_DIR" >/dev/null
[ -f "$OUT" ] || { echo "错误: npm pack 失败" >&2; exit 1; }

echo "✔ 发布包已生成: $OUT"
echo "  大小: $(du -h "$OUT" | cut -f1)"
echo ""
echo "  官方方式安装（需要 dsh CLI + pnpm）:"
echo "    dsh plugin --profile web add $OUT"
echo "    或 git 直装（无需下载本包）:"
echo "    dsh plugin --profile web add github:blackteaYES/dsh-thinking-levels-settings"
echo "    （如遇 ERR_PNPM_ADDING_TO_ROOT 加 -w：dsh plugin --profile web add -w github:...）"
echo ""
echo "  无 pnpm 环境（install.sh 自动回退）:"
echo "    tar -xzf $OUT -C /tmp/rel && cd /tmp/rel/package && bash install.sh"
echo ""
echo "  包内容："
echo "    tar -tzf $OUT | head -30"