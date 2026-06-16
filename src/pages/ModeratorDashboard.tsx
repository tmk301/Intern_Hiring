import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.tsx";
import { isAdminRole, isModeratorRole } from "@/lib/roles.ts";
import { getReviewStatusBadgeClassName, getRoleBadgeClassName, normalizeReviewStatus, normalizeRoleName } from "@/lib/dashboardStyles.ts";
import { moderatorApi, type ModeratorJobPost } from "@/lib/api.ts";
import { ActionIconButton } from "@/components/ui/action-icon-button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";
import { paginateItems } from "@/lib/pagination.ts";
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

const ModeratorDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<ModeratorJobPost | null>(null);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
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
  const paginatedJobs = useMemo(
    () => paginateItems(jobs, jobPage, jobPageSize),
    [jobPage, jobPageSize, jobs],
  );

  
  
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
                  {paginatedJobs.map((job) => (
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
                          <ActionIconButton
                            icon={Eye}
                            label={t("common.details")}
                            variantStyle="view"
                            onClick={() => setSelectedJob(job)}
                          />
                          <ActionIconButton
                            icon={CheckCircle2}
                            label={t("admin.jobs.approve")}
                            variantStyle="approve"
                            disabled={actionId === job.id}
                            onClick={() => handleApprove(job)}
                          />
                          <ActionIconButton
                            icon={XCircle}
                            label={t("admin.jobs.reject")}
                            variantStyle="reject"
                            disabled={actionId === job.id}
                            onClick={() => handleReject(job)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                page={jobPage}
                pageSize={jobPageSize}
                totalItems={jobs.length}
                onPageChange={setJobPage}
                onPageSizeChange={setJobPageSize}
              />
              </>
            )}
          </CardContent>

        </Card>
      </section>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ModeratorDashboard;
