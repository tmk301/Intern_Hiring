import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Users, Award, Eye, MapPin, Heart } from "lucide-react";
import mscBackground from "@/assets/msc.jpg";
import { useAuth } from "@/context/AuthContext";
import { isCandidateRole } from "@/lib/roles";
import { toast } from "sonner";
import { candidateApi, companyApi, jobApi, type CompanyProfile, type PublicJobPost } from "@/lib/api";
import { paginateItems } from "@/lib/pagination";
import {
    CURRENCY_OPTIONS,
    defaultJobFilterOptions,
    getSalaryRangeOption,
    formatSalaryRangeLabel,
    JOB_TYPE_OPTIONS,
    WORK_MODE_OPTIONS,
} from "@/components/jobs/jobFilterConfig";
import { FavoriteJobButton } from "@/components/jobs/FavoriteJobButton";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";
import { useSanityManagedInterface } from "@/lib/sanityInterfaceText";

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
    const { text: uiText, homeHero, homeContent } = useSanityManagedInterface("/");
    const { user, token, isAuthenticated } = useAuth();
    const [approvedCompanies, setApprovedCompanies] = useState<CompanyProfile[]>([]);
    const [featuredJobs, setFeaturedJobs] = useState<PublicJobPost[]>([]);
    const [favoriteJobIds, setFavoriteJobIds] = useState<Set<string | number>>(new Set());
    const [featuredJobPage, setFeaturedJobPage] = useState(1);
    const [featuredJobPageSize, setFeaturedJobPageSize] = useState(5);
    const [searchKeyword, setSearchKeyword] = useState("");
    const partnerList = approvedCompanies.filter((company) => company.logoUrl?.trim());
    const canRequestRecruiterVerification = !isAuthenticated || isCandidateRole(user?.role);
    const numberFormatter = new Intl.NumberFormat(i18n.language?.startsWith("vi") ? "vi-VN" : "en-US");
    const paginatedFeaturedJobs = paginateItems(featuredJobs, featuredJobPage, featuredJobPageSize);
    const partnerRows: Array<{ partners: typeof partnerList; reverse: boolean }> = [];
    if (partnerList.length > 0) {
        const numRows = Math.min(4, partnerList.length);
        const rows: CompanyProfile[][] = Array.from({ length: numRows }, () => []);
        partnerList.forEach((company, index) => {
            const rowIndex = index % numRows;
            rows[rowIndex].push(company);
        });

        rows.forEach((rowPartners, i) => {
            if (rowPartners.length > 0) {
                let marqueePartners = [...rowPartners];
                while (marqueePartners.length < 4) {
                    marqueePartners = [...marqueePartners, ...rowPartners];
                }
                partnerRows.push({
                    partners: marqueePartners,
                    reverse: i % 2 !== 0,
                });
            }
        });
    }
    const hasVisibleAboutCard = homeContent.projectCardVisible !== false
        || homeContent.missionCardVisible !== false
        || homeContent.valuesCardVisible !== false;
    const homeColor = (key: string) => typeof homeContent[key] === "string" ? homeContent[key] as string : undefined;

    useEffect(() => {
        let mounted = true;

        jobApi.listFeaturedJobs()
            .then((jobs) => {
                if (mounted) setFeaturedJobs(jobs);
            })
            .catch(() => {
                if (mounted) setFeaturedJobs([]);
            });

        companyApi.listCompanies()
            .then((companies) => {
                if (mounted) setApprovedCompanies(companies);
            })
            .catch(() => {
                if (mounted) setApprovedCompanies([]);
            });

        return () => {
            mounted = false;
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
            <SanityPageSections routePath="/" placement="top" />
            {/* Hero: Job search */}
            {homeHero.isVisible !== false && <section id="trang-chu" className="relative scroll-mt-16 overflow-hidden py-20">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat hero-bg-zoom"
                    style={{ backgroundImage: `url(${homeHero.imageUrl || mscBackground})` }}
                    aria-hidden="true"
                />
                <div className="absolute inset-0 bg-white/75" aria-hidden="true" />
                <div className="absolute inset-0 bg-primary/10" aria-hidden="true" />

                <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[420px] md:min-h-[520px]">
                    <div className="mb-6">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-2 text-primary">
                            {homeHero.title || "InternHiring"}
                        </h1>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            {homeHero.subtitle || uiText("home.heroSubtitle", t("home.heroSubtitle"))}
                        </p>
                    </div>

                    <p className="text-lg text-black mb-8 max-w-3xl mx-auto">
                        {homeHero.description || uiText("home.heroDescription", t("home.heroDescription"))}
                    </p>
                </div>
            </section>}

            <SanityPageSections routePath="/" placement="afterHero" />

            {/* Featured Jobs */}
            {/* About / Introduction */}
            {homeContent.aboutVisible !== false && <section
                id="gioi-thieu"
                className="scroll-mt-16 border-y py-12"
                style={{
                    backgroundColor: homeColor("aboutSectionBackgroundColor") || "#ffffff",
                    borderColor: homeColor("aboutSectionBorderColor") || undefined,
                }}
            >
                <div className="container mx-auto px-4">
                    <div
                        className="mx-auto max-w-6xl rounded-lg border shadow-sm"
                        style={{
                            backgroundColor: homeColor("aboutCardBackgroundColor") || undefined,
                            borderColor: homeColor("aboutCardBorderColor") || undefined,
                        }}
                    >
                        <div className="p-6 text-center md:p-8">
                            <h2 className="text-3xl font-bold md:text-4xl" style={{color: homeColor("aboutTitleTextColor")}}>{uiText("home.aboutTitle", t("home.aboutTitle"))}</h2>
                            <p className="mt-3 text-sm font-semibold uppercase" style={{color: homeColor("aboutLeadTextColor")}}>{uiText("home.aboutLead", t("home.aboutLead"))}</p>
                            <p className="mx-auto mt-5 max-w-4xl text-base leading-7 text-muted-foreground" style={{color: homeColor("aboutBodyTextColor")}}>{uiText("home.aboutIntro", t("home.aboutIntro"))}</p>
                            <p className="mx-auto mt-4 max-w-4xl text-sm leading-7 text-muted-foreground" style={{color: homeColor("aboutBodyTextColor")}}>{uiText("home.aboutIntroLong", t("home.aboutIntroLong"))}</p>
                        </div>

                        {hasVisibleAboutCard && <div className="grid grid-cols-1 border-t border-primary/10 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                        {homeContent.projectCardVisible !== false && <div className="border-b p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" style={{backgroundColor: homeColor("projectCardBackgroundColor"), borderColor: homeColor("projectCardBorderColor")}}>
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2" style={{color: homeColor("projectCardTitleColor")}}>{uiText("home.aboutCardProjectTitle", t("home.aboutCardProjectTitle"))}</h3>
                                    <p className="text-sm text-muted-foreground" style={{color: homeColor("projectCardBodyColor")}}>{uiText("home.aboutCardProjectBody", t("home.aboutCardProjectBody"))}</p>
                                </div>
                        </div>}

                        {homeContent.missionCardVisible !== false && <div className="border-b p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" style={{backgroundColor: homeColor("missionCardBackgroundColor"), borderColor: homeColor("missionCardBorderColor")}}>
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2" style={{color: homeColor("missionCardTitleColor")}}>{uiText("home.aboutMissionTitle", t("home.aboutMissionTitle"))}</h3>
                                    <p className="text-sm text-muted-foreground" style={{color: homeColor("missionCardBodyColor")}}>{uiText("home.aboutMission", t("home.aboutMission"))}</p>
                                </div>
                        </div>}

                        {homeContent.valuesCardVisible !== false && <div className="border-b p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" style={{backgroundColor: homeColor("valuesCardBackgroundColor"), borderColor: homeColor("valuesCardBorderColor")}}>
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2" style={{color: homeColor("valuesCardTitleColor")}}>{uiText("home.aboutValuesTitle", t("home.aboutValuesTitle"))}</h3>
                                    <p className="text-sm text-muted-foreground" style={{color: homeColor("valuesCardBodyColor")}}>{uiText("home.aboutValues", t("home.aboutValues"))}</p>
                                </div>
                        </div>}
                        </div>}
                    </div>
                </div>
            </section>}

            {/* Featured Jobs */}
            {homeContent.featuredJobsVisible !== false && <section id="viec-lam-noi-bat" className="scroll-mt-16 py-16">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">{uiText("home.featuredJobsTitle", t("home.featuredJobsTitle"))}</h2>
                        <Button variant="cta" size="lg" className="flex items-center gap-2" onClick={() => navigate("/jobs")}>{uiText("home.viewAll", t("home.viewAll"))} <ArrowRight className="ml-1 h-4 w-4" /></Button>
                    </div>
                    {featuredJobs.length > 0 ? (
                        <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedFeaturedJobs.items.map((job) => {
                                const company = job.company || job.employerName || t("jobs.page.notProvided");
                                const viewCount = numberFormatter.format(job.viewCount ?? 0);
                                const favoriteCount = numberFormatter.format(job.favoriteCount ?? 0);
                                const jobTypeLabel = getOptionLabel(JOB_TYPE_OPTIONS, job.type, t);
                                const workModeLabel = getOptionLabel(WORK_MODE_OPTIONS, job.mode, t);
                                const salaryLabel = job.salary ? formatSalaryRangeLabel(job.salary, job.currency, t) : "";
                                const experienceLabel = getOptionLabel(defaultJobFilterOptions.experience, job.experience, t);

                                return (
                                    <Card
                                        key={job.id}
                                        role="button"
                                        tabIndex={0}
                                        className="group relative h-full overflow-hidden cursor-pointer transition-smooth hover:-translate-y-1 hover:shadow-medium border bg-card shadow-soft"
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                navigate(`/jobs/${job.id}`);
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-light" />
                                        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 transition-smooth group-hover:scale-125" />
                                        <FavoriteJobButton
                                            jobId={job.id}
                                            isFavorited={favoriteJobIds.has(job.id)}
                                            onFavoriteChange={handleFavoriteChange}
                                            className="absolute right-4 top-4 z-10"
                                        />
                                        <CardContent className="relative flex h-full flex-col gap-4 p-5">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2 pr-10">
                                                    {jobTypeLabel && <Badge variant="secondary" className="rounded-full px-3 py-1">{jobTypeLabel}</Badge>}
                                                    {salaryLabel && <Badge variant="secondary" className="rounded-full px-3 py-1">{salaryLabel}</Badge>}
                                                    {workModeLabel && <Badge variant="secondary" className="rounded-full px-3 py-1">{workModeLabel}</Badge>}
                                                    {experienceLabel && <Badge variant="secondary" className="rounded-full px-3 py-1">{experienceLabel}</Badge>}
                                                </div>
                                                <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                                                    {job.title}
                                                </h3>
                                                <p className="line-clamp-1 text-sm font-medium text-muted-foreground">
                                                    {company}
                                                </p>
                                            </div>

                                            <div className="mt-auto flex flex-wrap gap-2 text-sm text-muted-foreground">
                                                {job.location && (
                                                    <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                                                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                                        <span className="line-clamp-1">{job.location}</span>
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                                                    <Eye className="h-4 w-4 shrink-0 text-primary" />
                                                    <span>{t("home.featuredJobViews", { views: viewCount })}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                                                    <Heart className="h-4 w-4 shrink-0 text-red-500 fill-red-500" />
                                                    <span>{t("home.featuredJobLikes", { likes: favoriteCount })}</span>
                                                </span>
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
                                {uiText("home.featuredJobsEmpty", t("home.featuredJobsEmpty"))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>}

            {/* Partners (keep) */}
            {homeContent.partnersVisible !== false && <section id="doi-tac" className="scroll-mt-16 pt-10 pb-44 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-2 text-primary">
                            {uiText("home.partnersTitle", t("home.partnersTitle"))}
                        </h2>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            {uiText("home.partnersSubtitle", t("home.partnersSubtitle"))}
                        </p>
                    </div>
                    {partnerRows.length > 0 ? (
                        <div className="mt-12 space-y-10 overflow-hidden">
                            {partnerRows.map((row, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    className="relative overflow-hidden"
                                    aria-label={t("home.partnerRowAria", { number: rowIndex + 1 })}
                                >
                                    <div className={`partner-marquee ${row.reverse ? "partner-marquee-reverse" : ""}`}>
                                        {[...row.partners, ...row.partners].map((company, index) => {
                                            const isDuplicate = index >= row.partners.length;
                                            const companyName = company.companyDisplayName || company.companyFullName;

                                            return (
                                                <motion.div
                                                    key={`${rowIndex}-${company.id}-${index}`}
                                                    role={isDuplicate ? undefined : "button"}
                                                    tabIndex={isDuplicate ? -1 : 0}
                                                    className="partner-marquee-item flex h-24 w-48 items-center justify-center rounded-lg bg-card p-4 shadow-sm hover:shadow-lg cursor-pointer sm:w-56 md:w-60"
                                                    whileHover={{ scale: 1.08 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                    aria-hidden={isDuplicate}
                                                    aria-label={companyName}
                                                    onClick={() => navigate(`/companies/${company.id}`)}
                                                    onKeyDown={(event) => {
                                                        if (isDuplicate) return;
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            navigate(`/companies/${company.id}`);
                                                        }
                                                    }}
                                                >
                                                    <img src={company.logoUrl} alt={isDuplicate ? "" : companyName} className="max-h-12 object-contain" loading="lazy" />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card className="mt-8">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                {uiText("home.partnersEmpty", t("home.partnersEmpty"))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>}

            {/* CTA */}
            {canRequestRecruiterVerification && homeContent.recruiterCtaVisible !== false && (
                <section id="tuyen-dung" className="scroll-mt-16 py-16 hero-gradient">
                    <div className="container mx-auto px-4 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            {uiText("home.recruiterCtaTitle", t("home.recruiterCtaTitle"))}
                        </h2>
                        <div className="flex justify-center mt-6">
                            <Button variant="secondary" onClick={openEmployerRequestPage}>{uiText("home.recruiterCtaButton", t("home.recruiterCtaButton"))}</Button>
                        </div>
                    </div>
                </section>
            )}

            {homeContent.footerVisible !== false && <footer className="border-t bg-white py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    {uiText("home.footer", t("home.footer"))}
                </div>
            </footer>}

            <SanityPageSections routePath="/" placement="bottom" />

        </div>
    );
};

export default Home;
