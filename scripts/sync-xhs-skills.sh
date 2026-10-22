#!/bin/bash
# 同步 xhs-writes / xhs-review 到 Doubao 运行时 skill 目录
# 用途：git 提交后（post-commit hook）自动把项目仓库里的最新版
#       skill 同步到 .user_skills 运行时副本，保证运行时跟随 git 最新提交。
# 也可手动执行：bash scripts/sync-xhs-skills.sh
set -euo pipefail

REPO="/Users/Doc/agent/lovin-skills"
TARGET="/Users/cocochimp/Library/Application Support/Doubao/Profile 1/.doubao/agent_mode/workspace/.user_skills"

if [ ! -d "$TARGET" ]; then
  echo "[sync-xhs] 警告: 运行时目录不存在，跳过: $TARGET" >&2
  exit 0
fi

for skill in xhs-writes xhs-review; do
  /usr/bin/rsync -a --delete \
    "$REPO/$skill/" \
    "$TARGET/$skill/"
  echo "[sync-xhs] synced: $skill"
done
