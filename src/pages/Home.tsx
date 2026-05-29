import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Briefcase, Users, Award } from "lucide-react";
import mscBackground from "@/assets/msc.jpg";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    defaultManagedSiteConfig,
    loadManagedSiteConfig,
    type ManagedSiteConfig,
} from "@/lib/siteConfig";
import { configApi, recruiterApi, type RecruiterFormField } from "@/lib/api";

const corporatePartners = [
    { id: 1, name: "ASL", logo: "/carousel/ASL.webp" },
    { id: 2, name: "Binemo", logo: "/carousel/Binemo.webp" },
    { id: 3, name: "CP Group", logo: "/carousel/CP.webp" },
    { id: 4, name: "Greenfeed", logo: "/carousel/Greenfeed.webp" },
    { id: 5, name: "Happy Land", logo: "/carousel/Happyland.webp" },
    { id: 6, name: "HTO Group", logo: "/carousel/HTOGroup.webp" },
    { id: 7, name: "NAB", logo: "/carousel/NAB.webp" },
    { id: 8, name: "Richs Vietnam", logo: "/carousel/Richs.webp" },
    { id: 9, name: "Satra", logo: "/carousel/Satra.webp" },
    { id: 10, name: "Schindler", logo: "/carousel/Schindler.webp" },
    { id: 11, name: "SGC", logo: "/carousel/SGC.webp" },
    { id: 12, name: "SGF", logo: "/carousel/SGF.webp" },
    { id: 13, name: "SGGG", logo: "/carousel/SGGG.webp" },
    { id: 14, name: "SGL", logo: "/carousel/SGL.webp" },
    { id: 15, name: "Shinhan Bank", logo: "/carousel/Shinhan.webp" },
    { id: 16, name: "Smar", logo: "/carousel/Smar.webp" },
    { id: 17, name: "Smentor", logo: "/carousel/Smentor.webp" },
    { id: 18, name: "SP", logo: "/carousel/SP.webp" },
    { id: 19, name: "Tam Chau", logo: "/carousel/TC.webp" },
    { id: 20, name: "VNPT", logo: "/carousel/VNPT.webp" },
    { id: 21, name: "WK", logo: "/carousel/WK.webp" },
    { id: 22, name: "YESCO", logo: "/carousel/YESCO.webp" },
];

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { token, isAuthenticated } = useAuth();
    const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [isEmployerDialogOpen, setIsEmployerDialogOpen] = useState(false);
    const [isSubmittingEmployerRequest, setIsSubmittingEmployerRequest] = useState(false);
    const [employerRequest, setEmployerRequest] = useState<Record<string, string>>({});
    const [recruiterFields, setRecruiterFields] = useState<RecruiterFormField[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const partnerList = managedConfig.partners.length > 0 ? managedConfig.partners : corporatePartners;
    // split partners into multiple horizontal rows to increase vertical height
    const rowsCount = 4;
    const itemsPerRow = Math.max(1, Math.ceil(partnerList.length / rowsCount));
    const partnerRows = Array.from({ length: rowsCount })
        .map((_, idx) => {
            const start = idx * itemsPerRow;
            const partners = partnerList.slice(start, start + itemsPerRow);
            return { partners, reverse: idx % 2 === 1 };
        })
        .filter((row) => row.partners.length > 0);

    useEffect(() => {
        let mounted = true;

        loadManagedSiteConfig().then((config) => {
            if (mounted) setManagedConfig(config);
        });

        const handleConfigUpdate = (event: Event) => {
            const nextConfig = (event as CustomEvent<ManagedSiteConfig>).detail;
            if (nextConfig) setManagedConfig(nextConfig);
        };

        window.addEventListener("managed-site-config-updated", handleConfigUpdate);

        return () => {
            mounted = false;
            window.removeEventListener("managed-site-config-updated", handleConfigUpdate);
        };
    }, []);

    const openEmployerRequestDialog = async () => {
        if (!isAuthenticated) {
            toast.error(t("home.employerRequest.loginRequired"));
            navigate("/login");
            return;
        }

        setLoadingFields(true);
        setIsEmployerDialogOpen(true);
        try {
            const fields = await configApi.listRecruiterFormFields(false);
            setRecruiterFields(fields);
            setEmployerRequest({});
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t("home.employerRequest.loadFormError"));
        } finally {
            setLoadingFields(false);
        }
    };

    const submitEmployerRequest = async () => {
        if (!token) return;

        const requiredMissing = recruiterFields.some((field) => field.required && !employerRequest[field.name]?.trim());

        if (requiredMissing) {
            toast.error(t("home.employerRequest.requiredMissing"));
            return;
        }

        const invalidField = recruiterFields.find((field) => {
            const value = employerRequest[field.name]?.trim();
            if (!value || !field.validationRegex) return false;

            try {
                return !new RegExp(`^(?:${field.validationRegex})$`).test(value);
            } catch {
                return false;
            }
        });

        if (invalidField) {
            toast.error(t("home.employerRequest.invalidFormat", { field: invalidField.label }));
            return;
        }

        setIsSubmittingEmployerRequest(true);
        try {
            const formData: Record<string, string> = {};
            for (const field of recruiterFields) {
                formData[field.name] = employerRequest[field.name]?.trim() || "";
            }

            await recruiterApi.submitApplication(token, formData);
            toast.success(t("home.employerRequest.success"));
            setEmployerRequest({});
            setIsEmployerDialogOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t("home.employerRequest.submitError"));
        } finally {
            setIsSubmittingEmployerRequest(false);
        }
    };

    const submitHeroSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const keyword = searchKeyword.trim();
        navigate(keyword ? `/jobs?keyword=${encodeURIComponent(keyword)}` : "/jobs");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero: Job search */}
            <section id="trang-chu" className="relative scroll-mt-24 overflow-hidden py-20">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat hero-bg-zoom"
                    style={{ backgroundImage: `url(${mscBackground})` }}
                    aria-hidden="true"
                />
                <div className="absolute inset-0 bg-white/75" aria-hidden="true" />
                <div className="absolute inset-0 bg-primary/10" aria-hidden="true" />

                <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[420px] md:min-h-[520px]">
                    <div className="mb-6">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-2 text-primary">
                            InternHiring
                        </h1>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            {t("home.heroSubtitle")}
                        </p>
                    </div>

                    <p className="text-lg text-black mb-8 max-w-3xl mx-auto">
                        {t("home.heroDescription")}
                    </p>
                </div>
            </section>

            {/* Featured Jobs */}
            {/* About / Introduction */}
            <section id="gioi-thieu" className="scroll-mt-24 py-12 bg-white">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center mb-6">
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{t("home.aboutTitle")}</h2>
                        <p className="text-lg text-muted-foreground mb-4">{t("home.aboutIntro")}</p>
                        <p className="text-sm text-muted-foreground">{t("home.aboutIntroLong")}</p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl p-[1px] bg-gradient-to-br from-primary-light to-primary">
                            <div className="bg-card rounded-lg p-6 relative border border-primary/20">
                                <div className="absolute -top-6 left-6 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10 z-10">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <div className="pt-8">
                                    <h3 className="text-lg font-semibold mb-2">{t("home.aboutCardProjectTitle")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("home.aboutCardProjectBody")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl p-[1px] bg-gradient-to-br from-primary-light to-primary">
                            <div className="bg-card rounded-lg p-6 relative border border-primary/20">
                                <div className="absolute -top-6 left-6 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10 z-10">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div className="pt-8">
                                    <h3 className="text-lg font-semibold mb-2">{t("home.aboutMissionTitle")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("home.aboutMission")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl p-[1px] bg-gradient-to-br from-primary-light to-primary">
                            <div className="bg-card rounded-lg p-6 relative border border-primary/20">
                                <div className="absolute -top-6 left-6 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10 z-10">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div className="pt-8">
                                    <h3 className="text-lg font-semibold mb-2">{t("home.aboutValuesTitle")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("home.aboutValues")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section id="viec-lam-noi-bat" className="scroll-mt-24 py-16">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">{t("home.featuredJobsTitle")}</h2>
                        <Button variant="cta" size="lg" className="flex items-center gap-2" onClick={() => navigate("/jobs")}>{t("home.viewAll")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
                    </div>
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            {t("home.featuredJobsEmpty")}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Partners (keep) */}
            <section id="doi-tac" className="scroll-mt-24 py-14 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-2 text-primary">
                            {t("home.partnersTitle")}
                        </h2>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            {t("home.partnersSubtitle")}
                        </p>
                    </div>
                    <div className="mt-8 space-y-6 overflow-hidden">
                        {partnerRows.map((row, rowIndex) => (
                            <div
                                key={rowIndex}
                                className="relative overflow-hidden"
                                aria-label={t("home.partnerRowAria", { number: rowIndex + 1 })}
                            >
                                <div className={`partner-marquee ${row.reverse ? "partner-marquee-reverse" : ""}`}>
                                    {[...row.partners, ...row.partners].map((p, index) => {
                                        const isDuplicate = index >= row.partners.length;

                                        return (
                                            <motion.div
                                                key={`${rowIndex}-${p.id}-${index}`}
                                                className="partner-marquee-item flex h-24 w-48 items-center justify-center rounded-lg bg-card p-4 shadow-sm hover:shadow-lg cursor-pointer sm:w-56 md:w-60"
                                                whileHover={{ scale: 1.08 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                aria-hidden={isDuplicate}
                                            >
                                                <img src={p.logo} alt={isDuplicate ? "" : p.name} className="max-h-12 object-contain" loading="lazy" />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="tuyen-dung" className="scroll-mt-24 py-16 hero-gradient">
                <div className="container mx-auto px-4 text-center text-white">
                    <h2 className="text-3xl font-bold mb-4">
                        {t("home.recruiterCtaTitle")}
                    </h2>
                    <div className="flex justify-center mt-6">
                        <Button variant="secondary" onClick={openEmployerRequestDialog}>{t("home.recruiterCtaButton")}</Button>
                    </div>
                </div>
            </section>

            <footer className="border-t bg-white py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    {t("home.footer")}
                </div>
            </footer>

            <Dialog open={isEmployerDialogOpen} onOpenChange={setIsEmployerDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("home.employerRequest.title")}</DialogTitle>
                        <DialogDescription>
                            {t("home.employerRequest.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {loadingFields ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            recruiterFields.map((field) => (
                                <div key={field.id}>
                                    <Label>
                                        {field.label}
                                        {field.required && <span className="ml-1 text-destructive">*</span>}
                                    </Label>
                                    <Input
                                        type="text"
                                        value={employerRequest[field.name] || ""}
                                        onChange={(event) =>
                                            setEmployerRequest({ ...employerRequest, [field.name]: event.target.value })
                                        }
                                        placeholder={field.placeholder}
                                        className="mt-2"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEmployerDialogOpen(false)} disabled={isSubmittingEmployerRequest}>
                            {t("home.employerRequest.cancel")}
                        </Button>
                        <Button onClick={submitEmployerRequest} disabled={isSubmittingEmployerRequest}>
                            {isSubmittingEmployerRequest && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                            {t("home.employerRequest.submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Home;
