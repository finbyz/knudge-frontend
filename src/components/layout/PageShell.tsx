import { type ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

/**
 * Sticky stack offset: TopBar (top-4 / sm:top-6) + h-16 + small gap so the toolbar never
 * tucks under the glass header or scrolls behind it.
 */


type PageShellProps = {
  title: string;
  showNotifications?: boolean;
  /**
   * Renders directly below the glass TopBar — filters, tabs, primary CTAs.
   * Never place primary actions inside TopBar; keeps hierarchy clear (title / meta vs tools).
   */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Standard app page: sticky title bar + optional subheader row + scrollable content.
 * Matches common product patterns (Notion, Linear, Slack): header for context, toolbar for mode/actions.
 */
export function PageShell({
  title,
  showNotifications = true,
  toolbar,
  children,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col bg-background pb-24 pt-0',
        className
      )}
    >
      <div className="sticky top-0 z-30 -mx-4 flex shrink-0 flex-col bg-background/60 px-4 pb-2 pt-2 backdrop-blur-xl border-b border-border/40 transition-all sm:-mx-6 sm:px-6 sm:pb-3 sm:pt-4">
        <TopBar title={title} showNotifications={showNotifications} />

        {toolbar != null && (
          <div
            className="mt-2 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-md p-3 shadow-sm sm:mt-3 sm:p-4"
          >
            {toolbar}
          </div>
        )}
      </div>

      <div className="min-h-0 min-w-0 w-full flex-1 pt-4 sm:pt-5">{children}</div>
    </div>
  );
}
