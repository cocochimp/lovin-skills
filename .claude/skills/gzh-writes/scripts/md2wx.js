#!/usr/bin/env node

/**
 * Markdown → 微信公众号兼容 HTML
 * 用法：node md2wx.js input.md output.html [--image img.png:N]
 * 支持：标题、加粗、红字、引用、列表、表格、分隔线、链接
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
      const [imgPath, position] = args[i + 1].split(':');
      images.push({ path: path.resolve(imgPath), afterParagraph: parseInt(position) || 1 });
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('用法: node md2wx.js input.md output.html [--image path:N]');
    process.exit(1);
  }
  return { inputPath, outputPath, images };
}

// 处理行内元素
function processInline(text) {
  // 加粗
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 红字标记
  text = text.replace(/「(.+?)」/g, '<span style="color:#E91E63;">「$1」</span>');
  // 链接（微信不支持外链点击，显示文字）
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:#576b95;text-decoration:underline;">$1</span>');
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:14px;color:#c7254e;">$1</code>');
  return text;
}

function mdToWxHtml(md, images) {
  // 去掉 frontmatter
  md = md.replace(/^---[\s\S]*?---\n*/, '');

  const lines = md.split('\n');
  const htmlBlocks = [];
  let paragraphCount = 0;
  let i = 0;

  function maybeInsertImage() {
    for (const img of images) {
      if (img.afterParagraph === paragraphCount) {
        htmlBlocks.push(`<p style="text-align:center;margin:24px 0;"><img src="${img.path}" style="max-width:100%;border-radius:4px;" /></p>`);
      }
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行跳过
    if (!trimmed) { i++; continue; }

    // --- 分隔线
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      htmlBlocks.push('<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />');
      i++; continue;
    }

    // ### 三级标题
    if (/^###\s+(.+)/.test(trimmed)) {
      const text = trimmed.replace(/^###\s+/, '');
      htmlBlocks.push(`<h3 style="font-size:17px;font-weight:bold;color:#2d2926;margin:20px 0 10px;line-height:1.6;">${processInline(text)}</h3>`);
      paragraphCount++; maybeInsertImage(); i++; continue;
    }

    // ## 二级标题
    if (/^##\s+(.+)/.test(trimmed)) {
      const text = trimmed.replace(/^##\s+/, '');
      htmlBlocks.push(`<h2 style="font-size:20px;font-weight:bold;color:#2d2926;margin:24px 0 12px;line-height:1.5;">${processInline(text)}</h2>`);
      paragraphCount++; maybeInsertImage(); i++; continue;
    }

    // > 引用块（连续行合并）
    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(processInline(lines[i].trim().replace(/^>\s?/, '')));
        i++;
      }
      htmlBlocks.push(`<blockquote style="border-left:3px solid #E91E63;padding:12px 16px;margin:16px 0;background:#fafafa;color:#5c5350;font-size:15px;line-height:1.8;">${quoteLines.join('<br/>')}</blockquote>`);
      paragraphCount++; maybeInsertImage(); continue;
    }

    // 表格
    if (/^\|.+\|/.test(trimmed)) {
      const tableLines = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }
      // 去掉分隔行
      const dataRows = tableLines.filter(l => !/^\|[\s\-:|]+\|$/.test(l));
      if (dataRows.length > 0) {
        let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:15px;">';
        dataRows.forEach((row, idx) => {
          const cells = row.split('|').filter(c => c !== '').map(c => c.trim());
          const tag = idx === 0 ? 'th' : 'td';
          const bgStyle = idx === 0 ? 'background:#f5f5f5;font-weight:bold;' : '';
          tableHtml += '<tr>';
          for (const cell of cells) {
            tableHtml += `<${tag} style="border:1px solid #e0e0e0;padding:8px 12px;text-align:left;${bgStyle}">${processInline(cell)}</${tag}>`;
          }
          tableHtml += '</tr>';
        });
        tableHtml += '</table>';
        htmlBlocks.push(tableHtml);
        paragraphCount++; maybeInsertImage();
      }
      continue;
    }

    // 无序列表（连续 - 或 * 开头）
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(processInline(lines[i].trim().replace(/^[-*]\s+/, '')));
        i++;
      }
      let listHtml = '<ul style="margin:16px 0;padding-left:24px;">';
      for (const item of items) {
        listHtml += `<li style="font-size:16px;color:#3f3f3f;line-height:2;margin:4px 0;">${item}</li>`;
      }
      listHtml += '</ul>';
      htmlBlocks.push(listHtml);
      paragraphCount++; maybeInsertImage();
      continue;
    }

    // 有序列表（连续数字. 开头）
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(processInline(lines[i].trim().replace(/^\d+\.\s+/, '')));
        i++;
      }
      let listHtml = '<ol style="margin:16px 0;padding-left:24px;">';
      for (const item of items) {
        listHtml += `<li style="font-size:16px;color:#3f3f3f;line-height:2;margin:4px 0;">${item}</li>`;
      }
      listHtml += '</ol>';
      htmlBlocks.push(listHtml);
      paragraphCount++; maybeInsertImage();
      continue;
    }

    // 加粗段落标题（整行加粗）
    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      const text = trimmed.replace(/^\*\*(.+)\*\*$/, '$1');
      htmlBlocks.push(`<p style="font-weight:bold;font-size:18px;color:#2d2926;margin:24px 0 12px;line-height:1.6;">${text}</p>`);
      paragraphCount++; maybeInsertImage(); i++; continue;
    }

    // 普通段落
    htmlBlocks.push(`<p style="font-size:16px;color:#3f3f3f;margin:16px 0;line-height:2;letter-spacing:0.5px;">${processInline(trimmed)}</p>`);
    paragraphCount++; maybeInsertImage();
    i++;
  }

  return htmlBlocks.join('\n');
}

const { inputPath, outputPath, images } = parseArgs();
const md = fs.readFileSync(path.resolve(inputPath), 'utf8');
const html = mdToWxHtml(md, images);
fs.writeFileSync(path.resolve(outputPath), html, 'utf8');
console.log(`OK: ${path.resolve(outputPath)}`);
