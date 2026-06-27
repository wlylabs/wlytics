// Safely parse a fetch Response as JSON. If the body is not JSON (e.g. an HTML
// error page from a 500/proxy), throw a clear message instead of the cryptic
// "Unexpected token '<' ... is not valid JSON".
export async function parseJson<T = unknown>(res: Response): Promise<T> {
  const raw = await res.text()
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Server mengembalikan respons tidak valid (HTTP ${res.status}). Coba lagi.`)
  }
}
