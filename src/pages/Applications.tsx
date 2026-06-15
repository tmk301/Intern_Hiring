import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { candidateApi, type CandidateApplication } from "@/lib/api";
import { getReviewStatusBadgeClassName, getReviewStatusTranslationKey } from "@/lib/dashboardStyles";
import { isCandidateRole } from "@/lib/roles";
import { DEFAULT_PAGE_SIZE, getSafePage, paginateItems } from "@/lib/pagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

const ApplicationCard = ({ application }: { application: CandidateApplication }) => {
  const { t } = useTranslation();
  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-medium">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 transition-smooth group-hover:scale-125" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={getReviewStatusBadgeClassName(application.status)}>
              {t(`recruiter.applications.statuses.${getReviewStatusTranslationKey(application.status)}`)}
            </Badge>
            {application.jobType && <Badge variant="secondary" className="rounded-full px-3 py-1">{application.jobType}</Badge>}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{application.jobTitle || "Vị trí ứng tuyển"}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="h-4 w-4 text-primary" />{application.company || "Công ty đang tuyển"}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {application.location && <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1"><MapPin className="h-4 w-4 text-primary" />{application.location}</span>}
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1"><CalendarDays className="h-4 w-4 text-primary" />Gửi ngày {formatDate(application.appliedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary"><a href={application.appliedCvUrl} target="_blank" rel="noreferrer"><FileText className="mr-2 h-4 w-4" />CV đã gửi</a></Button>
          <Button asChild variant="cta" className="bg-primary text-primary-foreground hover:bg-primary-dark"><Link to={`/jobs?jobId=${application.jobId}`}><ExternalLink className="mr-2 h-4 w-4" />Xem công việc</Link></Button>
        </div>
      </div>
    </article>
  );
};

const EmptyState = ({ accepted }: { accepted?: boolean }) => (
  <div className="rounded-2xl border border-dashed bg-card p-10 text-center shadow-soft">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">{accepted ? <CheckCircle2 className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}</div>
    <h2 className="text-xl font-bold text-foreground">{accepted ? "Chưa có hồ sơ được duyệt" : "Bạn chưa gửi hồ sơ nào"}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{accepted ? "Khi công ty chấp nhận CV, hồ sơ sẽ xuất hiện ở đây để bạn theo dõi bước tiếp theo." : "Khám phá các vị trí thực tập phù hợp và gửi CV đầu tiên của bạn."}</p>
    {!accepted && <Button asChild variant="cta" className="mt-5 bg-primary text-primary-foreground hover:bg-primary-dark"><Link to="/jobs">Tìm việc ngay</Link></Button>}
  </div>
);

const LoadingState = () => (
  <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="rounded-xl border bg-card p-5 shadow-soft"><Skeleton className="mb-4 h-5 w-32" /><Skeleton className="mb-2 h-7 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>)}</div>
);

const Applications = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedPage = getSafePage(searchParams.get("submittedPage"));
  const acceptedPage = getSafePage(searchParams.get("acceptedPage"));

  const setPage = (key: "submittedPage" | "acceptedPage", page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(page));
    setSearchParams(next);
  };

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-applications", token],
    queryFn: () => candidateApi.listApplications(token!),
    enabled: Boolean(token),
  });

  const { submittedApplications, acceptedApplications } = useMemo(() => {
    const accepted = data.filter((application) => application.status === "ACCEPTED");
    const submitted = data.filter((application) => application.status !== "ACCEPTED");
    return { submittedApplications: submitted, acceptedApplications: accepted };
  }, [data]);

  const submitted = paginateItems(submittedApplications, submittedPage, DEFAULT_PAGE_SIZE);
  const accepted = paginateItems(acceptedApplications, acceptedPage, DEFAULT_PAGE_SIZE);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCandidateRole(user?.role)) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-gradient-subtle px-4 py-10">
      <section className="container mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-3xl border bg-card shadow-medium">
          <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><p className="mb-3 inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-accent-foreground shadow-accent">Career dossier</p><h1 className="text-4xl font-extrabold tracking-tight text-primary md:text-6xl">Ứng tuyển</h1><p className="mt-3 max-w-2xl text-base text-muted-foreground">Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.</p></div>
            <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-soft"><div className="text-3xl font-extrabold">{submittedApplications.length}</div><div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Đã gửi</div></div><div className="rounded-2xl bg-accent px-5 py-4 text-accent-foreground shadow-accent"><div className="text-3xl font-extrabold">{acceptedApplications.length}</div><div className="text-xs font-bold uppercase tracking-widest">Được duyệt</div></div></div>
          </div>
        </div>
        {isError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive"><p className="font-semibold">Không tải được danh sách ứng tuyển.</p><Button variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive/10" onClick={() => refetch()}>Thử lại</Button></div> : (
          <Tabs defaultValue="submitted" className="space-y-6">
            <TabsList className="h-auto rounded-full bg-secondary p-1 shadow-soft"><TabsTrigger value="submitted" className="rounded-full px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Đã gửi ({submittedApplications.length})</TabsTrigger><TabsTrigger value="accepted" className="rounded-full px-5 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Đã được duyệt ({acceptedApplications.length})</TabsTrigger></TabsList>
            <TabsContent value="submitted" className="space-y-4">{isLoading ? <LoadingState /> : submitted.items.length ? submitted.items.map((application) => <ApplicationCard key={application.id} application={application} />) : <EmptyState />}<PaginationControls page={submitted.page} totalPages={submitted.totalPages} onPageChange={(page) => setPage("submittedPage", page)} /></TabsContent>
            <TabsContent value="accepted" className="space-y-4">{isLoading ? <LoadingState /> : accepted.items.length ? accepted.items.map((application) => <ApplicationCard key={application.id} application={application} />) : <EmptyState accepted />}<PaginationControls page={accepted.page} totalPages={accepted.totalPages} onPageChange={(page) => setPage("acceptedPage", page)} /></TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  );
};

export default Applications;
