import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Users, Award, Eye, MapPin } from "lucide-react";
import mscBackground from "@/assets/msc.jpg";
import { useAuth } from "@/context/AuthContext";
import { isCandidateRole } from "@/lib/roles";
import { toast } from "sonner";
import { jobApi, type PublicJobPost } from "@/lib/api";
import { candidateApi } from "@/lib/api";
import { paginateItems } from "@/lib/pagination";
import {
    CURRENCY_OPTIONS,
    defaultJobFilterOptions,
    getSalaryRangeOption,
    JOB_TYPE_OPTIONS,
    WORK_MODE_OPTIONS,
} from "@/components/jobs/jobFilterConfig";
import { FavoriteJobButton } from "@/components/jobs/FavoriteJobButton";
import {
    defaultManagedSiteConfig,
    loadManagedSiteConfig,
    type ManagedSiteConfig,
} from "@/lib/siteConfig";

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

const getOptionLabel = (
    options: Array<{ value: string; labelKey?: string }>,
    value: string | null | undefined,
    translate: (key: string) => string,
) => {
    if (!value) return "";
    const option = options.find((item) => item.value === value);
    return option?.labelKey ? translate(option.labelKey) : value;
};

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, token, isAuthenticated } = useAuth();
    const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
    const [featuredJobs, setFeaturedJobs] = useState<PublicJobPost[]>([]);
    const [favoriteJobIds, setFavoriteJobIds] = useState<Set<string | number>>(new Set());
    const [featuredJobPage, setFeaturedJobPage] = useState(1);
    const [featuredJobPageSize, setFeaturedJobPageSize] = useState(5);
    const [searchKeyword, setSearchKeyword] = useState("");
    const partnerList = managedConfig.partners.length > 0 ? managedConfig.partners : corporatePartners;
    const canRequestRecruiterVerification = !isAuthenticated || isCandidateRole(user?.role);
    const numberFormatter = new Intl.NumberFormat(i18n.language?.startsWith("vi") ? "vi-VN" : "en-US");
    const paginatedFeaturedJobs = paginateItems(featuredJobs, featuredJobPage, featuredJobPageSize);
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

        jobApi.listFeaturedJobs()
            .then((jobs) => {
                if (mounted) setFeaturedJobs(jobs);
            })
            .catch(() => {
                if (mounted) setFeaturedJobs([]);
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

    useEffect(() => {
        if (!token || user?.role !== "CANDIDATE") {
            setFavoriteJobIds(new Set());
            return;
        }

        let mounted = true;
        candidateApi.listFavoriteJobs(token)
            .then((jobs) => {
                if (mounted) setFavoriteJobIds(new Set(jobs.map((job) => job.id)));
            })
            .catch(() => {
                if (mounted) setFavoriteJobIds(new Set());
            });

        return () => {
            mounted = false;
        };
    }, [token, user?.role]);

    const handleFavoriteChange = (updatedJob: PublicJobPost, isFavorited: boolean) => {
        setFavoriteJobIds((current) => {
            const next = new Set(current);
            if (isFavorited) next.add(updatedJob.id);
            else next.delete(updatedJob.id);
            return next;
        });
        setFeaturedJobs((current) =>
            current
                .map((job) => (String(job.id) === String(updatedJob.id) ? updatedJob : job))
                .filter((job) => (job.viewCount ?? 0) > 10 || (job.favoriteCount ?? 0) > 5),
        );
    };

    const openEmployerRequestPage = () => {
        if (!isAuthenticated) {
            toast.error(t("home.employerRequest.loginRequired"));
            navigate("/login");
            return;
        }

        if (!isCandidateRole(user?.role)) {
            return;
        }

        navigate("/recruiter-verification");
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
                    {featuredJobs.length > 0 ? (
                        <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedFeaturedJobs.items.map((job) => {
                                const company = job.company || job.employerName || t("jobs.page.notProvided");
                                const viewCount = numberFormatter.format(job.viewCount ?? 0);
                                const jobTypeLabel = getOptionLabel(JOB_TYPE_OPTIONS, job.type, t);
                                const workModeLabel = getOptionLabel(WORK_MODE_OPTIONS, job.mode, t);
                                const salaryRange = job.salary ? getSalaryRangeOption(job.salary) : undefined;
                                const salaryLabel = job.salary
                                    ? `${salaryRange?.labelKey ? t(salaryRange.labelKey) : job.salary}${
                                        job.currency
                                            ? ` ${getOptionLabel(CURRENCY_OPTIONS, job.currency, t)}`
                                            : ""
                                    }`
                                    : "";
                                const experienceLabel = getOptionLabel(defaultJobFilterOptions.experience, job.experience, t);

                                return (
                                    <Card
                                        key={job.id}
                                        role="button"
                                        tabIndex={0}
                                        className="relative h-full cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                navigate(`/jobs/${job.id}`);
                                            }
                                        }}
                                    >
                                        <FavoriteJobButton
                                            jobId={job.id}
                                            isFavorited={favoriteJobIds.has(job.id)}
                                            onFavoriteChange={handleFavoriteChange}
                                            className="absolute right-4 top-4 z-10"
                                        />
                                        <CardContent className="flex h-full flex-col gap-4 p-5">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2 pr-10">
                                                    {jobTypeLabel && <Badge variant="outline">{jobTypeLabel}</Badge>}
                                                    {salaryLabel && <Badge variant="outline">{salaryLabel}</Badge>}
                                                    {workModeLabel && <Badge variant="outline">{workModeLabel}</Badge>}
                                                    {experienceLabel && <Badge variant="outline">{experienceLabel}</Badge>}
                                                </div>
                                                <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                                                    {job.title}
                                                </h3>
                                                <p className="line-clamp-1 text-sm font-medium text-muted-foreground">
                                                    {company}
                                                </p>
                                            </div>

                                            <div className="mt-auto space-y-2 text-sm text-muted-foreground">
                                                {job.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                                        <span className="line-clamp-1">{job.location}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4 shrink-0 text-primary" />
                                                    <span>{t("home.featuredJobViews", { views: viewCount })}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                        <PaginationControls
                            page={paginatedFeaturedJobs.page}
                            totalPages={paginatedFeaturedJobs.totalPages}
                            onPageChange={setFeaturedJobPage}
                            pageSize={featuredJobPageSize}
                            onPageSizeChange={setFeaturedJobPageSize}
                        />
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                {t("home.featuredJobsEmpty")}
                            </CardContent>
                        </Card>
                    )}
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
            {canRequestRecruiterVerification && (
                <section id="tuyen-dung" className="scroll-mt-24 py-16 hero-gradient">
                    <div className="container mx-auto px-4 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            {t("home.recruiterCtaTitle")}
                        </h2>
                        <div className="flex justify-center mt-6">
                            <Button variant="secondary" onClick={openEmployerRequestPage}>{t("home.recruiterCtaButton")}</Button>
                        </div>
                    </div>
                </section>
            )}

            <footer className="border-t bg-white py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    {t("home.footer")}
                </div>
            </footer>

        </div>
    );
};

export default Home;
