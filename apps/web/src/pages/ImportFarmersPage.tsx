import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMODITIES, GENDER_OPTIONS, GHANA_REGIONS } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { SelectField } from "../components/fields/SelectField";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { submitFarmersBulk } from "../lib/offline/sync";
import {
  SHEET_FIELD_OPTIONS,
  autoMapColumns,
  detectHeaderRowIndex,
  downloadFarmerImportTemplate,
  extractFarmersFromSheet,
  extractPreambleDefaults,
  parseCommoditiesValue,
  parseDelimitedText,
  parseSpreadsheetFile,
  summarizeFarmerCompleteness,
  type ExtractedFarmerRow,
  type ParsedSheetTab,
  type SheetBatchDefaults,
  type SheetTargetField,
} from "../lib/sheet-import";
import { buildPrimaryCommodities } from "./farmer-form/commodities";
import type { FarmerFormData } from "./farmer-form/types";
import { sanitizePhoneInput } from "../lib/form-validation";

export function ImportFarmersPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { refreshPending } = useOfflineSyncContext();
  const { showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceName, setSourceName] = useState("");
  const [tabs, setTabs] = useState<ParsedSheetTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [columnMappings, setColumnMappings] = useState<SheetTargetField[]>([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);

  const [batchDefaults, setBatchDefaults] = useState<SheetBatchDefaults>({
    community: "",
    district: "",
    region: "",
    commodity: "",
  });

  const [rows, setRows] = useState<ExtractedFarmerRow[]>([]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const activeTab = tabs[activeTabIndex] ?? null;

  function initializeFromTab(
    tab: ParsedSheetTab,
    existingDefaults?: SheetBatchDefaults
  ) {
    const detectedHeader = detectHeaderRowIndex(tab.rows);
    const mappings = autoMapColumns(tab.rows, detectedHeader);
    const preamble = extractPreambleDefaults(tab.rows, detectedHeader);

    const nextDefaults: SheetBatchDefaults = {
      community: preamble.community || existingDefaults?.community || "",
      district: preamble.district || existingDefaults?.district || "",
      region: preamble.region || existingDefaults?.region || "",
      commodity: preamble.commodity || existingDefaults?.commodity || "",
    };

    setHeaderRowIndex(detectedHeader);
    setColumnMappings(mappings);
    setBatchDefaults(nextDefaults);

    const extracted = extractFarmersFromSheet(
      tab.rows,
      detectedHeader,
      mappings,
      nextDefaults
    );
    setRows(extracted);

    // Automatically open column mapping if full_name wasn't matched
    const hasNameColumn = mappings.some(
      (m) => m === "full_name" || m === "first_name" || m === "last_name"
    );
    setShowColumnMapping(!hasNameColumn);
  }

  async function handleFileSelected(file: File) {
    setParsing(true);
    setError("");
    try {
      const parsedTabs = await parseSpreadsheetFile(file);
      setSourceName(file.name);
      setTabs(parsedTabs);
      setActiveTabIndex(0);
      initializeFromTab(parsedTabs[0], batchDefaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the uploaded sheet.");
    } finally {
      setParsing(false);
    }
  }

  function handleExtractPastedText() {
    if (!pastedText.trim()) {
      setError("Paste table rows from Excel, Word, or CSV first.");
      return;
    }
    setError("");
    const parsedRows = parseDelimitedText(pastedText);
    if (parsedRows.length < 2) {
      setError("Please include a header row and at least one farmer row.");
      return;
    }
    const tab: ParsedSheetTab = { name: "Pasted Table", rows: parsedRows };
    setSourceName("Pasted Table");
    setTabs([tab]);
    setActiveTabIndex(0);
    setPasteMode(false);
    initializeFromTab(tab, batchDefaults);
  }

  function handleTabChange(nextTabIndex: number) {
    const tab = tabs[nextTabIndex];
    if (!tab) return;
    setActiveTabIndex(nextTabIndex);
    initializeFromTab(tab, batchDefaults);
  }

  function handleHeaderRowChange(nextHeaderIndex: number) {
    if (!activeTab) return;
    const mappings = autoMapColumns(activeTab.rows, nextHeaderIndex);
    setHeaderRowIndex(nextHeaderIndex);
    setColumnMappings(mappings);
    setRows(
      extractFarmersFromSheet(
        activeTab.rows,
        nextHeaderIndex,
        mappings,
        batchDefaults
      )
    );
  }

  function handleColumnMappingChange(colIdx: number, target: SheetTargetField) {
    if (!activeTab) return;
    const nextMappings = [...columnMappings];
    nextMappings[colIdx] = target;
    setColumnMappings(nextMappings);
    setRows(
      extractFarmersFromSheet(
        activeTab.rows,
        headerRowIndex,
        nextMappings,
        batchDefaults
      )
    );
  }

  function handleBatchDefaultChange(field: keyof SheetBatchDefaults, value: string) {
    const nextDefaults = { ...batchDefaults, [field]: value };
    setBatchDefaults(nextDefaults);
    if (!activeTab) return;
    setRows(
      extractFarmersFromSheet(
        activeTab.rows,
        headerRowIndex,
        columnMappings,
        nextDefaults
      )
    );
  }

  function updateRowFormField(rowId: string, field: keyof FarmerFormData, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let nextForm: FarmerFormData;
        if (field === "other_commodity") {
          const parsedCrops = parseCommoditiesValue(value);
          nextForm = {
            ...row.form,
            primary_crops: parsedCrops.primary_crops,
            other_commodity_enabled: parsedCrops.other_commodity_enabled,
            other_commodity: parsedCrops.other_commodity,
          };
        } else {
          nextForm = { ...row.form, [field]: value };
        }
        const { extractedCount, missingOptionalLabels } =
          summarizeFarmerCompleteness(nextForm);
        return {
          ...row,
          selected: row.selected || Boolean(nextForm.full_name.trim()),
          form: nextForm,
          extractedCount,
          missingOptionalLabels,
        };
      })
    );
  }

  function toggleRowSelection(rowId: string, checked: boolean) {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, selected: checked } : row))
    );
  }

  function toggleSelectAll(checked: boolean) {
    setRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  }

  const stats = useMemo(() => {
    const selected = rows.filter((r) => r.selected);
    const missingName = selected.filter((r) => !r.form.full_name.trim()).length;
    const missingCommunity = selected.filter((r) => !r.form.community.trim()).length;
    const mappedColumnsCount = columnMappings.filter((m) => m !== "ignore").length;
    return {
      total: rows.length,
      selectedCount: selected.length,
      missingName,
      missingCommunity,
      mappedColumnsCount,
    };
  }, [rows, columnMappings]);

  async function handleBulkImport() {
    if (!user) return;
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setError("Select at least one farmer row to import.");
      return;
    }

    const unnamedCount = selectedRows.filter((r) => !r.form.full_name.trim()).length;
    if (unnamedCount > 0) {
      setError(
        `${unnamedCount} selected row${unnamedCount === 1 ? " is" : "s are"} missing a Full Name. Please enter a name or uncheck ${unnamedCount === 1 ? "that row" : "those rows"}.`
      );
      return;
    }

    setImporting(true);
    setError("");

    try {
      const forms = selectedRows.map((r) => r.form);
      const result = await submitFarmersBulk(user.id, forms);
      await refreshPending();

      if (result.status === "queued") {
        showSuccess(
          "Sheet Queued Offline",
          `${result.count} farmer${result.count === 1 ? "" : "s"} saved to your device and will sync automatically. You can update missing details anytime.`
        );
      } else {
        const conflictNote =
          result.conflictsCount > 0
            ? ` (${result.conflictsCount} duplicate flag${result.conflictsCount === 1 ? "" : "s"} noted for review)`
            : "";
        showSuccess(
          "Farmers Imported",
          `${result.count} farmer${result.count === 1 ? "" : "s"} added from sheet${conflictNote}. Missing fields can be updated anytime.`
        );
      }

      navigate("/farmers");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not import farmers from sheet. Please try again."
      );
    } finally {
      setImporting(false);
    }
  }

  function handleOpenInSingleForm(row: ExtractedFarmerRow) {
    navigate("/farmers/new", {
      state: {
        prefillForm: row.form,
        fromSheetName: sourceName,
      },
    });
  }

  if (!user) return null;

  const headerRowCells = activeTab?.rows[headerRowIndex] ?? [];
  const sampleDataRow = activeTab?.rows[headerRowIndex + 1] ?? [];
  const headerRowOptions = (activeTab?.rows.slice(0, 15) ?? []).map((r, idx) => {
    const preview = r
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(" | ");
    return {
      value: String(idx),
      label: `Row ${idx + 1}: ${preview ? preview.slice(0, 60) : "(empty)"}`,
    };
  });

  return (
    <main className="main main--dashboard">
      <BackButton to="/farmers" />

      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Upload Farmer Sheet</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Extract farmers from an Excel (.xlsx) or CSV sheet to match the Farmer Form. Any missing fields can be added or updated later.
          </p>
        </div>
        <div className="reports-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadFarmerImportTemplate}
          >
            Download Template (.csv)
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setPasteMode((v) => !v)}
          >
            {pasteMode ? "Upload File Instead" : "Paste Table"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--color-danger)", padding: "1rem 1.25rem" }}>
          <p className="error" style={{ margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* ── Upload / Paste Card ── */}
      <section className="card">
        {!pasteMode ? (
          <div
            className={`sheet-dropzone${dragActive ? " sheet-dropzone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.tsv,.xls,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.target.value = "";
              }}
            />

            <div className="sheet-dropzone__icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>

            <div className="sheet-dropzone__content">
              <p className="sheet-dropzone__title">
                {sourceName
                  ? `Loaded: ${sourceName} (${rows.length} farmer${rows.length === 1 ? "" : "s"} extracted)`
                  : "Upload your farmer registration sheet"}
              </p>
              <p className="muted" style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.875rem" }}>
                Supports Excel workbooks (<strong>.xlsx</strong>), CSV (<strong>.csv</strong>), TSV, or exported HTML/XML sheets (<strong>.xls</strong>).
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
              >
                {parsing
                  ? "Reading sheet…"
                  : sourceName
                    ? "Choose Another Sheet"
                    : "Select Sheet File"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="card-title" style={{ marginTop: 0 }}>
              Paste Table from Excel, Word, or PDF
            </h3>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.875rem" }}>
              Copy the table (including the column header row) from Excel, Word, Google Sheets, or a PDF and paste it below.
            </p>
            <div className="form-group">
              <label htmlFor="paste-sheet-input" className="sr-only">
                Paste table data
              </label>
              <textarea
                id="paste-sheet-input"
                rows={6}
                placeholder={"Full Name\tGender\tAge\tCommunity\tMobile\tCommodities\nAbdulai Mohammed\tM\t42\tKpalsi\t0244123456\tMaize, Soya"}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPasteMode(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExtractPastedText}
              >
                Extract Table
              </button>
            </div>
          </div>
        )}
      </section>

      {activeTab && (
        <>
          {/* ── Sheet Settings, Batch Defaults & Column Mapping ── */}
          <section className="card">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Field Mapping & Defaults for Missing Data
                </h3>
                <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
                  {stats.mappedColumnsCount} of {columnMappings.length} columns auto-matched to Farmer Form fields. Set defaults below if the sheet omits location or crop columns.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowColumnMapping((v) => !v)}
              >
                {showColumnMapping ? "Hide Column Mapping" : "Adjust Column Mapping"}
              </button>
            </div>

            {tabs.length > 1 || activeTab.rows.length > 1 ? (
              <div className="form-grid form-grid--2" style={{ marginBottom: "1rem" }}>
                {tabs.length > 1 && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="sheet-tab-select">Worksheet tab</label>
                    <SelectField
                      id="sheet-tab-select"
                      value={String(activeTabIndex)}
                      onChange={(v) => handleTabChange(parseInt(v, 10))}
                      options={tabs.map((t, i) => ({
                        value: String(i),
                        label: `${t.name} (${t.rows.length} rows)`,
                      }))}
                    />
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="sheet-header-row-select">Table header row</label>
                  <SelectField
                    id="sheet-header-row-select"
                    value={String(headerRowIndex)}
                    onChange={(v) => handleHeaderRowChange(parseInt(v, 10))}
                    options={headerRowOptions}
                  />
                </div>
              </div>
            ) : null}

            <div className="form-grid">
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="default-community">
                  Default Community / Village <span className="optional">(used when blank)</span>
                </label>
                <input
                  id="default-community"
                  placeholder="e.g. Kpalsi"
                  value={batchDefaults.community}
                  onChange={(e) => handleBatchDefaultChange("community", e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="default-district">
                  Default District <span className="optional">(used when blank)</span>
                </label>
                <input
                  id="default-district"
                  placeholder="e.g. Sagnarigu"
                  value={batchDefaults.district}
                  onChange={(e) => handleBatchDefaultChange("district", e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="default-region">
                  Default Region <span className="optional">(used when blank)</span>
                </label>
                <SelectField
                  id="default-region"
                  value={batchDefaults.region}
                  onChange={(val) => handleBatchDefaultChange("region", val)}
                  placeholder="Select region"
                  options={[
                    { value: "", label: "None" },
                    ...GHANA_REGIONS.map((r) => ({ value: r, label: r })),
                  ]}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="default-commodity">
                  Default Commodity <span className="optional">(used when blank)</span>
                </label>
                <SelectField
                  id="default-commodity"
                  value={batchDefaults.commodity}
                  onChange={(val) => handleBatchDefaultChange("commodity", val)}
                  placeholder="Select commodity"
                  options={[
                    { value: "", label: "None" },
                    ...COMMODITIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            </div>

            {showColumnMapping && (
              <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-border)" }}>
                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem" }}>
                  Map Sheet Columns to Farmer Form Fields
                </h4>
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Sheet Column Header</th>
                        <th>Sample Value (First Row)</th>
                        <th>Maps to Farmer Form Field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnMappings.map((mappedField, colIdx) => {
                        const headerLabel =
                          headerRowCells[colIdx]?.trim() || `Column ${colIdx + 1}`;
                        const sampleVal = sampleDataRow[colIdx]?.trim() || "—";
                        return (
                          <tr key={colIdx}>
                            <td>
                              <strong>{headerLabel}</strong>
                            </td>
                            <td className="muted">{sampleVal}</td>
                            <td style={{ minWidth: "240px" }}>
                              <SelectField
                                id={`col-map-${colIdx}`}
                                variant="compact"
                                value={mappedField}
                                onChange={(val) =>
                                  handleColumnMappingChange(colIdx, val as SheetTargetField)
                                }
                                options={SHEET_FIELD_OPTIONS}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Extracted Farmers Review Table ── */}
          <section className="card">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Extracted Farmers ({stats.selectedCount} of {stats.total} selected)
                </h3>
                <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
                  Review or edit extracted values below. Missing fields (Ghana Card, photos, bank details, GPS boundary, etc.) can be added or updated later from each farmer&apos;s profile.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={importing || stats.selectedCount === 0}
                  onClick={() => void handleBulkImport()}
                >
                  {importing
                    ? "Importing Farmers…"
                    : `Import ${stats.selectedCount} Farmer${stats.selectedCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>

            {stats.missingCommunity > 0 && (
              <p
                className="muted"
                style={{
                  margin: "0 0 1rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-accent-soft)",
                  fontSize: "0.875rem",
                }}
              >
                <strong>Tip:</strong> {stats.missingCommunity} selected farmer
                {stats.missingCommunity === 1 ? " does" : "s do"} not have a Community / Village specified yet. You can set a <strong>Default Community</strong> above, type it below, or leave it blank and update it later.
              </p>
            )}

            {rows.length > 0 ? (
              <div className="table-scroll">
                <table className="table sheet-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          aria-label="Select all extracted farmers"
                          checked={rows.length > 0 && stats.selectedCount === rows.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th style={{ width: "52px" }}>Row</th>
                      <th style={{ minWidth: "180px" }}>Full Name *</th>
                      <th style={{ minWidth: "140px" }}>Community</th>
                      <th style={{ minWidth: "130px" }}>District</th>
                      <th style={{ minWidth: "145px" }}>Region</th>
                      <th style={{ minWidth: "105px" }}>Gender</th>
                      <th style={{ width: "80px" }}>Age</th>
                      <th style={{ minWidth: "130px" }}>Mobile</th>
                      <th style={{ minWidth: "155px" }}>Ghana Card</th>
                      <th style={{ minWidth: "150px" }}>Commodities</th>
                      <th style={{ minWidth: "130px" }}>Extracted Data</th>
                      <th style={{ minWidth: "120px" }}>Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const commoditiesText = buildPrimaryCommodities(row.form).join(", ");
                      const nameMissing = !row.form.full_name.trim();
                      return (
                        <tr
                          key={row.id}
                          style={{ opacity: row.selected ? 1 : 0.55 }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select row ${row.sourceRowNumber}`}
                              checked={row.selected}
                              onChange={(e) => toggleRowSelection(row.id, e.target.checked)}
                            />
                          </td>
                          <td className="muted">#{row.sourceRowNumber}</td>
                          <td>
                            <input
                              type="text"
                              className="sheet-cell-input"
                              placeholder="Full name required"
                              value={row.form.full_name}
                              style={
                                nameMissing
                                  ? { borderColor: "var(--color-danger)" }
                                  : undefined
                              }
                              onChange={(e) =>
                                updateRowFormField(row.id, "full_name", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="sheet-cell-input"
                              placeholder="Add now or later"
                              value={row.form.community}
                              onChange={(e) =>
                                updateRowFormField(row.id, "community", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="sheet-cell-input"
                              placeholder="Optional"
                              value={row.form.district}
                              onChange={(e) =>
                                updateRowFormField(row.id, "district", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="sheet-cell-input"
                              value={row.form.region}
                              onChange={(e) =>
                                updateRowFormField(row.id, "region", e.target.value)
                              }
                            >
                              <option value="">—</option>
                              {GHANA_REGIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="sheet-cell-input"
                              value={row.form.gender}
                              onChange={(e) =>
                                updateRowFormField(row.id, "gender", e.target.value)
                              }
                            >
                              <option value="">—</option>
                              {GENDER_OPTIONS.map((g) => (
                                <option key={g.value} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              className="sheet-cell-input"
                              placeholder="—"
                              value={row.form.age}
                              onChange={(e) =>
                                updateRowFormField(row.id, "age", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="tel"
                              className="sheet-cell-input"
                              placeholder="Optional"
                              value={row.form.phone}
                              onChange={(e) =>
                                updateRowFormField(row.id, "phone", sanitizePhoneInput(e.target.value))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="sheet-cell-input"
                              placeholder="Optional"
                              value={row.form.ghana_card}
                              onChange={(e) =>
                                updateRowFormField(row.id, "ghana_card", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="sheet-cell-input"
                              placeholder="e.g. Maize, Soya"
                              value={commoditiesText}
                              onChange={(e) =>
                                updateRowFormField(row.id, "other_commodity", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <span
                              className="sync-badge sync-badge--synced"
                              title={
                                row.missingOptionalLabels.length > 0
                                  ? `Can be added later: ${row.missingOptionalLabels.join(", ")}`
                                  : "All main fields present"
                              }
                            >
                              {row.extractedCount} field{row.extractedCount === 1 ? "" : "s"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", minHeight: "32px" }}
                              onClick={() => handleOpenInSingleForm(row)}
                            >
                              Open in Form
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No farmer rows were detected under the selected header row. Try selecting a different header row or adjusting the column mapping above.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

