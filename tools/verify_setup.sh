#!/usr/bin/env bash
# 走进名画 · 安装浏览器检查要用的 axe-core 和 Lighthouse（装到仓库外面的缓存文件夹，不加进仓库依赖）
# 用法：bash tools/verify_setup.sh
# Playwright 和 Chromium 用电脑上已经装好的（require('playwright')）。
set -euo pipefail
DIR="${WIP_VERIFY_CACHE:-$HOME/.cache/walk-into-paintings-verify}"
mkdir -p "$DIR"
cd "$DIR"
[ -f package.json ] || echo '{"private":true}' > package.json
npm install --no-audit --no-fund --silent axe-core@4.10.2 lighthouse@12.2.1
echo "装好了：$DIR"
