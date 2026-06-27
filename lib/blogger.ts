import { google } from 'googleapis'

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
}) {
  // Convert markdown ke HTML sederhana
  const htmlContent = post.content
    .replace(/^# .+\n/, '') // hapus H1 pertama (judul sudah ada di field title)
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^\s*/, '<p>')
    .replace(/\s*$/, '</p>')
    // Hapus placeholder
    .replace(/\[AFFILIATE_1\]/g, '')
    .replace(/\[AFFILIATE_2\]/g, '')
    .replace(/\[CTA_BOX\]/g, '')

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
