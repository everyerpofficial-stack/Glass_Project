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
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGQ } from "@/lib/store";
import { G, pingSheet } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, saveSettings } = useGQ();
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
    <div className="max-w-[1200px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
      {/* ---------- Top Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Application Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure company branding, document defaults, Google Sheets sync, and calculation presets
          </p>
        </div>

        <Button onClick={handleSubmit} size="sm" className="shadow-sm bg-primary text-primary-foreground font-semibold">
          <Save className="h-4 w-4 mr-1.5" /> Save All Settings
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="h-auto text-xs flex flex-wrap gap-1 p-1.5 w-full sm:w-auto sm:flex-nowrap sm:h-10 bg-white border border-border rounded-xl shadow-xs">
            <TabsTrigger value="company" className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs rounded-lg">
              <Building className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" /> Company
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs rounded-lg">
              <Calculator className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" /> Calculation
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs rounded-lg">
              <Landmark className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" /> Bank & Terms
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs rounded-lg">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 hidden sm:inline text-emerald-500" /> Sheet Sync
            </TabsTrigger>
          </TabsList>

          {/* ---------- Tab 1: Company Profile ---------- */}
          <TabsContent value="company">
            <Card className="bg-white border border-border rounded-xl shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Company Profile & Branding</CardTitle>
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
                      <img src={form.logo} alt="Logo preview" className="h-9 w-auto max-w-[160px] object-contain bg-white border border-border rounded p-1" />
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
                <CardTitle className="text-base font-semibold">Calculation Engine Presets</CardTitle>
                <CardDescription className="text-xs">
                  Choose default pricing formulas and unit conversion modes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      form.preset === "anand" ? "border-primary bg-primary/5 shadow-md" : "border-border/60 hover:border-primary/40"
                    }`}
                    onClick={() => handleApplyPreset("anand")}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Anand Lamps Preset</span>
                      {form.preset === "anand" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate unit: <strong className="text-foreground">Sq.Mtr (₹807/sqm)</strong>. Rounding: Exact MM. Wastage: 10% cutting.
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      form.preset === "krishna" ? "border-primary bg-primary/5 shadow-md" : "border-border/60 hover:border-primary/40"
                    }`}
                    onClick={() => handleApplyPreset("krishna")}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Krishna Glass Preset</span>
                      {form.preset === "krishna" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate unit: <strong className="text-foreground">Sq.Ft (₹69/sqft)</strong>. Chargeable inch offset (+1 inch).
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
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Google Apps Script Integration
                </CardTitle>
                <CardDescription className="text-xs">
                  Connect your web app directly to your Google Sheets backend via Web App URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <Label className="text-xs">Google Apps Script Web App URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      className="h-9 text-xs font-mono flex-1"
                      value={form.sheetUrl || ""}
                      onChange={(e) => handleChange("sheetUrl", e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handlePing} disabled={pinging}>
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
                    Deploy your Google Apps Script as a Web App with access set to "Anyone" and paste the URL above.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="sm" className="shadow-sm bg-primary text-primary-foreground font-semibold w-full sm:w-auto">
            <Save className="h-4 w-4 mr-1.5" /> Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
