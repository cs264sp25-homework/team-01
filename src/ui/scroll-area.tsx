import * as React from "react"
import { cn } from "@/shared/lib/utils"

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)} // Basic styling
        {...props}
      >
        <div 
          className="h-full w-full overflow-y-auto" // Enable vertical scrolling
        >
          {children}
        </div>
        {/* Basic ScrollBar placeholder if needed, or omit */}
        {/* <div className="absolute top-0 right-0 h-full w-2 bg-gray-200 rounded"></div> */}
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

// Basic ScrollBar (optional, can be omitted if not strictly needed by modal style)
const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
     return <div ref={ref} className={cn("w-2.5 bg-gray-200", className)} {...props}></div>
  }
)
ScrollBar.displayName = "ScrollBar"


export { ScrollArea, ScrollBar } 