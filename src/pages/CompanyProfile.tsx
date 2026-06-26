import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, Globe, ImageIcon, Loader2, Mail, MapPin, Phone, Pencil } from "lucide-react";

import { companyApi, CompanyProfile as CompanyProfileData } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";

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
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);

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
  const isOwner = user && user.role === "RECRUITER" && String(user.id) === String(company.recruiterId);

  return (
    <main className="min-h-screen bg-slate-50">
      <SanityPageSections routePath="/companies/:companyId" placement="top" />
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
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-end min-w-0 flex-1">
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
              </div>

              {isOwner && (
                <Button 
                  onClick={() => navigate("/recruiter-verification")}
                  className="shrink-0 flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {t("profile.companyProfileEdit") || "Chỉnh sửa hồ sơ"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      <SanityPageSections routePath="/companies/:companyId" placement="afterHero" />

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
                      <div className="mt-1 text-xs font-semibold text-emerald-700">{t("recruiterVerification.fields.defaultAddressTag")}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Google Map Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t("profile.mapTitle")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4">
              {company.mapUrl ? (
                <div className="w-full overflow-hidden rounded-lg border bg-white p-1">
                  <iframe
                    src={company.mapUrl}
                    width="100%"
                    height="320"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Maps"
                    className="rounded-md"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50 p-4 text-center text-muted-foreground">
                  <MapPin className="mb-2 h-7 w-7 opacity-40 text-muted-foreground" />
                  <p className="text-sm">{t("companyProfile.noMap")}</p>
                  {addresses.length > 0 ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [addresses[0].detail, addresses[0].district, addresses[0].province].filter(Boolean).join(", ")
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      {t("companyProfile.viewOnGoogleMaps")} ↗
                    </a>
                  ) : company.billingAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.billingAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      {t("companyProfile.viewOnGoogleMaps")} ↗
                    </a>
                  )}
                </div>
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
      <SanityPageSections routePath="/companies/:companyId" placement="bottom" />
    </main>
  );
};

export default CompanyProfile;
