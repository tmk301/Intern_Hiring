import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Check, ChevronsUpDown, ImageIcon, Loader2, MapPin, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { configApi, isApiError, recruiterApi, type RecruiterFormField } from "@/lib/api";
import { isCandidateRole, isRecruiterRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { getVietnamProvinceOptions, getVietnamWardOptions } from "@/lib/vietnamProvinces";
import type { JobFilterOption } from "@/components/jobs/jobFilterConfig";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";
import { useSanityInterfaceText } from "@/lib/sanityInterfaceText";

const COMPANY_PROFILE_BUCKET = "company";
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MB = 1024 * 1024;
const LOGO_MAX_SIZE = 5 * MB;
const COVER_MAX_SIZE = 10 * MB;
const GALLERY_MAX_SIZE = 5 * MB;
const MAX_GALLERY_IMAGES = 5;
const RESERVED_FORM_FIELD_NAMES = new Set([
  "logoUrl",
  "coverUrl",
  "companyFullName",
  "companyDisplayName",
  "taxCode",
  "billingAddress",
  "companySize",
  "companyPhone",
  "companyWebsite",
  "companyIntro",
  "addresses",
  "galleryUrls",
]);

type CompanyAddress = {
  id: string;
  headOffice: string;
  province: string;
  district: string;
  detail: string;
  isDefault: boolean;
};

type CompanyFormValue = {
  companyFullName: string;
  companyDisplayName: string;
  taxCode: string;
  billingAddress: string;
  companySize: string;
  companyPhone: string;
  companyWebsite: string;
  companyIntro: string;
  mapUrl: string;
};

type FilePreview = {
  file?: File;
  previewUrl: string;
  existingUrl?: string;
};

type StoredCompanyAddress = {
  headOffice?: string;
  province?: string;
  provinceCode?: string;
  district?: string;
  districtCode?: string;
  detail?: string;
  isDefault?: boolean;
};

const emptyFormValue: CompanyFormValue = {
  companyFullName: "",
  companyDisplayName: "",
  taxCode: "",
  billingAddress: "",
  companySize: "",
  companyPhone: "",
  companyWebsite: "",
  companyIntro: "",
  mapUrl: "",
};

const createAddress = (isDefault = false): CompanyAddress => ({
  id: crypto.randomUUID(),
  headOffice: "",
  province: "79",
  district: "",
  detail: "",
  isDefault,
});

const safeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

const getOptionLabel = (options: JobFilterOption[], value: string) =>
  options.find((option) => option.value === value)?.label || value;

const parseJsonArray = <T,>(value?: string | null): T[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStoredText = (value: unknown) => (typeof value === "string" ? value : "");

const getCompanySizeValue = (value?: string | null) => {
  if (!value) return "";
  const [code] = value.split(" - ");
  return ["1", "2", "3", "4"].includes(code) ? code : value;
};

const extractMapUrl = (input: string): string => {
  if (!input.trim()) return "";
  const iframeRegex = /<iframe[^>]+src="([^"]+)"/;
  const match = input.match(iframeRegex);
  return match ? match[1] : input.trim();
};

