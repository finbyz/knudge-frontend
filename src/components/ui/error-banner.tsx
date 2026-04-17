import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  onClose,
}: ErrorBannerProps) {
  return (
    <div className="p-4 w-full max-w-2xl mx-auto">
      <Alert variant="destructive" className="relative bg-destructive/10 border-destructive/20 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle className="font-semibold">{title}</AlertTitle>
          <AlertDescription className="mt-1 opacity-90">
            {message}
          </AlertDescription>
          {onRetry && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="bg-background/50 hover:bg-background border-destructive/20 text-destructive"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try again
              </Button>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Alert>
    </div>
  );
}
