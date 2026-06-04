import { join } from "path"
import { homedir } from "os"
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "fs"
import { execSync } from "child_process"

const CURRENT_VERSION = "0.1.2"

async function main() {
  const res = await fetch("https://registry.npmjs.org/opencode-cron-job/latest")
  const data = await res.json()
  console.log(`当前版本: ${CURRENT_VERSION}`)
  console.log(`npm 最新版: ${data.version}`)

  if (data.version === CURRENT_VERSION) {
    console.log("已是最新版，无需更新")
    return
  }

  const cacheDir = join(homedir(), ".cache", "opencode", "packages", "opencode-cron-job@latest")
  const targetDir = join(cacheDir, "node_modules", "opencode-cron-job")
  mkdirSync(targetDir, { recursive: true })

  const tgzUrl = `https://registry.npmjs.org/opencode-cron-job/-/opencode-cron-job-${data.version}.tgz`
  console.log(`下载: ${tgzUrl}`)
  const tgz = await fetch(tgzUrl).then((r) => r.arrayBuffer())

  const tmpFile = join(cacheDir, "..", "_update.tgz")
  writeFileSync(tmpFile, Buffer.from(tgz))

  execSync(`tar -xzf "${tmpFile}" --strip-components=1 -C "${targetDir}"`, { stdio: "ignore" })
  rmSync(tmpFile, { force: true })

  const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"))
  console.log(`解压完成, 版本: ${pkg.version}`)

  if (pkg.version === data.version) {
    console.log(`✅ 自动更新成功: ${CURRENT_VERSION} → ${data.version}`)
  } else {
    console.log(`❌ 版本不匹配: 期望 ${data.version}, 实际 ${pkg.version}`)
  }
}

main().catch((e) => console.log(`❌ 失败: ${e.message}`))
