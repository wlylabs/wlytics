import { Loader2 } from 'lucide-react'

interface LoaderProps {
  text?: string
}

export default function Loader({ text }: LoaderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#111111]" strokeWidth={1.8} />
      {text && <p className="text-sm text-[#6B7280]">{text}</p>}
    </div>
  )
}
