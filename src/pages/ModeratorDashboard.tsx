import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, History, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.tsx";
import { isAdminRole, isModeratorRole } from "@/lib/roles.ts";
import { getReviewStatusBadgeClassName, getRoleBadgeClassName, normalizeReviewStatus, normalizeRoleName } from "@/lib/dashboardStyles.ts";
import { DEFAULT_PAGE_SIZE, getSafePage, paginateItems } from "@/lib/pagination.ts";
import { moderatorApi, type ModeratorJobPost, type RecruiterJobChangeLog, type RecruiterJobSnapshot } from "@/lib/api.ts";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";
import { ActionIconButton } from "@/components/ui/action-icon-button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

type JobSnapshotField = keyof RecruiterJobSnapshot;

const JOB_SNAPSHOT_FIELDS: JobSnapshotField[] = [
  "title",
  "location",
  "type",
  "salary",
  "experience",
  "applicationDeadline",
  "description",
];

const JOB_FIELD_LABELS: Record<JobSnapshotField, string> = {
  title: "Tiêu đề",
  location: "Địa điểm",
  type: "Loại công việc",
  salary: "Lương",
  experience: "Kinh nghiệm",
  applicationDeadline: "Hạn ứng tuyển",
  description: "Mô tả",
};

const ModeratorDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<ModeratorJobPost | null>(null);
  const [selectedJobChangeLogs, setSelectedJobChangeLogs] = useState<RecruiterJobChangeLog[]>([]);
  const [loadingChangeLogs, setLoadingChangeLogs] = useState(false);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = getSafePage(searchParams.get("moderatorPage"));
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const formatModeratorDate = useCallback(
    (value?: string | null) => formatDate(value, dateLocale),
    [dateLocale],
  );

  const {
    data: jobs = [],
    isLoading: loadingData,
    refetch,
  } = useQuery({
    queryKey: ["moderator", "pendingJobs", token],
    queryFn: () => moderatorApi.listPendingJobs(token!),
    enabled: !!token && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const pageData = paginateItems(jobs, currentPage, DEFAULT_PAGE_SIZE);

  const setCurrentPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("moderatorPage", String(page));
    setSearchParams(next);
  };

  const approveMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.approveJob(token!, jobId),
    onSuccess: () => {
      toast.success(t("admin.jobs.approveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["moderator", "pendingJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.jobs.approveError")));
    },
    onSettled: () => setActionId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.rejectJob(token!, jobId),
    onSuccess: () => {
      toast.success(t("admin.jobs.rejectSuccess"));
      queryClient.invalidateQueries({ queryKey: ["moderator", "pendingJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.jobs.rejectError")));
    },
    onSettled: () => setActionId(null),
  });

  const handleApprove = (job: ModeratorJobPost) => {
    if (!token) return;
    setActionId(job.id);
    approveMutation.mutate(job.id);
  };

  const handleReject = (job: ModeratorJobPost) => {
    if (!token || !window.confirm(t("admin.jobs.rejectConfirm"))) return;
    setActionId(job.id);
    rejectMutation.mutate(job.id);
  };

  const openJobDetail = async (job: ModeratorJobPost) => {
    if (!token) return;

    setSelectedJob(job);
    setSelectedJobChangeLogs([]);
    setLoadingChangeLogs(true);
    try {
      setSelectedJobChangeLogs(await moderatorApi.listJobChangeLogs(token, job.id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể tải lịch sử thay đổi bài viết"));
    } finally {
      setLoadingChangeLogs(false);
    }
  };

  const closeJobDetail = () => {
    setSelectedJob(null);
    setSelectedJobChangeLogs([]);
    setLoadingChangeLogs(false);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isModeratorRole(user?.role) && !isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-5 py-2 text-sm ${getRoleBadgeClassName(user?.role)}`}>
                {t(`role.${normalizeRoleName(user?.role)}`, { defaultValue: t("moderator.badge") })}
              </Badge>
              <h1 className="text-3xl font-bold text-slate-950">{t("moderator.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("moderator.description")}</p>
            </div>

            <Button variant="outline" className="w-auto" onClick={() => refetch()} disabled={loadingData}>
              {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("moderator.stats.pendingTitle")}</CardTitle>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground">{t("moderator.stats.pendingDescription")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("moderator.jobs.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("moderator.jobs.empty")}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.jobs.titleColumn")}</TableHead>
                      <TableHead>{t("common.company")}</TableHead>
                      <TableHead>{t("common.recruiter")}</TableHead>
                      <TableHead>{t("admin.jobs.postedDate")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("admin.jobs.hiddenColumn")}</TableHead>
                      <TableHead className="text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.items.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.company || "-"}</TableCell>
                        <TableCell>{job.employerEmail || job.employerName || job.recruiterName || "-"}</TableCell>
                        <TableCell>{formatModeratorDate(job.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getReviewStatusBadgeClassName(job.status)}>
                            {t(`admin.jobs.statuses.${normalizeReviewStatus(job.status)}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.hidden ? t("common.yes") : t("common.no")}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            <ActionIconButton icon={Eye} label={t("common.details")} variantStyle="view" onClick={() => openJobDetail(job)} />
                            <ActionIconButton icon={CheckCircle2} label={t("admin.jobs.approve")} variantStyle="approve" disabled={actionId === job.id} onClick={() => handleApprove(job)} />
                            <ActionIconButton icon={XCircle} label={t("admin.jobs.reject")} variantStyle="reject" disabled={actionId === job.id} onClick={() => handleReject(job)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
          {!loadingData && jobs.length > 0 && (
            <PaginationControls page={pageData.page} totalPages={pageData.totalPages} onPageChange={setCurrentPage} className="pb-6" />
          )}
        </Card>
      </section>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && closeJobDetail()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t("admin.jobDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.jobDialog.description")}</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div><strong>{t("admin.jobs.titleColumn")}:</strong> {selectedJob.title}</div>
                <div><strong>{t("common.company")}:</strong> {selectedJob.company || "-"}</div>
                <div><strong>{t("common.recruiter")}:</strong> {selectedJob.employerEmail || selectedJob.employerName || selectedJob.recruiterName || "-"}</div>
                <div><strong>{t("admin.jobDialog.location")}:</strong> {selectedJob.location || "-"}</div>
                <div><strong>{t("common.type")}:</strong> {selectedJob.type || "-"}</div>
                <div><strong>{t("common.salary")}:</strong> {selectedJob.salary || "-"}</div>
                <div><strong>{t("recruiter.form.experience")}:</strong> {selectedJob.experience || "-"}</div>
              </div>
              <div>
                <strong>{t("common.description")}:</strong>
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3">{selectedJob.description || "-"}</p>
              </div>
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-slate-950">
                  <History className="h-4 w-4 text-primary" />
                  Lịch sử chỉnh sửa
                </div>
                {loadingChangeLogs ? (
                  <div className="flex items-center justify-center rounded-md border border-dashed py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedJobChangeLogs.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    Chưa có thay đổi nào được ghi nhận.
                  </p>
                ) : (
                  <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-2">
                    {selectedJobChangeLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border bg-white p-4">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-medium text-slate-950">{log.actorEmail}</div>
                            <div className="text-xs text-muted-foreground">{formatModeratorDate(log.createdAt)}</div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {log.changedFields.map((field) => (
                              <Badge key={field} variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                                {JOB_FIELD_LABELS[field] || field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {JOB_SNAPSHOT_FIELDS.filter((field) => log.changedFields.includes(field)).map((field) => (
                            <div key={field} className={`rounded-md border border-orange-200 bg-orange-50 p-3 ${field === "description" ? "md:col-span-2" : ""}`}>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
                                {JOB_FIELD_LABELS[field] || field}
                              </div>
                              <div className="grid gap-2 md:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-xs font-medium text-muted-foreground">Trước</div>
                                  <div className="whitespace-pre-wrap break-words rounded bg-white p-2 text-slate-700">
                                    {String(log.previousData[field] || "-")}
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 text-xs font-medium text-muted-foreground">Sau</div>
                                  <div className="whitespace-pre-wrap break-words rounded bg-white p-2 text-slate-950">
                                    {String(log.newData[field] || "-")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeJobDetail}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ModeratorDashboard;
