import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
}

export function LoadingSpinner({
  className,
  size = "md",
  label = "Loading...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className="relative">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        <div className={cn(
          "absolute inset-0 rounded-full border-4 border-primary/20",
          sizeClasses[size]
        )} />
      </div>
      {label && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
