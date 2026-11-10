import { RotateCw } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

/** Inline failure state for a query: says what broke and offers a retry. */
export function QueryError({ error, onRetry, isRetrying, className }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm border border-loss/30 bg-loss/[0.05] rounded-md",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-loss">Couldn't load this</p>
        <p className="text-[13px] text-muted-foreground mt-0.5">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 border bg-card px-3 py-1.5 rounded-md text-[13px] hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RotateCw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying" : "Try again"}
        </button>
      )}
    </div>
  );
}
