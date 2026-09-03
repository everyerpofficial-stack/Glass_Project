import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  HardDrive,
  Database,
  Cpu,
  Terminal,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { pingSheet } from "@/lib/gq";
import GlassTests from "@/lib/tests.js";
import { toast } from "sonner";

export const Route = createFileRoute("/checks")({
  component: SystemChecksPage,
});

function SystemChecksPage() {
  const { settings, invoices, customers } = useGQ();
  const [testSuiteResults, setTestSuiteResults] = useState<any>(null);
  const [pinging, setPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const runTests = () => {
    try {
      if (GlassTests && typeof GlassTests.run === "function") {
        const res = GlassTests.run();
        setTestSuiteResults(res);
        if (res.passed === res.total) {
          toast.success(
            `100% Passed! (${res.passed}/${res.total} calculation engine checks verified)`,
          );
        } else {
          toast.error(`${res.total - res.passed} engine checks failed!`);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run test suite: " + err.message);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const handlePingSheet = () => {
    if (!settings.sheetUrl) {
      toast.error("Please add your Google Apps Script URL in Settings first");
      return;
    }
    setPinging(true);
    setPingStatus(null);
    pingSheet(settings.sheetUrl)
      .then((res) => {
        setPinging(false);
        setPingStatus(
          `Ping Success! Status: ${res.status || "OK"} (Version: ${res.version || "1.0"})`,
        );
        toast.success("Google Apps Script connection verified successfully!");
      })
      .catch((err) => {
        setPinging(false);
        setPingStatus(`Ping Failed: ${err.message}`);
        toast.error("Apps Script connection error: " + err.message);
      });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ---------- Top Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" /> Calculation Engine & System Checks
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Validate formula precision, run unit test verification, and test Apps Script backend
            connectivity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runTests} className="shadow-sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-Run Engine Tests
          </Button>
        </div>
      </div>

      {/* ---------- Test Suite Summary Banner ----------
           The heading was the literal string "100% OPERATIONAL" and the banner
           was always green, so a failing calculation engine still reported
           itself healthy on the one page whose job is to say otherwise. */}
      {testSuiteResults &&
        (() => {
          const failedCount = Number(testSuiteResults.total) - Number(testSuiteResults.passed);
          const allPassed = failedCount === 0 && Number(testSuiteResults.total) > 0;
          return (
            <Card
              className={
                allPassed
                  ? "border border-emerald-500/30 bg-emerald-500/5 shadow-md"
                  : "border border-red-500/40 bg-red-500/5 shadow-md"
              }
            >
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      allPassed
                        ? "rounded-full bg-emerald-500/20 p-2.5 text-emerald-600"
                        : "rounded-full bg-red-500/20 p-2.5 text-red-600"
                    }
                  >
                    {allPassed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {allPassed
                        ? "Calculation Engine Status: 100% OPERATIONAL"
                        : `Calculation Engine Status: ${failedCount} CHECK${failedCount === 1 ? "" : "S"} FAILING`}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {allPassed
                        ? `${testSuiteResults.passed} of ${testSuiteResults.total} automated checks passed with 0 formula deviations`
                        : `${testSuiteResults.passed} of ${testSuiteResults.total} automated checks passed. Do not rely on printed figures until this is resolved.`}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    allPassed
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-mono text-xs"
                      : "bg-red-500/10 text-red-600 border-red-500/30 font-mono text-xs"
                  }
                >
                  {testSuiteResults.passed} / {testSuiteResults.total} PASSED
                </Badge>
              </CardHeader>
            </Card>
          );
        })()}

      {/* ---------- Test Details Table & System Status ---------- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Test Suite Results List */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/20 border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" /> Formula Verification Trajectory
              </CardTitle>
              <CardDescription className="text-xs">
                Live checks against sample PI-1828, PI-1813, Krishna sqft & inch-fraction parser
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              GlassCalc v1.0
            </Badge>
          </CardHeader>
          <CardContent className="p-0 max-h-[460px] overflow-y-auto">
            {testSuiteResults?.results ? (
              <div className="divide-y divide-border/40 text-xs">
                {testSuiteResults.results.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.pass ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs text-foreground truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                      <span className="text-muted-foreground">got={String(r.got)}</span>
                      <Badge
                        variant="outline"
                        className={
                          r.pass
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                            : "bg-red-500/10 text-red-600 border-red-500/20 text-[10px]"
                        }
                      >
                        {r.pass ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Running test suite...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend & Local System Diagnostic Widgets */}
        <div className="space-y-6">
          {/* Apps Script Connection Widget */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Google Apps Script Sync Test
              </CardTitle>
              <CardDescription className="text-xs">
                Test backend endpoint responsiveness
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 font-mono text-[11px] truncate">
                {settings.sheetUrl ? settings.sheetUrl : "Sheet URL not configured"}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={handlePingSheet}
                disabled={pinging || !settings.sheetUrl}
              >
                {pinging ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Pinging Sheet...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Test Ping Apps Script
                  </>
                )}
              </Button>

              {pingStatus && (
                <div className="p-2.5 rounded-lg bg-background border border-border/60 font-mono text-[11px] text-foreground">
                  {pingStatus}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Browser Storage Diagnostic Widget */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-indigo-500" /> Local Storage Health
              </CardTitle>
              <CardDescription className="text-xs">Persisted browser data stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Saved Quotation Records:</span>
                <span className="font-mono font-semibold">{invoices.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Saved Customer Profiles:</span>
                <span className="font-mono font-semibold">{customers.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Active Preset:</span>
                <span className="font-mono font-semibold uppercase">{settings.preset}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
