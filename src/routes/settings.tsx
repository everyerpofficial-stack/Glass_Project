import { createFileRoute } from "@tanstack/react-router";
import {
  Settings,
  Building,
  Save,
  FileSpreadsheet,
  Zap,
  CheckCircle2,
  Calculator,
  Landmark,
  FileText,
  RefreshCw,
  Sparkles,
  Download,
  Upload,
  Database,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileActionBar } from "@/components/app/MobileRecord";
import { useGQ } from "@/lib/store";
import { G, pingSheet } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const {
    settings,
    saveSettings,
    loadFromSheet,
    pushAllToSheet,
    sheetSyncing,
    invoices,
    customers,
    workOrders,
    payments,
    clearAllData,
  } = useGQ();
  const [form, setForm] = useState<any>(() => ({ ...settings }));
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleChange = (field: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleApplyPreset = (presetName: "anand" | "krishna") => {
    const preset = G.PRESETS[presetName];
    if (preset) {
      setForm((prev: any) => ({
        ...prev,
        preset: presetName,
        ...preset,
      }));
      toast.success(`Applied ${presetName.toUpperCase()} calculation preset`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(form);
  };

  const handlePing = () => {
    if (!form.sheetUrl) {
      toast.error("Please enter a Google Apps Script URL first");
      return;
    }
    setPinging(true);
    pingSheet(form.sheetUrl)
      .then((res) => {
        setPinging(false);
        toast.success("Apps Script connection verified! Status: " + (res.status || "OK"));
      })
      .catch((err) => {
        setPinging(false);
        toast.error("Failed to connect: " + err.message);
      });
  };

  return (
    <div className="w-full space-y-5 px-3 pt-4 pb-24 sm:space-y-6 sm:px-6 sm:pt-6 md:pb-12 lg:px-8">
      {/* ---------- Top Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Application Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure company branding, document defaults, Google Sheets sync, and calculation
            presets
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          size="sm"
          className="hidden shadow-sm bg-primary text-primary-foreground font-semibold sm:inline-flex"
        >
          <Save className="h-4 w-4 mr-1.5" /> Save All Settings
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="h-auto text-xs flex w-full gap-1 overflow-x-auto hide-scrollbar p-1.5 sm:w-auto sm:h-10 bg-white border border-border rounded-xl shadow-xs">
            <TabsTrigger
              value="company"
              className="shrink-0 px-3 sm:px-4 py-2 sm:py-1.5 text-xs rounded-lg"
            >
              <Building className="h-3.5 w-3.5 mr-1.5" /> Company
            </TabsTrigger>
            <TabsTrigger
              value="presets"
              className="shrink-0 px-3 sm:px-4 py-2 sm:py-1.5 text-xs rounded-lg"
            >
              <Calculator className="h-3.5 w-3.5 mr-1.5" /> Calculation
            </TabsTrigger>
            <TabsTrigger
              value="bank"
              className="shrink-0 px-3 sm:px-4 py-2 sm:py-1.5 text-xs rounded-lg"
            >
              <Landmark className="h-3.5 w-3.5 mr-1.5" /> Bank & Terms
            </TabsTrigger>
            <TabsTrigger
              value="sync"
              className="shrink-0 px-3 sm:px-4 py-2 sm:py-1.5 text-xs rounded-lg"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Sheet Sync
            </TabsTrigger>
            <TabsTrigger
              value="reset"
              className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 sm:py-1.5 text-xs rounded-lg text-rose-600 font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> Clear & Reset Data
            </TabsTrigger>
          </TabsList>

          {/* ---------- Tab 1: Company Profile ---------- */}
          <TabsContent value="company">
            <Card className="bg-white border border-border rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Company Profile & Branding
                </CardTitle>
                <CardDescription className="text-xs">
                  Details shown on generated proforma invoices and quotations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Company Name *</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.coName || ""}
                      onChange={(e) => handleChange("coName", e.target.value)}
                      placeholder="e.g. Glass Quote India Ltd"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Document Title</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.title || ""}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="PROFORMA INVOICE"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <Label className="text-xs">Company Logo Path / URL</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.logo || ""}
                      onChange={(e) => handleChange("logo", e.target.value)}
                      placeholder="/logo.png"
                    />
                  </div>
                  {form.logo && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      <img
                        src={form.logo}
                        alt="Logo preview"
                        className="h-9 w-auto max-w-[160px] object-contain bg-white border border-border rounded p-1"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Company Address</Label>
                  <Textarea
                    className="text-xs"
                    rows={3}
                    value={form.addr || ""}
                    onChange={(e) => handleChange("addr", e.target.value)}
                    placeholder="Street, Industrial Estate, City, State, Pincode"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+91..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="info@company.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GSTIN Number</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.gstin || ""}
                      onChange={(e) => handleChange("gstin", e.target.value)}
                      placeholder="08AACCH4208C1Z3"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">CIN Number</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.pan || ""}
                      onChange={(e) => handleChange("pan", e.target.value)}
                      placeholder="U26109RJ2010PTC031953"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Invoice Prefix</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.prefix || "PI-"}
                      onChange={(e) => handleChange("prefix", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Next Invoice No</Label>
                    <Input
                      type="number"
                      className="h-9 text-xs font-mono"
                      value={form.nextNo || 1001}
                      onChange={(e) => handleChange("nextNo", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Currency Symbol</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.currency || "₹"}
                      onChange={(e) => handleChange("currency", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Tab 2: Presets & Calculation ---------- */}
          <TabsContent value="presets">
            <Card className="bg-white border border-border rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Calculation Engine Presets
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose default pricing formulas and unit conversion modes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      form.preset === "anand"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                    onClick={() => handleApplyPreset("anand")}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Anand Lamps Preset</span>
                      {form.preset === "anand" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate unit: <strong className="text-foreground">Sq.Mtr (₹807/sqm)</strong>.
                      Rounding: Exact MM. Wastage: 10% cutting.
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      form.preset === "krishna"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                    onClick={() => handleApplyPreset("krishna")}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Krishna Glass Preset</span>
                      {form.preset === "krishna" && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate unit: <strong className="text-foreground">Sq.Ft (₹69/sqft)</strong>.
                      Chargeable inch offset (+1 inch).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                  <div>
                    <Label className="text-xs">Rate Unit</Label>
                    <Select
                      value={form.rateUnit || "sqm"}
                      onValueChange={(val) => handleChange("rateUnit", val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqm">Sq.Mtr (₹/sqm)</SelectItem>
                        <SelectItem value="sqft">Sq.Ft (₹/sqft)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Default Wastage Mode</Label>
                    <Select
                      value={form.wastageMode || "none"}
                      onValueChange={(val) => handleChange("wastageMode", val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percent">Percentage %</SelectItem>
                        <SelectItem value="manual">Manual Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Default Admin Charge (₹)</Label>
                    <Input
                      type="number"
                      className="h-9 text-xs"
                      value={form.adminCharge ?? 50}
                      onChange={(e) => handleChange("adminCharge", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Tab 3: Bank & Terms ---------- */}
          <TabsContent value="bank">
            <Card className="bg-white border border-border rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Bank Details & Terms</CardTitle>
                <CardDescription className="text-xs">
                  Payment instructions and standard commercial terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Bank Name</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.bankName || ""}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Account Number</Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={form.bankAcc || ""}
                      onChange={(e) => handleChange("bankAcc", e.target.value)}
                      placeholder="Account Number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">IFSC Code</Label>
                    <Input
                      className="h-9 text-xs font-mono uppercase"
                      value={form.bankIfsc || ""}
                      onChange={(e) => handleChange("bankIfsc", e.target.value)}
                      placeholder="HDFC0001234"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Branch Name</Label>
                    <Input
                      className="h-9 text-xs"
                      value={form.bankBranch || ""}
                      onChange={(e) => handleChange("bankBranch", e.target.value)}
                      placeholder="Branch name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Standard Terms & Conditions (One per line)</Label>
                  <Textarea
                    className="text-xs font-mono leading-relaxed"
                    rows={8}
                    value={form.terms || ""}
                    onChange={(e) => handleChange("terms", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Tab 4: Google Sheets Sync ---------- */}
          <TabsContent value="sync">
            <Card className="bg-white border border-border rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Google Apps Script
                  Integration
                </CardTitle>
                <CardDescription className="text-xs">
                  Connect your web app directly to your Google Sheets backend via Web App URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div>
                  <Label className="text-xs">Google Apps Script Web App URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      className="h-9 text-xs font-mono flex-1"
                      value={form.sheetUrl || ""}
                      onChange={(e) => handleChange("sheetUrl", e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePing}
                      disabled={pinging}
                    >
                      {pinging ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" /> Test Ping
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Deploy your Google Apps Script as a Web App with access set to "Anyone" and
                    paste the URL above.
                  </p>
                </div>

                {/* ── Two-Way Sync Actions ── */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" /> Two-Way Database Sync
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Sync data between your browser's local storage and Google Sheets database.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-semibold">Pull from Google Sheet</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Download all records from Google Sheets and merge into your local data.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={() => loadFromSheet()}
                        disabled={sheetSyncing || !form.sheetUrl}
                      >
                        {sheetSyncing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Pull Data from Sheet
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-semibold">Push All to Google Sheet</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Upload all local data to Google Sheets (creates/updates records).
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={pushAllToSheet}
                        disabled={sheetSyncing || !form.sheetUrl}
                      >
                        {sheetSyncing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        Push All Data to Sheet
                      </Button>
                    </div>
                  </div>

                  {/* Current data counts */}
                  <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Local Data Summary
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoices:</span>
                        <span className="font-mono font-semibold">{invoices.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customers:</span>
                        <span className="font-mono font-semibold">{customers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Work Orders:</span>
                        <span className="font-mono font-semibold">{workOrders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payments:</span>
                        <span className="font-mono font-semibold">{payments.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Tab 5: Clear & Reset Data ---------- */}
          <TabsContent value="reset" className="space-y-6">
            <Card className="border-rose-200 dark:border-rose-900/50 shadow-sm">
              <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40">
                <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" /> Total Data Clear & Database
                  Reset
                </CardTitle>
                <CardDescription className="text-xs text-rose-600/80">
                  Wipe all stored invoices, quotes, customers, work orders, and payment history from
                  the website local storage and Google Sheet database.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1: Clear Local Only */}
                  <div className="rounded-xl border border-border p-4 bg-background space-y-3 flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                        <Trash2 className="h-4 w-4" /> 1. Clear Website Local Data
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Deletes all records stored locally in your browser (localStorage). Does not
                        touch your connected Google Sheet.
                      </p>
                    </div>
                    <ConfirmDelete
                      title="Clear Website Local Data?"
                      description="Are you sure you want to delete all invoices, customers, work orders, and payment records saved locally in this browser? This action cannot be undone."
                      confirmLabel="Clear Local Data"
                      onConfirm={() => clearAllData({ clearLocal: true, clearSheet: false })}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold text-amber-600 border-amber-300 hover:bg-amber-50 gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear Website Local Data
                      </Button>
                    </ConfirmDelete>
                  </div>

                  {/* Option 2: Clear Sheet Only */}
                  <div className="rounded-xl border border-border p-4 bg-background space-y-3 flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                        <Database className="h-4 w-4" /> 2. Clear Google Sheet Database
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Wipes all data rows across your Google Sheet tables (Invoices, Customers,
                        WorkOrders, Payments).
                      </p>
                    </div>
                    <ConfirmDelete
                      title="Clear Google Sheet Database?"
                      description="Are you sure you want to erase all data rows from your connected Google Sheet database? Header rows will be preserved."
                      confirmLabel="Wipe Sheet Database"
                      onConfirm={() => clearAllData({ clearLocal: false, clearSheet: true })}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 gap-1.5"
                        disabled={!form.sheetUrl || sheetSyncing}
                      >
                        <Database className="h-3.5 w-3.5" /> Clear Sheet Database
                      </Button>
                    </ConfirmDelete>
                  </div>

                  {/* Option 3: Total Master Clear */}
                  <div className="rounded-xl border-2 border-rose-500/40 p-4 bg-rose-500/5 space-y-3 flex flex-col justify-between shadow-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold text-sm">
                        <AlertTriangle className="h-4 w-4 text-rose-600" /> 3. Total Master Clear
                      </div>
                      <p className="text-xs text-rose-700/80 dark:text-rose-300/80 font-medium leading-relaxed">
                        Wipes EVERYTHING: erases all data from both your local website browser
                        storage AND your connected Google Sheet database.
                      </p>
                    </div>
                    <ConfirmDelete
                      title="⚠️ TOTAL MASTER CLEAR (Website + Database)?"
                      description="DANGER: This will permanently delete ALL invoices, proforma quotes, customers, work orders, and payment records from BOTH the local website AND the Google Sheet database. This action is completely irreversible."
                      confirmLabel="TOTAL CLEAR EVERYTHING"
                      onConfirm={() => clearAllData({ clearLocal: true, clearSheet: true })}
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="w-full text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                        disabled={sheetSyncing}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> TOTAL CLEAR (Website + Database)
                      </Button>
                    </ConfirmDelete>
                  </div>
                </div>

                {/* Data Counter Card */}
                <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Current Database Record Count</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Real-time store snapshot
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-background border border-border/60 flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Invoices & PIs:</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {invoices.length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border/60 flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Customers:</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {customers.length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border/60 flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Work Orders:</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {workOrders.length}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border/60 flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Payments:</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {payments.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="hidden justify-end pt-4 sm:flex">
          <Button
            type="submit"
            size="sm"
            className="shadow-sm bg-primary text-primary-foreground font-semibold w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save All Settings
          </Button>
        </div>

        {/* Phone: one Save for the whole page, following the user down it */}
        <MobileActionBar label="Settings" value={settings.coName || "Your company"}>
          <Button
            type="submit"
            className="h-10 gap-2 px-4 font-bold bg-primary text-primary-foreground"
          >
            <Save className="h-4 w-4" /> Save all
          </Button>
        </MobileActionBar>
      </form>
    </div>
  );
}
