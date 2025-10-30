import { spawn } from "child_process"
import path from "path"
import { promises as fs } from "fs"

export async function runPythonPlanner(dataDir: string, args: { swapDays?: number; days?: number } = {}): Promise<string> {
	// Prefer root-level lsp.py if present; fallback to python/planner.py
	const rootScript = path.join(process.cwd(), "lsp.py")
	const fallbackScript = path.join(process.cwd(), "python", "planner.py")
	const scriptPath = (await fileExists(rootScript)) ? rootScript : fallbackScript
	if (!(await fileExists(scriptPath))) {
		throw new Error(`Brak pliku ${rootScript} ani ${fallbackScript}. Umieść swój skrypt i spróbuj ponownie.`)
	}
	const py = await resolvePython()
  const cliArgs = ["-X", "utf8", scriptPath, "--data", dataDir]
	if (args.swapDays != null) cliArgs.push("--swapDays", String(args.swapDays))
	if (args.days != null) cliArgs.push("--days", String(args.days))
	return await spawnCollect(py, cliArgs, { timeoutMs: 5 * 60 * 1000 })
}

async function resolvePython(): Promise<string> {
	const candidates = ["python", "python3", "py"]
	for (const c of candidates) {
		try {
			await spawnCollect(c, ["--version"], { timeoutMs: 5000 })
			return c
		} catch {}
	}
	throw new Error("Nie znaleziono interpretera Pythona w PATH (python/python3/py)")
}

function spawnCollect(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<string> {
	return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    })
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (d) => (stdout += d.toString()))
		child.stderr.on("data", (d) => (stderr += d.toString()))
		let to: NodeJS.Timeout | undefined
		if (opts.timeoutMs) {
			to = setTimeout(() => {
				child.kill("SIGKILL")
				reject(new Error("Czas wykonania skryptu Python przekroczony"))
			}, opts.timeoutMs)
		}
		child.on("exit", (code) => {
			if (to) clearTimeout(to)
			if (code === 0) resolve(stdout.trim())
			else reject(new Error(stderr || `Python exit code ${code}`))
		})
		child.on("error", (e) => {
			if (to) clearTimeout(to)
			reject(e)
		})
	})
}

async function fileExists(p: string): Promise<boolean> {
	try {
		await fs.access(p)
		return true
	} catch {
		return false
	}
}


