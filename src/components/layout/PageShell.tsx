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
      <div className="sticky top-0 z-30 -mx-4 flex shrink-0 flex-col bg-background/95 px-4 pb-4 pt-4 shadow-sm backdrop-blur-md transition-all sm:-mx-6 sm:px-6 sm:pb-5 sm:pt-6">
        <TopBar title={title} showNotifications={showNotifications} />

        {toolbar != null && (
          <div
            className="mt-4 rounded-2xl border border-border/80 bg-background p-3 shadow-sm sm:mt-5 sm:p-4"
          >
            {toolbar}
          </div>
        )}
      </div>

      <div className="min-h-0 min-w-0 w-full flex-1 pt-4 sm:pt-5">{children}</div>
    </div>
  );
}
