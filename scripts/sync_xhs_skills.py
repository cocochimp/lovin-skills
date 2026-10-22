#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
同步 xhs-writes / xhs-review 到 Doubao 运行时 skill 目录。

用途：git 提交后（post-commit hook）自动把项目仓库里的最新版
      skill 同步到 .user_skills 运行时副本，保证运行时跟随 git 最新提交。
也可手动执行：python3 scripts/sync_xhs_skills.py
"""
import os
import shutil
import sys

REPO = "/Users/Doc/agent/lovin-skills"
TARGET = "/Users/cocochimp/Library/Application Support/Doubao/Profile 1/.doubao/agent_mode/workspace/.user_skills"
SKILLS = ["xhs-writes", "xhs-review"]


def sync_dir(src: str, dst: str) -> None:
    """将 src 目录完整同步到 dst（含删除 dst 中 src 没有的文件）。"""
    if not os.path.isdir(src):
        print(f"[sync-xhs] 警告: 源目录不存在，跳过: {src}", file=sys.stderr)
        return
    os.makedirs(dst, exist_ok=True)
    # 删除 dst 中存在但 src 中不存在的文件/目录
    for name in os.listdir(dst):
        d = os.path.join(dst, name)
        if not os.path.exists(os.path.join(src, name)):
            if os.path.isdir(d):
                shutil.rmtree(d)
            else:
                os.remove(d)
    # 复制/覆盖 src -> dst
    for name in os.listdir(src):
        s = os.path.join(src, name)
        d = os.path.join(dst, name)
        if os.path.isdir(s):
            if os.path.isdir(d):
                shutil.rmtree(d)
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
    print(f"[sync-xhs] synced: {os.path.basename(dst)}")


def main() -> int:
    if not os.path.isdir(TARGET):
        print(f"[sync-xhs] 警告: 运行时目录不存在，跳过: {TARGET}", file=sys.stderr)
        return 0
    for skill in SKILLS:
        sync_dir(os.path.join(REPO, skill), os.path.join(TARGET, skill))
    return 0


if __name__ == "__main__":
    sys.exit(main())
