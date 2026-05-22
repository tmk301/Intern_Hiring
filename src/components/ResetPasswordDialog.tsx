import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ResetPasswordDialog({ open, onOpenChange }: Props) {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSend = async () => {
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            toast.error("Vui lòng nhập email hợp lệ");
            return;
        }
        setIsSubmitting(true);
        try {
            const redirectTo = window.location.origin + "/reset-password"; // redirect to reset-password page after user clicks email link
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            toast.success("Một email đặt lại mật khẩu đã được gửi nếu email tồn tại.");
            onOpenChange(false);
            setEmail("");
        } catch (err: unknown) {
            console.error("Reset password error:", err);
            toast.error(err instanceof Error ? err.message : "Không thể gửi email đặt lại mật khẩu");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quên mật khẩu</DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    <Label>Email đăng nhập</Label>
                    <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ten@example.com"
                        className="mt-2"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu nếu email tồn tại.
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button onClick={handleSend} disabled={isSubmitting}>
                        Gửi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
