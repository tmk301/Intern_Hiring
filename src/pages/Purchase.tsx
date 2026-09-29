import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { purchaseApi, type SubscriptionPlan, type OrderResponse, type UserSubscriptionResponse } from "@/lib/api";
import { MemberBadge, isUserMember } from "@/components/MemberBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Crown,
  CheckCircle2,
  Sparkles,
  Loader2,
  Calendar,
  ShieldCheck,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Receipt,
  RotateCcw,
  BadgeCheck,
  Building2,
  History,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Purchase: React.FC = () => {
  const { user, token, refreshUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session_id");
  const statusFromUrl = searchParams.get("status");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [step, setStep] = useState<"PLANS" | "CHECKOUT" | "SUCCESS">("PLANS");
  const [paymentTab, setPaymentTab] = useState<"STRIPE" | "QR" | "CARD">("STRIPE");

  // Mock Card Form inputs
  const [cardForm, setCardForm] = useState({
    cardNumber: "4242 •••• •••• 4242",
    holderName: user ? `${user.lastName || ""} ${user.firstName || ""}`.trim().toUpperCase() : "NGUYEN VAN A",
    expiry: "12/28",
    cvv: "888",
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasMember = isUserMember(user);

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  useEffect(() => {
    if (sessionIdFromUrl && token) {
      verifyStripePayment(sessionIdFromUrl);
    } else if (statusFromUrl === "cancelled") {
      toast.info("Đã hủy phiên thanh toán Stripe Sandbox.");
      navigate("/purchase", { replace: true });
    }
  }, [sessionIdFromUrl, statusFromUrl, token]);

  const verifyStripePayment = async (sessionId: string) => {
    try {
      setProcessing(true);
      toast.loading("Đang xác thực thanh toán từ Stripe Sandbox...", { id: "stripe-verify" });
      const completedOrder = await purchaseApi.verifyStripeSession(token!, sessionId);
      toast.dismiss("stripe-verify");
      toast.success("🎉 Thanh toán Stripe Sandbox thành công! Gói Member đã được kích hoạt.");
      setOrder(completedOrder);
      setStep("SUCCESS");
      await refreshUser();
      fetchInitialData();
      navigate("/purchase", { replace: true });
    } catch (err: any) {
      toast.dismiss("stripe-verify");
      toast.error("Lỗi xác thực thanh toán Stripe: " + (err.message || "Vui lòng thử lại"));
      navigate("/purchase", { replace: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeCheckout = async (planId?: number) => {
    if (!isAuthenticated || !token) {
      toast.info("Vui lòng đăng nhập để nâng cấp tài khoản Member");
      navigate("/login");
      return;
    }

    const targetPlanId = planId || order?.planId || selectedPlanId;
    if (!targetPlanId) return;

    try {
      setProcessing(true);
      toast.loading("Đang khởi tạo phiên thanh toán Stripe Sandbox...", { id: "stripe-init" });
      const response = await purchaseApi.createStripeCheckoutSession(token, {
        planId: targetPlanId,
        successUrl: window.location.origin + "/purchase",
        cancelUrl: window.location.origin + "/purchase",
      });
      toast.dismiss("stripe-init");
      if (response && response.checkoutUrl) {
        toast.info("Đang chuyển tiếp đến trang thanh toán Stripe Sandbox...");
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error("Không nhận được URL thanh toán từ Stripe.");
      }
    } catch (err: any) {
      toast.dismiss("stripe-init");
      toast.error("Lỗi tạo phiên Stripe: " + (err.message || "Vui lòng thử lại"));
      setProcessing(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const plansData = await purchaseApi.getPlans();
      if (plansData && plansData.length > 0) {
        setPlans(plansData);
        setSelectedPlanId(plansData[0].id);
      } else {
        useFallbackPlans();
      }

      if (token) {
        try {
          const [subData, ordersData] = await Promise.all([
            purchaseApi.getMySubscription(token),
            purchaseApi.getMyOrders(token),
          ]);
          setActiveSubscription(subData);
          setMyOrders(ordersData);
        } catch (subErr) {
          console.error("Could not fetch user sub/orders:", subErr);
        }
      }
    } catch (err) {
      console.warn("Could not fetch plans:", err);
      useFallbackPlans();
    } finally {
      setLoading(false);
    }
  };

  const useFallbackPlans = () => {
    const fallback: SubscriptionPlan[] = [
      {
        id: 1,
        code: "MEMBER_MONTHLY",
        name: "Gói Thành Viên Tháng",
        description: "Gói 30 ngày trải nghiệm toàn diện huy hiệu Member hoàng gia và các đặc quyền hội viên.",
        price: 99000,
        billingCycle: "MONTHLY",
        durationDays: 30,
      },
      {
        id: 2,
        code: "MEMBER_YEARLY",
        name: "Gói Thành Viên Năm",
        description: "Gói 365 ngày trọn vẹn đặc quyền Member với chi phí tiết kiệm ~17%.",
        price: 990000,
        billingCycle: "YEARLY",
        durationDays: 365,
      },
    ];
    setPlans(fallback);
    setSelectedPlanId(fallback[0].id);
  };

  const handleStartCheckout = async (planId?: number) => {
    if (!isAuthenticated || !token) {
      toast.info("Vui lòng đăng nhập để nâng cấp tài khoản Member");
      navigate("/login");
      return;
    }

    const targetPlanId = planId || selectedPlanId;
    if (!targetPlanId) return;

    try {
      setLoading(true);
      const paymentMethod = paymentTab === "QR" ? "VIETQR_BANK_TRANSFER" : "CREDIT_CARD";
      const newOrder = await purchaseApi.checkout(token, {
        planId: targetPlanId,
        paymentMethod,
      });
      setOrder(newOrder);
      setStep("CHECKOUT");
      window.scrollTo({ top: 200, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err?.message || "Không thể khởi tạo đơn hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!token || !order) return;

    try {
      setProcessing(true);
      // Realistic brief delay to simulate bank webhook processing
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const updatedOrder = await purchaseApi.simulatePayment(token, {
        orderCode: order.orderCode,
        success: true,
      });

      if (updatedOrder.status === "COMPLETED") {
        setOrder(updatedOrder);
        setStep("SUCCESS");
        await refreshUser();
        // Refresh orders and subscriptions
        const [subData, ordersData] = await Promise.all([
          purchaseApi.getMySubscription(token),
          purchaseApi.getMyOrders(token),
        ]);
        setActiveSubscription(subData);
        setMyOrders(ordersData);
        toast.success("Thanh toán thành công! Bạn đã được cấp huy hiệu Member!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xử lý giao dịch. Vui lòng thử lại.");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const calculateDaysRemaining = (expireAt?: string | null) => {
    if (!expireAt) return 0;
    const diff = new Date(expireAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining(user?.memberExpireAt);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/10 via-slate-50 to-white pb-20 pt-8">
      <div className="container max-w-5xl mx-auto px-4 space-y-10">

        {/* HERO HEADER */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-300/50 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Gói Hội Viên Chính Thức · InternHiring</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            Nâng Cấp Gói <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600">Member</span>
          </h1>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Nhận huy hiệu Member hoàng gia kế bên tên tài khoản, mở rộng hạn mức và gia tăng độ tin cậy trong toàn hệ thống tuyển dụng.
          </p>
        </div>

        {/* CURRENT MEMBERSHIP STATE BANNER (WHEN USER HAS PURCHASED) */}
        {hasMember && (
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-6 md:p-8 text-slate-950 shadow-xl shadow-amber-500/15">
              <div className="absolute right-4 top-4 opacity-15 pointer-events-none">
                <Crown className="w-40 h-40" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-2xl bg-black/10 backdrop-blur-md">
                      <BadgeCheck className="w-8 h-8 text-slate-950" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-slate-950">Gói Hội Viên Đang Hoạt Động</h2>
                        <MemberBadge size="sm" />
                      </div>
                      <p className="text-xs font-semibold text-slate-900/80">
                        Tài khoản: {user?.email} · Trạng thái: <span className="underline font-bold">ĐÃ MUA (ACTIVE)</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950 text-amber-400 font-mono text-xs font-bold px-4 py-2 rounded-2xl shadow-inner">
                    CÒN LẠI {daysRemaining} NGÀY
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/40 backdrop-blur-md rounded-2xl p-3 border border-white/40">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Gói hiện tại</span>
                    <span className="text-base font-black text-slate-950">
                      {activeSubscription?.planName || "Gói Thành Viên VIP"}
                    </span>
                  </div>

                  <div className="bg-white/40 backdrop-blur-md rounded-2xl p-3 border border-white/40">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Ngày hết hạn</span>
                    <span className="text-base font-black text-slate-950">
                      {user?.memberExpireAt ? new Date(user.memberExpireAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                    </span>
                  </div>

                  <div className="bg-white/40 backdrop-blur-md rounded-2xl p-3 border border-white/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Huy hiệu</span>
                      <span className="text-xs font-bold text-slate-950">Đã kích hoạt</span>
                    </div>
                    <MemberBadge size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: PLANS SELECTION */}
        {step === "PLANS" && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {plans.map((plan) => {
                const isYearly = plan.billingCycle === "YEARLY";
                const isCurrentActivePlan = hasMember && (
                  (isYearly && daysRemaining > 30) ||
                  (!isYearly && daysRemaining <= 30 && daysRemaining > 0)
                );

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col justify-between transition-all duration-300 rounded-3xl overflow-hidden border-2 ${
                      isYearly
                        ? "border-amber-400 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/20"
                        : "border-slate-200 hover:border-slate-300 shadow-md"
                    }`}
                  >
                    {isYearly && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-amber-500 text-white text-xs font-black px-4 py-1 rounded-bl-2xl shadow-sm uppercase tracking-wider">
                        Tiết kiệm ~17% · Khuyên dùng ⭐
                      </div>
                    )}

                    <CardHeader className="pt-8 pb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mb-3">
                        <Crown className="w-6 h-6 fill-current" />
                      </div>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                        {isCurrentActivePlan && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đang sử dụng
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-slate-600 text-sm mt-1">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900">{formatPrice(plan.price)}</span>
                        <span className="text-sm font-semibold text-muted-foreground">
                          / {isYearly ? "năm" : "tháng"}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Quyền lợi bao gồm:</p>
                        <ul className="space-y-2.5 text-sm text-slate-700">
                          <li className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              Huy hiệu <MemberBadge size="sm" /> xuất hiện bên cạnh tên người dùng.
                            </span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Thời hạn gói: <strong>{plan.durationDays} ngày</strong>.</span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Tự động cộng dồn thời hạn nếu gia hạn trước hạn.</span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Ưu tiên xuất hiện trong danh sách ứng viên / tin tuyển dụng.</span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-6">
                      <Button
                        onClick={() => handleStartCheckout(plan.id)}
                        disabled={loading}
                        className={`w-full py-6 font-bold text-base rounded-2xl transition-all duration-300 shadow-md ${
                          isYearly
                            ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/25"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Crown className="w-4 h-4 fill-current" />
                            {hasMember ? "Gia Hạn Thêm Gói Này" : "Chọn Gói Này"}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* ORDER HISTORY TABLE (IF ANY ORDERS EXIST) */}
            {myOrders && myOrders.length > 0 && (
              <div className="max-w-4xl mx-auto space-y-4 pt-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                  <History className="w-5 h-5 text-amber-500" />
                  <span>Lịch Sử Giao Dịch Của Bạn</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5">Mã đơn hàng</th>
                          <th className="px-5 py-3.5">Gói dịch vụ</th>
                          <th className="px-5 py-3.5">Số tiền</th>
                          <th className="px-5 py-3.5">Phương thức</th>
                          <th className="px-5 py-3.5">Ngày tạo</th>
                          <th className="px-5 py-3.5">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{ord.orderCode}</td>
                            <td className="px-5 py-3.5 font-medium">{ord.planName}</td>
                            <td className="px-5 py-3.5 font-bold text-amber-600">{formatPrice(ord.amount)}</td>
                            <td className="px-5 py-3.5 text-xs text-slate-500">{ord.paymentMethod}</td>
                            <td className="px-5 py-3.5 text-xs text-slate-500">
                              {new Date(ord.createdAt).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-5 py-3.5">
                              {ord.status === "COMPLETED" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" /> Đã thanh toán
                                </span>
                              ) : ord.status === "PENDING" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" /> Đang chờ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                  Thất bại
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: REALISTIC CHECKOUT FLOW */}
        {step === "CHECKOUT" && order && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <Button variant="ghost" onClick={() => setStep("PLANS")} className="text-slate-600">
                ← Quay lại danh sách gói
              </Button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> Thời gian giữ đơn hàng: 15:00
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Payment details column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Chọn Phương Thức Thanh Toán</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentTab("STRIPE")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          paymentTab === "STRIPE"
                            ? "bg-[#635BFF] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-200" /> Stripe Sandbox
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTab("QR")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          paymentTab === "QR"
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" /> VietQR Chuyển khoản
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTab("CARD")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          paymentTab === "CARD"
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Thẻ Mô Phỏng
                      </button>
                    </div>
                  </div>

                  {paymentTab === "STRIPE" ? (
                    <div className="space-y-5">
                      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-indigo-900 block font-bold mb-1">Cổng thanh toán Stripe Sandbox:</strong>
                          Hỗ trợ thẻ Visa, Mastercard, JCB, American Express với giao diện chính thức của Stripe. Bạn sẽ được chuyển tiếp sang trang thanh toán bảo mật của Stripe Sandbox.
                        </div>
                      </div>

                      {/* Sandbox Card Credentials helper */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-slate-600" /> Thẻ Test Stripe Sandbox:
                          </span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">TEST MODE</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Số thẻ Visa test</span>
                            <span className="font-mono font-bold text-slate-900">4242 4242 4242 4242</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Hạn dùng</span>
                            <span className="font-mono font-bold text-slate-900">Tương lai (VD: 12/28)</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Mã CVC</span>
                            <span className="font-mono font-bold text-slate-900">3 số (VD: 123)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={() => handleStripeCheckout(order.planId)}
                          disabled={processing}
                          className="w-full py-6 font-bold text-base bg-[#635BFF] hover:bg-[#5851EA] text-white rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Đang kết nối Stripe Sandbox...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Thanh Toán Ngay Qua Stripe ({formatPrice(order.amount)})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : paymentTab === "QR" ? (
                    <div className="space-y-5">
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                        <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Hướng dẫn chuyển khoản:</strong> Sử dụng ứng dụng Ngân hàng bất kỳ (Mobile Banking) để quét mã VietQR hoặc chuyển khoản trực tiếp theo thông tin bên dưới.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                        {/* Dynamic VietQR Image */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                          <img
                            src={`https://img.vietqr.io/image/MB-0348748301-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=INTERNHIRING%20MEMBERSHIP`}
                            alt="VietQR Code"
                            className="w-48 h-48 object-contain rounded-xl"
                            loading="lazy"
                          />
                          <span className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Quét mã để thanh toán tự động
                          </span>
                        </div>

                        {/* Bank info box with copy buttons */}
                        <div className="space-y-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 block">Ngân hàng:</span>
                            <span className="font-bold text-slate-900 text-sm">MB Bank (Ngân hàng Quân Đội)</span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <span className="text-slate-500 block">Số tài khoản:</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">0348748301</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard("0348748301", "account")}
                              className="h-7 px-2 text-xs"
                            >
                              {copiedField === "account" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <span className="text-slate-500 block">Số tiền:</span>
                              <span className="font-bold text-amber-600 text-sm">{formatPrice(order.amount)}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(String(order.amount), "amount")}
                              className="h-7 px-2 text-xs"
                            >
                              {copiedField === "amount" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <span className="text-slate-500 block">Nội dung chuyển khoản:</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">{order.orderCode}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(order.orderCode, "code")}
                              className="h-7 px-2 text-xs"
                            >
                              {copiedField === "code" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={handleConfirmPayment}
                          disabled={processing}
                          className="w-full py-6 font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/20"
                        >
                          {processing ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Đang kiểm tra và xác nhận chuyển khoản...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              Tôi Đã Chuyển Khoản Thành Công
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Credit Card Form */
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Số thẻ tín dụng / ghi nợ</Label>
                        <Input
                          value={cardForm.cardNumber}
                          onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Tên in trên thẻ (không dấu)</Label>
                        <Input
                          value={cardForm.holderName}
                          onChange={(e) => setCardForm({ ...cardForm, holderName: e.target.value.toUpperCase() })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Ngày hết hạn (MM/YY)</Label>
                          <Input
                            value={cardForm.expiry}
                            onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Mã bảo mật CVV</Label>
                          <Input
                            type="password"
                            value={cardForm.cvv}
                            maxLength={4}
                            onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          onClick={handleConfirmPayment}
                          disabled={processing}
                          className="w-full py-6 font-bold text-base bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl shadow-lg"
                        >
                          {processing ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Đang kết nối cổng thanh toán...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5" />
                              Thanh Toán Ngay {formatPrice(order.amount)}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order summary column */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-500" /> Tóm Tắt Đơn Hàng
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-500">#{order.orderCode}</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gói đăng ký:</span>
                      <span className="font-bold text-slate-900">{order.planName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Đơn giá:</span>
                      <span className="font-semibold text-slate-900">{formatPrice(order.amount)}</span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Thuế & Phí dịch vụ:</span>
                      <span className="text-emerald-600 font-bold">0 VNĐ (Miễn phí)</span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">Tổng thanh toán:</span>
                      <span className="text-2xl font-black text-amber-600">{formatPrice(order.amount)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Cam kết dịch vụ</span>
                    </div>
                    <p className="leading-relaxed">
                      Kích hoạt tức thì ngay khi xác nhận thanh toán. Huy hiệu Member sẽ được gắn tự động vào tài khoản.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT SUCCESS RECEIPT SCREEN */}
        {step === "SUCCESS" && order && (
          <div className="max-w-xl mx-auto">
            <Card className="rounded-3xl border-2 border-emerald-400 p-8 text-center space-y-6 shadow-2xl bg-white">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900">Thanh Toán Thành Công!</h3>
                <p className="text-slate-600 text-sm">
                  Giao dịch của bạn đã được ghi nhận. Chúc mừng bạn đã chính thức đạt danh hiệu:
                </p>
              </div>

              <div className="py-3 flex justify-center">
                <MemberBadge size="lg" />
              </div>

              {/* Receipt details */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-900">{order.orderCode}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Mã giao dịch:</span>
                  <span className="font-mono text-slate-700">{order.transactionId || "TXN-APPROVED"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Gói hội viên:</span>
                  <span className="font-bold text-slate-900">{order.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Đã Kích Hoạt Thành Công
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/profile")}
                  className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 py-5 rounded-2xl shadow-md"
                >
                  Xem Profile Của Bạn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep("PLANS")}
                  className="py-5 rounded-2xl"
                >
                  Quản lý gói & Lịch sử
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchase;
