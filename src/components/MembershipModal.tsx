import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { purchaseApi, type SubscriptionPlan, type OrderResponse } from "@/lib/api";
import { MemberBadge } from "./MemberBadge";
import { Crown, CheckCircle2, XCircle, Sparkles, Loader2, Calendar, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MembershipModal: React.FC<MembershipModalProps> = ({ isOpen, onClose }) => {
  const { user, token, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [step, setStep] = useState<"SELECT" | "PAYMENT" | "SUCCESS">("SELECT");

  useEffect(() => {
    if (isOpen) {
      setStep("SELECT");
      setOrder(null);
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await purchaseApi.getPlans();
      setPlans(data);
      if (data.length > 0) {
        setSelectedPlanId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
      // Fallback local plans if backend has not responded yet
      const fallback: SubscriptionPlan[] = [
        {
          id: 1,
          code: "MEMBER_MONTHLY",
          name: "Gói Thành Viên Tháng",
          description: "Gói 30 ngày trải nghiệm trạng thái Member với huy hiệu vương miện danh giá.",
          price: 99000,
          billingCycle: "MONTHLY",
          durationDays: 30,
        },
        {
          id: 2,
          code: "MEMBER_YEARLY",
          name: "Gói Thành Viên Năm",
          description: "Gói 365 ngày trọn vẹn đặc quyền Member với chi phí tiết kiệm tối đa.",
          price: 990000,
          billingCycle: "YEARLY",
          durationDays: 365,
        },
      ];
      setPlans(fallback);
      setSelectedPlanId(fallback[0].id);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!token || !selectedPlanId) {
      toast.error("Vui lòng đăng nhập để mua gói");
      return;
    }

    try {
      setLoading(true);
      const newOrder = await purchaseApi.checkout(token, {
        planId: selectedPlanId,
        paymentMethod: "MOCK_SANDBOX",
      });
      setOrder(newOrder);
      setStep("PAYMENT");
    } catch (err: any) {
      toast.error(err?.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (success: boolean) => {
    if (!token || !order) return;

    try {
      setSimulating(true);
      const updatedOrder = await purchaseApi.simulatePayment(token, {
        orderCode: order.orderCode,
        success,
      });

      if (success && updatedOrder.status === "COMPLETED") {
        setOrder(updatedOrder);
        setStep("SUCCESS");
        await refreshUser();
        toast.success("Thanh toán thành công! Bạn đã nhận huy hiệu Member!");
      } else {
        toast.error("Thanh toán giả lập thất bại hoặc đã bị từ chối.");
        setOrder(updatedOrder);
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xử lý thanh toán.");
    } finally {
      setSimulating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl p-0 overflow-hidden border-amber-500/20 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-6 text-slate-950 relative">
          <div className="absolute right-4 top-4 opacity-15 pointer-events-none">
            <Crown className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-black/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Gói Hội Viên Cao Cấp
            </span>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
            Nâng cấp tài khoản Member
          </DialogTitle>
          <DialogDescription className="text-slate-900/80 mt-1 font-medium text-sm">
            Nhận ngay huy hiệu Member hoàng gia kế bên tên tài khoản và mở khóa các quyền lợi độc quyền.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {step === "SELECT" && (
            <>
              {/* Plans Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  const isYearly = plan.billingCycle === "YEARLY";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-200 border-2 flex flex-col justify-between ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {isYearly && (
                        <div className="absolute -top-3 right-3 bg-gradient-to-r from-red-500 to-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Tiết kiệm ~17%
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-base text-slate-900">{plan.name}</h4>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className="text-2xl font-black text-slate-900">{formatPrice(plan.price)}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            / {isYearly ? "năm" : "tháng"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>Thời hạn: {plan.durationDays} ngày</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Benefits checklist */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" /> Quyền lợi khi kích hoạt
                </h5>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      Gắn huy hiệu <MemberBadge size="sm" /> cạnh họ tên tại Profile và hệ thống.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Chứng nhận tài khoản thành viên tích cực được kiểm định.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Ưu tiên trải nghiệm các tính năng đặc quyền tiếp theo.</span>
                  </li>
                </ul>
              </div>

              {/* Footer CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Để sau
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={loading || !selectedPlanId}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-6"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Tiến hành Mua gói
                </Button>
              </div>
            </>
          )}

          {step === "PAYMENT" && order && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-sm text-muted-foreground">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{order.orderCode}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-sm text-muted-foreground">Gói đăng ký:</span>
                  <span className="font-bold text-slate-900">{order.planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Số tiền thanh toán:</span>
                  <span className="text-xl font-black text-amber-600">{formatPrice(order.amount)}</span>
                </div>
              </div>

              {/* Mock Sandbox Controls */}
              <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Khu vực Cổng Thanh Toán Giả Lập (Demo Sandbox)</span>
                </div>
                <p className="text-xs text-amber-900/80">
                  Hệ thống đang hoạt động ở chế độ Demo Sandbox. Bạn có thể chọn mô phỏng kết quả thanh toán ngay lập tức:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={() => handleSimulatePayment(true)}
                    disabled={simulating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
                  >
                    {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Giả lập Thành công
                  </Button>
                  <Button
                    onClick={() => handleSimulatePayment(false)}
                    disabled={simulating}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold flex items-center justify-center gap-2"
                  >
                    {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Giả lập Thất bại
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep("SELECT")}>
                  Quay lại chọn gói
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          )}

          {step === "SUCCESS" && order && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Chúc mừng bạn!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Đơn hàng <span className="font-mono font-bold text-slate-800">{order.orderCode}</span> đã hoàn tất thành công. Tài khoản của bạn đã được nâng cấp lên:
              </p>

              <div className="py-2">
                <MemberBadge size="lg" />
              </div>

              <p className="text-xs text-slate-500">
                Huy hiệu Member đã được cập nhật trực tiếp tại trang cá nhân của bạn.
              </p>

              <div className="pt-4">
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8"
                >
                  Tuyệt vời, Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipModal;
