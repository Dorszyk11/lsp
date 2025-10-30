export function parseCsv<T = Record<string, string>>(csv: string): T[] {
	const lines = csv.trim().split(/\r?\n/)
	if (lines.length === 0) return []
	const headers = splitCsvLine(lines[0]).map((h) => h.trim())
	const rows: T[] = []
	for (let i = 1; i < lines.length; i++) {
		const raw = lines[i].trim()
		if (!raw) continue
		const cols = splitCsvLine(raw)
		const obj: Record<string, string> = {}
		headers.forEach((h, idx) => {
			obj[h] = cols[idx] ?? ""
		})
		rows.push(obj as T)
	}
	return rows
}

function splitCsvLine(line: string): string[] {
	const result: string[] = []
	let current = ""
	let inQuotes = false
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"'
				i++
			} else {
				inQuotes = !inQuotes
			}
		} else if (ch === "," && !inQuotes) {
			result.push(current)
			current = ""
		} else {
			current += ch
		}
	}
	result.push(current)
	return result
}


