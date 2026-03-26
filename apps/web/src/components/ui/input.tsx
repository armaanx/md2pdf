import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-border/20 bg-input px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring",
        className
      )}
      {...props}
    />
  );
}

export { Input };
