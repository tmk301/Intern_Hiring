import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { candidateApi, type CandidateApplication } from "@/lib/api";
import { getReviewStatusBadgeClassName, getReviewStatusTranslationKey } from "@/lib/dashboardStyles";
import { isCandidateRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

const ApplicationCard = ({ application }: { application: CandidateApplication }) => {
  const { t } = useTranslation();

  return (
  <article className="group relative overflow-hidden border-l-4 border-slate-900 bg-white p-5 shadow-[8px_8px_0_0_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_rgba(15,23,42,0.12)]">
    <div className="absolute right-0 top-0 h-16 w-16 bg-emerald-400/10 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getReviewStatusBadgeClassName(application.status)}>
            {t(`recruiter.applications.statuses.${getReviewStatusTranslationKey(application.status)}`)}
          </Badge>
          {application.jobType && (
            <Badge variant="secondary" className="rounded-none">
              {application.jobType}
            </Badge>
          )}
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">
            {application.jobTitle || "Vị trí ứng tuyển"}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <BriefcaseBusiness className="h-4 w-4" />
            {application.company || "Công ty đang tuyển"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          {application.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {application.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Gửi ngày {formatDate(application.appliedAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button asChild variant="outline" className="rounded-none border-slate-900">
          <a href={application.appliedCvUrl} target="_blank" rel="noreferrer">
            <FileText className="mr-2 h-4 w-4" />
            CV đã gửi
          </a>
        </Button>
        <Button asChild className="rounded-none bg-slate-950 text-white hover:bg-emerald-700">
          <Link to={`/jobs?jobId=${application.jobId}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Xem công việc
          </Link>
        </Button>
      </div>
    </div>
  </article>
  );
};

const EmptyState = ({ accepted }: { accepted?: boolean }) => (
  <div className="border border-dashed border-slate-300 bg-white p-10 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-slate-950 text-white">
      {accepted ? <CheckCircle2 className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}
    </div>
    <h2 className="text-xl font-black text-slate-950">
      {accepted ? "Chưa có hồ sơ được duyệt" : "Bạn chưa gửi hồ sơ nào"}
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
      {accepted
        ? "Khi công ty chấp nhận CV, hồ sơ sẽ xuất hiện ở đây để bạn theo dõi bước tiếp theo."
        : "Khám phá các vị trí thực tập phù hợp và gửi CV đầu tiên của bạn."}
    </p>
    {!accepted && (
      <Button asChild className="mt-5 rounded-none bg-emerald-600 hover:bg-emerald-700">
        <Link to="/jobs">Tìm việc ngay</Link>
      </Button>
    )}
  </div>
);

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((item) => (
      <div key={item} className="border-l-4 border-slate-200 bg-white p-5">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="mb-2 h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const Applications = () => {
  const { token, user, isAuthenticated } = useAuth();

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

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCandidateRole(user?.role)) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_42%,#f8fafc_100%)] px-4 py-10">
      <section className="container mx-auto max-w-6xl">
        <div className="mb-8 grid gap-6 border-b-4 border-slate-950 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-slate-950">
              Career dossier
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Ứng tuyển
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-950 px-5 py-4 text-white">
              <div className="text-3xl font-black">{submittedApplications.length}</div>
              <div className="text-xs uppercase tracking-widest text-slate-300">Đã gửi</div>
            </div>
            <div className="bg-emerald-500 px-5 py-4 text-slate-950">
              <div className="text-3xl font-black">{acceptedApplications.length}</div>
              <div className="text-xs font-bold uppercase tracking-widest">Được duyệt</div>
            </div>
          </div>
        </div>

        {isError ? (
          <div className="border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <p className="font-semibold">Không tải được danh sách ứng tuyển.</p>
            <Button variant="outline" className="mt-4 rounded-none" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="submitted" className="space-y-6">
            <TabsList className="h-auto rounded-none bg-slate-950 p-1">
              <TabsTrigger value="submitted" className="rounded-none px-5 py-3 data-[state=active]:bg-white">
                Đã gửi ({submittedApplications.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="rounded-none px-5 py-3 data-[state=active]:bg-emerald-400">
                Đã được duyệt ({acceptedApplications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submitted" className="space-y-4">
              {isLoading ? <LoadingState /> : submittedApplications.length ? submittedApplications.map((application) => <ApplicationCard key={application.id} application={application} />) : <EmptyState />}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-4">
              {isLoading ? <LoadingState /> : acceptedApplications.length ? acceptedApplications.map((application) => <ApplicationCard key={application.id} application={application} />) : <EmptyState accepted />}
            </TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  );
};

export default Applications;
