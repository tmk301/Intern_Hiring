import React, { useState, useEffect } from 'react';
import { sanityClient } from '@/lib/sanity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Paintbrush } from 'lucide-react';

export const SanityAdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State quản lý Tab đang mở
  const [activeTab, setActiveTab] = useState('home');

  // STATES CHO TRANG CHỦ (HOME)
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [aboutTitle, setAboutTitle] = useState('');
  const [heroBgColor, setHeroBgColor] = useState('');


  // STATES CHO TRANG ĐĂNG NHẬP (LOGIN)
  const [loginTitle, setLoginTitle] = useState('');
  const [loginSubtitle, setLoginSubtitle] = useState('');
  const [loginQuote, setLoginQuote] = useState('');
  const [loginBannerColor, setLoginBannerColor] = useState('#2563eb'); // Mặc định màu xanh dương

  useEffect(() => {
    setLoading(true);
    
    if (activeTab === 'home') {
      sanityClient.fetch(`*[_id == "homePageConfig"][0]`)
        .then((data) => {
          if (data) {
            setHeroTitle(data.heroTitle || '');
            setHeroSubtitle(data.heroSubtitle || '');
            setHeroDescription(data.heroDescription || '');
            setAboutTitle(data.aboutTitle || '');
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Lỗi khi tải dữ liệu Trang Chủ');
          setLoading(false);
        });
    } else if (activeTab === 'login') {
      sanityClient.fetch(`*[_id == "loginPageConfig"][0]`)
        .then((data) => {
          if (data) {
            setLoginTitle(data.loginTitle || '');
            setLoginSubtitle(data.loginSubtitle || '');
            setLoginQuote(data.loginQuote || '');
            setLoginBannerColor(data.loginBannerColor || '#2563eb');
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Lỗi khi tải dữ liệu Trang Đăng nhập');
          setLoading(false);
        });
    }
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'home') {
        await sanityClient.createOrReplace({
          _id: 'homePageConfig',
          _type: 'pageConfig',
          heroTitle,
          heroSubtitle,
          heroDescription,
          aboutTitle,
        });
        toast.success('Đã lưu cấu hình Trang Chủ!');
      } else if (activeTab === 'login') {
        await sanityClient.createOrReplace({
          _id: 'loginPageConfig',
          _type: 'pageConfig',
          loginTitle,
          loginSubtitle,
          loginQuote,
          loginBannerColor,
        });
        toast.success('Đã lưu cấu hình Trang Đăng Nhập!');
      }
    } catch (error: any) {
      toast.error('Lỗi khi lưu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* KHU VỰC TÙY CHỌN TRANG */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="home" className="data-[state=active]:bg-white">Trang Chủ (Home)</TabsTrigger>
            <TabsTrigger value="login" className="data-[state=active]:bg-white">Trang Đăng Nhập (Login)</TabsTrigger>
          </TabsList>
          
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          <>
            {/* TAB TRANG CHỦ */}
            <TabsContent value="home" className="space-y-8 mt-0">
              {/* Phần Hero */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border">
                <h3 className="text-lg font-bold border-b pb-2">Hero Banner</h3>
                <div className="grid gap-2">
                  <Label>Tiêu đề chính (Brand Name)</Label>
                  <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="VD: InternHiring" />
                </div>
                <div className="grid gap-2">
                  <Label>Dòng phụ đề</Label>
                  <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Nền tảng tuyển dụng sinh viên..." />
                </div>
                <div className="grid gap-2">
                  <Label>Mô tả chi tiết</Label>
                  <Textarea value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} placeholder="Nhập đoạn giới thiệu dài..." rows={3} />
                </div>
              </div>

              {/* Phần About */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border">
                <h3 className="text-lg font-bold border-b pb-2">Giới thiệu</h3>
                <div className="grid gap-2">
                  <Label>Tiêu đề phần Giới thiệu</Label>
                  <Input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="VD: Tại sao chọn chúng tôi?" />
                </div>
              </div>
            </TabsContent>

            {/* TAB TRANG LOGIN */}
            <TabsContent value="login" className="space-y-8 mt-0">
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border">
                <h3 className="text-lg font-bold border-b pb-2">Cấu hình Giao diện Login</h3>
                <div className="grid gap-2">
                  <Label>Tiêu đề form đăng nhập</Label>
                  <Input value={loginTitle} onChange={(e) => setLoginTitle(e.target.value)} placeholder="VD: Chào mừng trở lại!" />
                </div>
                <div className="grid gap-2">
                  <Label>Phụ đề / Hướng dẫn</Label>
                  <Input value={loginSubtitle} onChange={(e) => setLoginSubtitle(e.target.value)} placeholder="VD: Vui lòng nhập email và mật khẩu của bạn" />
                </div>
                <div className="grid gap-2">
                  <Label>Câu trích dẫn (Banner bên cạnh form)</Label>
                  <Textarea value={loginQuote} onChange={(e) => setLoginQuote(e.target.value)} placeholder="VD: Hành trình vạn dặm bắt đầu từ một bước chân..." rows={3} />
                </div>
              </div>

              {/* Select color */}
              <div className="grid gap-2">
                <Label>Màu nền Banner (Bên trái)</Label>
                <div className="flex gap-3">
                  {/* Ô hiển thị bảng màu trực quan */}
                  <Input 
                    type="color" 
                    value={loginBannerColor} 
                    onChange={(e) => setLoginBannerColor(e.target.value)} 
                    className="w-16 h-10 p-1 cursor-pointer" 
                  />
                  {/* Ô cho phép nhập mã màu dạng Text hoặc dán mã Gradient */}
                  <Input 
                    type="text" 
                    value={loginBannerColor} 
                    onChange={(e) => setLoginBannerColor(e.target.value)} 
                    placeholder="Mã HEX (VD: #2563eb) hoặc dán mã CSS Gradient" 
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};