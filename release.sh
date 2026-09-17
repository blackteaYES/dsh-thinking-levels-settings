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

# 来源溯源：包内容取决于当前工作树，先亮明身份；脏树给出明确警告。
# 应急定位：本脚本是 GitHub Actions（release.yml）不可用时的本地出包通道，
# 正常发版请推 v* tag 走 CI，保证产物与仓库历史一一对应。
if git rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH=$(git branch --show-current)
  SHA=$(git rev-parse --short HEAD)
  echo "==> 来源: ${BRANCH:-detached}@${SHA}"
  if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  工作树有未提交改动，包内容可能与仓库不一致：" >&2
    git status --porcelain | sed 's/^/     /' >&2
  fi
fi

# 前置检查：构建依赖必须就位（npm pack 触发的 prepare 需要 tsdown/tsc）
[ -x node_modules/.bin/tsdown ] || {
  echo "错误: 未安装构建依赖，请先运行 npm install" >&2; exit 1;
}

# npm 缓存可写覆盖（如 ~/.npm 为只读挂载的环境）
CACHE_DIR="${NPM_CACHE_DIR:-$HOME/.npm-cache}"
mkdir -p "$CACHE_DIR"
export npm_config_cache="$CACHE_DIR"

VERSION=$(node -p "require('./package.json').version")
OUT_DIR="${OUT_DIR:-.}"
OUT="$OUT_DIR/dsh-thinking-levels-settings-$VERSION.tgz"

echo "==> 打包 (npm pack，其 prepare 阶段自动执行 npm run bundle) ..."
mkdir -p "$OUT_DIR"
rm -f "$OUT"
npm pack --pack-destination "$OUT_DIR" >/dev/null

# 关键产物检查（兜底：即使未来 npm 不再于 pack 时触发 prepare，也能立刻发现）
for f in lib/client.js lib/index.js lib/invariant.js lib/types/client/index.d.ts install.sh INSTALL.html cordis.patch.yml LICENSE; do
  [ -f "$f" ] || { echo "错误: 缺少 $f，请先检查构建 (npm run bundle)" >&2; exit 1; }
done
[ -f "$OUT" ] || { echo "错误: npm pack 失败" >&2; exit 1; }

echo "✔ 发布包已生成: $OUT"
echo "  大小: $(du -h "$OUT" | cut -f1)"
echo ""
echo "  安装方式（用户）:"
echo "    A. #master 直装（推荐，无需构建授权）:"
echo "       dsh plugin --profile web add -w github:blackteaYES/dsh-thinking-levels-settings#master"
echo "    B. 本 tarball / Release 直链（版本可锁定）:"
echo "       dsh plugin --profile web add -w $OUT"
echo "    两处都用 add -w：旧 pnpm(<10.5.0) 不加会报 ERR_PNPM_ADDING_TO_ROOT，"
echo "    新 pnpm(>=10.5.0) 则无所谓；加 -w 两边都 rc=0，所以统一带上。"
echo "    github: 与显式 git+https:// 等价。"
echo ""
echo "  无 pnpm 环境（install.sh 自动回退）:"
echo "    tar -xzf $OUT -C /tmp/rel && cd /tmp/rel/package && bash install.sh"
echo ""
echo "  包内容："
echo "    tar -tzf $OUT | head -30"