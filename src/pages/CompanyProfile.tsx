import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, Globe, ImageIcon, Loader2, Mail, MapPin, Phone, Pencil, AlertTriangle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { companyApi, CompanyProfile as CompanyProfileData, recruiterApi, RecruiterApplication } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type CompanyAddress = {
  headOffice?: string;
  province?: string;
  district?: string;
  detail?: string;
  isDefault?: boolean;
};

const parseJsonArray = <T,>(value?: string | null): T[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CompanyProfile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companyId } = useParams();
  const { user, token } = useAuth();
  const [company, setCompany] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCompanyApplication, setPendingCompanyApplication] = useState<RecruiterApplication | undefined>();
  const [loadingPending, setLoadingPending] = useState(false);

  const isOwner = user && company && String(user.id) === String(company.recruiterId);

  useEffect(() => {
    if (!companyId) return;

    let mounted = true;
    setLoading(true);
    companyApi.getCompanyProfile(companyId)
      .then((data) => {
        if (mounted) setCompany(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!isOwner || !token) {
      setPendingCompanyApplication(undefined);
      return;
    }

    let mounted = true;
    setLoadingPending(true);
    recruiterApi.getPendingApplication(token)
      .then((pending) => {
        if (mounted) setPendingCompanyApplication(pending);
      })
      .catch(() => {
        if (mounted) setPendingCompanyApplication(undefined);
      })
      .finally(() => {
        if (mounted) setLoadingPending(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOwner, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) return <Navigate to="/" replace />;

  const addresses = parseJsonArray<CompanyAddress>(company.addresses);
  const galleryUrls = parseJsonArray<string>(company.galleryUrls);
  const displayName = company.companyDisplayName || company.companyFullName;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>

          <div className="overflow-hidden rounded-lg border bg-white">
            {company.coverUrl ? (
              <img src={company.coverUrl} alt="" className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-slate-100">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
              <div className="-mt-16 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-bold text-slate-950">{displayName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{company.companyFullName}</p>
              </div>
              {isOwner && (
                <div className="shrink-0 w-full md:w-auto">
                  {pendingCompanyApplication ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              disabled
                              className="w-full md:w-auto flex items-center justify-center gap-2 border-slate-200 shadow-sm opacity-60 cursor-help"
                            >
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              {t("recruiter.companyProfileUpdatePending")}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-xs rounded-lg shadow-md">
                          <p className="font-semibold text-amber-950 mb-1">{t("recruiter.companyProfileUpdatePending")}</p>
                          <p className="text-amber-900/90">{t("recruiter.companyProfileUpdatePendingDescription")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/recruiter-verification")}
                      disabled={loadingPending}
                      className="w-full md:w-auto flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 hover:text-slate-950 shadow-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      {t("profile.companyProfileEdit")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("recruiterVerification.sections.legal")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{t("profile.companyTaxCode")}</div>
                <div className="mt-1 text-sm">{company.taxCode}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{t("recruiterVerification.fields.companySize")}</div>
                <div className="mt-1 text-sm">{company.companySize}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{t("profile.companyPhone")}</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {company.companyPhone}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{t("common.email")}</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {company.recruiterEmail || "-"}
                </div>
              </div>
              {company.companyWebsite && (
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground">{t("recruiterVerification.fields.companyWebsite")}</div>
                  <a href={company.companyWebsite} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 text-sm text-primary underline">
                    <Globe className="h-4 w-4" />
                    {company.companyWebsite}
                  </a>
                </div>
              )}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground">{t("recruiterVerification.fields.companyIntro")}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{company.companyIntro || "-"}</p>
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
              {addresses.length === 0 ? (
                <div className="rounded-lg border bg-white p-3 text-sm text-muted-foreground">{company.billingAddress}</div>
              ) : (
                addresses.map((address, index) => (
                  <div key={index} className="rounded-lg border bg-white p-3">
                    <div className="font-semibold">{address.headOffice || t("recruiterVerification.addressTitle", { number: index + 1 })}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {[address.detail, address.district, address.province].filter(Boolean).join(", ")}
                    </div>
                    {address.isDefault && (
                      <div className="mt-1 text-xs font-semibold text-emerald-700">{t("recruiterVerification.fields.defaultAddress")}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
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
      </section>
    </main>
  );
};

export default CompanyProfile;
