import { readFileSync, existsSync } from "fs"
import { join } from "path"
import cron from "node-cron"
import { tool, type Plugin } from "@opencode-ai/plugin"

interface Job {
  id: string
  name: string
  schedule: string
  prompt: string
  task: cron.ScheduledTask | null
}

function parseTasks(content: string): { name: string; schedule: string; prompt: string }[] {
  const tasks: { name: string; schedule: string; prompt: string }[] = []
  const sections = content.split(/^## /m).filter((s) => s.trim())
  for (const section of sections) {
    const lines = section.split("\n")
    const name = lines[0]?.trim()
    if (!name) continue
    let schedule = "", prompt = ""
    for (const line of lines.slice(1)) {
      const t = line.trim()
      if (t.startsWith("- cron:")) schedule = t.slice("- cron:".length).trim()
      else if (t.startsWith("- prompt:")) prompt = t.slice("- prompt:".length).trim()
    }
    if (schedule && prompt) tasks.push({ name, schedule, prompt })
  }
  return tasks
}

let jobs: Job[] = []
let nextId = 1

export const CronPlugin: Plugin = async ({ client, directory }) => {
  const tasksFile = join(directory, ".cron-job", "tasks.md")

  function fire(job: Job) {
    client.tui.appendPrompt({ body: { text: job.prompt } })
      .then(() => client.tui.submitPrompt())
      .catch(() => {})
  }

  function schedule(j: Job) {
    if (cron.validate(j.schedule)) {
      j.task = cron.schedule(j.schedule, () => fire(j))
    }
  }

  // Load from file on startup
  if (existsSync(tasksFile)) {
    const items = parseTasks(readFileSync(tasksFile, "utf-8"))
    for (const item of items) {
      const job: Job = { ...item, id: String(nextId++), task: null }
      schedule(job)
      jobs.push(job)
    }
  }

  return {
    tool: {
      cron_create: tool({
        description: "Create a new cron job. The job fires on schedule by injecting the prompt into the user's session. Jobs are ephemeral (in-memory) and lost when OpenCode restarts. To persist a job permanently, also add it to .cron-job/tasks.md so it auto-loads on startup.",
        args: {
          name: tool.schema.string().describe("Unique name for this job"),
          schedule: tool.schema.string().describe("Cron expression. 5-field format (min hour dom mon dow), e.g. '0 9 * * *' for daily at 9am. Supports 6-field with seconds: '*/30 * * * * *' for every 30s."),
          prompt: tool.schema.string().describe("The prompt text that gets injected into the session when the job fires. The AI will receive this as a user message and act on it."),
        },
        async execute(args) {
          const job: Job = { id: String(nextId++), name: args.name, schedule: args.schedule, prompt: args.prompt, task: null }
          schedule(job)
          jobs.push(job)
          return `Created job: ${job.name} (ID: ${job.id}, cron: ${job.schedule})`
        },
      }),

      cron_list: tool({
        description: "List all scheduled cron jobs",
        args: {},
        async execute() {
          if (jobs.length === 0) return "No jobs scheduled."
          return jobs.map((j) => `${j.id}  ${j.schedule}  ${j.name}`).join("\n")
        },
      }),

      cron_run: tool({
        description: "Run a job immediately (fire-and-forget). The job fires once right now regardless of its cron schedule. Useful for testing or one-off execution. The job remains scheduled and will continue firing on its normal cron schedule afterwards.",
        args: {
          jobId: tool.schema.string().describe("ID of the job to run. Get it from cron_list."),
        },
        async execute(args) {
          const job = jobs.find((j) => j.id === args.jobId)
          if (!job) return `Job ${args.jobId} not found.`
          fire(job)
          return `${job.name}: triggered`
        },
      }),

      cron_delete: tool({
        description: "Delete a cron job. Stops the timer and removes it from memory. This does not modify .cron-job/tasks.md — if the job was defined there, it will reappear after OpenCode restarts.",
        args: {
          jobId: tool.schema.string().describe("ID of the job to delete. Get it from cron_list."),
        },
        async execute(args) {
          const idx = jobs.findIndex((j) => j.id === args.jobId)
          if (idx === -1) return `Job ${args.jobId} not found.`
          const [job] = jobs.splice(idx, 1)
          job.task?.stop()
          return `${job.name}: deleted`
        },
      }),
    },
  }
}
