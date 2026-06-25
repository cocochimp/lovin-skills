# gzh-studio 后端基础 + Mock 管道 实现计划（计划 1/4）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出 gzh-studio 后端骨架，跑通一条由 Mock Agent 驱动的 4 步撰文假流程（选题→写文→配图→发布），全程不调用真实 AI、可单测。

**Architecture:** Fastify 单进程，分四个内聚模块——配置层（channels/style 读写）、数据层（任务/热点文件持久化）、闸门管理器（present_* 的挂起 Promise 注册表）、SSE 广播器。Mock Agent 把这些拼成一条脚本化流程：每步调闸门挂起 → SSE 推前端 → `respond` resolve → 进下一步。计划 3 用真 Agent SDK 替换 Mock Agent，其余模块不动。

**Tech Stack:** TypeScript (ESM)、Fastify、Vitest、tsx、Node ≥20 内置 fs/promises。

**目标目录：** `/Users/lovin/Desktop/AgentTest/gzh-studio`（新建，本计划只动 `server/`、根 `package.json`、`config/`）。

---

### Task 1: 仓库与 server 骨架

**Files:**
- Create: `gzh-studio/package.json`
- Create: `gzh-studio/server/package.json`
- Create: `gzh-studio/server/tsconfig.json`
- Create: `gzh-studio/server/vitest.config.ts`
- Create: `gzh-studio/server/src/types.ts`
- Create: `gzh-studio/server/src/app.ts`
- Create: `gzh-studio/server/src/index.ts`
- Test: `gzh-studio/server/src/app.test.ts`

- [ ] **Step 1: 根 workspace package.json**

```json
{
  "name": "gzh-studio",
  "private": true,
  "workspaces": ["server", "client"]
}
```

- [ ] **Step 2: server package.json**

```json
{
  "name": "@gzh-studio/server",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "fastify": "^4.28.0"
  },
  "devDependencies": {
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 5: 共享类型 src/types.ts**

```ts
export type WizardStep = "topic" | "write" | "image" | "publish";

export interface Topic { id: string; title: string; summary: string; sourceUrl?: string; }
export interface TitleOption { id: string; label: string; group: "subjective" | "objective"; }

export type PresentPayload =
  | { tool: "present_topics"; topics: Topic[] }
  | { tool: "present_draft"; titleOptions: TitleOption[]; contentMd: string; frontmatter: Record<string, unknown> }
  | { tool: "present_covers"; options: { id: string; previewUrl: string; desc: string }[] }
  | { tool: "present_images"; cover: { url: string }; dataChart: { url: string } }
  | { tool: "present_publish"; checklist: string[] }
  | { tool: "report_result"; mediaId: string };

export type GateResponse =
  | { type: "confirm"; selection: unknown }
  | { type: "revise"; feedback: string }
  | { type: "regenerate" };

