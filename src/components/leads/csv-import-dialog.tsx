"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, FileText, CheckCircle2, Download } from "lucide-react";
import type { Pipeline } from "@/types";

const FIELD_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "source", label: "Source" },
  { value: "stage", label: "Stage" },
  { value: "owner", label: "Owner" },
  { value: "formName", label: "Form" },
  { value: "metadata", label: "Keep as metadata" },
  { value: "skip", label: "Skip" },
];

// Common column name auto-detection
const AUTO_MAP: Record<string, string> = {
  name: "name", "full name": "name", fullname: "name",
  phone: "phone", "phone number": "phone", mobile: "phone",
  email: "email", "email address": "email",
  source: "source",
  stage: "stage",
  form: "formName", "form name": "formName",
  owner: "owner", "assigned to": "owner", "assignee": "owner",
  // Columns that don't match a core field get kept as metadata
  channel: "metadata", labels: "metadata",
  "whatsapp number": "metadata", "secondary phone": "metadata",
  "secondary phone number": "metadata",
};

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: Pipeline[];
  onImported: () => void;
}

export function CSVImportDialog({ open, onOpenChange, pipelines, onImported }: CSVImportDialogProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "result">("upload");
  const [pipelineId, setPipelineId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setColumnMap({});
    setResult(null);
    setShowSkipped(false);
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;

      const hdrs = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
      setHeaders(hdrs);

      // Auto-detect column mapping — unknown columns default to metadata, not skip
      const map: Record<number, string> = {};
      hdrs.forEach((h, i) => {
        const key = h.toLowerCase().trim();
        if (AUTO_MAP[key]) map[i] = AUTO_MAP[key];
        else map[i] = "metadata";
      });
      setColumnMap(map);

      // Preview first 5 rows
      const previewRows = lines.slice(1, 6).map((line) =>
        line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
      );
      setPreview(previewRows);
      setStep("mapping");
    };
    reader.readAsText(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) {
      const input = document.createElement("input");
      input.type = "file";
      const dt = new DataTransfer();
      dt.items.add(f);
      // Trigger the same flow
      setFile(f);
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) return;
        const hdrs = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
        setHeaders(hdrs);
        const map: Record<number, string> = {};
        hdrs.forEach((h, i) => {
          const key = h.toLowerCase().trim();
          if (AUTO_MAP[key]) map[i] = AUTO_MAP[key];
          else map[i] = "metadata";
        });
        setColumnMap(map);
        const previewRows = lines.slice(1, 6).map((line) =>
          line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
        );
        setPreview(previewRows);
        setStep("mapping");
      };
      reader.readAsText(f);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (pipelineId) formData.append("pipelineId", pipelineId);
      formData.append("columnMap", JSON.stringify(columnMap));

      const res = await fetch("/api/leads/import", { method: "POST", body: formData });
      const d = await res.json();
      if (d.success) {
        setResult(d.data);
        setStep("result");
        onImported();
      } else {
        setResult({ imported: 0, skipped: 0, errors: [{ row: 0, reason: d.error?.message || "Import failed" }] });
        setStep("result");
      }
    } finally {
      setImporting(false);
    }
  }

  const hasMappedName = Object.values(columnMap).includes("name");
  const hasMappedPhone = Object.values(columnMap).includes("phone");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file and select a pipeline."}
            {step === "mapping" && "Map CSV columns to lead fields. Preview your first 5 rows."}
            {step === "result" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div>
              <Select value={pipelineId || "auto"} onValueChange={(v) => setPipelineId(v === "auto" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (route by form)</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {pipelineId ? "All leads will go to this pipeline regardless of form." : "Leads will be routed to pipelines based on their form mapping."}
              </p>
            </div>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? (
                  <span className="flex items-center justify-center gap-2"><FileText className="w-4 h-4" />{file.name}</span>
                ) : (
                  "Drag & drop a CSV file, or click to browse"
                )}
              </p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            {/* Column mapping grid */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 sticky top-0 z-10">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">CSV Column</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Map To</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Sample</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {headers.map((header, i) => (
                    <tr key={i} className={columnMap[i] && columnMap[i] !== "skip" ? "bg-green-500/5" : ""}>
                      <td className="px-3 py-1.5">
                        <span className="font-mono truncate block max-w-44" title={header}>{header}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <Select value={columnMap[i] || "skip"} onValueChange={(v) => setColumnMap({ ...columnMap, [i]: v })}>
                          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground truncate max-w-40">
                        {preview[0]?.[i] || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {preview.length} row{preview.length !== 1 ? "s" : ""} previewed &middot; Mapped: {Object.values(columnMap).filter((v) => v !== "skip" && v !== "metadata").length} of {headers.length} columns &middot; {Object.values(columnMap).filter((v) => v === "metadata").length} kept as metadata
            </p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">{result.imported} leads imported</p>
                {result.skipped > 0 && <p className="text-xs text-muted-foreground">{result.skipped} skipped (duplicate or missing data)</p>}
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => setShowSkipped(!showSkipped)}
                >
                  {showSkipped ? "Hide" : "Show"} {result.errors.length} skipped row{result.errors.length !== 1 ? "s" : ""}
                </button>
                {showSkipped && (
                  <>
                    <div className="border rounded-md max-h-48 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50 sticky top-0">
                            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Row</th>
                            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.errors.map((err, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 tabular-nums">{err.row}</td>
                              <td className="px-3 py-1.5 text-destructive">{err.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const csv = "Row,Reason\n" + result.errors.map((e) => `${e.row},"${e.reason.replace(/"/g, '""')}"`).join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "skipped-leads.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export skipped rows
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          )}
          {step === "mapping" && (() => {
            const issues: string[] = [];
            if (!hasMappedName) issues.push("Map a Name column");
            if (!hasMappedPhone) issues.push("Map a Phone column");
            if (!pipelineId && !Object.values(columnMap).includes("formName")) issues.push("Select a pipeline or map a Form column");
            const canImport = issues.length === 0;

            return (
              <>
                {!canImport && (
                  <p className="text-xs text-destructive mr-auto self-center">{issues.join(" · ")}</p>
                )}
                <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); }}>Back</Button>
                <Button onClick={handleImport} disabled={importing || !canImport}>
                  {importing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Import
                </Button>
              </>
            );
          })()}
          {step === "result" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
