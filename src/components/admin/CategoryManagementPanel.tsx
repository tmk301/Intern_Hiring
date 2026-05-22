import React, { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  configApi,
  type CategoryKey,
  type CategoryOption,
  type RecruiterFormField,
} from "@/lib/api";

type CategoryManagementPanelProps = {
  token: string;
};

const CATEGORY_KEYS: { key: CategoryKey; label: string }[] = [
  { key: "CITIES", label: "Tỉnh/Thành phố" },
  { key: "WORK_MODES", label: "Hình thức làm việc" },
  { key: "JOB_TYPES", label: "Loại công việc" },
  { key: "DISTRICTS", label: "Quận/Huyện" },
  { key: "WARDS", label: "Phường/Xã" },
  { key: "COMPANIES", label: "Công ty" },
  { key: "CURRENCIES", label: "Đơn vị tiền tệ" },
];

const emptyFieldDraft = {
  name: "",
  label: "",
  type: "TEXT" as RecruiterFormField["type"],
  placeholder: "",
  required: true,
  sortOrder: 0,
  active: true,
};

export function CategoryManagementPanel({ token }: CategoryManagementPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("CITIES");
  const [categoryOptions, setCategoryOptions] = useState<Record<string, CategoryOption[]>>({});
  const [formFields, setFormFields] = useState<RecruiterFormField[]>([]);
  const [filterLabel, setFilterLabel] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [fieldDraft, setFieldDraft] = useState(emptyFieldDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fields, ...categoryResults] = await Promise.all([
        configApi.listRecruiterFormFields(true),
        ...CATEGORY_KEYS.map(({ key }) => configApi.listCategoryOptions(key, true)),
      ]);

      setFormFields(fields);
      const optionMap: Record<string, CategoryOption[]> = {};
      CATEGORY_KEYS.forEach(({ key }, index) => {
        optionMap[key] = categoryResults[index];
      });
      setCategoryOptions(optionMap);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu danh mục.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addFilterOption = async () => {
    const label = filterLabel.trim();
    const value = filterValue.trim() || label.toLowerCase().replace(/\s+/g, "-");

    if (!label || !value) {
      toast.error("Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);
    try {
      const created = await configApi.createCategoryOption(token, {
        categoryKey: selectedCategory,
        value,
        label,
        sortOrder: (categoryOptions[selectedCategory]?.length ?? 0),
        active: true,
      });
      setCategoryOptions((prev) => ({
        ...prev,
        [selectedCategory]: [...(prev[selectedCategory] || []), created],
      }));
      toast.success("Đã thêm danh mục.");
      setFilterLabel("");
      setFilterValue("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFilterOption = async (key: CategoryKey, id: number) => {
    setSaving(true);
    try {
      await configApi.deleteCategoryOption(token, id);
      setCategoryOptions((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((o) => o.id !== id),
      }));
      toast.success("Đã xóa danh mục.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const addFormField = async () => {
    const label = fieldDraft.label.trim();
    const name = fieldDraft.name.trim() || label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

    if (!label || !name) {
      toast.error("Vui lòng nhập nhãn trường.");
      return;
    }

    setSaving(true);
    try {
      const created = await configApi.createRecruiterFormField(token, {
        ...fieldDraft,
        name,
        label,
        sortOrder: formFields.length,
      });
      setFormFields((prev) => [...prev, created]);
      toast.success("Đã thêm trường form.");
      setFieldDraft(emptyFieldDraft);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm trường form.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFormField = async (id: number) => {
    setSaving(true);
    try {
      await configApi.deleteRecruiterFormField(token, id);
      setFormFields((prev) => prev.filter((f) => f.id !== id));
      toast.success("Đã xóa trường form.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa trường form.");
    } finally {
      setSaving(false);
    }
  };

  const totalOptions = Object.values(categoryOptions).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý danh mục</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalOptions} danh mục, {formFields.length} trường form — dữ liệu từ backend
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="filters">
          <TabsList className="mb-4">
            <TabsTrigger value="filters">Bộ lọc tìm kiếm</TabsTrigger>
            <TabsTrigger value="verification">Form xác thực</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>Nhóm danh mục</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_KEYS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tên hiển thị</Label>
                <Input value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Giá trị</Label>
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Tự tạo nếu bỏ trống"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addFilterOption} disabled={saving}>
                  <Plus className="h-4 w-4" />
                  Thêm
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {CATEGORY_KEYS.map(({ key, label }) => (
                <div key={key} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{label}</h3>
                    <Badge variant="outline">{(categoryOptions[key] || []).length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {(categoryOptions[key] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có danh mục.</p>
                    ) : (
                      (categoryOptions[key] || []).map((option) => (
                        <div key={option.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                          <span className="text-sm">{option.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFilterOption(key, option.id)}
                            disabled={saving}
                            aria-label={`Xóa ${option.label}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr_120px_auto]">
              <div className="space-y-2">
                <Label>Nhãn trường</Label>
                <Input
                  value={fieldDraft.label}
                  onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })}
                  placeholder="Ví dụ: Website công ty"
                />
              </div>
              <div className="space-y-2">
                <Label>Tên trường</Label>
                <Input
                  value={fieldDraft.name}
                  onChange={(e) => setFieldDraft({ ...fieldDraft, name: e.target.value })}
                  placeholder="Tự tạo nếu bỏ trống"
                />
              </div>
              <div className="space-y-2">
                <Label>Kiểu</Label>
                <select
                  value={fieldDraft.type}
                  onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value as RecruiterFormField["type"] })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="TEXT">Text</option>
                  <option value="EMAIL">Email</option>
                  <option value="NUMBER">Number</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={fieldDraft.placeholder}
                  onChange={(e) => setFieldDraft({ ...fieldDraft, placeholder: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldDraft.required}
                    onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })}
                  />
                  Bắt buộc
                </label>
              </div>
              <div className="flex items-end">
                <Button onClick={addFormField} disabled={saving}>
                  <Plus className="h-4 w-4" />
                  Thêm
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trường</TableHead>
                  <TableHead>Tên lưu trữ</TableHead>
                  <TableHead>Kiểu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>{field.name}</TableCell>
                    <TableCell>{field.type}</TableCell>
                    <TableCell>
                      <Badge variant={field.required ? "default" : "outline"}>
                        {field.required ? "Bắt buộc" : "Không bắt buộc"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFormField(field.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-start gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
              <Building2 className="mt-0.5 h-4 w-4" />
              Các trường mới sẽ xuất hiện trong form yêu cầu xác thực ở trang chủ và được lưu vào phần dữ liệu bổ sung của yêu cầu.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