export type SseEvent =
  | { event: "status"; data: { line: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "present"; data: { gateId: string; payload: PresentPayload } }
  | { event: "step_done"; data: { step: WizardStep } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { mediaId?: string } };

export interface TaskRecord {
  id: string;
  status: "running" | "awaiting" | "done" | "error";
  currentStep: WizardStep;
  seed?: { title: string; url: string };
  title?: string;
  createdAt: string;
}
```

- [ ] **Step 6: 写失败测试 src/app.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("app", () => {
  it("GET /api/health returns ok", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 7: 运行测试确认失败**

Run: `cd gzh-studio/server && npm install && npm test`
Expected: FAIL —— `Cannot find module './app.js'`

- [ ] **Step 8: 实现 app.ts**

```ts
import Fastify, { FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
```

- [ ] **Step 9: 实现 index.ts**

```ts
import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 5174);
app.listen({ port }).then(() => console.log(`server on :${port}`));
```

- [ ] **Step 10: 运行测试确认通过**

Run: `npm test`
Expected: PASS（1 passed）

- [ ] **Step 11: 提交**

```bash
cd gzh-studio && git init -q && git add . && git commit -q -m "feat: scaffold gzh-studio server with health route"
```

---

### Task 2: 配置层（channels / style 读写）

**Files:**
- Create: `gzh-studio/config/channels.json`
- Create: `gzh-studio/config/style.json`
- Create: `gzh-studio/server/src/config.ts`
- Test: `gzh-studio/server/src/config.test.ts`

- [ ] **Step 1: 种子配置文件 config/channels.json**

```json
[
  { "name": "36氪", "url": "https://www.36kr.com", "category": "综合/科技" }
]
```

- [ ] **Step 2: config/style.json**

```json
{ "description": "" }
```

- [ ] **Step 3: 写失败测试 config.test.ts**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore } from "./config.js";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "cfg-")); });

describe("ConfigStore", () => {
  it("returns defaults when files absent", async () => {
    const store = new ConfigStore(dir);
    expect(await store.getChannels()).toEqual([]);
    expect(await store.getStyle()).toEqual({ description: "" });
  });

  it("persists channels to channels.json", async () => {
    const store = new ConfigStore(dir);
    const channels = [{ name: "虎嗅", url: "https://huxiu.com", category: "商业" }];
    await store.setChannels(channels);
    expect(await store.getChannels()).toEqual(channels);
    const raw = JSON.parse(await readFile(join(dir, "channels.json"), "utf8"));
    expect(raw).toEqual(channels);
  });

  it("persists style description", async () => {
    const store = new ConfigStore(dir);
    await store.setStyle({ description: "克制中立" });
    expect(await store.getStyle()).toEqual({ description: "克制中立" });
  });
});
```

- [ ] **Step 4: 运行确认失败**

Run: `npm test src/config.test.ts`
Expected: FAIL —— `Cannot find module './config.js'`

- [ ] **Step 5: 实现 config.ts**

```ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface Channel { name: string; url: string; category: string; }
export interface Style { description: string; }

export class ConfigStore {
  constructor(private dir: string) {}

  private async readJson<T>(file: string, fallback: T): Promise<T> {
    try { return JSON.parse(await readFile(join(this.dir, file), "utf8")) as T; }
    catch { return fallback; }
  }
  private async writeJson(file: string, data: unknown): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, file), JSON.stringify(data, null, 2), "utf8");
  }

  getChannels() { return this.readJson<Channel[]>("channels.json", []); }
  setChannels(c: Channel[]) { return this.writeJson("channels.json", c); }
  getStyle() { return this.readJson<Style>("style.json", { description: "" }); }
  setStyle(s: Style) { return this.writeJson("style.json", s); }
}
```

- [ ] **Step 6: 运行确认通过**

Run: `npm test src/config.test.ts`
Expected: PASS（3 passed）

- [ ] **Step 7: 提交**

```bash
git add . && git commit -q -m "feat: add config store for channels and style"
```

---

### Task 3: 数据层（任务 + 热点文件持久化）

**Files:**
- Create: `gzh-studio/server/src/store.ts`
- Test: `gzh-studio/server/src/store.test.ts`

- [ ] **Step 1: 写失败测试 store.test.ts**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DataStore } from "./store.js";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "store-")); });

