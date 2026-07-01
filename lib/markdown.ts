import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

// GFM tables render as bare <table> tags, which look cramped and overflow on
// mobile (column headers wrap into "Tool\nA"). Inject inline styles — Blogger
// strips <style> blocks but keeps inline — and wrap each table in a horizontally
// scrollable container so wide comparison tables stay readable on phones.
function styleTables(html: string): string {
  const cell = (tag: string, attrs: string): string => {
    const align = attrs.match(/align="(left|center|right)"/)?.[1] ?? 'left'
    const base = `border:1px solid #4b5563;padding:8px 12px;text-align:${align};vertical-align:top;`
    const head = tag === 'th' ? 'font-weight:600;white-space:nowrap;' : ''
    return `<${tag} style="${base}${head}">`
  }

  return html
    .replace(
      /<table>/g,
      '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 24px;">' +
        '<table style="border-collapse:collapse;width:100%;min-width:480px;font-size:14px;line-height:1.5;">'
    )
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<(th|td)(\s+align="[^"]*")?>/g, (_m, tag, attrs) => cell(tag, attrs ?? ''))
}

// Convert article markdown into clean, semantic HTML for publishing. Uses a real
// markdown parser (handles lists, tables, hr, blockquotes, links) instead of
// fragile regex, and removes artifacts that look unprofessional. Used by the
// Blogger publish path.
export function markdownToHtml(markdown: string): string {
  const cleaned = markdown
    .replace(/\r\n/g, '\n')
    .replace(/^#[ \t]+.+\n?/, '') // drop the first H1 (already the post title)
    .replace(/^#{1,6}[ \t]*$/gm, '') // strip empty heading markers (stray "#")
    .replace(/^#[ \t]+/gm, '## ') // demote any remaining H1 to H2 (one H1 per page)
    .replace(/\[AFFILIATE_1\]/g, '')
    .replace(/\[AFFILIATE_2\]/g, '')
    .replace(/\[CTA_BOX\]/g, '')
    .replace(/\n{3,}/g, '\n\n') // collapse extra blank lines
    .trim()

  const html = (marked.parse(cleaned, { async: false }) as string).trim()
  return styleTables(html)
}
