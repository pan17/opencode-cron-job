import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import cron from "node-cron"
import { tool, type Plugin } from "@opencode-ai/plugin"

interface Task {
  name: string
  schedule: string
  prompt: string
}

interface Job extends Task {
  id: string
  task: cron.ScheduledTask | null
  timer: ReturnType<typeof setTimeout> | null
  cancelled: boolean
}

function parseDelay(s: string): number {
  const m = s.match(/^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days)?$/)
  if (!m) return 0
  const n = parseInt(m[1])
  const unit = (m[2] || "m").charAt(0)
  if (unit === "s") return n * 1000
  if (unit === "m") return n * 60000
  if (unit === "h") return n * 3600000
  if (unit === "d") return n * 86400000
  return n * 60000
}

function parseTasks(content: string): Task[] {
  const result: Task[] = []
  const sections = content.split(/^## /m).filter((s) => s.trim())
  for (const section of sections) {
    const lines = section.split("\n")
    const name = lines[0]?.trim()
    if (!name) continue
    let schedule = "", prompt = ""
    for (const line of lines.slice(1)) {
      const t = line.trim()
      if (t.startsWith("- cron:")) schedule = t.slice("- cron:".length).trim()
      else if (t.startsWith("- delay:")) schedule = t.slice("- delay:".length).trim()
      else if (t.startsWith("- prompt:")) prompt = t.slice("- prompt:".length).trim()
    }
    if (schedule && prompt) result.push({ name, schedule, prompt })
  }
  return result
}

let jobs: Job[] = []
let nextId = 1

export const CronPlugin: Plugin = async ({ client, directory }) => {
    const tasksFile = join(directory, ".cron-job", "tasks.md")

    async function fire(job: Job) {
      try {
        const res = await client.session.list({ query: { directory } })
        const sessions = res.data
        if (!sessions || sessions.length === 0) return
        sessions.sort((a, b) => b.time.updated - a.time.updated)
        await client.session.promptAsync({
          path: { id: sessions[0].id },
          body: {
            parts: [{ type: "text", text: `<cron-reminder>${job.prompt}</cron-reminder>` }],
          },
        })
      } catch (e: any) {
        process.stderr.write(`[cron] fire error: ${e.message}\n`)
      }
    }

    function scheduleCron(job: Job) {
      job.task = cron.schedule(job.schedule, () => {
        if (job.cancelled) return
        fire(job)
      })
    }

    function scheduleDelay(job: Job) {
      const ms = parseDelay(job.schedule)
      if (ms <= 0) return
      job.timer = setTimeout(() => {
        if (job.cancelled) return
        fire(job)
        removeJobFromFile(job.name)
        const idx = jobs.indexOf(job)
        if (idx !== -1) jobs.splice(idx, 1)
      }, ms)
    }

    function startJob(item: Task): Job {
      const job: Job = { ...item, id: String(nextId++), task: null, timer: null, cancelled: false }
      if (cron.validate(job.schedule)) {
        scheduleCron(job)
      } else {
        scheduleDelay(job)
      }
      return job
    }

    function stopJob(job: Job) {
      job.cancelled = true
      job.task?.stop()
      if (job.timer) clearTimeout(job.timer)
    }

    function reloadJobs() {
      for (const j of jobs) stopJob(j)
      jobs = []
      if (!existsSync(tasksFile)) return
      const items = parseTasks(readFileSync(tasksFile, "utf-8"))
      for (const item of items) {
        jobs.push(startJob(item))
      }
    }

    function removeJobFromFile(name: string) {
      try {
        const content = readFileSync(tasksFile, "utf-8")
        const tasks = parseTasks(content)
        const remaining = tasks.filter((t) => t.name !== name)
        const lines: string[] = ["# 周期任务"]
        for (const t of remaining) {
          lines.push("")
          lines.push(`## ${t.name}`)
          lines.push(cron.validate(t.schedule) ? `- cron: ${t.schedule}` : `- delay: ${t.schedule}`)
          lines.push(`- prompt: ${t.prompt}`)
        }
        writeFileSync(tasksFile, lines.join("\n") + "\n")
      } catch (e: any) {
        process.stderr.write(`[cron] remove file error: ${e.message}\n`)
      }
    }

    // Load from file on startup
    reloadJobs()

    return {
      tool: {
        cron_create: tool({
          description: "Create a new cron job. Writes to .cron-job/tasks.md and schedules it.",
          args: {
            name: tool.schema.string().describe("Unique name for this job"),
            schedule: tool.schema.string().describe("Cron expression, e.g. '0 9 * * *'"),
            prompt: tool.schema.string().describe("Prompt to inject when the job fires"),
          },
          async execute(args) {
            const entry = `\n## ${args.name}\n- cron: ${args.schedule}\n- prompt: ${args.prompt}\n\n`
            if (!existsSync(tasksFile)) {
              mkdirSync(join(directory, ".cron-job"), { recursive: true })
              appendFileSync(tasksFile, `# 周期任务\n${entry}`)
            } else {
              appendFileSync(tasksFile, entry)
            }
            jobs.push(startJob({ name: args.name, schedule: args.schedule, prompt: args.prompt }))
            return `Created: ${args.name} (${args.schedule})`
          },
        }),

        cron_list: tool({
          description: "List all scheduled cron jobs",
          args: {},
          async execute() {
            if (jobs.length === 0) return "No jobs scheduled."
            return jobs.map((j) => `${j.id}  ${j.schedule}  ${j.name}  ${j.prompt}`).join("\n")
          },
        }),

        cron_run: tool({
          description: "Run a job immediately",
          args: {
            jobId: tool.schema.string().describe("Job ID. Get it from cron_list."),
          },
          async execute(args) {
            const job = jobs.find((j) => j.id === args.jobId)
            if (!job) return `Job ${args.jobId} not found.`
            fire(job)
            return `${job.name}: triggered`
          },
        }),

        cron_delete: tool({
          description: "Delete a cron job from .cron-job/tasks.md",
          args: {
            jobId: tool.schema.string().describe("Job ID. Get it from cron_list."),
          },
          async execute(args) {
            const idx = jobs.findIndex((j) => j.id === args.jobId)
            if (idx === -1) return `Job ${args.jobId} not found.`
            const job = jobs[idx]
            stopJob(job)
            jobs.splice(idx, 1)
            removeJobFromFile(job.name)
            return `${job.name}: deleted`
          },
        }),

        cron_once: tool({
          description: "Schedule a one-shot prompt after a delay. Saved to .cron-job/tasks.md for persistence across restarts.",
          args: {
            prompt: tool.schema.string().describe("Prompt to inject when timer fires"),
            delay: tool.schema.string().describe("Delay: '5m', '30s', '2h', '1d'"),
            name: tool.schema.string().optional().describe("Optional name"),
          },
          async execute(args) {
            const ms = parseDelay(args.delay)
            if (ms <= 0) return `Invalid delay: ${args.delay}`
            const name = args.name || `reminder-${nextId}`

            const entry = `\n## ${name}\n- delay: ${args.delay}\n- prompt: ${args.prompt}\n\n`
            if (!existsSync(tasksFile)) {
              mkdirSync(join(directory, ".cron-job"), { recursive: true })
              appendFileSync(tasksFile, `# 周期任务\n${entry}`)
            } else {
              appendFileSync(tasksFile, entry)
            }
            jobs.push(startJob({ name, schedule: args.delay, prompt: args.prompt }))
            return `Scheduled: ${name} (fires in ${args.delay})`
          },
        }),
      },
    }
  }
