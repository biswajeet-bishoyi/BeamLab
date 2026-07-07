
import * as React from "react"
import { cn } from "../utils"

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ role, content, className, ...props }, ref) => {
    const isUser = role === 'user';
    return (
      <div ref={ref} className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start", className)} {...props}>
        <div className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser ? "bg-accent text-white rounded-tr-sm" : "bg-panel text-primary border border-subtle rounded-tl-sm"
        )}>
          {content}
        </div>
      </div>
    )
  }
)
ChatBubble.displayName = "ChatBubble"
