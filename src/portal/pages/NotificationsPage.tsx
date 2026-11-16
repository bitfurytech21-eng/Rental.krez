import React, { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { formatDateTime } from '../utils/format';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/LoadingSkeleton';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, refreshNotifications, navigatePortal } = usePortal();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await portalApi.markNotificationRead(id);
      await refreshNotifications();
    } catch (err: any) {
      setError(err?.message || 'Unable to update notification status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setError(null);
    try {
      await portalApi.markAllNotificationsRead();
      await refreshNotifications();
    } catch (err: any) {
      setError(err?.message || 'Unable to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {error && <ErrorBanner message={error} onRetry={refreshNotifications} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-heading font-bold text-white">Notifications</h2>
          <p className="text-xs text-[#8EA7C7] mt-0.5 portal-tabular">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            className="portal-btn-secondary !min-h-[40px] !px-4 text-xs"
          >
            <CheckCheck className="w-4 h-4 text-[#C5A880]" />
            <span>{markingAll ? 'Updating…' : 'Mark all read'}</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5" />}
          title="No notifications"
          description="Settlement confirmations, rent distribution alerts, and compliance status updates will appear here."
          actionLabel="Back to overview"
          onAction={() => navigatePortal('overview')}
        />
      ) : (
        <div className="portal-card divide-y divide-[#1D3860]">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                !item.read ? 'bg-[#152E54]/45' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    !item.read ? 'bg-[#C5A880]' : 'bg-[#1D3860]'
                  }`}
                />
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <p className="text-xs text-[#8EA7C7] leading-relaxed">{item.message}</p>
                  <div className="text-[11px] text-[#8EA7C7] portal-tabular pt-0.5">
                    {item.type ? `${item.type} · ` : ''}
                    {formatDateTime(item.createdAt)}
                  </div>
                </div>
              </div>

              {!item.read && (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void handleMarkRead(item.id)}
                  className="portal-btn-secondary !min-h-[40px] !px-3.5 text-xs self-start shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{busyId === item.id ? 'Saving…' : 'Mark read'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