const RecruiterVerification: React.FC = () => {
  const { t } = useTranslation();
  const uiText = useSanityInterfaceText("/recruiter-verification");
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formValue, setFormValue] = useState<CompanyFormValue>(emptyFormValue);
  const [logo, setLogo] = useState<FilePreview | null>(null);
  const [cover, setCover] = useState<FilePreview | null>(null);
  const [gallery, setGallery] = useState<FilePreview[]>([]);
  const [addresses, setAddresses] = useState<CompanyAddress[]>([createAddress(true)]);
  const [provinceOptions, setProvinceOptions] = useState<JobFilterOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Record<string, JobFilterOption[]>>({});
  const [loadingDistricts, setLoadingDistricts] = useState<Record<string, boolean>>({});
  const [districtOpenStates, setDistrictOpenStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<RecruiterFormField[]>([]);
  const [customFormValue, setCustomFormValue] = useState<Record<string, string>>({});
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isRecruiter = isRecruiterRole(user?.role);
  const canAccessPage = isCandidateRole(user?.role) || isRecruiter;

  const companySizeOptions = useMemo(
    () => [
      { value: "1", label: t("recruiterVerification.companySizes.micro") },
      { value: "2", label: t("recruiterVerification.companySizes.small") },
      { value: "3", label: t("recruiterVerification.companySizes.medium") },
      { value: "4", label: t("recruiterVerification.companySizes.large") },
    ],
    [t],
  );

  useEffect(() => {
    let mounted = true;
    getVietnamProvinceOptions()
      .then((options) => {
        if (mounted) setProvinceOptions(options);
      })
      .catch(() => {
        if (mounted) setProvinceOptions([]);
      });

    const initialAddressId = addresses[0]?.id;
    if (initialAddressId) {
      getVietnamWardOptions("79")
        .then((options) => {
          if (mounted) {
            setDistrictOptions((current) => ({ ...current, [initialAddressId]: options }));
          }
        })
        .catch(() => {
          if (mounted) {
            setDistrictOptions((current) => ({ ...current, [initialAddressId]: [] }));
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, [addresses]);

  useEffect(() => {
    let mounted = true;

    configApi.listRecruiterFormFields(false)
      .then((fields) => {
        if (!mounted) return;

        const nextFields = fields
          .filter((field) => field.active && !RESERVED_FORM_FIELD_NAMES.has(field.name))
          .sort((first, second) => first.sortOrder - second.sortOrder);
        setCustomFields(nextFields);
        setCustomFormValue((current) => {
          const next = { ...current };
          nextFields.forEach((field) => {
            if (next[field.name] === undefined) next[field.name] = "";
          });
          return next;
        });
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : t("recruiterVerification.toast.loadCompanyError"));
      })
      .finally(() => {
        if (mounted) setLoadingCustomFields(false);
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!token || !isRecruiter) return;

    let mounted = true;

    const loadCompanyProfile = async () => {
      setLoadingCompany(true);
      try {
        const company = await recruiterApi.getCompanyProfile(token);
        if (!mounted) return;

        setFormValue({
          companyFullName: company.companyFullName || "",
          companyDisplayName: company.companyDisplayName || "",
          taxCode: company.taxCode || "",
          billingAddress: company.billingAddress || "",
          companySize: getCompanySizeValue(company.companySize),
          companyPhone: company.companyPhone || "",
          companyWebsite: company.companyWebsite || "",
          companyIntro: company.companyIntro || "",
          mapUrl: company.mapUrl || "",
        });
        setLogo(company.logoUrl ? { previewUrl: company.logoUrl, existingUrl: company.logoUrl } : null);
        setCover(company.coverUrl ? { previewUrl: company.coverUrl, existingUrl: company.coverUrl } : null);

        const storedAddresses = parseJsonArray<StoredCompanyAddress>(company.addresses);
        const nextAddresses = storedAddresses.length > 0
          ? storedAddresses.map((address, index) => ({
              id: crypto.randomUUID(),
              headOffice: getStoredText(address.headOffice),
              province: "79",
              district: getStoredText(address.districtCode || address.district),
              detail: getStoredText(address.detail),
              isDefault: Boolean(address.isDefault) || index === 0,
            }))
          : [createAddress(true)];
        setAddresses(nextAddresses);

        const nextDistrictOptions: Record<string, JobFilterOption[]> = {};
        await Promise.all(
          nextAddresses.map(async (address) => {
            const provinceCode = "79";

            try {
              nextDistrictOptions[address.id] = await getVietnamWardOptions(provinceCode);
            } catch {
              nextDistrictOptions[address.id] = [];
            }
          }),
        );
        if (mounted && Object.keys(nextDistrictOptions).length > 0) {
          setDistrictOptions((current) => ({ ...current, ...nextDistrictOptions }));
        }

        const galleryUrls = parseJsonArray<string>(company.galleryUrls);
        setGallery(
          galleryUrls
            .filter((url) => typeof url === "string" && url.trim())
            .map((url) => ({ previewUrl: url, existingUrl: url })),
        );
      } catch (error: unknown) {
        if (isApiError(error) && (error.status === 400 || error.status === 404)) return;
        toast.error(t("recruiterVerification.toast.loadCompanyError"));
      } finally {
        if (mounted) setLoadingCompany(false);
      }
    };

    loadCompanyProfile();

    return () => {
      mounted = false;
    };
  }, [isRecruiter, t, token]);

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

  if (!canAccessPage) {
    return <Navigate to="/" replace />;
  }

  if (loadingCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadingCustomFields) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fieldClassName = (key: string) =>
    errors[key] ? "border-destructive focus-visible:ring-destructive" : "";

  const renderError = (key: string) =>
    errors[key] ? <p className="mt-1 text-xs text-destructive">{errors[key]}</p> : null;

  const updateFormValue = (field: keyof CompanyFormValue, value: string) => {
    setFormValue((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateCustomFormValue = (field: string, value: string) => {
    setCustomFormValue((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`custom.${field}`];
      return next;
    });
  };

  const setSingleImage = (
    file: File,
    maxSize: number,
    errorKey: string,
    setter: React.Dispatch<React.SetStateAction<FilePreview | null>>,
  ) => {
    const error = validateImageFile(file, maxSize);
    if (error) {
      setErrors((current) => ({ ...current, [errorKey]: error }));
      return;
    }

    setter((current) => {
      if (current?.file) URL.revokeObjectURL(current.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  };

  const validateImageFile = (file: File, maxSize: number) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return t("recruiterVerification.errors.imageType");
    }

    if (file.size > maxSize) {
      return t("recruiterVerification.errors.imageSize", { size: Math.round(maxSize / MB) });
    }

    return "";
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSingleImage(file, LOGO_MAX_SIZE, "logo", setLogo);
    event.target.value = "";
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSingleImage(file, COVER_MAX_SIZE, "cover", setCover);
    event.target.value = "";
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (gallery.length + files.length > MAX_GALLERY_IMAGES) {
      setErrors((current) => ({ ...current, gallery: t("recruiterVerification.errors.galleryLimit") }));
      return;
    }

    const invalidFile = files.find((file) => validateImageFile(file, GALLERY_MAX_SIZE));
    if (invalidFile) {
      setErrors((current) => ({ ...current, gallery: validateImageFile(invalidFile, GALLERY_MAX_SIZE) }));
      return;
    }

    setGallery((current) => [
      ...current,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    setErrors((current) => {
      const next = { ...current };
      delete next.gallery;
      return next;
    });
  };

  const removeGalleryImage = (index: number) => {
    setGallery((current) => {
      const target = current[index];
      if (target?.file) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const updateAddress = (id: string, field: keyof CompanyAddress, value: string | boolean) => {
    setAddresses((current) =>
      current.map((address) => {
        if (field === "isDefault") {
          return { ...address, isDefault: address.id === id };
        }

        if (address.id !== id) return address;

        return {
          ...address,
          [field]: value,
          ...(field === "province" ? { district: "" } : {}),
        };
      }),
    );

    if (field === "province" && typeof value === "string") {
      loadDistrictOptions(id, value);
    }

    setErrors((current) => {
      const next = { ...current };
      delete next[`address.${id}.${field}`];
      return next;
    });
  };

  const loadDistrictOptions = async (addressId: string, provinceCode: string) => {
    if (!provinceCode) {
      setDistrictOptions((current) => ({ ...current, [addressId]: [] }));
      return;
    }

    setLoadingDistricts((current) => ({ ...current, [addressId]: true }));
    try {
      const options = await getVietnamWardOptions(provinceCode);
      setDistrictOptions((current) => ({ ...current, [addressId]: options }));
    } catch {
      setDistrictOptions((current) => ({ ...current, [addressId]: [] }));
    } finally {
      setLoadingDistricts((current) => ({ ...current, [addressId]: false }));
    }
  };

  const addAddress = () => {
    const newAddress = createAddress(false);
    setAddresses((current) => [...current, newAddress]);
    loadDistrictOptions(newAddress.id, "79");
  };

  const removeAddress = (id: string) => {
    setAddresses((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((address) => address.id !== id);
      return next.some((address) => address.isDefault) ? next : next.map((address, index) => ({ ...address, isDefault: index === 0 }));
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const requiredMessage = t("recruiterVerification.errors.required");

    if (!logo) nextErrors.logo = requiredMessage;
    if (!cover) nextErrors.cover = requiredMessage;
    if (!formValue.companyFullName.trim()) nextErrors.companyFullName = requiredMessage;
    if (formValue.companyFullName.length > 255) nextErrors.companyFullName = t("recruiterVerification.errors.max255");
    if (!formValue.companyDisplayName.trim()) nextErrors.companyDisplayName = requiredMessage;
    if (formValue.companyDisplayName.length > 255) nextErrors.companyDisplayName = t("recruiterVerification.errors.max255");
    if (!formValue.taxCode.trim()) nextErrors.taxCode = requiredMessage;
    if (formValue.taxCode.trim() && !/^[0-9-]+$/.test(formValue.taxCode.trim())) {
      nextErrors.taxCode = t("recruiterVerification.errors.taxCode");
    }
    if (!formValue.billingAddress.trim()) nextErrors.billingAddress = requiredMessage;
    if (!formValue.companySize) nextErrors.companySize = requiredMessage;
    if (!formValue.companyPhone.trim()) nextErrors.companyPhone = requiredMessage;
    if (formValue.companyPhone.trim() && !/^[0-9+\s]+$/.test(formValue.companyPhone.trim())) {
      nextErrors.companyPhone = t("recruiterVerification.errors.phone");
    }
    if (formValue.companyWebsite.trim() && !/^https?:\/\/.+\..+/i.test(formValue.companyWebsite.trim())) {
      nextErrors.companyWebsite = t("recruiterVerification.errors.website");
    }
    if (formValue.companyIntro.length > 5000) {
      nextErrors.companyIntro = t("recruiterVerification.errors.max5000");
    }

    if (formValue.mapUrl.trim()) {
      const extracted = extractMapUrl(formValue.mapUrl);
      if (!extracted.startsWith("https://www.google.com/maps/embed") && 
          !extracted.startsWith("https://maps.google.com/maps")) {
        nextErrors.mapUrl = t("recruiterVerification.errors.mapUrl");
      }
    }

    addresses.forEach((address) => {
      if (!address.headOffice.trim()) nextErrors[`address.${address.id}.headOffice`] = requiredMessage;
      if (!address.province) nextErrors[`address.${address.id}.province`] = requiredMessage;
      if (!address.district) nextErrors[`address.${address.id}.district`] = requiredMessage;
      if (!address.detail.trim()) nextErrors[`address.${address.id}.detail`] = requiredMessage;
    });

    customFields.forEach((field) => {
      const value = customFormValue[field.name]?.trim() || "";
      const errorKey = `custom.${field.name}`;

      if (field.required && !value) {
        nextErrors[errorKey] = requiredMessage;
        return;
      }

      if (field.validationRegex && value) {
        try {
          const regex = new RegExp(field.validationRegex);
          if (!regex.test(value)) {
            nextErrors[errorKey] = t("recruiterVerification.errors.invalidFormat", {
              defaultValue: "Định dạng không hợp lệ",
            });
          }
        } catch {
          nextErrors[errorKey] = t("admin.categories.invalidRegex", {
            defaultValue: "Regex không hợp lệ",
          });
        }
      }
    });

    setErrors(nextErrors);

    const firstErrorKey = Object.keys(nextErrors)[0];
    if (firstErrorKey) {
      window.setTimeout(() => {
        document.querySelector(`[data-error-key="${firstErrorKey}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File, group: string) => {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) throw new Error("Not authenticated");

    const filePath = `${supabaseUser.id}/${Date.now()}-${crypto.randomUUID()}-${group}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(COMPANY_PROFILE_BUCKET).upload(filePath, file);

    if (error) throw error;

    return supabase.storage.from(COMPANY_PROFILE_BUCKET).getPublicUrl(filePath).data.publicUrl;
  };

  const resolveImageUrl = async (image: FilePreview, group: string) => {
    if (image.file) return uploadFile(image.file, group);
    if (image.existingUrl) return image.existingUrl;
    return image.previewUrl;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !validate() || !logo || !cover) return;

    setSubmitting(true);
    try {
      const [logoUrl, coverUrl, galleryUrls] = await Promise.all([
        resolveImageUrl(logo, "logo"),
        resolveImageUrl(cover, "cover"),
        Promise.all(gallery.map((image) => resolveImageUrl(image, "gallery"))),
      ]);
      const companySizeLabel = companySizeOptions.find((option) => option.value === formValue.companySize)?.label ?? formValue.companySize;
      const addressPayload = addresses.map((address) => ({
        headOffice: address.headOffice.trim(),
        provinceCode: address.province,
        province: getOptionLabel(provinceOptions, address.province),
        districtCode: address.district,
        district: getOptionLabel(districtOptions[address.id] ?? [], address.district),
        detail: address.detail.trim(),
        isDefault: address.isDefault,
      }));

      await recruiterApi.submitApplication(token, {
        logoUrl,
        coverUrl,
        companyFullName: formValue.companyFullName.trim(),
        companyDisplayName: formValue.companyDisplayName.trim(),
        taxCode: formValue.taxCode.trim(),
        billingAddress: formValue.billingAddress.trim(),
        companySize: `${formValue.companySize} - ${companySizeLabel}`,
        companyPhone: formValue.companyPhone.trim(),
        companyWebsite: formValue.companyWebsite.trim(),
        companyIntro: formValue.companyIntro.trim(),
        mapUrl: extractMapUrl(formValue.mapUrl),
        addresses: JSON.stringify(addressPayload),
        galleryUrls: JSON.stringify(galleryUrls),
        ...customFields.reduce<Record<string, string>>((payload, field) => {
          payload[field.name] = customFormValue[field.name]?.trim() || "";
          return payload;
        }, {}),
      });

      toast.success(t(isRecruiter ? "recruiterVerification.toast.updateSuccess" : "recruiterVerification.toast.success"));
      navigate(isRecruiter ? "/profile" : "/");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiterVerification.toast.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="mb-4 w-auto" onClick={() => navigate(isRecruiter ? "/profile" : "/")}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-slate-950">
              {uiText(isRecruiter ? "recruiterVerification.updateTitle" : "recruiterVerification.title", t(isRecruiter ? "recruiterVerification.updateTitle" : "recruiterVerification.title"))}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {uiText(isRecruiter ? "recruiterVerification.updateDescription" : "recruiterVerification.description", t(isRecruiter ? "recruiterVerification.updateDescription" : "recruiterVerification.description"))}
            </p>
          </div>
        </div>
      </section>

      <SanityPageSections routePath="/recruiter-verification" placement="afterHero" />

      <section className="container mx-auto px-4 py-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ImageIcon className="h-5 w-5 text-primary" />
                {uiText("recruiterVerification.sections.branding", t("recruiterVerification.sections.branding"))}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div data-error-key="logo">
                <Label>{t("recruiterVerification.fields.logo")} <span className="text-destructive">*</span></Label>
                <button
                  type="button"
                  className={cn("mt-2 flex min-h-44 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-white p-4 text-center transition hover:bg-slate-50", fieldClassName("logo"))}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logo ? (
                    <img src={logo.previewUrl} alt="" className="max-h-32 rounded-md object-contain" />
                  ) : (
                    <>
                      <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("recruiterVerification.upload.logoHint")}</span>
                    </>
                  )}
                </button>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoChange} />
                {renderError("logo")}
              </div>

              <div data-error-key="cover">
                <Label>{t("recruiterVerification.fields.cover")} <span className="text-destructive">*</span></Label>
                <button
                  type="button"
                  className={cn("mt-2 flex min-h-44 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-white p-4 text-center transition hover:bg-slate-50", fieldClassName("cover"))}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {cover ? (
                    <img src={cover.previewUrl} alt="" className="max-h-32 rounded-md object-cover" />
                  ) : (
                    <>
                      <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("recruiterVerification.upload.coverHint")}</span>
                    </>
                  )}
                </button>
                <input ref={coverInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleCoverChange} />
                {renderError("cover")}
              </div>
            </CardContent>
          </Card>

          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building2 className="h-5 w-5 text-primary" />
                  {uiText("admin.categories.verificationTab", t("admin.categories.verificationTab"))}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {customFields.map((field) => (
                  <div key={field.id} data-error-key={`custom.${field.name}`} className={field.name.toLowerCase().includes("intro") || field.name.toLowerCase().includes("description") ? "md:col-span-2" : ""}>
                    <Label htmlFor={`custom-${field.name}`}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {field.name.toLowerCase().includes("intro") || field.name.toLowerCase().includes("description") ? (
                      <Textarea
                        id={`custom-${field.name}`}
                        value={customFormValue[field.name] || ""}
                        placeholder={field.placeholder || undefined}
                        onChange={(event) => updateCustomFormValue(field.name, event.target.value)}
                        className={cn("min-h-28", fieldClassName(`custom.${field.name}`))}
                      />
                    ) : (
                      <Input
                        id={`custom-${field.name}`}
                        value={customFormValue[field.name] || ""}
                        placeholder={field.placeholder || undefined}
                        onChange={(event) => updateCustomFormValue(field.name, event.target.value)}
                        className={fieldClassName(`custom.${field.name}`)}
                      />
                    )}
                    {renderError(`custom.${field.name}`)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                {uiText("recruiterVerification.sections.legal", t("recruiterVerification.sections.legal"))}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div data-error-key="companyFullName">
                <Label htmlFor="companyFullName">{t("recruiterVerification.fields.companyFullName")} <span className="text-destructive">*</span></Label>
                <Input id="companyFullName" value={formValue.companyFullName} placeholder={t("recruiterVerification.placeholders.companyFullName")} maxLength={255} onChange={(event) => updateFormValue("companyFullName", event.target.value)} className={fieldClassName("companyFullName")} />
                {renderError("companyFullName")}
              </div>
              <div data-error-key="companyDisplayName">
                <Label htmlFor="companyDisplayName">{t("recruiterVerification.fields.companyDisplayName")} <span className="text-destructive">*</span></Label>
                <Input id="companyDisplayName" value={formValue.companyDisplayName} placeholder={t("recruiterVerification.placeholders.companyDisplayName")} maxLength={255} onChange={(event) => updateFormValue("companyDisplayName", event.target.value)} className={fieldClassName("companyDisplayName")} />
                {renderError("companyDisplayName")}
              </div>
              <div data-error-key="taxCode">
                <Label htmlFor="taxCode">{t("recruiterVerification.fields.taxCode")} <span className="text-destructive">*</span></Label>
                <Input id="taxCode" value={formValue.taxCode} placeholder={t("recruiterVerification.placeholders.taxCode")} onChange={(event) => updateFormValue("taxCode", event.target.value)} className={fieldClassName("taxCode")} />
                {renderError("taxCode")}
              </div>
              <div data-error-key="companySize">
                <Label>{t("recruiterVerification.fields.companySize")} <span className="text-destructive">*</span></Label>
                <Select value={formValue.companySize} onValueChange={(value) => updateFormValue("companySize", value)}>
                  <SelectTrigger className={cn("mt-2", fieldClassName("companySize"))}>
                    <SelectValue placeholder={t("recruiterVerification.placeholders.companySize")} />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError("companySize")}
              </div>
              <div data-error-key="billingAddress" className="md:col-span-2">
                <Label htmlFor="billingAddress">{t("recruiterVerification.fields.billingAddress")} <span className="text-destructive">*</span></Label>
                <Input id="billingAddress" value={formValue.billingAddress} placeholder={t("recruiterVerification.placeholders.billingAddress")} onChange={(event) => updateFormValue("billingAddress", event.target.value)} className={fieldClassName("billingAddress")} />
                {renderError("billingAddress")}
              </div>
              <div data-error-key="companyPhone">
                <Label htmlFor="companyPhone">{t("recruiterVerification.fields.companyPhone")} <span className="text-destructive">*</span></Label>
                <Input id="companyPhone" value={formValue.companyPhone} placeholder={t("recruiterVerification.placeholders.companyPhone")} onChange={(event) => updateFormValue("companyPhone", event.target.value)} className={fieldClassName("companyPhone")} />
                {renderError("companyPhone")}
              </div>
              <div data-error-key="companyWebsite">
                <Label htmlFor="companyWebsite">{t("recruiterVerification.fields.companyWebsite")}</Label>
                <Input id="companyWebsite" value={formValue.companyWebsite} placeholder={t("recruiterVerification.placeholders.companyWebsite")} onChange={(event) => updateFormValue("companyWebsite", event.target.value)} className={fieldClassName("companyWebsite")} />
                {renderError("companyWebsite")}
              </div>
              <div data-error-key="companyIntro" className="md:col-span-2">
                <Label htmlFor="companyIntro">{t("recruiterVerification.fields.companyIntro")}</Label>
                <Textarea id="companyIntro" value={formValue.companyIntro} placeholder={t("recruiterVerification.placeholders.companyIntro")} maxLength={5000} onChange={(event) => updateFormValue("companyIntro", event.target.value)} className={cn("min-h-32", fieldClassName("companyIntro"))} />
                <div className="mt-1 text-right text-xs text-muted-foreground">{formValue.companyIntro.length}/5000</div>
                {renderError("companyIntro")}
              </div>
              <div data-error-key="mapUrl" className="md:col-span-2">
                <Label htmlFor="mapUrl">{t("recruiterVerification.fields.mapUrl")}</Label>
                <Input id="mapUrl" value={formValue.mapUrl} placeholder={t("recruiterVerification.placeholders.mapUrl")} onChange={(event) => updateFormValue("mapUrl", event.target.value)} className={fieldClassName("mapUrl")} />
                {renderError("mapUrl")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                {uiText("recruiterVerification.sections.addresses", t("recruiterVerification.sections.addresses"))}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.map((address, index) => (
                <div key={address.id} className="rounded-lg border bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="font-semibold">{t("recruiterVerification.addressTitle", { number: index + 1 })}</div>
                    <Button type="button" variant="outline" size="icon" disabled={addresses.length === 1} onClick={() => removeAddress(address.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div data-error-key={`address.${address.id}.headOffice`}>
                      <Label>{t("recruiterVerification.fields.headOffice")} <span className="text-destructive">*</span></Label>
                      <Input value={address.headOffice} placeholder={t("recruiterVerification.placeholders.headOffice")} onChange={(event) => updateAddress(address.id, "headOffice", event.target.value)} className={fieldClassName(`address.${address.id}.headOffice`)} />
                      {renderError(`address.${address.id}.headOffice`)}
                    </div>
                    <div data-error-key={`address.${address.id}.province`}>
                      <Label>{t("recruiterVerification.fields.province")} <span className="text-destructive">*</span></Label>
                      <Select value={address.province || "79"} disabled={true}>
                        <SelectTrigger className={cn("mt-2", fieldClassName(`address.${address.id}.province`))}>
                          <SelectValue placeholder={t("recruiterVerification.placeholders.province")} />
                        </SelectTrigger>
                        <SelectContent>
                          {provinceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderError(`address.${address.id}.province`)}
                    </div>
                    <div data-error-key={`address.${address.id}.district`}>
                      <Label>{t("recruiterVerification.fields.district")} <span className="text-destructive">*</span></Label>
                      <Popover
                        open={districtOpenStates[address.id] || false}
                        onOpenChange={(open) => setDistrictOpenStates((prev) => ({ ...prev, [address.id]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={districtOpenStates[address.id] || false}
                            disabled={loadingDistricts[address.id]}
                            className={cn(
                              "mt-2 flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm text-left font-normal transition-colors hover:bg-slate-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-slate-900",
                              !address.district && "text-muted-foreground",
                              fieldClassName(`address.${address.id}.district`)
                            )}
                          >
                            <span className="truncate">
                              {loadingDistricts[address.id]
                                ? t("common.loading")
                                : (districtOptions[address.id] ?? []).find((opt) => opt.value === address.district)?.label ||
                                  t("recruiterVerification.placeholders.district")}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command className="w-full">
                            <CommandInput placeholder={`${t("common.search")}...`} className="h-10" />
                            <CommandList className="max-h-[300px] overflow-y-auto">
                              <CommandEmpty>{t("jobs.page.emptyTitle") || "Không tìm thấy"}</CommandEmpty>
                              <CommandGroup>
                                {(districtOptions[address.id] ?? []).map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                      updateAddress(address.id, "district", option.value);
                                      setDistrictOpenStates((prev) => ({ ...prev, [address.id]: false }));
                                    }}
                                    className="cursor-pointer data-[selected='true']:bg-primary/10 data-[selected='true']:text-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        address.district === option.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {option.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {renderError(`address.${address.id}.district`)}
                    </div>
                    <div data-error-key={`address.${address.id}.detail`}>
                      <Label>{t("recruiterVerification.fields.addressDetail")} <span className="text-destructive">*</span></Label>
                      <Input value={address.detail} placeholder={t("recruiterVerification.placeholders.detail")} onChange={(event) => updateAddress(address.id, "detail", event.target.value)} className={fieldClassName(`address.${address.id}.detail`)} />
                      {renderError(`address.${address.id}.detail`)}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={address.isDefault} onChange={() => updateAddress(address.id, "isDefault", true)} />
                      {t("recruiterVerification.fields.defaultAddress")}
                    </label>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addAddress}>
                <Plus className="h-4 w-4" />
                {t("recruiterVerification.actions.addAddress")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ImageIcon className="h-5 w-5 text-primary" />
                {uiText("recruiterVerification.sections.gallery", t("recruiterVerification.sections.gallery"))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {gallery.map((image, index) => (
                  <div key={image.previewUrl} className="relative aspect-video overflow-hidden rounded-lg border bg-white">
                    <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button type="button" className="absolute right-2 top-2 rounded-full bg-white p-1 text-slate-700 shadow" onClick={() => removeGalleryImage(index)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {gallery.length < MAX_GALLERY_IMAGES && (
                  <button
                    type="button"
                    className={cn("flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed bg-white p-3 text-center hover:bg-slate-50", fieldClassName("gallery"))}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t("recruiterVerification.upload.galleryHint")}</span>
                  </button>
                )}
              </div>
              <input ref={galleryInputRef} type="file" accept="image/png,image/jpeg" className="hidden" multiple onChange={handleGalleryChange} />
              {renderError("gallery")}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="cta" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              {uiText(isRecruiter ? "recruiterVerification.actions.submitUpdate" : "recruiterVerification.actions.submit", t(isRecruiter ? "recruiterVerification.actions.submitUpdate" : "recruiterVerification.actions.submit"))}
            </Button>
          </div>
        </form>
      </section>
      <SanityPageSections routePath="/recruiter-verification" placement="bottom" />
    </main>
  );
};

export default RecruiterVerification;
