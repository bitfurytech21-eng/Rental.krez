import React, { useState } from 'react';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { formatDateTime } from '../utils/format';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, LoadingSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';

export const NotificationsPage: React.FC = () => {
  const toast = useToast();
  const {
    loading,
    notifications,
    unreadCount,
    sampleDataEnabled,
    refreshNotifications,
    navigatePortal,
  } = usePortal();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleReadIds, setSampleReadIds] = useState<Set<string>>(new Set());

  if (loading && !sampleDataEnabled && notifications.length === 0) {
    return <LoadingSkeleton rows={3} />;
  }

  const effectiveNotifications = sampleDataEnabled
    ? notifications.map((n) => (sampleReadIds.has(n.id) ? { ...n, read: true } : n))
    : notifications;
  const effectiveUnreadCount = sampleDataEnabled
    ? effectiveNotifications.filter((n) => !n.read).length
    : unreadCount;

  const handleMarkRead = async (id: string) => {
    if (sampleDataEnabled) {
      setSampleReadIds((prev) => new Set(prev).add(id));
      toast.success('Notification marked as read.');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await portalApi.markNotificationRead(id);
      await refreshNotifications();
      toast.success('Notification marked as read.');
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Unable to update notification status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (sampleDataEnabled) {
      setSampleReadIds(new Set(notifications.map((n) => n.id)));
      toast.success('All notifications marked as read.');
      return;
    }
    setMarkingAll(true);
    setError(null);
    try {
      await portalApi.markAllNotificationsRead();
      await refreshNotifications();
      toast.success('All notifications marked as read.');
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Unable to mark all notifications as read.'));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {error && <ErrorBanner message={error} onRetry={refreshNotifications} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Notifications</h2>
          <p className="text-xs text-[#8FA1A8] mt-0.5 portal-tabular">
            {effectiveUnreadCount > 0
              ? `${effectiveUnreadCount} unread alert${effectiveUnreadCount === 1 ? '' : 's'}`
              : 'You’re all caught up'}
          </p>
        </div>

        {effectiveUnreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            className="portal-btn-secondary"
          >
            <CheckCheck className="w-4 h-4 text-[#6FD8B0]" />
            <span>{markingAll ? 'Updating...' : 'Mark all read'}</span>
          </button>
        )}
      </div>

      {effectiveNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5" />}
          title="You’re all caught up"
          description="Settlement confirmations, rent distribution alerts, and verification updates will appear here."
          actionLabel="Back to overview"
          onAction={() => navigatePortal('overview')}
        />
      ) : (
        <div className="portal-card-list divide-y divide-[#1F2C33]">
          {effectiveNotifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                !item.read ? 'bg-[#172228]/55' : ''
              }`}
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StatusBadge
                    status={item.read ? 'completed' : 'pending'}
                    label={item.read ? 'Read' : 'Pending'}
                  />
                  <span className="text-sm font-medium text-[#F2F5F4]">{item.title}</span>
                </div>
                <p className="text-xs text-[#8FA1A8] leading-relaxed">{item.message}</p>
                <div className="text-xs text-[#8FA1A8] portal-tabular pt-0.5">
                  {formatDateTime(item.createdAt)}
                </div>
              </div>

              {!item.read && (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void handleMarkRead(item.id)}
                  className="portal-btn-secondary self-start shrink-0"
                >
                  <Check className="w-4 h-4 text-[#6FD8B0]" />
                  <span>{busyId === item.id ? 'Saving...' : 'Mark read'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
