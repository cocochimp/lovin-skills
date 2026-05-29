#!/usr/bin/env python3
"""Grade ljg-writes skill outputs against assertions."""
import json
import re
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))

AI_CLICHES = [
    "标志着", "见证了", "充满活力", "值得注意的是", "某种程度上",
    "在当今", "不可或缺", "日新月异", "与时俱进", "蓬勃发展",
    "此外", "另外", "综上所述", "总而言之", "毋庸置疑",
    "不言而喻", "众所周知", "显而易见", "事实上",
    "再深入一层", "最深的一层是", "更深地说", "深入探讨",
    "接下来我们", "让我们来看", "首先.*其次.*最后",
]

DEPTH_ANNOUNCEMENTS = [
    "再深入一层", "最深的一层是", "更深地说", "深入探讨",
    "更深层次", "往深层看",
]

def count_chinese_chars(text):
    return len(re.findall(r'[\u4e00-\u9fff]', text))

def count_words_approx(text):
    """Approximate word count: Chinese chars + English words."""
    cn = count_chinese_chars(text)
    en = len(re.findall(r'[a-zA-Z]+', text))
    return cn + en

def check_ai_cliches(text):
    found = []
    for c in AI_CLICHES:
        if re.search(c, text):
            found.append(c)
    return found

def check_depth_announcements(text):
    found = []
    for d in DEPTH_ANNOUNCEMENTS:
        if d in text:
            found.append(d)
    return found

def check_header_format(text):
    lines = text.strip().split('\n')
    has_title = lines[0].startswith('# ') if lines else False
    has_date_author = False
    for line in lines[:5]:
        if re.search(r'>\s*\d{4}-\d{2}-\d{2}\s*\|\s*李继刚', line):
            has_date_author = True
            break
    return has_title, has_date_author

def check_listicle_pattern(text):
    """Check for listicle patterns - numbered lists or many bullet points."""
    lines = text.strip().split('\n')
    bullet_lines = sum(1 for l in lines if re.match(r'\s*[-•·]\s', l))
    numbered_lines = sum(1 for l in lines if re.match(r'\s*\d+[\.\)]\s', l))
    total_lines = len([l for l in lines if l.strip()])
    ratio = (bullet_lines + numbered_lines) / max(total_lines, 1)
    return ratio, bullet_lines + numbered_lines

def grade_article(filepath, eval_id, eval_name):
    with open(filepath, 'r') as f:
        text = f.read()

    results = []
    word_count = count_words_approx(text)

    # word-count
    passed = 1000 <= word_count <= 1500
    results.append({
        "text": "文章字数在1000-1500之间",
        "passed": passed,
        "evidence": f"字数: {word_count}"
    })

    # no-ai-cliches
    cliches = check_ai_cliches(text)
    passed = len(cliches) == 0
    results.append({
        "text": "没有AI拐杖词",
        "passed": passed,
        "evidence": f"发现拐杖词: {cliches}" if cliches else "未发现AI拐杖词"
    })

    # header-format
    has_title, has_date = check_header_format(text)
    passed = has_title and has_date
    results.append({
        "text": "文件头包含标题和日期+作者信息",
        "passed": passed,
        "evidence": f"标题: {'有' if has_title else '无'}, 日期+作者: {'有' if has_date else '无'}"
    })

    # no-listicle (programmatic approximation)
    ratio, count = check_listicle_pattern(text)
    passed = ratio < 0.15
    results.append({
        "text": "文章不是要点罗列式",
        "passed": passed,
        "evidence": f"列表行占比: {ratio:.1%} ({count}行), 低于15%视为通过"
    })

    # no-depth-announcements
    depth_ann = check_depth_announcements(text)
    passed = len(depth_ann) == 0
    results.append({
        "text": "不自标深度（禁用'再深入一层'等宣告）",
        "passed": passed,
        "evidence": f"发现深度宣告: {depth_ann}" if depth_ann else "未发现深度宣告"
    })

    return {
        "eval_id": eval_id,
        "eval_name": eval_name,
        "file": filepath,
        "word_count": word_count,
        "expectations": results
    }

# Grade all articles
evals = [
    ("remote-work-with-skill/outputs/远程办公.md", 1, "remote-work", "with_skill"),
    ("remote-work-without-skill/outputs/远程办公比坐班更高效.md", 1, "remote-work", "without_skill"),
    ("reading-useless-with-skill/outputs/读书无用论.md", 2, "reading-useless", "with_skill"),
    ("reading-useless-without-skill/outputs/读书无用论.md", 2, "reading-useless", "without_skill"),
    ("ai-replace-programmer-with-skill/outputs/AI取代程序员.md", 3, "ai-replace-programmer", "with_skill"),
    ("ai-replace-programmer-without-skill/outputs/ai-replace-programmer.md", 3, "ai-replace-programmer", "without_skill"),
]

all_results = {}
for relpath, eid, ename, variant in evals:
    filepath = os.path.join(BASE, relpath)
    if os.path.exists(filepath):
        result = grade_article(filepath, eid, f"{ename}-{variant}")
        key = f"{ename}-{variant}"
        all_results[key] = result

        # Save individual grading.json
        outdir = os.path.dirname(filepath)
        grading_path = os.path.join(os.path.dirname(outdir), "grading.json")
        with open(grading_path, 'w') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

# Print summary
print("\n" + "="*70)
print("GRADING SUMMARY")
print("="*70)

for key, result in all_results.items():
    passed = sum(1 for e in result["expectations"] if e["passed"])
    total = len(result["expectations"])
    print(f"\n{'='*50}")
    print(f"  {key}")
    print(f"  Words: {result['word_count']} | Score: {passed}/{total}")
    print(f"{'='*50}")
    for exp in result["expectations"]:
        status = "PASS" if exp["passed"] else "FAIL"
        print(f"  [{status}] {exp['text']}")
        print(f"         {exp['evidence']}")

# Create benchmark.json
benchmark = {
    "skill_name": "ljg-writes",
    "configurations": [
        {"name": "with_skill", "label": "使用 ljg-writes 技能"},
        {"name": "without_skill", "label": "无技能基线"}
    ],
    "evals": []
}

eval_names = ["remote-work", "reading-useless", "ai-replace-programmer"]
eval_labels = ["远程办公", "读书无用论", "AI取代程序员"]

for ename, elabel in zip(eval_names, eval_labels):
    eval_entry = {"name": ename, "label": elabel, "results": {}}
    for variant in ["with_skill", "without_skill"]:
        key = f"{ename}-{variant}"
        if key in all_results:
            r = all_results[key]
            passed = sum(1 for e in r["expectations"] if e["passed"])
            total = len(r["expectations"])
            eval_entry["results"][variant] = {
                "pass_rate": passed / total,
                "passed": passed,
                "total": total,
                "word_count": r["word_count"]
            }
    benchmark["evals"].append(eval_entry)

# Compute aggregate
for variant in ["with_skill", "without_skill"]:
    rates = [e["results"][variant]["pass_rate"] for e in benchmark["evals"] if variant in e["results"]]
    benchmark[f"{variant}_avg_pass_rate"] = sum(rates) / len(rates) if rates else 0

with open(os.path.join(BASE, "benchmark.json"), 'w') as f:
    json.dump(benchmark, f, ensure_ascii=False, indent=2)

print(f"\n\nBenchmark saved to {os.path.join(BASE, 'benchmark.json')}")
print(f"\nWith Skill avg pass rate: {benchmark['with_skill_avg_pass_rate']:.1%}")
print(f"Without Skill avg pass rate: {benchmark['without_skill_avg_pass_rate']:.1%}")
