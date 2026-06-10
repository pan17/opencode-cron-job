/**
 * tests/test-repair.mjs
 *
 * Tests for the two fixes:
 *   1. ID recycling (nextJobId reuses freed IDs)
 *   2. File watch (external edit triggers reload, self-write guarded)
 *
 * Run:  node test.mjs
 * or:   node --test tests/
 */

import { describe, it, before, after, beforeEach, afterEach, mock } from "node:test"
import assert from "node:assert"
import {
  existsSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
  unlinkSync,
  watchFile,
  unwatchFile,
  mkdirSync,
  rmSync,
} from "fs"
import { join } from "path"
import { tmpdir } from "os"

// ──────────────────────────────────────────────
// Functions under test (extracted from src/index.ts)
// ──────────────────────────────────────────────

function parseDelay(s) {
  const m = s.match(
    /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days)?$/
  )
  if (!m) return 0
  const n = parseInt(m[1])
  const unit = (m[2] || "m").charAt(0)
  if (unit === "s") return n * 1000
  if (unit === "m") return n * 60000
  if (unit === "h") return n * 3600000
  if (unit === "d") return n * 86400000
  return n * 60000
}

function parseTasks(content) {
  const result = []
  const sections = content.split(/^## /m).filter((s) => s.trim())
  for (const section of sections) {
    const lines = section.split("\n")
    const name = lines[0]?.trim()
    if (!name) continue
    let schedule = "",
      prompt = ""
    for (const line of lines.slice(1)) {
      const t = line.trim()
      if (t.startsWith("- cron:")) schedule = t.slice("- cron:".length).trim()
      else if (t.startsWith("- delay:"))
        schedule = t.slice("- delay:".length).trim()
      else if (t.startsWith("- prompt:"))
        prompt = t.slice("- prompt:".length).trim()
    }
    if (schedule && prompt) result.push({ name, schedule, prompt })
  }
  return result
}

// nextJobId + jobs (simulated module state)
let testJobs = []
function nextJobId() {
  const used = new Set(testJobs.map((j) => Number(j.id)))
  for (let i = 1; ; i++) {
    if (!used.has(i)) return String(i)
  }
}

// ──────────────────────────────────────────────
// Tests: parseDelay
// ──────────────────────────────────────────────

describe("parseDelay", () => {
  it("returns 0 for invalid input", () => {
    assert.strictEqual(parseDelay(""), 0)
    assert.strictEqual(parseDelay("abc"), 0)
    assert.strictEqual(parseDelay("1x"), 0)
  })

  it("parses seconds", () => {
    assert.strictEqual(parseDelay("30s"), 30000)
    assert.strictEqual(parseDelay("5sec"), 5000)
    assert.strictEqual(parseDelay("10second"), 10000)
    assert.strictEqual(parseDelay("1seconds"), 1000)
  })

  it("parses minutes (default)", () => {
    assert.strictEqual(parseDelay("5m"), 300000)
    assert.strictEqual(parseDelay("10min"), 600000)
    assert.strictEqual(parseDelay("1minute"), 60000)
    assert.strictEqual(parseDelay("2minutes"), 120000)
    assert.strictEqual(parseDelay("5"), 300000) // bare number => minutes
  })

  it("parses hours", () => {
    assert.strictEqual(parseDelay("1h"), 3600000)
    assert.strictEqual(parseDelay("2hr"), 7200000)
    assert.strictEqual(parseDelay("3hour"), 10800000)
    assert.strictEqual(parseDelay("4hours"), 14400000)
  })

  it("parses days", () => {
    assert.strictEqual(parseDelay("1d"), 86400000)
    assert.strictEqual(parseDelay("2day"), 172800000)
    assert.strictEqual(parseDelay("3days"), 259200000)
  })
})

// ──────────────────────────────────────────────
// Tests: parseTasks
// ──────────────────────────────────────────────

describe("parseTasks", () => {
  it("parses cron tasks", () => {
    const md = `# Tasks

## Daily Report
- cron: 0 9 * * *
- prompt: Write daily report

## Health Check
- cron: */30 * * * *
- prompt: Check server health
`
    const tasks = parseTasks(md)
    assert.strictEqual(tasks.length, 2)
    assert.strictEqual(tasks[0].name, "Daily Report")
    assert.strictEqual(tasks[0].schedule, "0 9 * * *")
    assert.strictEqual(tasks[0].prompt, "Write daily report")
    assert.strictEqual(tasks[1].name, "Health Check")
  })

  it("parses delay tasks", () => {
    const md = `# Tasks

## Reminder
- delay: 5m
- prompt: Check the build
`
    const tasks = parseTasks(md)
    assert.strictEqual(tasks.length, 1)
    assert.strictEqual(tasks[0].name, "Reminder")
    assert.strictEqual(tasks[0].schedule, "5m")
    assert.strictEqual(tasks[0].prompt, "Check the build")
  })

  it("skips sections without schedule or prompt", () => {
    const md = `# Tasks

## Incomplete Task
- cron: 0 9 * * *
`
    const tasks = parseTasks(md)
    assert.strictEqual(tasks.length, 0)
  })

  it("returns empty array for empty content", () => {
    assert.deepStrictEqual(parseTasks(""), [])
    assert.deepStrictEqual(parseTasks("# Only header"), [])
  })
})

// ──────────────────────────────────────────────
// Tests: nextJobId — ID recycling
// ──────────────────────────────────────────────

describe("nextJobId — ID recycling", () => {
  beforeEach(() => {
    testJobs = []
  })

  it("starts from 1 when empty", () => {
    assert.strictEqual(nextJobId(), "1")
  })

  it("returns next sequential ID", () => {
    testJobs.push({ id: "1" })
    assert.strictEqual(nextJobId(), "2")
    testJobs.push({ id: "2" })
    assert.strictEqual(nextJobId(), "3")
  })

  it("reuses ID after deletion from the front", () => {
    testJobs.push({ id: "1" }, { id: "2" }, { id: "3" })
    // Remove "1"
    testJobs = testJobs.filter((j) => j.id !== "1")
    assert.strictEqual(nextJobId(), "1")
  })

  it("reuses ID after deletion from the middle", () => {
    testJobs.push({ id: "1" }, { id: "2" }, { id: "3" })
    testJobs = testJobs.filter((j) => j.id !== "2")
    assert.strictEqual(nextJobId(), "2")
  })

  it("fills the smallest gap", () => {
    testJobs.push({ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" })
    // Remove 1, 3 → holes at 1 and 3
    testJobs = testJobs.filter((j) => j.id !== "1" && j.id !== "3")
    assert.strictEqual(nextJobId(), "1") // smallest gap wins
  })

  it("reuses multiple IDs sequentially", () => {
    testJobs.push({ id: "1" }, { id: "2" }, { id: "3" })
    testJobs = testJobs.filter((j) => j.id !== "1")
    assert.strictEqual(nextJobId(), "1")

    // Add the new job with id "1"
    testJobs.push({ id: "1" })
    testJobs = testJobs.filter((j) => j.id !== "2")
    assert.strictEqual(nextJobId(), "2")
  })

  it("can fill all gaps after multiple deletions", () => {
    testJobs.push({ id: "1" }, { id: "2" }, { id: "3" })
    testJobs = []
    assert.strictEqual(nextJobId(), "1")
  })
})

// ──────────────────────────────────────────────
// Tests: File watch — external edit triggers reload
// ──────────────────────────────────────────────

describe("fs.watchFile — external edit triggers reload", () => {
  let tmpDir, tasksFile
  let reloadCount, lastWriteTime

  // Simulates reloadJobs: reads file and updates the job list
  function reloadJobs() {
    reloadCount++
    const content = existsSync(tasksFile) ? readFileSync(tasksFile, "utf-8") : ""
    return parseTasks(content)
  }

  function setupWatcher() {
    if (existsSync(tasksFile)) {
      watchFile(tasksFile, { interval: 200 }, (curr, prev) => {
        if (curr.mtimeMs === prev.mtimeMs) return
        // Self-write guard
        if (Date.now() - lastWriteTime < 200) return
        reloadJobs()
      })
    }
  }

  before(async () => {
    tmpDir = join(tmpdir(), "opencode-cron-test-watch-" + Date.now())
    tasksFile = join(tmpDir, ".cron-job", "tasks.md")
    mkdirSync(join(tmpDir, ".cron-job"), { recursive: true })
    writeFileSync(
      tasksFile,
      "# 周期任务\n\n## Task A\n- cron: 0 9 * * *\n- prompt: Do A\n"
    )
  })

  beforeEach(() => {
    reloadCount = 0
    lastWriteTime = 0
    unwatchFile(tasksFile) // clean watchers between tests
  })

  after(() => {
    unwatchFile(tasksFile)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it("triggers reload on external file edit", { timeout: 5000 }, async () => {
    setupWatcher()

    // Wait for initial watch to settle
    await new Promise((r) => setTimeout(r, 500))

    // Modify the file (simulating external edit — no lastWriteTime set)
    appendFileSync(
      tasksFile,
      "\n## Task B\n- cron: */5 * * * *\n- prompt: Do B\n"
    )

    // Poll until reload triggered or timeout
    const deadline = Date.now() + 4000
    while (Date.now() < deadline) {
      if (reloadCount > 0) break
      await new Promise((r) => setTimeout(r, 200))
    }

    assert.ok(
      reloadCount > 0,
      "reloadJobs should be called after external file edit"
    )
  })

  it("does NOT trigger reload when lastWriteTime is set (self-write guard)", { timeout: 5000 }, async () => {
    // Reset file to known state
    writeFileSync(
      tasksFile,
      "# 周期任务\n\n## Task A\n- cron: 0 9 * * *\n- prompt: Do A\n"
    )
    reloadCount = 0
    setupWatcher()

    await new Promise((r) => setTimeout(r, 500))

    // Simulate tool writing: set lastWriteTime BEFORE writing
    lastWriteTime = Date.now()
    appendFileSync(
      tasksFile,
      "\n## Task C\n- cron: 0 */2 * * *\n- prompt: Do C\n"
    )

    // Wait long enough for watcher to fire if it were going to
    await new Promise((r) => setTimeout(r, 1500))

    assert.strictEqual(
      reloadCount,
      0,
      "reloadJobs should NOT be called when lastWriteTime guard is active"
    )
  })
})

// ──────────────────────────────────────────────
// Tests: End-to-end — delete + create reuses ID
// ──────────────────────────────────────────────

describe("End-to-end: delete+create reuses ID", () => {
  let tmpDir, tasksFile

  function startJob(item) {
    const job = { ...item, id: nextJobId(), task: null, timer: null, cancelled: false }
    testJobs.push(job)
    return job
  }

  function stopJob(job) {
    if (!job) return
    job.cancelled = true
  }

  function removeJobFromFile(name) {
    const content = readFileSync(tasksFile, "utf-8")
    const tasks = parseTasks(content)
    const remaining = tasks.filter((t) => t.name !== name)
    const lines = ["# 周期任务"]
    for (const t of remaining) {
      lines.push("")
      lines.push(`## ${t.name}`)
      lines.push(t.schedule.includes("*") ? `- cron: ${t.schedule}` : `- delay: ${t.schedule}`)
      lines.push(`- prompt: ${t.prompt}`)
    }
    writeFileSync(tasksFile, lines.join("\n") + "\n")
  }

  before(async () => {
    tmpDir = join(tmpdir(), "opencode-cron-test-e2e-" + Date.now())
    tasksFile = join(tmpDir, "tasks.md")
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(tasksFile, "# 周期任务\n")
  })

  beforeEach(() => {
    testJobs = []
    writeFileSync(tasksFile, "# 周期任务\n")
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it("reuses IDs after delete + create cycle", () => {
    // Create 3 jobs
    const j1 = startJob({ name: "A", schedule: "0 9 * * *", prompt: "Do A" })
    const j2 = startJob({ name: "B", schedule: "*/5 * * * *", prompt: "Do B" })
    const j3 = startJob({ name: "C", schedule: "0 18 * * *", prompt: "Do C" })

    assert.strictEqual(j1.id, "1")
    assert.strictEqual(j2.id, "2")
    assert.strictEqual(j3.id, "3")

    // Delete "1" and "3"
    stopJob(j1)
    testJobs = testJobs.filter((j) => j.id !== "1")
    stopJob(j3)
    testJobs = testJobs.filter((j) => j.id !== "3")

    // Create two new jobs
    const j4 = startJob({ name: "D", schedule: "0 10 * * *", prompt: "Do D" })
    const j5 = startJob({ name: "E", schedule: "0 11 * * *", prompt: "Do E" })

    assert.strictEqual(j4.id, "1", "should reuse id=1")
    assert.strictEqual(j5.id, "3", "should reuse id=3")

    // Create another
    const j6 = startJob({ name: "F", schedule: "0 12 * * *", prompt: "Do F" })
    assert.strictEqual(j6.id, "4", "next available after fill")
  })

  it("file is consistent after simulated cron_delete flow", () => {
    // Simulate cron_create flow: append to file + startJob
    function cronCreate(name, schedule, prompt) {
      const entry = `\n## ${name}\n- cron: ${schedule}\n- prompt: ${prompt}\n\n`
      appendFileSync(tasksFile, entry)
      return startJob({ name, schedule, prompt })
    }

    function cronDelete(job) {
      stopJob(job)
      testJobs = testJobs.filter((j) => j.id !== job.id)
      removeJobFromFile(job.name)
    }

    const a = cronCreate("Alpha", "0 9 * * *", "Do Alpha")
    const b = cronCreate("Beta", "0 10 * * *", "Do Beta")
    assert.strictEqual(a.id, "1")
    assert.strictEqual(b.id, "2")

    // Delete first → file should only have Beta
    cronDelete(a)

    const fileContent = readFileSync(tasksFile, "utf-8")
    assert.ok(fileContent.includes("Beta"), "file should still contain Beta")
    assert.ok(!fileContent.includes("Alpha"), "file should NOT contain Alpha")

    // Create new → should reuse id "1"
    const c = cronCreate("Gamma", "0 11 * * *", "Do Gamma")
    assert.strictEqual(c.id, "1", "new job reuses deleted id 1")
  })
})
