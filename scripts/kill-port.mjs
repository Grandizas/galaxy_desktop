#!/usr/bin/env node
/**
 * Frees the dev-server port.
 *
 * `tauri dev` spawns Vite through `beforeDevCommand`, and closing the desktop
 * window does not always reap that child. The orphan keeps port 1420, and
 * because `strictPort` is on, the next `pnpm dev` fails outright.
 *
 * Usage: pnpm kill-port [port]
 */
import { execFileSync } from 'node:child_process'

const port = Number(process.argv[2] ?? 1420)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${process.argv[2]}`)
  process.exit(1)
}

/** PIDs listening on `port`, deduplicated. */
function findListeners() {
  if (process.platform === 'win32') {
    const output = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' })
    const pids = output
      .split(/\r?\n/)
      .filter((line) => line.includes('LISTENING') && new RegExp(`[:.]${port}\\s`).test(line))
      .map((line) => line.trim().split(/\s+/).at(-1))
      .filter((pid) => pid && pid !== '0')
    return [...new Set(pids)]
  }

  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    })
    return [...new Set(output.split(/\s+/).filter(Boolean))]
  } catch {
    return [] // lsof exits non-zero when nothing matches
  }
}

const pids = findListeners()

if (pids.length === 0) {
  console.log(`Port ${port} is already free.`)
  process.exit(0)
}

for (const pid of pids) {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', pid, '/F', '/T'], { stdio: 'ignore' })
    } else {
      process.kill(Number(pid), 'SIGKILL')
    }
    console.log(`Stopped PID ${pid} on port ${port}.`)
  } catch (error) {
    console.error(`Could not stop PID ${pid}: ${error.message}`)
    process.exitCode = 1
  }
}
