import { type ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

/**
 * Sticky stack offset: TopBar (top-4 / sm:top-6) + h-16 + small gap so the toolbar never
 * tucks under the glass header or scrolls behind it.
 */
export const PAGE_STICKY_UNDER_HEADER_CLASS =
  'top-[calc(theme(spacing.4)+theme(spacing.16)+theme(spacing.2))] sm:top-[calc(theme(spacing.6)+theme(spacing.16)+theme(spacing.2))]';

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
      <TopBar title={title} showNotifications={showNotifications} />

      {toolbar != null && (
        <div
          className={cn(
            'sticky z-30 mb-4 shrink-0 rounded-2xl border border-border/60 bg-muted/30 p-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-muted/25 sm:mb-5 sm:p-4',
            PAGE_STICKY_UNDER_HEADER_CLASS
          )}
        >
          {toolbar}
        </div>
      )}

      <div className="min-h-0 min-w-0 w-full flex-1">{children}</div>
    </div>
  );
}
