import { google } from 'googleapis'
import { markdownToHtml } from '@/lib/markdown'

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  featured_image_url?: string
  featured_image_alt?: string
}) {
  const body = markdownToHtml(post.content)

  const imageHtml = post.featured_image_url
    ? `<img src="${escapeAttr(post.featured_image_url)}" alt="${escapeAttr(
        post.featured_image_alt ?? post.title
      )}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:20px;" />`
    : ''
  const htmlContent = imageHtml + body

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
