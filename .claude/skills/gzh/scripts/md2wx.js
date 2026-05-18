#!/usr/bin/env node

/**
 * Markdown → 微信公众号兼容 HTML
 * 用法：node md2wx.js input.md output.html [--images img1.png:插入位置]
 * 微信限制：不支持外链图片、不支持class、有限CSS内联
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outputPath = args[1];
  const images = [];

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--image' && args[i + 1]) {
      // 格式: path:after_paragraph_N
      const [imgPath, position] = args[i + 1].split(':');
      images.push({ path: imgPath, afterParagraph: parseInt(position) || 1 });
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('用法: node md2wx.js input.md output.html [--image path:N]');
    process.exit(1);
  }
  return { inputPath, outputPath, images };
}

function mdToWxHtml(md, images) {
  // 去掉 frontmatter
  md = md.replace(/^---[\s\S]*?---\n*/, '');

  const lines = md.split('\n');
  const htmlLines = [];
  let paragraphCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let html;

    // 加粗段落标题
    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      const text = trimmed.replace(/^\*\*(.+)\*\*$/, '$1');
      html = `<p style="font-weight:bold;font-size:18px;color:#2d2926;margin:24px 0 12px;line-height:1.6;">${text}</p>`;
    }
    // 普通段落
    else {
      // 内联加粗
      let processed = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // 内联标记
      processed = processed.replace(/「(.+?)」/g, '<span style="color:#E91E63;">「$1」</span>');
      html = `<p style="font-size:16px;color:#3f3f3f;margin:16px 0;line-height:2;letter-spacing:0.5px;">${processed}</p>`;
    }

    htmlLines.push(html);
    paragraphCount++;

    // 插入图片
    for (const img of images) {
      if (img.afterParagraph === paragraphCount) {
        htmlLines.push(`<p style="text-align:center;margin:24px 0;"><img src="${img.path}" style="max-width:100%;border-radius:4px;" /></p>`);
      }
    }
  }

  // 包装
  const body = htmlLines.join('\n');
  return body;
}

const { inputPath, outputPath, images } = parseArgs();
const md = fs.readFileSync(path.resolve(inputPath), 'utf8');
const html = mdToWxHtml(md, images);
fs.writeFileSync(path.resolve(outputPath), html, 'utf8');
console.log(`OK: ${path.resolve(outputPath)}`);
