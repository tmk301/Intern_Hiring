import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationApi, type ApiNotification, type ApiUser } from "@/lib/api";
import { isAdminRole, isCandidateRole, isModeratorRole, isRecruiterRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  read?: boolean;
};

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
    read,
  };
};

export function NotificationButton({ user, token, mobile = false }: NotificationButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[]>([]);

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
      items.push({
        id: "missing-cv",
        title: t("notifications.missingCvTitle"),
        description: t("notifications.missingCvDescription"),
        path: "/profile",
        read: false,
      });
    }

    if (!user.phoneNumber || !user.gender || !user.dob) {
      items.push({
        id: "incomplete-profile",
        title: t("notifications.incompleteProfileTitle"),
        description: t("notifications.incompleteProfileDescription"),
        path: "/profile",
        read: false,
      });
    }

    return items;
  }, [t, user]);

  const notifications = useMemo(
    () => [...apiNotifications, ...profileNotifications],
    [apiNotifications, profileNotifications],
  );
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const openNotification = async (notification: NotificationItem) => {
    setApiNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );

    if (token && !notification.read && !notification.id.startsWith("missing-") && !notification.id.startsWith("incomplete-")) {
      notificationApi.markAsRead(token, notification.id).catch(() => undefined);
    }

    navigate(notification.path);
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
        <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 whitespace-normal py-3",
                notification.read ? "font-normal" : "font-semibold",
              )}
              onClick={() => openNotification(notification)}
            >
              <span className={notification.read ? "font-normal" : "font-semibold"}>{notification.title}</span>
              <span className={cn("text-xs text-muted-foreground", notification.read ? "font-normal" : "font-semibold")}>
                {notification.description}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="py-3 text-muted-foreground">
            {t("notifications.empty")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
