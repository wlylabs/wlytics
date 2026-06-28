import { Loader2 } from 'lucide-react'

interface LoaderProps {
  text?: string
}

export default function Loader({ text }: LoaderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
