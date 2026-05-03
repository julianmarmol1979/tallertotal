"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { agendaApi } from "@/lib/api";
import type { ServiceDocument } from "@/types/agenda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarClock, Upload, RefreshCw, Bell, Trash2,
  CheckCircle, AlertTriangle, Clock, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function urgencyClass(daysLeft: number | null): string {
  if (daysLeft === null) return "text-gray-400";
  if (daysLeft <= 0)  return "text-red-600 font-semibold";
  if (daysLeft <= 14) return "text-orange-500 font-semibold";
  if (daysLeft <= 30) return "text-amber-500";
  return "text-emerald-600";
}

function urgencyIcon(daysLeft: number | null) {
  if (daysLeft === null) return <Clock className="h-4 w-4 text-gray-300" />;
  if (daysLeft <= 0)  return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (daysLeft <= 30) return <Clock className="h-4 w-4 text-amber-500" />;
  return <CheckCircle className="h-4 w-4 text-emerald-500" />;
}

function daysLabel(daysLeft: number | null): string {
  if (daysLeft === null) return "Sin fecha";
  if (daysLeft <= 0)  return `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`;
  if (daysLeft === 0) return "Vence hoy";
  return `En ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [documents, setDocuments] = useState<ServiceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agendaApi.getDocuments();
      setDocuments(data);
    } catch {
      toast.error("No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se aceptan archivos PDF");
      return;
    }
    setUploading(true);
    try {
      await agendaApi.upload(file);
      toast.success("PDF subido correctamente");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ── Parse ───────────────────────────────────────────────────────────────────

  const handleParse = async (id: string) => {
    setParsing(id);
    try {
      const result = await agendaApi.parse(id);
      toast.success(`Análisis completado: ${result.entriesFound} servicio${result.entriesFound !== 1 ? "s" : ""} encontrado${result.entriesFound !== 1 ? "s" : ""}`);
      await load();
      setExpanded((prev) => new Set([...prev, id]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al analizar el PDF");
    } finally {
      setParsing(null);
    }
  };

  // ── Check alerts ────────────────────────────────────────────────────────────

  const handleCheckAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const result = await agendaApi.checkAlerts();
      toast.success(result.alertsSent > 0
        ? `${result.alertsSent} alerta${result.alertsSent !== 1 ? "s" : ""} enviada${result.alertsSent !== 1 ? "s" : ""}`
        : result.message ?? "No hay alertas pendientes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al verificar alertas");
    } finally {
      setCheckingAlerts(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      await agendaApi.deleteDocument(id);
      toast.success("Documento eliminado");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Error al eliminar el documento");
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const allEntries = documents.flatMap((d) => d.entries.filter((e) => e.isActive));
  const overdueCount  = allEntries.filter((e) => e.daysUntilDue !== null && e.daysUntilDue <= 0).length;
  const soonCount     = allEntries.filter((e) => e.daysUntilDue !== null && e.daysUntilDue > 0 && e.daysUntilDue <= 30).length;
  const okCount       = allEntries.filter((e) => e.daysUntilDue !== null && e.daysUntilDue > 30).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            Agenda de Servicios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Subí órdenes de servicio en PDF y recibí alertas automáticas
          </p>
        </div>
        <Button
          onClick={handleCheckAlerts}
          disabled={checkingAlerts || documents.length === 0}
          variant="outline"
          className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Bell className={`h-4 w-4 ${checkingAlerts ? "animate-pulse" : ""}`} />
          {checkingAlerts ? "Verificando..." : "Verificar alertas"}
        </Button>
      </div>

      {/* KPI cards */}
      {allEntries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Vencidos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Próximos 30 días</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{soonCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Al día</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{okCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Upload className={`h-8 w-8 mx-auto mb-3 ${dragging ? "text-blue-500" : "text-gray-300"}`} />
        <p className="text-sm font-medium text-gray-700">
          {uploading ? "Subiendo..." : "Arrastrá un PDF o hacé clic para seleccionar"}
        </p>
        <p className="text-xs text-gray-400 mt-1">Órdenes de servicio recibidas por email</p>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
      ) : documents.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          No hay documentos aún. Subí un PDF para comenzar.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const isExpanded = expanded.has(doc.id);
            const isParsing  = parsing === doc.id;

            return (
              <Card key={doc.id} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Subido el {new Date(doc.uploadedAt).toLocaleDateString("es-AR")}
                          {doc.vehicleLicensePlate && (
                            <span className="ml-2 font-mono font-medium text-gray-600">· {doc.vehicleLicensePlate}</span>
                          )}
                          {doc.vehicleDescription && (
                            <span className="ml-1 text-gray-500">— {doc.vehicleDescription}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Analizar / Re-analizar */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                        onClick={() => handleParse(doc.id)}
                        disabled={isParsing}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isParsing ? "animate-spin" : ""}`} />
                        {isParsing ? "Analizando..." : doc.parsedAt ? "Re-analizar" : "Analizar con IA"}
                      </Button>

                      {/* Ver entradas */}
                      {doc.entries.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-gray-500"
                          onClick={() => toggleExpanded(doc.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {doc.entries.length}
                        </Button>
                      )}

                      {/* Eliminar */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-300 hover:text-red-500"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Pending parse hint */}
                  {!doc.parsedAt && (
                    <p className="text-xs text-amber-600 mt-2 ml-8">
                      ⚡ Hacé clic en "Analizar con IA" para extraer los servicios automáticamente
                    </p>
                  )}
                </CardHeader>

                {/* Entries */}
                {isExpanded && doc.entries.length > 0 && (
                  <CardContent className="pt-0 pb-4">
                    <div className="mt-2 space-y-2 border-t pt-3">
                      {doc.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {urgencyIcon(entry.daysUntilDue)}
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {entry.serviceType}
                            </span>
                            {entry.intervalMonths && (
                              <span className="text-xs text-gray-400">cada {entry.intervalMonths} meses</span>
                            )}
                            {entry.intervalKm && (
                              <span className="text-xs text-gray-400">/ {entry.intervalKm.toLocaleString()} km</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs ${urgencyClass(entry.daysUntilDue)}`}>
                              {daysLabel(entry.daysUntilDue)}
                            </p>
                            {entry.nextDueDate && (
                              <p className="text-xs text-gray-400">
                                {new Date(entry.nextDueDate + "T00:00:00").toLocaleDateString("es-AR")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
