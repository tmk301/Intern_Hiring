import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const CATEGORY_KEYS: { key: CategoryKey; labelKey: string }[] = [
  { key: "CITIES", labelKey: "jobs.filters.city" },
  { key: "WORK_MODES", labelKey: "jobs.filters.workMode" },
  { key: "JOB_TYPES", labelKey: "jobs.filters.jobType" },
  { key: "DISTRICTS", labelKey: "jobs.filters.district" },
  { key: "WARDS", labelKey: "jobs.filters.ward" },
  { key: "COMPANIES", labelKey: "jobs.filters.company" },
  { key: "CURRENCIES", labelKey: "jobs.filters.currency" },
];

const emptyFieldDraft = {
  name: "",
  label: "",
  validationRegex: "",
  placeholder: "",
  required: true,
  sortOrder: 0,
  active: true,
};

export function CategoryManagementPanel({ token }: CategoryManagementPanelProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("CITIES");
  const [categoryOptions, setCategoryOptions] = useState<Record<string, CategoryOption[]>>({});
  const [formFields, setFormFields] = useState<RecruiterFormField[]>([]);
  const [filterLabel, setFilterLabel] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [fieldDraft, setFieldDraft] = useState(emptyFieldDraft);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
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
      toast.error(error instanceof Error ? error.message : t("admin.categories.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addFilterOption = async () => {
    const label = filterLabel.trim();
    const value = filterValue.trim() || label.toLowerCase().replace(/\s+/g, "-");

    if (!label || !value) {
      toast.error(t("admin.categories.missingOption"));
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
      toast.success(t("admin.categories.addOptionSuccess"));
      setFilterLabel("");
      setFilterValue("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.categories.addOptionError"));
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
      toast.success(t("admin.categories.deleteOptionSuccess"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.categories.deleteOptionError"));
    } finally {
      setSaving(false);
    }
  };

  const addFormField = async () => {
    const label = fieldDraft.label.trim();
    const name = fieldDraft.name.trim() || label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

    if (!label || !name) {
      toast.error(t("admin.categories.missingField"));
      return;
    }

    const validationRegex = fieldDraft.validationRegex.trim();
    if (validationRegex) {
      try {
        new RegExp(validationRegex);
      } catch {
        toast.error(t("admin.categories.invalidRegex"));
        return;
      }
    }

    setSaving(true);
    try {
      const created = await configApi.createRecruiterFormField(token, {
        ...fieldDraft,
        name,
        label,
        validationRegex,
        sortOrder: formFields.length,
      });
      setFormFields((prev) => [...prev, created]);
      toast.success(t("admin.categories.addFieldSuccess"));
      setFieldDraft(emptyFieldDraft);
      setIsFieldDialogOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.categories.addFieldError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteFormField = async (id: number) => {
    setSaving(true);
    try {
      await configApi.deleteRecruiterFormField(token, id);
      setFormFields((prev) => prev.filter((f) => f.id !== id));
      toast.success(t("admin.categories.deleteFieldSuccess"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.categories.deleteFieldError"));
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
        <CardTitle>{t("admin.categories.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("admin.categories.summary", { options: totalOptions, fields: formFields.length })}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="filters">
          <TabsList className="mb-4">
            <TabsTrigger value="filters">{t("admin.categories.filtersTab")}</TabsTrigger>
            <TabsTrigger value="verification">{t("admin.categories.verificationTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>{t("admin.categories.categoryGroup")}</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_KEYS.map(({ key, labelKey }) => (
                    <option key={key} value={key}>{t(labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.categories.displayName")}</Label>
                <Input value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.categories.value")}</Label>
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={t("admin.categories.autoValuePlaceholder")}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addFilterOption} disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {CATEGORY_KEYS.map(({ key, labelKey }) => (
                <div key={key} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{t(labelKey)}</h3>
                    <Badge variant="outline">{(categoryOptions[key] || []).length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {(categoryOptions[key] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.categories.empty")}</p>
                    ) : (
                      (categoryOptions[key] || []).map((option) => (
                        <div key={option.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                          <span className="text-sm">{option.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFilterOption(key, option.id)}
                            disabled={saving}
                            aria-label={t("admin.categories.deleteOptionAria", { label: option.label })}
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
            <div className="flex justify-end">
              <Button onClick={() => setIsFieldDialogOpen(true)} disabled={saving}>
                <Plus className="h-4 w-4" />
                {t("admin.categories.addField")}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.categories.fieldLabel")}</TableHead>
                  <TableHead>{t("admin.categories.storageName")}</TableHead>
                  <TableHead>{t("admin.categories.validationRegex")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>{field.name}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs">
                      {field.validationRegex || t("admin.categories.noRegex")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.required ? "default" : "outline"}>
                        {field.required ? t("common.required") : t("common.optional")}
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
              {t("admin.categories.newFieldsHint")}
            </div>

            <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.categories.addFieldDialogTitle")}</DialogTitle>
                  <DialogDescription>{t("admin.categories.addFieldDialogDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("admin.categories.fieldLabel")}</Label>
                    <Input
                      value={fieldDraft.label}
                      onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })}
                      placeholder={t("admin.categories.fieldLabelPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.categories.fieldName")}</Label>
                    <Input
                      value={fieldDraft.name}
                      onChange={(e) => setFieldDraft({ ...fieldDraft, name: e.target.value })}
                      placeholder={t("admin.categories.autoValuePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.categories.placeholder")}</Label>
                    <Input
                      value={fieldDraft.placeholder}
                      onChange={(e) => setFieldDraft({ ...fieldDraft, placeholder: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.categories.validationRegex")}</Label>
                    <Input
                      value={fieldDraft.validationRegex}
                      onChange={(e) => setFieldDraft({ ...fieldDraft, validationRegex: e.target.value })}
                      placeholder={t("admin.categories.regexPlaceholder")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("admin.categories.regexHint")}
                    </p>
                  </div>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fieldDraft.required}
                      onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })}
                    />
                    {t("common.required")}
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFieldDraft(emptyFieldDraft);
                      setIsFieldDialogOpen(false);
                    }}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={addFormField} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("common.add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
