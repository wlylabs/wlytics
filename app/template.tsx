// Re-mounts on every navigation, so each page fades in gently — smooths the
// content swap when clicking sidebar links instead of a hard cut.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in duration-300">{children}</div>
}
