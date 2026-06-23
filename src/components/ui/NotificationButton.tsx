import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, CheckSquare, Trash2, X } from "lucide-react";
import { notificationApi, type ApiNotification, type ApiUser } from "@/lib/api";
import { paginateItems } from "@/lib/pagination";
import { isAdminRole, isCandidateRole, isModeratorRole, isRecruiterRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationButtonProps = {
  user: ApiUser | null;
  token: string | null;
  mobile?: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  path: string;
  source: "api" | "profile";
  read?: boolean;
};

const NOTIFICATIONS_PAGE_SIZE = 4;

const normalizeNotificationResponse = (response: Awaited<ReturnType<typeof notificationApi.list>>) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.content)) return response.content;
  if (Array.isArray(response.notifications)) return response.notifications;
  return [];
};

const getNotificationPath = (notification: ApiNotification, user?: ApiUser | null) => {
  if (notification.targetUrl || notification.link || notification.path) {
    return notification.targetUrl || notification.link || notification.path || "/profile";
  }

  switch (notification.type) {
    case "NEW_APPLICATION":
      return isRecruiterRole(user?.role) ? "/recruiter" : "/admin?section=employer-requests";
    case "JOB_PENDING_REVIEW":
    case "JOB_APPROVED":
    case "JOB_REJECTED":
      return isRecruiterRole(user?.role) ? "/recruiter" : "/admin?section=jobs";
    case "JOB_REVIEW_REQUEST":
      if (isAdminRole(user?.role)) return "/admin?section=jobs";
      if (isModeratorRole(user?.role)) return "/moderator";
      return "/admin?section=jobs";
    case "APPLICATION_ACCEPTED":
    case "APPLICATION_REJECTED":
      return "/jobs";
    default:
      return notification.jobId ? "/jobs" : "/profile";
  }
};

const mapApiNotification = (notification: ApiNotification, user?: ApiUser | null): NotificationItem => {
  const read = Boolean(notification.read || notification.isRead || notification.readAt);

  return {
    id: String(notification.id),
    title: notification.title || "Notification",
    description: notification.message || notification.content || notification.description || "",
    path: getNotificationPath(notification, user),
    source: "api",
    read,
  };
};

