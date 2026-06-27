import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function groqComplete(prompt: string, model = 'llama-3.3-70b-versatile'): Promise<string> {
  const res = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096
  })
  return res.choices[0].message.content ?? ''
}

export async function groqFast(prompt: string): Promise<string> {
  return groqComplete(prompt, 'llama3-8b-8192')
}
