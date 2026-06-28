import { google } from 'googleapis'
import { markdownToHtml } from '@/lib/markdown'
import { getFeaturedImage } from '@/lib/images'

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Build a featured-image <figure> with attribution. Blogger uses the first
// image in the post as its thumbnail.
function featuredImageHtml(image: NonNullable<Awaited<ReturnType<typeof getFeaturedImage>>>) {
  const credit = image.creator
    ? `<figcaption style="font-size:12px;color:#6b7280;margin-top:6px;">Foto: ${escapeHtml(image.creator)}${
        image.license ? ` (${escapeHtml(image.license)})` : ''
      }${image.source ? ` via ${escapeHtml(image.source)}` : ''}</figcaption>`
    : ''
  return `<figure style="margin:0 0 24px;"><img src="${escapeAttr(image.url)}" alt="${escapeAttr(
    image.title
  )}" style="width:100%;height:auto;border-radius:8px;" />${credit}</figure>`
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://wlytics.vercel.app/api/auth/callback'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
})

const blogger = google.blogger({
  version: 'v3',
  auth: oauth2Client
})

export async function publishToBlogger(post: {
  title: string
  content: string
  tags: string[]
  labels?: string[]
  keyword?: string
}) {
  const body = markdownToHtml(post.content)

  // Prepend a relevant featured image (best-effort; never blocks publishing).
  const image = await getFeaturedImage(post.keyword || post.tags[0] || post.title)
  const htmlContent = image ? featuredImageHtml(image) + body : body

  const response = await blogger.posts.insert({
    blogId: process.env.BLOGGER_BLOG_ID!,
    requestBody: {
      title: post.title,
      content: htmlContent,
      labels: post.labels || post.tags.slice(0, 5)
    }
  })

  return {
    id: response.data.id,
    url: response.data.url,
    title: response.data.title
  }
}

export async function getBloggerInfo() {
  const response = await blogger.blogs.get({
    blogId: process.env.BLOGGER_BLOG_ID!
  })
  return {
    name: response.data.name,
    url: response.data.url,
    posts: response.data.posts?.totalItems
  }
}

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/blogger'],
    prompt: 'consent'
  })
}

export async function getTokenFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}
