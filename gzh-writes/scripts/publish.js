#!/usr/bin/env node

/**
 * 微信公众号草稿发布脚本
 * 用法：node publish.js --title "标题" --content article.html --cover cover.png --summary "摘要" [--author "作者"] [--comment 1]
 * 配置：~/.gzh-config.json { appId, appSecret, author? }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(require('os').homedir(), '.gzh-config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`配置文件不存在: ${CONFIG_PATH}`);
    console.error('请创建配置文件 ~/.gzh-config.json，内容如下：');
    console.error(JSON.stringify({
      appId: '你的appId',
      appSecret: '你的appSecret',
      author: '你的署名',
      original: 1,
      reprint: 1,
      comment: 1,
      comment_audience: 'all',
      auto_select_comment: 1
    }, null, 2));
    console.error('\n字段说明：');
    console.error('  appId/appSecret  — 公众号开发者凭证（必填）');
    console.error('  author           — 默认作者署名');
    console.error('  original         — 声明原创 (1=文字原创, 0=无需声明)');
    console.error('  reprint          — 快捷转载 (1=允许所有账号转载, 0=关闭)');
    console.error('  comment          — 开启留言 (1=开启, 0=关闭)');
    console.error('  comment_audience  — 谁可以留言 (all=所有人, fans=已关注, fans7=关注7天以上)');
    console.error('  auto_select_comment — 自动精选留言 (1=开启, 0=关闭)');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!config.appId || !config.appSecret) {
    console.error('配置文件缺少 appId 或 appSecret');
    process.exit(1);
  }
  if (!config.author) {
    console.warn('提示：~/.gzh-config.json 中未设置 author（作者署名），建议补充');
  }
  return config;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    params[key] = args[i + 1];
  }
  if (!params.title || !params.content || !params.cover) {
    console.error('用法: node publish.js --title "标题" --content article.html --cover cover.png --summary "摘要" [--author "作者"] [--comment 1]');
    console.error('可选参数:');
    console.error('  --author "作者名"   作者署名（也可在 ~/.gzh-config.json 中设置 author 字段）');
    console.error('  --comment 1|0      是否开启留言（默认 1）');
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

  const author = params.author || config.author || '';
  const needComment = (params.comment !== undefined ? params.comment : String(config.comment ?? 1)) !== '0';
  const onlyFans = config.comment_audience === 'fans' ? 1 : config.comment_audience === 'fans7' ? 2 : 0;

  console.log('正在创建草稿...');
  const draftId = await createDraft(token, {
    title: params.title,
    author: author,
    thumb_media_id: thumbMediaId,
    content: content,
    digest: params.summary || '',
    content_source_url: '',
    need_open_comment: needComment ? 1 : 0,
    only_fans_can_comment: onlyFans
  });

  console.log(`\n草稿创建成功！`);
  console.log(`草稿 media_id: ${draftId}`);
  console.log(`作者署名: ${author || '(未设置)'}`);
  console.log(`声明原创: ${config.original ? '文字原创' : '无需声明'}（需后台确认）`);
  console.log(`快捷转载: ${config.reprint ? '已开启' : '未开启'}（需后台确认）`);
  console.log(`留言功能: ${needComment ? '已开启' : '未开启'}`);
  if (needComment) {
    const audienceMap = { all: '所有人', fans: '已关注的人', fans7: '已关注7天及以上的人' };
    console.log(`留言范围: ${audienceMap[config.comment_audience] || '所有人'}`);
    console.log(`自动精选: ${config.auto_select_comment ? '已开启' : '未开启'}（需后台确认）`);
  }
  console.log('\n提示：原创声明、快捷转载、自动精选留言需登录 mp.weixin.qq.com → 草稿箱 → 手动设置');
  console.log('如需群发通知或定时发布，也请在后台操作。');
}

main().catch(err => {
  console.error('发布失败:', err.message);
  process.exit(1);
});
