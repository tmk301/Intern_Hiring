import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, CheckCircle2, ImageIcon, Loader2, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { recruiterApi, RecruiterApplication } from "@/lib/api";
import { isAdminRole, isModeratorRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const parseJsonArray = <T,>(value?: string | null): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type CompanyAddress = {
  headOffice?: string;
  province?: string;
  district?: string;
  detail?: string;
  isDefault?: boolean;
};

const AdminCompanyReview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [application, setApplication] = useState<RecruiterApplication | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(true);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (!token || !applicationId) return;

    let mounted = true;
    setLoadingApplication(true);
    recruiterApi.getApplication(token, applicationId)
      .then((data) => {
        if (mounted) setApplication(data);
      })
      .finally(() => {
        if (mounted) setLoadingApplication(false);
      });

    return () => {
      mounted = false;
    };
  }, [applicationId, token]);

  const handleReview = async (approved: boolean) => {
    if (!token || !application) return;

    setActionId(application.id);
    try {
      await recruiterApi.reviewApplication(token, application.id, approved, reviewNote.trim());
      toast.success(approved ? t("admin.approveRecruiterSuccess") : t("admin.rejectRequestSuccess"));
      if (isModeratorRole(user?.role)) {
        navigate("/moderator");
      } else {
        navigate("/admin");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.reviewRequestError"));
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

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdminRole(user?.role) && !isModeratorRole(user?.role)) return <Navigate to="/" replace />;

  if (loadingApplication) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return <Navigate to={isModeratorRole(user?.role) ? "/moderator" : "/admin"} replace />;
  }

  const formData = application.formData || {};
  const addresses = parseJsonArray<CompanyAddress>(formData.addresses);
  const galleryUrls = parseJsonArray<string>(formData.galleryUrls);
  const pending = application.status === "PENDING";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="hero-gradient text-white py-8 shadow-sm">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            className="mb-6 text-white hover:bg-white/10 hover:text-white/80"
            onClick={() => {
              if (isModeratorRole(user?.role)) {
                navigate("/moderator");
              } else {
                navigate("/admin");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                {formData.companyDisplayName || formData.companyFullName}
              </h1>
              <p className="mt-2 text-sm font-medium text-blue-100/90">{application.applicantEmail}</p>
            </div>
            {pending && (
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/30 bg-white/95 text-red-700 hover:bg-white hover:text-red-800" disabled={actionId === application.id} onClick={() => handleReview(false)}>
                  <XCircle className="h-4 w-4" />
                  {t("admin.requests.reject")}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/95 text-emerald-700 hover:bg-white hover:text-emerald-800"
                  disabled={actionId === application.id}
                  onClick={() => handleReview(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("admin.requests.approve")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                {t("recruiterVerification.sections.branding")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {formData.logoUrl && <img src={formData.logoUrl} alt="" className="max-h-52 rounded-lg border object-contain" />}
              {formData.coverUrl && <img src={formData.coverUrl} alt="" className="max-h-52 w-full rounded-lg border object-cover" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("recruiterVerification.sections.legal")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
              {[
                "companyFullName",
                "companyDisplayName",
                "taxCode",
                "billingAddress",
                "companySize",
                "companyPhone",
                "companyWebsite",
              ].map((key) => (
                <div key={key}>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {t(`recruiterVerification.formData.${key}`, { defaultValue: key })}
                  </div>
                  <div className="mt-1 break-words text-sm">{formData[key] || "-"}</div>
                </div>
              ))}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground">{t("recruiterVerification.formData.companyIntro")}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{formData.companyIntro || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t("recruiterVerification.sections.addresses")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {addresses.map((address, index) => (
                <div key={index} className="rounded-lg border bg-white p-3">
                  <div className="font-semibold">{address.headOffice || t("recruiterVerification.addressTitle", { number: index + 1 })}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[address.detail, address.district, address.province].filter(Boolean).join(", ")}
                  </div>
                  {address.isDefault && <div className="mt-1 text-xs font-semibold text-emerald-700">{t("recruiterVerification.fields.defaultAddressTag")}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.requests.note")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={t("admin.rejectDialog.placeholder")} disabled={!pending} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("recruiterVerification.sections.gallery")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {galleryUrls.length === 0 ? (
                <span className="text-sm text-muted-foreground">-</span>
              ) : (
                galleryUrls.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-video w-full rounded-lg border object-cover" />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default AdminCompanyReview;
