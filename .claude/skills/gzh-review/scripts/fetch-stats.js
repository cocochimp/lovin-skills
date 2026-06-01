#!/usr/bin/env node

/**
 * 微信公众号数据拉取脚本
 * 用法：node fetch-stats.js --days 14 [--format json|table] [--schema]
 * 配置：~/.gzh-config.json { appId, appSecret }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(require('os').homedir(), '.gzh-config.json');
const DOCS_GZH_DIR = path.resolve(__dirname, '../../../../docs/gzh');

// ── 从 publish.js 复制的基础函数 ──

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`配置文件不存在: ${CONFIG_PATH}`);
    console.error('请创建配置文件 ~/.gzh-config.json，内容如下：');
    console.error(JSON.stringify({ appId: '你的appId', appSecret: '你的appSecret' }, null, 2));
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!config.appId || !config.appSecret) {
    console.error('配置文件缺少 appId 或 appSecret');
    process.exit(1);
  }
  return config;
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

async function getAccessToken(appId, appSecret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await request(url);
  if (res.errcode) {
    console.error('获取 access_token 失败:', res.errmsg);
    process.exit(1);
  }
  return res.access_token;
}

// ── POST 请求封装 ──

async function post(url, body) {
  const jsonBody = JSON.stringify(body);
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(jsonBody) },
    body: jsonBody
  });
}

// ── 参数解析 ──

function parseArgs() {
  const args = process.argv.slice(2);
  const params = { days: 14, format: 'json' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schema') { params.schema = true; continue; }
    if (args[i] === '--days' && args[i + 1]) { params.days = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--format' && args[i + 1]) { params.format = args[i + 1]; i++; }
  }
  return params;
}

// ── JSON Schema 输出 ──

function printSchema() {
  const schema = {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: { start: { type: 'string' }, end: { type: 'string' } }
      },
      articles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            publish_time: { type: 'string' },
            int_page_read_count: { type: 'number', description: '阅读量' },
            share_count: { type: 'number', description: '分享次数' },
            add_to_fav_count: { type: 'number', description: '收藏次数' },
            like_count: { type: 'number', description: '点赞次数' },
            local_file: { type: 'string', description: '本地文件路径' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      user_summary: {
        type: 'object',
        properties: {
          new_user: { type: 'number' },
          cancel_user: { type: 'number' },
          net_growth: { type: 'number' }
        }
      }
    }
  };
  console.log(JSON.stringify(schema, null, 2));
}

// ── 日期工具 ──

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── 微信 API 调用 ──

async function fetchPublishedArticles(token, days) {
  const articles = [];
  let offset = 0;
  const count = 20;
  const cutoff = Date.now() / 1000 - days * 86400;

  while (true) {
    const url = `https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`;
    const res = await post(url, { offset, count, no_content: 1 });
    if (res.errcode) {
      console.error('获取文章列表失败:', res.errcode, res.errmsg);
      break;
    }
    const items = res.item || [];
    if (items.length === 0) break;

    for (const item of items) {
      const news = item.content?.news_item || [];
      const publishTime = item.update_time || 0;
      if (publishTime < cutoff) continue;
      for (const article of news) {
        articles.push({
          title: article.title,
          article_id: item.article_id,
          publish_time: formatDate(new Date(publishTime * 1000)),
          url: article.url
        });
      }
    }

    // 如果最旧的一条已超出范围，停止翻页
    const oldest = items[items.length - 1];
    if ((oldest.update_time || 0) < cutoff) break;
    if (items.length < count) break;
    offset += count;
  }

  return articles;
}

async function fetchArticleStats(token, startDate, endDate) {
  // getarticletotal 一次只能查 1 天，需要逐天查询
  const stats = {};
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = formatDate(current);
    const url = `https://api.weixin.qq.com/datacube/getarticletotal?access_token=${token}`;
    const res = await post(url, { begin_date: dateStr, end_date: dateStr });

    if (res.errcode) {
      // 40035 = 日期不合法，可能是未来日期，跳过
      if (res.errcode !== 40035) {
        console.error(`获取 ${dateStr} 文章数据失败:`, res.errcode, res.errmsg);
      }
      current = addDays(current, 1);
      continue;
    }

    for (const item of (res.list || [])) {
      const title = item.msgid ? item.title : '';
      const details = item.details || [];
      // 取最新一天的累计数据（stat_date 最大的）
      const latest = details.sort((a, b) => (b.stat_date || '').localeCompare(a.stat_date || ''))[0];
      if (latest && item.title) {
        stats[item.title] = {
          int_page_read_count: latest.int_page_read_count || 0,
          share_count: latest.share_count || 0,
          add_to_fav_count: latest.add_to_fav_count || 0,
          like_count: latest.like_count || 0
        };
      }
    }

    current = addDays(current, 1);
  }
  return stats;
}

async function fetchUserSummary(token, startDate, endDate) {
  // getusersummary 一次最多 7 天
  let totalNew = 0, totalCancel = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const chunkEnd = new Date(Math.min(addDays(current, 6).getTime(), end.getTime()));
    const url = `https://api.weixin.qq.com/datacube/getusersummary?access_token=${token}`;
    const res = await post(url, {
      begin_date: formatDate(current),
      end_date: formatDate(chunkEnd)
    });

    if (!res.errcode && res.list) {
      for (const day of res.list) {
        totalNew += day.new_user || 0;
        totalCancel += day.cancel_user || 0;
      }
    }

    current = addDays(chunkEnd, 1);
  }

  return { new_user: totalNew, cancel_user: totalCancel, net_growth: totalNew - totalCancel };
}

// ── 本地文章匹配 ──

function loadLocalArticles() {
  if (!fs.existsSync(DOCS_GZH_DIR)) return [];

  const files = fs.readdirSync(DOCS_GZH_DIR).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(DOCS_GZH_DIR, f), 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];
    const title = (fm.match(/^title:\s*(.+)$/m) || [])[1]?.trim() || '';
    const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [];

    return { file: `docs/gzh/${f}`, title, tags };
  }).filter(Boolean);
}

function matchLocalFile(articleTitle, localArticles) {
  // 模糊匹配：本地标题包含线上标题的前 8 个字，或线上标题包含本地标题的前 8 个字
  for (const local of localArticles) {
    const a = articleTitle.replace(/\s+/g, '');
    const b = local.title.replace(/\s+/g, '');
    if (a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8))) {
      return local;
    }
  }
  return null;
}

// ── 表格输出 ──

function printTable(data) {
  console.log(`\n期间: ${data.period.start} ~ ${data.period.end}`);
  console.log(`文章数: ${data.articles.length}\n`);

  if (data.articles.length > 0) {
    console.log('标题'.padEnd(30) + '日期'.padEnd(14) + '阅读'.padEnd(8) + '分享'.padEnd(8) + '点赞'.padEnd(8) + '收藏');
    console.log('-'.repeat(80));
    for (const a of data.articles) {
      const title = a.title.length > 28 ? a.title.slice(0, 27) + '…' : a.title;
      console.log(
        title.padEnd(30) +
        a.publish_time.padEnd(14) +
        String(a.int_page_read_count).padEnd(8) +
        String(a.share_count).padEnd(8) +
        String(a.like_count).padEnd(8) +
        String(a.add_to_fav_count)
      );
    }
  }

  console.log(`\n用户: 新增 ${data.user_summary.new_user} / 取关 ${data.user_summary.cancel_user} / 净增 ${data.user_summary.net_growth}`);
}

// ── 主流程 ──

async function main() {
  const params = parseArgs();

  if (params.schema) {
    printSchema();
    process.exit(0);
  }

  const config = loadConfig();
  const endDate = new Date();
  const startDate = addDays(endDate, -params.days);

  console.error(`正在拉取最近 ${params.days} 天的数据...`);
  const token = await getAccessToken(config.appId, config.appSecret);

  // 并行拉取文章列表和用户数据
  console.error('正在获取文章列表...');
  const articles = await fetchPublishedArticles(token, params.days);
  console.error(`找到 ${articles.length} 篇文章`);

  // 拉取每篇文章的详细数据
  console.error('正在获取文章数据统计...');
  const stats = await fetchArticleStats(token, formatDate(startDate), formatDate(endDate));

  console.error('正在获取用户增长数据...');
  const userSummary = await fetchUserSummary(token, formatDate(startDate), formatDate(endDate));

  // 本地文章匹配
  const localArticles = loadLocalArticles();

  // 组装结果
  const result = {
    period: { start: formatDate(startDate), end: formatDate(endDate) },
    articles: articles.map(a => {
      const s = stats[a.title] || { int_page_read_count: 0, share_count: 0, add_to_fav_count: 0, like_count: 0 };
      const local = matchLocalFile(a.title, localArticles);
      return {
        title: a.title,
        publish_time: a.publish_time,
        int_page_read_count: s.int_page_read_count,
        share_count: s.share_count,
        add_to_fav_count: s.add_to_fav_count,
        like_count: s.like_count,
        local_file: local?.file || null,
        tags: local?.tags || []
      };
    }),
    user_summary: userSummary
  };

  if (params.format === 'table') {
    printTable(result);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  console.error('拉取失败:', err.message);
  process.exit(1);
});
