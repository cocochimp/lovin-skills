#!/usr/bin/env node

/**
 * 微信公众号草稿发布脚本
 * 用法：node publish.js --title "标题" --content article.html --cover cover.png --summary "摘要"
 * 配置：~/.gzh-config.json { appId, appSecret }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(require('os').homedir(), '.gzh-config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`配置文件不存在: ${CONFIG_PATH}`);
    console.error('请创建配置文件: {"appId":"xxx","appSecret":"xxx"}');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    params[key] = args[i + 1];
  }
  if (!params.title || !params.content || !params.cover) {
    console.error('用法: node publish.js --title "标题" --content article.html --cover cover.png --summary "摘要"');
    process.exit(1);
  }
  return params;
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function uploadFile(url, filePath, fieldName, formFields = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now().toString(16);
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
    const mime = mimeTypes[ext] || 'application/octet-stream';

    let body = '';
    for (const [key, val] of Object.entries(formFields)) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
    }
    const prefix = Buffer.from(
      body + `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([prefix, fileData, suffix]);

    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function getAccessToken(appId, appSecret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await request(url);
  if (res.errcode) {
    console.error('获取 access_token 失败:', res.errmsg);
    process.exit(1);
  }
  return res.access_token;
}

async function uploadImage(token, imagePath) {
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;
  const res = await uploadFile(url, imagePath, 'media');
  if (res.errcode) {
    console.error('上传图片失败:', res.errmsg);
    process.exit(1);
  }
  console.log(`图片上传成功: ${path.basename(imagePath)} → ${res.media_id}`);
  return res;
}

async function uploadContentImage(token, imagePath) {
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;
  const res = await uploadFile(url, imagePath, 'media');
  if (res.errcode) {
    console.error('上传正文图片失败:', res.errmsg);
    process.exit(1);
  }
  console.log(`正文图片上传成功: ${path.basename(imagePath)} → ${res.url}`);
  return res.url;
}

async function createDraft(token, article) {
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
  const body = JSON.stringify({ articles: [article] });
  const res = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });
  if (res.errcode) {
    console.error('创建草稿失败:', res.errmsg);
    process.exit(1);
  }
  return res.media_id || res.msg_data_id || JSON.stringify(res);
}

async function main() {
  const config = loadConfig();
  const params = parseArgs();

  console.log('正在获取 access_token...');
  const token = await getAccessToken(config.appId, config.appSecret);

  console.log('正在上传封面图...');
  const coverRes = await uploadImage(token, path.resolve(params.cover));
  const thumbMediaId = coverRes.media_id;

  // 读取 HTML 正文
  let content = fs.readFileSync(path.resolve(params.content), 'utf8');

  // 查找正文中的本地图片并上传替换
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match;
  const localImages = [];
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1];
    if (!src.startsWith('http')) {
      localImages.push(src);
    }
  }
  const contentDir = path.dirname(path.resolve(params.content));
  for (const imgPath of localImages) {
    const resolvedImg = path.isAbsolute(imgPath) ? imgPath : path.resolve(contentDir, imgPath);
    console.log(`正在上传正文图片: ${resolvedImg}...`);
    const wxUrl = await uploadContentImage(token, resolvedImg);
    content = content.replace(imgPath, wxUrl);
  }

  console.log('正在创建草稿...');
  const draftId = await createDraft(token, {
    title: params.title,
    thumb_media_id: thumbMediaId,
    content: content,
    digest: params.summary || '',
    content_source_url: '',
    need_open_comment: 0
  });

  console.log(`\n草稿创建成功！`);
  console.log(`草稿 media_id: ${draftId}`);
  console.log('请登录 mp.weixin.qq.com 查看草稿箱');
}

main().catch(err => {
  console.error('发布失败:', err.message);
  process.exit(1);
});