export function NotificationButton({ user, token, mobile = false }: NotificationButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[]>([]);
  const [readProfileNotificationIds, setReadProfileNotificationIds] = useState<Set<string>>(new Set());
  const [deletedProfileNotificationIds, setDeletedProfileNotificationIds] = useState<Set<string>>(new Set());
  const [notificationPage, setNotificationPage] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set());

  const loadNotifications = useCallback(() => {
    if (!token) {
      setApiNotifications([]);
      return Promise.resolve();
    }

    return notificationApi
      .list(token)
      .then((response) => {
        setApiNotifications(normalizeNotificationResponse(response).map((notification) => mapApiNotification(notification, user)));
      })
      .catch(() => {
        setApiNotifications([]);
      });
  }, [token, user]);

  useEffect(() => {
    let mounted = true;

    loadNotifications().then(() => undefined);
    const intervalId = window.setInterval(() => {
      if (mounted) loadNotifications();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const profileNotifications = useMemo<NotificationItem[]>(() => {
    if (!user) return [];

    const items: NotificationItem[] = [];

    if (isCandidateRole(user.role) && !user.cvList?.length) {
      const id = "missing-cv";
      if (!deletedProfileNotificationIds.has(id)) {
        items.push({
          id,
          title: t("notifications.missingCvTitle"),
          description: t("notifications.missingCvDescription"),
          path: "/profile",
          source: "profile",
          read: readProfileNotificationIds.has(id),
        });
      }
    }

    if (!user.phoneNumber || !user.gender || !user.dob) {
      const id = "incomplete-profile";
      if (!deletedProfileNotificationIds.has(id)) {
        items.push({
          id,
          title: t("notifications.incompleteProfileTitle"),
          description: t("notifications.incompleteProfileDescription"),
          path: "/profile",
          source: "profile",
          read: readProfileNotificationIds.has(id),
        });
      }
    }

    return items;
  }, [deletedProfileNotificationIds, readProfileNotificationIds, t, user]);

  const notifications = useMemo(
    () => [...apiNotifications, ...profileNotifications],
    [apiNotifications, profileNotifications],
  );
  const paginatedNotifications = useMemo(
    () => paginateItems(notifications, notificationPage, NOTIFICATIONS_PAGE_SIZE),
    [notificationPage, notifications],
  );
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const selectedCount = selectedNotificationIds.size;
  const allSelected = notifications.length > 0 && selectedCount === notifications.length;

  useEffect(() => {
    setNotificationPage((currentPage) => paginatedNotifications.page);
  }, [paginatedNotifications.page]);

  useEffect(() => {
    setSelectedNotificationIds((current) => {
      const existingIds = new Set(notifications.map((notification) => notification.id));
      const next = new Set([...current].filter((id) => existingIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [notifications]);

  useEffect(() => {
    // 1. Dynamic Page Title
    const titleEl = document.querySelector("title");
    if (titleEl) {
      const rawTitle = titleEl.textContent || "InternHiring";
      const baseTitle = rawTitle.replace(/\s*\(\d+\)/g, "");
      const targetTitle = unreadCount > 0 ? `${baseTitle} (${unreadCount})` : baseTitle;
      if (titleEl.textContent !== targetTitle) {
        titleEl.textContent = targetTitle;
      }
    }

    // 2. Dynamic Favicon Dot
    let faviconEl = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!faviconEl) {
      faviconEl = document.createElement("link");
      faviconEl.rel = "icon";
      document.head.appendChild(faviconEl);
    }

    if (unreadCount === 0) {
      faviconEl.href = "/favicon.ico";
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/favicon.ico";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 32, 32);
          
          // Red dot top-right
          const radius = 6;
          const x = 32 - radius;
          const y = radius;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#ef4444";
          ctx.fill();
          
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          
          faviconEl.href = canvas.toDataURL("image/png");
        }
      };
    }
  }, [unreadCount]);

  const openNotification = async (notification: NotificationItem) => {
    if (selectMode) {
      toggleNotificationSelection(notification.id);
      return;
    }

    setApiNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );

    if (notification.source === "profile") {
      setReadProfileNotificationIds((current) => new Set(current).add(notification.id));
    }

    if (token && !notification.read && notification.source === "api") {
      notificationApi.markAsRead(token, notification.id).catch(() => undefined);
    }

    navigate(notification.path);
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotificationIds((current) => {
      const next = new Set(current);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const toggleSelectAllNotifications = () => {
    setSelectedNotificationIds((current) =>
      current.size === notifications.length ? new Set() : new Set(notifications.map((notification) => notification.id)),
    );
  };

  const clearSelection = () => {
    setSelectedNotificationIds(new Set());
    setSelectMode(false);
  };

  const removeNotificationsLocally = (ids: Set<string>) => {
    setApiNotifications((current) => current.filter((notification) => !ids.has(notification.id)));
    setDeletedProfileNotificationIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => {
        if (id.startsWith("missing-") || id.startsWith("incomplete-")) next.add(id);
      });
      return next;
    });
    setSelectedNotificationIds((current) => new Set([...current].filter((id) => !ids.has(id))));
  };

  const deleteSelectedNotifications = () => {
    if (selectedNotificationIds.size === 0) return;

    const ids = new Set(selectedNotificationIds);
    const selectedApiIds = notifications
      .filter((notification) => ids.has(notification.id) && notification.source === "api")
      .map((notification) => notification.id);

    removeNotificationsLocally(ids);
    setSelectMode(false);

    if (token && selectedApiIds.length > 0) {
      notificationApi.deleteMany(token, selectedApiIds).catch(() => loadNotifications());
    }
  };

  const markAllAsRead = async () => {
    setApiNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setReadProfileNotificationIds(new Set(profileNotifications.map((notification) => notification.id)));

    if (!token) return;

    notificationApi.markAllAsRead(token).catch(() => {
      const unreadApiNotifications = apiNotifications.filter((notification) => !notification.read);
      unreadApiNotifications.forEach((notification) => {
        notificationApi.markAsRead(token, notification.id).catch(() => undefined);
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={mobile ? "outline" : "ghost"}
          size={mobile ? "default" : "icon"}
          className={mobile ? "relative w-full justify-start gap-2 overflow-visible" : "relative overflow-visible"}
          aria-label={t("notifications.buttonLabel")}
        >
          <Bell className="h-5 w-5" />
          {mobile && <span>{t("notifications.buttonLabel")}</span>}
          {unreadCount > 0 && (
            <span
              className={
                mobile
                  ? "ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground"
                  : "absolute right-0 top-0 z-10 flex min-h-5 min-w-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground ring-2 ring-white"
              }
            >
              {countLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>{t("notifications.title")}</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-primary hover:bg-sky-50 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  markAllAsRead();
                }}
              >
                {t("notifications.markAllRead")}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={selectMode ? t("common.cancel") : t("notifications.delete")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (selectMode) {
                    clearSelection();
                  } else {
                    setSelectMode(true);
                  }
                }}
              >
                {selectMode ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selectMode && notifications.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 px-2 py-2">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={toggleSelectAllNotifications}>
                <CheckSquare className="h-3.5 w-3.5" />
                {allSelected
                  ? t("notifications.clearSelection")
                  : t("notifications.selectAll")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={selectedCount === 0}
                onClick={deleteSelectedNotifications}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("notifications.deleteSelected")} ({selectedCount})
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {notifications.length > 0 ? (
          <>
            <div className="max-h-[440px] overflow-y-auto">
              {paginatedNotifications.items.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 px-2 py-3 focus-within:bg-sky-50 hover:bg-sky-50">
                  {selectMode && (
                    <Checkbox
                      className="mt-1"
                      checked={selectedNotificationIds.has(notification.id)}
                      onCheckedChange={() => toggleNotificationSelection(notification.id)}
                      aria-label={t("notifications.selectNotification")}
                    />
                  )}
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer whitespace-normal text-left focus:outline-none",
                      notification.read ? "font-normal text-slate-900" : "font-semibold text-slate-950",
                    )}
                    onClick={() => openNotification(notification)}
                  >
                    <span className={cn("block", notification.read ? "font-normal" : "font-semibold")}>{notification.title}</span>
                    <span className={cn("block text-xs", notification.read ? "font-normal text-slate-500" : "font-semibold text-slate-600")}>
                      {notification.description}
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <PaginationControls
              page={paginatedNotifications.page}
              totalPages={paginatedNotifications.totalPages}
              onPageChange={setNotificationPage}
              className="px-2 pb-2"
            />
          </>
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            {t("notifications.empty")}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
