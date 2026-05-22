import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Eye,
  FileCheck2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { adminApi, isApiError, recruiterApi, type AdminJobPost, type AdminUser, type RecruiterApplication } from "@/lib/api";
import { isAdminRole } from "@/lib/roles";
import { CategoryManagementPanel } from "@/components/admin/CategoryManagementPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type AdminSection = "users" | "jobs" | "employer-requests" | "categories";

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);


const isTrashedJob = (job: AdminJobPost) => {
  const status = job.status?.toUpperCase();
  return Boolean(job.deletedAt || status === "TRASHED" || status === "DELETED");
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
};


const AdminDashboard: React.FC = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJobPost[]>([]);
  const [requests, setRequests] = useState<RecruiterApplication[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedJob, setSelectedJob] = useState<AdminJobPost | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<RecruiterApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionId, setActionId] = useState<string | number | null>(null);

  const activeJobs = useMemo(() => jobs.filter((job) => !isTrashedJob(job)), [jobs]);
  const trashedJobs = useMemo(() => jobs.filter(isTrashedJob), [jobs]);
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING"),
    [requests],
  );

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoadingData(true);
    try {
      const [userList, jobList, requestList] = await Promise.all([
        adminApi.listUsers(token),
        adminApi.listJobs(token),
        recruiterApi.listApplications(token).catch(() => []),
      ]);

      setUsers(userList);
      setJobs(jobList);
      setRequests(requestList);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu quản trị."));
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const requireConfirm = (message: string) => window.confirm(message);




  const handleRestriction = async (targetUser: AdminUser, restricted: boolean) => {
    if (!token) return;

    setActionId(targetUser.id);
    try {
      await adminApi.setUserRestriction(token, targetUser.id, restricted);

      toast.success(restricted ? "Đã hạn chế tài khoản." : "Đã bỏ hạn chế tài khoản.");
      await loadData();
    } catch (error: unknown) {
      if (isApiError(error) && error.status === 403) {
        toast.error("Bạn không có quyền cập nhật hạn chế tài khoản này.");
      } else {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái hạn chế.");
      }
    } finally {
      setActionId(null);
    }
  };

  const handleTrashJob = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.moveJobToTrash(token, job.id);

      toast.success("Đã chuyển bài đăng vào thùng rác.");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể chuyển bài đăng vào thùng rác."));
    } finally {
      setActionId(null);
    }
  };

  const handleRestoreJob = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.restoreJob(token, job.id);

      toast.success("Đã khôi phục bài đăng.");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể khôi phục bài đăng."));
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteJobPermanently = async (job: AdminJobPost) => {
    if (!token) return;
    if (!requireConfirm("Xóa vĩnh viễn bài đăng này khỏi thùng rác?")) return;

    setActionId(job.id);
    try {
      await adminApi.deleteJobPermanently(token, job.id);
      toast.success("Đã xóa vĩnh viễn bài đăng.");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể xóa vĩnh viễn bài đăng."));
    } finally {
      setActionId(null);
    }
  };

  const handleReviewRequest = async (
    application: RecruiterApplication,
    approved: boolean,
    reason?: string,
  ) => {
    if (!token) return;

    setActionId(application.id);
    try {
      await recruiterApi.reviewApplication(token, application.id, approved, reason);

      toast.success(approved ? "Đã duyệt nhà tuyển dụng." : "Đã từ chối yêu cầu.");
      setRejectingRequest(null);
      setRejectionReason("");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể xử lý yêu cầu."));
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="mb-3 bg-primary text-primary-foreground">ADMIN</Badge>
              <h1 className="text-3xl font-bold text-slate-950">Trang quản trị viên</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Quản lý tài khoản, tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.
              </p>
            </div>
            <Button variant="outline" onClick={loadData} disabled={loadingData}>
              {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "users" ? "border-primary" : ""}`}
            onClick={() => setActiveSection("users")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tất cả người dùng</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Bấm để xem danh sách tài khoản</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "jobs" ? "border-primary" : ""}`}
            onClick={() => setActiveSection("jobs")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tin tuyển dụng</CardTitle>
              <Briefcase className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeJobs.length}</div>
              <p className="text-xs text-muted-foreground">{trashedJobs.length} bài trong thùng rác</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${
              activeSection === "employer-requests" ? "border-primary" : ""
            }`}
            onClick={() => setActiveSection("employer-requests")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duyệt nhà tuyển dụng</CardTitle>
              <FileCheck2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Yêu cầu đang chờ duyệt</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "categories" ? "border-primary" : ""}`}
            onClick={() => setActiveSection("categories")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quản lý danh mục</CardTitle>
              <Settings2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Danh mục &amp; Form xác thực</p>
            </CardContent>
          </Card>
        </div>

        {loadingData ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {activeSection === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách tài khoản người dùng</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((account) => {
                        const restricted =
                          account.restricted ||
                          account.isRestricted ||
                          account.status?.toUpperCase() === "RESTRICTED" ||
                          account.status?.toUpperCase() === "BLOCKED";

                        return (
                          <TableRow key={account.id}>
                            <TableCell>{account.email}</TableCell>
                            <TableCell>
                              {account.lastName} {account.firstName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{account.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={restricted ? "destructive" : "secondary"}>
                                {restricted ? "Bị hạn chế" : "Hoạt động"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(account)}>
                                  <Eye className="h-4 w-4" />
                                  Xem
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionId === account.id || isAdminRole(account.role)}
                                  onClick={() => handleRestriction(account, !restricted)}
                                >
                                  <ShieldAlert className="h-4 w-4" />
                                  {restricted ? "Bỏ hạn chế" : "Hạn chế"}
                                </Button>

                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeSection === "jobs" && (
              <Card>
                <CardHeader>
                  <CardTitle>Quản lý tin tuyển dụng</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="active">
                    <TabsList>
                      <TabsTrigger value="active">Đang hiển thị</TabsTrigger>
                      <TabsTrigger value="trash">Thùng rác</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead>Công ty</TableHead>
                            <TableHead>Nhà tuyển dụng</TableHead>
                            <TableHead>Ngày đăng</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{job.employerEmail || job.employerName || "-"}</TableCell>
                              <TableCell>{formatDate(job.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                                    <Eye className="h-4 w-4" />
                                    Chi tiết
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={actionId === job.id}
                                    onClick={() => handleTrashJob(job)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Vào thùng rác
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                    <TabsContent value="trash">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead>Công ty</TableHead>
                            <TableHead>Ngày xóa</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trashedJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{formatDate(job.deletedAt)}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleRestoreJob(job)}>
                                    <RotateCcw className="h-4 w-4" />
                                    Khôi phục
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={actionId === job.id}
                                    onClick={() => handleDeleteJobPermanently(job)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Xóa vĩnh viễn
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {activeSection === "employer-requests" && (
              <Card>
                <CardHeader>
                  <CardTitle>Duyệt yêu cầu xác thực nhà tuyển dụng</CardTitle>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Chưa có yêu cầu nào.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email ứng viên</TableHead>
                          <TableHead>Thông tin đăng ký</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((application) => {
                          const pending = application.status === "PENDING";

                          return (
                            <TableRow key={application.id}>
                              <TableCell className="font-medium">{application.applicantEmail}</TableCell>
                              <TableCell>
                                {application.formData && Object.keys(application.formData).length > 0 ? (
                                  <div className="space-y-1 text-xs">
                                    {Object.entries(application.formData).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {value || "-"}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    application.status === "APPROVED"
                                      ? "secondary"
                                      : application.status === "REJECTED"
                                        ? "destructive"
                                        : "outline"
                                  }
                                >
                                  {application.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{application.reviewNote || "-"}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pending || actionId === application.id}
                                    onClick={() => handleReviewRequest(application, true)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Duyệt
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={!pending || actionId === application.id}
                                    onClick={() => setRejectingRequest(application)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Từ chối
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "categories" && token && (
              <CategoryManagementPanel token={token} />
            )}
          </>
        )}
      </section>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile người dùng</DialogTitle>
            <DialogDescription>Thông tin chi tiết tài khoản đang chọn.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>Role:</strong> {selectedUser.role}</div>
              <div><strong>Họ tên:</strong> {selectedUser.lastName} {selectedUser.firstName}</div>
              <div><strong>Số điện thoại:</strong> {selectedUser.phoneNumber || "-"}</div>
              <div><strong>Giới tính:</strong> {selectedUser.gender || "-"}</div>
              <div><strong>Ngày sinh:</strong> {selectedUser.dob || "-"}</div>
              <div><strong>Ngày tạo:</strong> {formatDate(selectedUser.createdAt)}</div>
              <div><strong>CV:</strong> {selectedUser.cvUrl ? <a className="text-primary underline" href={selectedUser.cvUrl} target="_blank" rel="noreferrer">Xem CV</a> : "-"}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tin tuyển dụng</DialogTitle>
            <DialogDescription>Thông tin bài đăng từ nhà tuyển dụng.</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div><strong>Tiêu đề:</strong> {selectedJob.title}</div>
                <div><strong>Công ty:</strong> {selectedJob.company || "-"}</div>
                <div><strong>Nhà tuyển dụng:</strong> {selectedJob.employerEmail || selectedJob.employerName || "-"}</div>
                <div><strong>Địa điểm:</strong> {selectedJob.location || "-"}</div>
                <div><strong>Loại:</strong> {selectedJob.type || "-"}</div>
                <div><strong>Lương:</strong> {selectedJob.salary || "-"}</div>
              </div>
              <div>
                <strong>Mô tả:</strong>
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3">{selectedJob.description || "-"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
            <DialogDescription>Nhập lý do từ chối để lưu lại trong yêu cầu.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Ví dụ: Thông tin công ty chưa hợp lệ"
          />
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            Yêu cầu bị từ chối sẽ không đổi role của người dùng.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRequest(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingRequest && handleReviewRequest(rejectingRequest, false, rejectionReason)}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default AdminDashboard;
