import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { JobSearchFilters } from "@/components/jobs/JobSearchFilters";
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
    { id: 19, name: "Tâm Châu", logo: "/carousel/TC.webp" },
    { id: 20, name: "VNPT", logo: "/carousel/VNPT.webp" },
    { id: 21, name: "WK", logo: "/carousel/WK.webp" },
    { id: 22, name: "YESCO", logo: "/carousel/YESCO.webp" },
];

const featuredJobs = [
    { id: 1, title: "Thực tập Frontend Developer", company: "ASL", location: "Hồ Chí Minh", type: "Thực tập", salary: "Thỏa thuận" },
    { id: 2, title: "Junior Sales Executive", company: "Binemo", location: "Hà Nội", type: "Part-time", salary: "6-8 triệu" },
    { id: 3, title: "Data Analyst Intern", company: "CP Group", location: "Remote", type: "Thực tập", salary: "Thỏa thuận" },
];

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuth();
    const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
    const [isEmployerDialogOpen, setIsEmployerDialogOpen] = useState(false);
    const [isSubmittingEmployerRequest, setIsSubmittingEmployerRequest] = useState(false);
    const [employerRequest, setEmployerRequest] = useState<Record<string, string>>({});
    const [recruiterFields, setRecruiterFields] = useState<RecruiterFormField[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const partnerList = managedConfig.partners.length > 0 ? managedConfig.partners : corporatePartners;
    const midpoint = Math.ceil(partnerList.length / 2);
    const firstPartnerRow = partnerList.slice(0, midpoint);
    const secondPartnerRow = partnerList.slice(midpoint);
    const partnerRows = [
        { partners: firstPartnerRow, reverse: false },
        { partners: secondPartnerRow, reverse: true },
    ].filter((row) => row.partners.length > 0);

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
            toast.error("Vui lòng đăng nhập trước khi gửi yêu cầu xác thực nhà tuyển dụng.");
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
            toast.error(error instanceof Error ? error.message : "Không thể tải cấu hình form.");
        } finally {
            setLoadingFields(false);
        }
    };

    const submitEmployerRequest = async () => {
        if (!token) return;

        const requiredMissing = recruiterFields.some((field) => field.required && !employerRequest[field.name]?.trim());

        if (requiredMissing) {
            toast.error("Vui lòng nhập đầy đủ các trường bắt buộc.");
            return;
        }

        setIsSubmittingEmployerRequest(true);
        try {
            const formData: Record<string, string> = {};
            for (const field of recruiterFields) {
                formData[field.name] = employerRequest[field.name]?.trim() || "";
            }

            await recruiterApi.submitApplication(token, formData);
            toast.success("Đã gửi yêu cầu xác thực nhà tuyển dụng.");
            setEmployerRequest({});
            setIsEmployerDialogOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Không thể gửi yêu cầu xác thực.");
        } finally {
            setIsSubmittingEmployerRequest(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero: Job search */}
            <section id="trang-chu" className="relative scroll-mt-24 overflow-hidden py-20">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${mscBackground})` }}
                    aria-hidden="true"
                />
                <div className="absolute inset-0 bg-white/75" aria-hidden="true" />
                <div className="absolute inset-0 bg-primary/10" aria-hidden="true" />

                <div className="relative z-10 container mx-auto px-4 text-center">
                    <div className="mb-6">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-2 text-primary">
                            InternHiring
                        </h1>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            Kết nối Sinh viên & Doanh nghiệp
                        </p>
                    </div>

                    <p className="text-lg text-black mb-8 max-w-3xl mx-auto">
                        Tìm công việc thực tập, việc làm bán thời gian và cơ hội nghề nghiệp từ các công ty hàng đầu.
                    </p>

                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-lg shadow-md p-4 flex gap-2 items-center">
                            <div className="flex-1">
                                <input
                                    aria-label="Tìm kiếm công việc"
                                    className="w-full h-12 px-4 rounded-md border border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                                    placeholder="Ví dụ: Frontend, Data, Sales..."
                                />
                            </div>
                            <Button variant="cta" className="h-12 px-4">
                                <Search className="mr-2 h-4 w-4" />
                                Tìm kiếm
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div id="tim-kiem" className="mb-8 scroll-mt-24">
                        <JobSearchFilters options={managedConfig.filters} />
                    </div>

                    <div id="viec-lam" className="flex scroll-mt-24 items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Việc làm nổi bật</h2>
                        <Button variant="link" size="sm">Xem tất cả <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {featuredJobs.map((job) => (
                            <Card key={job.id} className="p-4">
                                <CardContent className="p-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-lg">{job.title}</h3>
                                            <p className="text-sm text-muted-foreground">{job.company} • {job.location}</p>
                                            <div className="mt-3 flex gap-2">
                                                <span className="text-xs px-3 py-1 bg-muted rounded-full">{job.type}</span>
                                                <span className="text-xs px-3 py-1 bg-muted rounded-full">{job.salary}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Button variant="outline" size="sm">Nộp hồ sơ</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partners (keep) */}
            <section id="doi-tac" className="scroll-mt-24 py-14 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-2 text-primary">
                            Đối tác & Tập đoàn
                        </h2>
                        <p className="text-2xl md:text-3xl font-medium text-black">
                            Các công ty tuyển dụng hàng đầu
                        </p>
                    </div>
                    <div className="mt-8 space-y-6 overflow-hidden">
                        {partnerRows.map((row, rowIndex) => (
                            <div
                                key={rowIndex}
                                className="relative overflow-hidden"
                                aria-label={`Dòng đối tác ${rowIndex + 1}`}
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
                        Bạn là nhà tuyển dụng? Hãy tiến thành xác thực với chúng tôi.
                    </h2>
                    <div className="flex justify-center mt-6">
                        <Button variant="secondary" onClick={openEmployerRequestDialog}>Yêu cầu xác thực</Button>
                    </div>
                </div>
            </section>

            <footer className="border-t bg-white py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    © 2026 InternHiring MSC Center. All rights reserved.
                </div>
            </footer>

            <Dialog open={isEmployerDialogOpen} onOpenChange={setIsEmployerDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yêu cầu xác thực nhà tuyển dụng</DialogTitle>
                        <DialogDescription>
                            Gửi thông tin doanh nghiệp để quản trị viên duyệt quyền nhà tuyển dụng.
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
                                        type={field.type.toLowerCase()}
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
                            Hủy
                        </Button>
                        <Button onClick={submitEmployerRequest} disabled={isSubmittingEmployerRequest}>
                            {isSubmittingEmployerRequest && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                            Gửi yêu cầu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Home;