describe("DataStore", () => {
  it("creates and reads back a task", async () => {
    const store = new DataStore(dir);
    const task = await store.createTask({ seed: { title: "A", url: "u" } });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("running");
    expect(task.currentStep).toBe("topic");
    const loaded = await store.getTask(task.id);
    expect(loaded?.seed).toEqual({ title: "A", url: "u" });
  });

  it("lists tasks newest first", async () => {
    const store = new DataStore(dir);
    const a = await store.createTask({});
    const b = await store.createTask({});
    const ids = (await store.listTasks()).map((t) => t.id);
    expect(ids).toEqual([b.id, a.id]);
  });

  it("updates task fields", async () => {
    const store = new DataStore(dir);
    const t = await store.createTask({});
    await store.updateTask(t.id, { status: "done", title: "终稿" });
    const loaded = await store.getTask(t.id);
    expect(loaded?.status).toBe("done");
    expect(loaded?.title).toBe("终稿");
  });

  it("saves and reads hotspots snapshot", async () => {
    const store = new DataStore(dir);
    await store.saveHotspots({ "36氪": [{ title: "X", url: "ux" }] });
    const snap = await store.getHotspots();
    expect(snap?.channels["36氪"][0].title).toBe("X");
    expect(snap?.fetchedAt).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test src/store.test.ts`
Expected: FAIL —— `Cannot find module './store.js'`

- [ ] **Step 3: 实现 store.ts**

`createdAt` 用单调计数器后缀保证列表稳定排序（避免同毫秒乱序）。

```ts
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { TaskRecord, WizardStep } from "./types.js";

export interface Hotspots { channels: Record<string, { title: string; url: string }[]>; fetchedAt: string; }

export class DataStore {
  private seq = 0;
  constructor(private dir: string) {}

  private taskDir(id: string) { return join(this.dir, "tasks", id); }

  async createTask(input: { seed?: { title: string; url: string } }): Promise<TaskRecord> {
    const id = randomUUID();
    const task: TaskRecord = {
      id, status: "running", currentStep: "topic",
      seed: input.seed, createdAt: `${Date.now()}-${this.seq++}`,
    };
    await mkdir(join(this.taskDir(id), "steps"), { recursive: true });
    await mkdir(join(this.taskDir(id), "assets"), { recursive: true });
    await this.writeTask(task);
    return task;
  }

  private async writeTask(task: TaskRecord) {
    await writeFile(join(this.taskDir(task.id), "task.json"), JSON.stringify(task, null, 2));
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    try { return JSON.parse(await readFile(join(this.taskDir(id), "task.json"), "utf8")); }
    catch { return null; }
  }

  async updateTask(id: string, patch: Partial<TaskRecord>): Promise<void> {
    const cur = await this.getTask(id);
    if (!cur) throw new Error(`task ${id} not found`);
    await this.writeTask({ ...cur, ...patch });
  }

  async listTasks(): Promise<TaskRecord[]> {
    let ids: string[];
    try { ids = await readdir(join(this.dir, "tasks")); } catch { return []; }
    const tasks = (await Promise.all(ids.map((id) => this.getTask(id)))).filter(Boolean) as TaskRecord[];
    return tasks.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async saveStep(id: string, step: WizardStep, data: unknown): Promise<void> {
    await writeFile(join(this.taskDir(id), "steps", `${step}.json`), JSON.stringify(data, null, 2));
  }

  async saveHotspots(channels: Hotspots["channels"]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const snap: Hotspots = { channels, fetchedAt: new Date().toISOString() };
    await writeFile(join(this.dir, "hotspots.json"), JSON.stringify(snap, null, 2));
  }

  async getHotspots(): Promise<Hotspots | null> {
    try { return JSON.parse(await readFile(join(this.dir, "hotspots.json"), "utf8")); }
    catch { return null; }
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test src/store.test.ts`
Expected: PASS（4 passed）

- [ ] **Step 5: 提交**

```bash
git add . && git commit -q -m "feat: add filesystem data store for tasks and hotspots"
```

---

### Task 4: 闸门管理器（present_* 挂起/resolve）

**Files:**
- Create: `gzh-studio/server/src/gates.ts`
- Test: `gzh-studio/server/src/gates.test.ts`

- [ ] **Step 1: 写失败测试 gates.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { GateManager } from "./gates.js";
import type { GateResponse } from "./types.js";

describe("GateManager", () => {
  it("open() resolves when resolve() is called with response", async () => {
    const gm = new GateManager();
    const onPresent = vi.fn();
    const promise = gm.open("task1", { tool: "present_topics", topics: [] }, onPresent);
    expect(onPresent).toHaveBeenCalledOnce();
    const gateId = onPresent.mock.calls[0][0];
    const resp: GateResponse = { type: "confirm", selection: 1 };
    gm.resolve("task1", gateId, resp);
    await expect(promise).resolves.toEqual(resp);
  });

  it("resolve() with unknown gateId throws", () => {
    const gm = new GateManager();
    expect(() => gm.resolve("task1", "nope", { type: "regenerate" }))
      .toThrow(/no pending gate/);
  });

  it("rejects pending gates on abort", async () => {
    const gm = new GateManager();
    const p = gm.open("task1", { tool: "present_publish", checklist: [] }, () => {});
    gm.abort("task1");
    await expect(p).rejects.toThrow(/aborted/);
  });
});
```

注：测试用到 `vi`，文件顶部加 `import { vi } from "vitest";`。

- [ ] **Step 2: 运行确认失败**

Run: `npm test src/gates.test.ts`
Expected: FAIL —— `Cannot find module './gates.js'`

- [ ] **Step 3: 实现 gates.ts**

```ts
import { randomUUID } from "node:crypto";
import type { GateResponse, PresentPayload } from "./types.js";

type Pending = { resolve: (r: GateResponse) => void; reject: (e: Error) => void };

export class GateManager {
  private pending = new Map<string, Pending>();

  private key(taskId: string, gateId: string) { return `${taskId}:${gateId}`; }

  open(
    taskId: string,
    payload: PresentPayload,
    onPresent: (gateId: string, payload: PresentPayload) => void,
  ): Promise<GateResponse> {
    const gateId = randomUUID();
    const p = new Promise<GateResponse>((resolve, reject) => {
      this.pending.set(this.key(taskId, gateId), { resolve, reject });
    });
    onPresent(gateId, payload);
    return p;
  }

  resolve(taskId: string, gateId: string, response: GateResponse): void {
    const k = this.key(taskId, gateId);
    const entry = this.pending.get(k);
    if (!entry) throw new Error(`no pending gate ${gateId} for task ${taskId}`);
    this.pending.delete(k);
    entry.resolve(response);
  }

  abort(taskId: string): void {
    for (const [k, entry] of this.pending) {
      if (k.startsWith(`${taskId}:`)) {
        this.pending.delete(k);
        entry.reject(new Error("gate aborted"));
      }
    }
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test src/gates.test.ts`
Expected: PASS（3 passed）

- [ ] **Step 5: 提交**

```bash
git add . && git commit -q -m "feat: add gate manager for human-in-the-loop confirmation"
```

---

### Task 5: SSE 广播器

**Files:**
- Create: `gzh-studio/server/src/sse.ts`
- Test: `gzh-studio/server/src/sse.test.ts`

- [ ] **Step 1: 写失败测试 sse.test.ts**

```ts
import { describe, it, expect, vi } from "vitest";
import { SseBroker } from "./sse.js";

describe("SseBroker", () => {
  it("delivers events to subscribers of a task", () => {
    const broker = new SseBroker();
    const received: unknown[] = [];
    broker.subscribe("t1", (e) => received.push(e));
    broker.publish("t1", { event: "status", data: { line: "hi" } });
    expect(received).toEqual([{ event: "status", data: { line: "hi" } }]);
  });

  it("does not deliver across tasks", () => {
    const broker = new SseBroker();
    const cb = vi.fn();
    broker.subscribe("t1", cb);
    broker.publish("t2", { event: "done", data: {} });
    expect(cb).not.toHaveBeenCalled();
  });

  it("unsubscribe stops delivery", () => {
    const broker = new SseBroker();
    const cb = vi.fn();
    const off = broker.subscribe("t1", cb);
    off();
    broker.publish("t1", { event: "done", data: {} });
    expect(cb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test src/sse.test.ts`
Expected: FAIL —— `Cannot find module './sse.js'`

- [ ] **Step 3: 实现 sse.ts**

```ts
import type { SseEvent } from "./types.js";

type Listener = (e: SseEvent) => void;

export class SseBroker {
  private subs = new Map<string, Set<Listener>>();

  subscribe(taskId: string, listener: Listener): () => void {
    let set = this.subs.get(taskId);
    if (!set) { set = new Set(); this.subs.set(taskId, set); }
    set.add(listener);
    return () => { set!.delete(listener); };
  }

  publish(taskId: string, event: SseEvent): void {
    this.subs.get(taskId)?.forEach((l) => l(event));
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test src/sse.test.ts`
Expected: PASS（3 passed）

- [ ] **Step 5: 提交**

```bash
git add . && git commit -q -m "feat: add per-task SSE broker"
```

---

### Task 6: Mock Agent（脚本化 4 步流程）

**Files:**
- Create: `gzh-studio/server/src/agent/types.ts`
- Create: `gzh-studio/server/src/agent/mock.ts`
- Test: `gzh-studio/server/src/agent/mock.test.ts`

- [ ] **Step 1: Agent 运行器接口 agent/types.ts**

计划 3 的真 Agent SDK 实现将满足同一接口，路由层不感知差异。

```ts
import type { GateResponse, PresentPayload, WizardStep } from "../types.js";

export interface AgentContext {
  emitStatus(line: string): void;
  emitDelta(text: string): void;
  emitStepDone(step: WizardStep): void;
  /** 调用 present_* 工具：挂起直到用户响应 */
  present(payload: PresentPayload): Promise<GateResponse>;
}

export interface AgentRunner {
  run(ctx: AgentContext): Promise<{ mediaId: string }>;
}
```

- [ ] **Step 2: 写失败测试 agent/mock.test.ts**

```ts
import { describe, it, expect, vi } from "vitest";
import { MockAgent } from "./mock.js";
import type { AgentContext } from "./types.js";

function ctxThatAlwaysConfirms(presented: any[]): AgentContext {
  return {
    emitStatus: vi.fn(),
    emitDelta: vi.fn(),
    emitStepDone: vi.fn(),
    present: vi.fn(async (payload) => { presented.push(payload); return { type: "confirm", selection: 0 }; }),
  };
}

describe("MockAgent", () => {
  it("walks all four steps and returns a mediaId", async () => {
    const presented: any[] = [];
    const ctx = ctxThatAlwaysConfirms(presented);
    const result = await new MockAgent({ title: "种子文", url: "u" }).run(ctx);
    expect(presented.map((p) => p.tool)).toEqual([
      "present_topics", "present_draft", "present_covers", "present_images", "present_publish",
    ]);
    expect(result.mediaId).toMatch(/^mock-/);
    expect(ctx.emitStepDone).toHaveBeenCalledWith("topic");
    expect(ctx.emitStepDone).toHaveBeenCalledWith("publish");
  });

  it("re-presents the same step on revise", async () => {
    const presented: any[] = [];
    let first = true;
    const ctx: AgentContext = {
      emitStatus: vi.fn(), emitDelta: vi.fn(), emitStepDone: vi.fn(),
      present: vi.fn(async (payload) => {
        presented.push(payload.tool);
        if (payload.tool === "present_topics" && first) { first = false; return { type: "revise", feedback: "换个角度" }; }
        return { type: "confirm", selection: 0 };
      }),
    };
    await new MockAgent().run(ctx);
    expect(presented.filter((t) => t === "present_topics").length).toBe(2);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npm test src/agent/mock.test.ts`
Expected: FAIL —— `Cannot find module './mock.js'`

- [ ] **Step 4: 实现 agent/mock.ts**

```ts
import type { AgentContext, AgentRunner } from "./types.js";
import type { PresentPayload } from "../types.js";

export class MockAgent implements AgentRunner {
  constructor(private seed?: { title: string; url: string }) {}

  /** 反复 present 同一步，直到用户 confirm */
  private async gate(ctx: AgentContext, build: () => PresentPayload): Promise<void> {
    for (;;) {
      const resp = await ctx.present(build());
      if (resp.type === "confirm") return;
      ctx.emitStatus(resp.type === "revise" ? "根据反馈重新生成…" : "更换下一批…");
    }
  }

  async run(ctx: AgentContext) {
    const topic = this.seed?.title ?? "示例主题";

    ctx.emitStatus("正在抓取选题素材…");
    await this.gate(ctx, () => ({
      tool: "present_topics",
      topics: [
        { id: "t1", title: `${topic}：一个被忽略的切口`, summary: "人物驱动角度", sourceUrl: this.seed?.url },
        { id: "t2", title: `${topic} 背后的利益冲突`, summary: "冲突包装", sourceUrl: this.seed?.url },
      ],
    }));
    ctx.emitStepDone("topic");

    ctx.emitStatus("撰写初稿…");
    ctx.emitDelta("这是 Mock 初稿正文的逐字流式片段……");
    await this.gate(ctx, () => ({
      tool: "present_draft",
      titleOptions: [
        { id: "a", label: "主观标题 A", group: "subjective" },
        { id: "b", label: "客观标题 B", group: "objective" },
      ],
      contentMd: "## 初稿\n\n这是 Mock 初稿正文。",
      frontmatter: { date: "2026-06-25", tags: ["mock"] },
    }));
    ctx.emitStepDone("write");

    ctx.emitStatus("生成封面方案…");
    await this.gate(ctx, () => ({
      tool: "present_covers",
      options: [
        { id: "c1", previewUrl: "/mock/cover1.png", desc: "深色大标题" },
        { id: "c2", previewUrl: "/mock/cover2.png", desc: "极简留白" },
      ],
    }));
    await this.gate(ctx, () => ({
      tool: "present_images",
      cover: { url: "/mock/cover1.png" },
      dataChart: { url: "/mock/chart.png" },
    }));
    ctx.emitStepDone("image");

    ctx.emitStatus("准备发布清单…");
    await this.gate(ctx, () => ({
      tool: "present_publish",
      checklist: ["标题已选", "正文 700-900 字", "封面 + 数据图就绪"],
    }));
    ctx.emitStepDone("publish");

    return { mediaId: `mock-${topic}` };
  }
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test src/agent/mock.test.ts`
Expected: PASS（2 passed）

- [ ] **Step 6: 提交**

```bash
git add . && git commit -q -m "feat: add mock agent driving the four-step flow"
```

---

### Task 7: 任务编排服务（把模块拼起来）

**Files:**
- Create: `gzh-studio/server/src/orchestrator.ts`
- Test: `gzh-studio/server/src/orchestrator.test.ts`

**职责：** 收 `createTask` 请求 → 起一个 AgentRunner → 把 `AgentContext` 的 emit/present 接到 SSE 与 GateManager → present 时把任务状态切 `awaiting`、缓存 step、推 `present` 事件 → 收 `respond` 时 resolve 闸门 → 结束推 `done`。

- [ ] **Step 1: 写失败测试 orchestrator.test.ts**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Orchestrator } from "./orchestrator.js";
import { DataStore } from "./store.js";
import { GateManager } from "./gates.js";
import { SseBroker } from "./sse.js";
import { MockAgent } from "./agent/mock.js";
import type { SseEvent } from "./types.js";

let orch: Orchestrator, store: DataStore, broker: SseBroker;
beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "orch-"));
  store = new DataStore(dir);
  broker = new SseBroker();
  orch = new Orchestrator(store, new GateManager(), broker, () => new MockAgent());
});

describe("Orchestrator", () => {
  it("emits a present event and sets task awaiting", async () => {
    const t = await store.createTask({});
    const events: SseEvent[] = [];
    broker.subscribe(t.id, (e) => events.push(e));
    orch.start(t.id);
    await vi.waitFor(() => expect(events.some((e) => e.event === "present")).toBe(true));
    expect((await store.getTask(t.id))?.status).toBe("awaiting");
  });

  it("respond(confirm) advances to the next present", async () => {
    const t = await store.createTask({});
    const events: SseEvent[] = [];
    broker.subscribe(t.id, (e) => events.push(e));
    orch.start(t.id);
    await vi.waitFor(() => expect(events.at(-1)?.event).toBe("present"));
    const gateId = (events.findLast((e) => e.event === "present") as any).data.gateId;
    orch.respond(t.id, gateId, { type: "confirm", selection: 0 });
    await vi.waitFor(() =>
      expect(events.filter((e) => e.event === "present").length).toBeGreaterThanOrEqual(2));
  });

  it("reaches done with mediaId when all gates confirmed", async () => {
    const t = await store.createTask({});
    const events: SseEvent[] = [];
    broker.subscribe(t.id, (e) => events.push(e));
    orch.start(t.id);
    for (let i = 0; i < 5; i++) {
      await vi.waitFor(() => expect(events.findLast((e) => e.event === "present")).toBeTruthy());
      const present = events.findLast((e) => e.event === "present") as any;
      events.length = events.indexOf(present); // 移除已消费的 present，等待下一个
      orch.respond(t.id, present.data.gateId, { type: "confirm", selection: 0 });
    }
    await vi.waitFor(() => expect(events.some((e) => e.event === "done")).toBe(true));
    expect((await store.getTask(t.id))?.status).toBe("done");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test src/orchestrator.test.ts`
Expected: FAIL —— `Cannot find module './orchestrator.js'`

- [ ] **Step 3: 实现 orchestrator.ts**

```ts
import type { DataStore } from "./store.js";
import type { GateManager } from "./gates.js";
import type { SseBroker } from "./sse.js";
import type { AgentContext, AgentRunner } from "./agent/types.js";
import type { GateResponse, PresentPayload, WizardStep } from "./types.js";

const TOOL_STEP: Record<string, WizardStep> = {
  present_topics: "topic", present_draft: "write",
  present_covers: "image", present_images: "image", present_publish: "publish",
};

export class Orchestrator {
  constructor(
    private store: DataStore,
    private gates: GateManager,
    private broker: SseBroker,
    private makeAgent: (seed?: { title: string; url: string }) => AgentRunner,
  ) {}

  start(taskId: string): void {
    void this.run(taskId);
  }

  private async run(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId);
    if (!task) return;
    const agent = this.makeAgent(task.seed);
    const ctx: AgentContext = {
      emitStatus: (line) => this.broker.publish(taskId, { event: "status", data: { line } }),
      emitDelta: (text) => this.broker.publish(taskId, { event: "delta", data: { text } }),
      emitStepDone: (step) => this.broker.publish(taskId, { event: "step_done", data: { step } }),
      present: (payload) => this.present(taskId, payload),
    };
    try {
      const { mediaId } = await agent.run(ctx);
      await this.store.updateTask(taskId, { status: "done" });
      this.broker.publish(taskId, { event: "done", data: { mediaId } });
    } catch (err) {
      await this.store.updateTask(taskId, { status: "error" });
      this.broker.publish(taskId, { event: "error", data: { message: (err as Error).message } });
    }
  }

  private async present(taskId: string, payload: PresentPayload): Promise<GateResponse> {
    const step = TOOL_STEP[payload.tool] ?? "topic";
    await this.store.saveStep(taskId, step, payload);
    await this.store.updateTask(taskId, { status: "awaiting", currentStep: step });
    return this.gates.open(taskId, payload, (gateId, p) => {
      this.broker.publish(taskId, { event: "present", data: { gateId, payload: p } });
    });
  }

  respond(taskId: string, gateId: string, response: GateResponse): void {
    void this.store.updateTask(taskId, { status: "running" });
    this.gates.resolve(taskId, gateId, response);
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test src/orchestrator.test.ts`
Expected: PASS（3 passed）

- [ ] **Step 5: 提交**

```bash
git add . && git commit -q -m "feat: add orchestrator wiring agent to gates and sse"
```

---

### Task 8: REST + SSE 路由（端到端）

**Files:**
- Modify: `gzh-studio/server/src/app.ts`
- Create: `gzh-studio/server/src/routes.ts`
- Test: `gzh-studio/server/src/routes.test.ts`

- [ ] **Step 1: 写失败测试 routes.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "./app.js";

async function makeApp() {
  const dataDir = await mkdtemp(join(tmpdir(), "data-"));
  const configDir = await mkdtemp(join(tmpdir(), "config-"));
  return buildApp({ dataDir, configDir });
}

describe("routes", () => {
  it("POST /api/tasks creates a task", async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: "POST", url: "/api/tasks",
      payload: { seed: { title: "种子", url: "u" } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBeTruthy();
  });

  it("GET /api/tasks lists tasks", async () => {
    const app = await makeApp();
    await app.inject({ method: "POST", url: "/api/tasks", payload: {} });
    const res = await app.inject({ method: "GET", url: "/api/tasks" });
    expect(res.json().length).toBe(1);
  });

  it("PUT/GET /api/config/style round-trips", async () => {
    const app = await makeApp();
    await app.inject({ method: "PUT", url: "/api/config/style", payload: { description: "克制" } });
    const res = await app.inject({ method: "GET", url: "/api/config/style" });
    expect(res.json()).toEqual({ description: "克制" });
  });

  it("PUT/GET /api/config/channels round-trips", async () => {
    const app = await makeApp();
    const channels = [{ name: "虎嗅", url: "https://huxiu.com", category: "商业" }];
    await app.inject({ method: "PUT", url: "/api/config/channels", payload: channels });
    const res = await app.inject({ method: "GET", url: "/api/config/channels" });
    expect(res.json()).toEqual(channels);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test src/routes.test.ts`
Expected: FAIL —— `buildApp` 不接受参数 / 路由 404

- [ ] **Step 3: 实现 routes.ts**

```ts
import type { FastifyInstance } from "fastify";
import { DataStore } from "./store.js";
import { ConfigStore } from "./config.js";
import { GateManager } from "./gates.js";
import { SseBroker } from "./sse.js";
import { Orchestrator } from "./orchestrator.js";
import { MockAgent } from "./agent/mock.js";
import type { GateResponse } from "./types.js";

export interface Deps { dataDir: string; configDir: string; }

export function registerRoutes(app: FastifyInstance, deps: Deps): void {
  const store = new DataStore(deps.dataDir);
  const config = new ConfigStore(deps.configDir);
  const gates = new GateManager();
  const broker = new SseBroker();
  const orch = new Orchestrator(store, gates, broker, (seed) => new MockAgent(seed));

  app.post<{ Body: { seed?: { title: string; url: string } } }>("/api/tasks", async (req) => {
    const task = await store.createTask({ seed: req.body?.seed });
    orch.start(task.id);
    return task;
  });

  app.get("/api/tasks", async () => store.listTasks());
  app.get<{ Params: { id: string } }>("/api/tasks/:id", async (req, reply) => {
    const t = await store.getTask(req.params.id);
    return t ?? reply.code(404).send({ error: "not found" });
  });

  app.post<{ Params: { id: string }; Body: { gateId: string } & GateResponse }>(
    "/api/tasks/:id/respond",
    async (req) => {
      const { gateId, ...response } = req.body;
      orch.respond(req.params.id, gateId, response as GateResponse);
      return { ok: true };
    },
  );

  app.get<{ Params: { id: string } }>("/api/tasks/:id/stream", (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const off = broker.subscribe(req.params.id, (e) => {
      reply.raw.write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
    });
    req.raw.on("close", off);
  });

  app.get("/api/config/channels", async () => config.getChannels());
  app.put("/api/config/channels", async (req) => { await config.setChannels(req.body as any); return { ok: true }; });
  app.get("/api/config/style", async () => config.getStyle());
  app.put("/api/config/style", async (req) => { await config.setStyle(req.body as any); return { ok: true }; });

  app.get("/api/hotspots", async () => store.getHotspots());
}
```

- [ ] **Step 4: 改 app.ts 接受依赖并注册路由**

```ts
import Fastify, { FastifyInstance } from "fastify";
import { registerRoutes, type Deps } from "./routes.js";

export function buildApp(deps?: Partial<Deps>): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get("/api/health", async () => ({ status: "ok" }));
  registerRoutes(app, {
    dataDir: deps?.dataDir ?? "./server/data",
    configDir: deps?.configDir ?? "./config",
  });
  return app;
}
```

- [ ] **Step 5: 改 index.ts 传真实目录**

```ts
import { buildApp } from "./app.js";

const app = buildApp({ dataDir: "./data", configDir: "../config" });
const port = Number(process.env.PORT ?? 5174);
app.listen({ port }).then(() => console.log(`server on :${port}`));
```

- [ ] **Step 6: 运行全部测试确认通过**

Run: `npm test`
Expected: PASS（全部文件，含 health + config + store + gates + sse + mock + orchestrator + routes）

- [ ] **Step 7: 手动冒烟（可选）**

Run: `npm run dev`，另开终端：
```bash
curl -s localhost:5174/api/health        # {"status":"ok"}
curl -s -XPOST localhost:5174/api/tasks -H 'content-type: application/json' -d '{}'
```
Expected: 返回带 `id` 的任务 JSON。

- [ ] **Step 8: 提交**

```bash
git add . && git commit -q -m "feat: wire REST and SSE routes over mock orchestrator"
```

---

## 自检

**1. Spec 覆盖：**
- §2 技术栈（Fastify/TS/Vitest）→ Task 1 ✅
- §3.3 设置（channels/style 读写）→ Task 2、Task 8 ✅
- §4 UI 契约 present_* + GateResponse → types(Task 1) + GateManager(Task 4) + MockAgent(Task 6) ✅
- §4.2 人在环挂起/resolve → Task 4 + Task 7 ✅
- §6 步骤缓存 steps/<step>.json → `saveStep`(Task 3) + orchestrator(Task 7) ✅
- §7 API 面（tasks/respond/stream/config/hotspots）→ Task 8 ✅
- §7 SSE 事件类型 → types(Task 1) + SseBroker(Task 5) ✅
- §8 持久化布局（tasks/<id>/task.json、steps、assets、hotspots.json）→ Task 3 ✅
- §13 Mock Agent 模式 → Task 6 ✅
- **本计划范围外（留给后续计划）：** 真 Agent SDK（计划 3）、截图管道与 publish.js（计划 4）、前端（计划 2）、`/api/hotspots/refresh` 真抓取（计划 3，本计划仅 GET 缓存）。

**2. 占位符扫描：** 无 TBD/TODO；每个代码步均给出完整可运行代码。✅

**3. 类型一致性：** `PresentPayload.tool` 取值（present_topics/draft/covers/images/publish）在 types、mock、orchestrator(`TOOL_STEP`)、routes 中一致；`GateResponse` 三态在 gates/mock/orchestrator/routes 一致；`AgentContext`/`AgentRunner` 接口在 mock 与 orchestrator 间一致。✅

---

## 后续计划（占位，不在本计划实现）

- **计划 2：** 前端三视图（React+Vite+shadcn），由本计划的 Mock 后端驱动，产出可点端到端原型。
- **计划 3：** 真 Agent SDK 实现 `AgentRunner`（加载 gzh-writes skill、present_* 工具映射、会话 resume、`/hotspots/refresh` 真抓取），替换 MockAgent。
- **计划 4：** 截图管道（puppeteer + skill 模板）与发布（publish.js）接入配图/发布步。

---

## 交接说明（来自计划 1 最终整体 review）

计划 1 已完成，整体 review 结论 **READY**：23 测试通过、tsc 干净、端到端 HTTP 冒烟（POST /api/tasks → SSE → respond×5 → done）实测通过。模块边界清晰，`AgentRunner`/`AgentContext` 是干净的可替换缝。

**实现中相对计划的三处必要改进（已合入）：**
1. `DataStore.updateTask` 加 per-task 串行写队列，修复并发 read-modify-write 丢更新。
2. SSE handler 加 `reply.hijack()`，防止 Fastify 双发。
3. `orchestrator.respond` 用 `.catch(()=>{})` 处理 `updateTask` rejection。

**给计划 2（前端）：**
- HTTP 契约已稳定且实测：`POST /api/tasks {seed?}`→TaskRecord；SSE `/api/tasks/:id/stream` 推 `event:`/`data:` 帧；`POST /api/tasks/:id/respond {gateId, ...GateResponse}`。前端须从每个 `present` 事件捕获 `gateId` 回传。
- **`Last-Event-ID` 续传未实现**：重连后前端应改为重新 `GET /api/tasks/:id` + 各步缓存重建状态，勿依赖回放。
- **`DELETE /api/tasks/:id` 未实现**（spec §7 列出，Task 8 路由清单未含）：DraftList 删除前需补这个路由。
- config PUT 端点不做校验，前端负责载荷形状正确。

**给计划 3（真 Agent SDK）：**
- 替换点是 `routes.ts` 里 `makeAgent` 这一个 lambda，其他模块不动。
- **把 `gates.abort(taskId)` 接入 `orchestrator.run` 的 catch**：真 agent 在 gate pending 时抛错会永久泄漏 Promise。注意需同时保持 `present()` 现有顺序（先 `saveStep`+`updateTask("awaiting")` 再 `gates.open` 发 present 事件），并妥善处理 happy-path 状态写顺序——计划 1 中一次"提前发 present + abort 标志"的尝试因破坏该顺序已回退。
- 补错误路径测试（故障注入 agent → 断言 SSE `error` + pending gates 被 reject）。
- `/api/hotspots/refresh` 真抓取在此计划落地（计划 1 仅 `GET /api/hotspots` 读缓存）。
