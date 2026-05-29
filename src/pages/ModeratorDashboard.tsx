import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.tsx";
import { isAdminRole, isModeratorRole } from "@/lib/roles.ts";
import { moderatorApi, type ModeratorJobPost } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN");
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const ModeratorDashboard: React.FC = () => {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [selectedJob, setSelectedJob] = useState<ModeratorJobPost | null>(null);
  const [actionId, setActionId] = useState<string | number | null>(null);

  const {
    data: jobs = [],
    isLoading: loadingData,
    refetch,
  } = useQuery({
    queryKey: ["moderator", "pendingJobs", token],
    queryFn: () => moderatorApi.listPendingJobs(token!),
    enabled: !!token && isAuthenticated,
    staleTime: 1000 * 60 * 5, // Cache trong 5 phút
  });

  const approveMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.approveJob(token!, jobId),
    onSuccess: () => {
      toast.success("Đã duyệt JD.");
      queryClient.invalidateQueries({ queryKey: ["moderator", "pendingJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể duyệt JD."));
    },
    onSettled: () => setActionId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.rejectJob(token!, jobId),
    onSuccess: () => {
      toast.success("Đã từ chối JD.");
      queryClient.invalidateQueries({ queryKey: ["moderator", "pendingJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể từ chối JD."));
    },
    onSettled: () => setActionId(null),
  });

  const handleApprove = async (job: ModeratorJobPost) => {
    if (!token) return;
    setActionId(job.id);
    approveMutation.mutate(job.id);
  };

  const handleReject = async (job: ModeratorJobPost) => {
    if (!token) return;

    const confirmed = window.confirm("Bạn chắc chắn muốn từ chối JD này?");
    if (!confirmed) return;

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
              <Badge className="mb-3 bg-primary text-primary-foreground">
                MODERATOR
              </Badge>
              <h1 className="text-3xl font-bold text-slate-950">
                Trang kiểm duyệt JD
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Duyệt hoặc từ chối các JD do nhà tuyển dụng đăng lên.
              </p>
            </div>

            <Button variant="outline" onClick={() => refetch()} disabled={loadingData}>
              {loadingData ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Làm mới
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">JD chờ duyệt</CardTitle>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground">
                Các JD đang ở trạng thái PENDING
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách JD chờ duyệt</CardTitle>
          </CardHeader>

          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Hiện không có JD nào đang chờ duyệt.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead>Địa điểm</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày đăng</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.company || job.employerName || "-"}</TableCell>
                      <TableCell>{job.location || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.status || "PENDING_REVIEW"}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(job.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                            <Eye className="h-4 w-4" />
                            Xem
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === job.id}
                            onClick={() => handleApprove(job)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Duyệt
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionId === job.id}
                            onClick={() => handleReject(job)}
                          >
                            <XCircle className="h-4 w-4" />
                            Từ chối
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết JD</DialogTitle>
            <DialogDescription>Thông tin JD do nhà tuyển dụng gửi lên.</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <strong>Tiêu đề:</strong> {selectedJob.title}
                </div>
                <div>
                  <strong>Công ty:</strong> {selectedJob.company || selectedJob.employerName || "-"}
                </div>
                <div>
                  <strong>Email nhà tuyển dụng:</strong> {selectedJob.employerEmail || "-"}
                </div>
                <div>
                  <strong>Địa điểm:</strong> {selectedJob.location || "-"}
                </div>
                <div>
                  <strong>Loại:</strong> {selectedJob.type || "-"}
                </div>
                <div>
                  <strong>Lương:</strong> {selectedJob.salary || "-"}
                </div>
              </div>

              <div>
                <strong>Mô tả:</strong>
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3">
                  {selectedJob.description || "-"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ModeratorDashboard;