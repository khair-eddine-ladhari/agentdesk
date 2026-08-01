"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Upload, FileText, CheckCircle2, Loader2, XCircle, Sparkles } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const PURPLE = "#8A05FF";

const STATUS_CONFIG = {
  embedded: { label: "Embedded", icon: CheckCircle2, className: "text-black bg-gray-100" },
  pending: { label: "Processing", icon: Loader2, className: "text-amber-700 bg-amber-50" },
  failed: { label: "Failed", icon: XCircle, className: "text-red-700 bg-red-50" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = sessionStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DocumentsPage() {
  const { workspace } = useGlobalContext();
  const workspaceId = workspace?._id;

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [structuringId, setStructuringId] = useState(null);
  const [structureError, setStructureError] = useState(null);
  const [structuredNotes, setStructuredNotes] = useState({});
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await axios.get(`${API_URL}/workspaces/${workspaceId}/documents`, {
        headers: authHeaders(),
      });
      setDocuments(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleFiles(fileList) {
    if (!workspaceId) return;
    const files = Array.from(fileList);
    setUploadingCount((n) => n + files.length);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        await axios.post(`${API_URL}/workspaces/${workspaceId}/documents`, formData, {
          headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
        });
        await fetchDocuments();
      } catch (err) {
        console.error("Upload request failed:", err.response?.data?.error || err.message);
      } finally {
        setUploadingCount((n) => Math.max(0, n - 1));
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  async function handleStructure(docId) {
    if (!workspaceId) return;
    setStructuringId(docId);
    setStructureError(null);
    try {
      const res = await axios.post(
        `${API_URL}/workspaces/${workspaceId}/documents/${docId}/structure`,
        {},
        { headers: authHeaders() }
      );
      setStructuredNotes((prev) => ({ ...prev, [docId]: res.data.note }));
      setSelectedDoc(docId);
    } catch (err) {
      setStructureError(err.response?.data?.error || "Failed to structure document");
    } finally {
      setStructuringId(null);
    }
  }

  if (!workspaceId) {
    return (
      <AppShell title="Documents">
        <div className="mx-auto max-w-4xl bg-white min-h-screen p-6">
          <p className="text-sm text-gray-400">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Documents">
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between border-b border-gray-900 pb-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Documents
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                {isLoading
                  ? "Loading documents…"
                  : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
              </h1>
            </div>
          </div>

          {/* Upload dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-10 text-center transition-colors"
            style={
              isDragging
                ? { borderColor: PURPLE, backgroundColor: "#f4f0ff" }
                : { borderColor: "#e5e7eb", backgroundColor: "#fff" }
            }
          >
            <div
              className="flex h-10 w-10 items-center justify-center text-white"
              style={{ backgroundColor: PURPLE }}
            >
              <Upload size={18} />
            </div>
            <p className="text-sm font-medium text-black">
              {uploadingCount > 0
                ? `Uploading ${uploadingCount} file${uploadingCount === 1 ? "" : "s"}…`
                : "Drop files here, or click to browse"}
            </p>
            <p className="text-xs text-gray-400">TXT, MD, PDF, and DOCX supported</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </div>

          {structureError && <p className="text-xs text-red-600">{structureError}</p>}

          {/* Document list */}
          <div>
            {loadError && (
              <p className="mb-3 text-xs text-red-600">Couldn't load documents: {loadError}</p>
            )}

            <div className="divide-y divide-gray-100 border border-gray-200">
              {documents.map((doc) => {
                const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isExpanded = selectedDoc === doc._id;
                const note = structuredNotes[doc._id];

                return (
                  <div key={doc._id}>
                    <div className="flex w-full items-center justify-between gap-4 px-4 py-3.5 hover:bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(isExpanded ? null : doc._id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <FileText size={16} className="shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-gray-400">
                            {doc.fileType?.toUpperCase()}
                            {doc.createdAt
                              ? ` · ${new Date(doc.createdAt).toLocaleString()}`
                              : ""}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        {doc.status === "embedded" && (
                          <button
                            type="button"
                            onClick={() => handleStructure(doc._id)}
                            disabled={structuringId === doc._id}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                            style={{ backgroundColor: PURPLE }}
                          >
                            {structuringId === doc._id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Sparkles size={13} />
                            )}
                            {structuringId === doc._id ? "Structuring…" : "Structure this"}
                          </button>
                        )}

                        <span
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon
                            size={12}
                            className={doc.status === "pending" ? "animate-spin" : ""}
                          />
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                        {doc.status === "embedded" ? (
                          <>
                            <p className="mb-3 line-clamp-4 text-xs text-gray-500">
                              {doc.rawText
                                ? doc.rawText.slice(0, 400)
                                : "No preview text available."}
                            </p>

                            {note && (
                              <div className="space-y-3 border border-gray-200 bg-white p-3.5">
                                {note.key_points?.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-black">
                                      Key points
                                    </p>
                                    <ul className="space-y-1 text-xs text-gray-500">
                                      {note.key_points.map((point, i) => (
                                        <li key={i}>• {point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {note.action_items?.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-black">
                                      Action items
                                    </p>
                                    <ul className="space-y-1 text-xs text-gray-500">
                                      {note.action_items.map((item, i) => (
                                        <li key={i}>• {item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {note.mentioned_dates?.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-black">
                                      Dates mentioned
                                    </p>
                                    <ul className="space-y-1 text-xs text-gray-500">
                                      {note.mentioned_dates.map((date, i) => (
                                        <li key={i}>• {date}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {!note.key_points?.length &&
                                  !note.action_items?.length &&
                                  !note.mentioned_dates?.length && (
                                    <p className="text-xs text-gray-400">
                                      Nothing structured was found in this document.
                                    </p>
                                  )}
                              </div>
                            )}
                          </>
                        ) : doc.status === "pending" ? (
                          <p className="text-xs text-gray-400">
                            Still processing — this'll be searchable once embedding finishes.
                          </p>
                        ) : (
                          <p className="text-xs text-red-600">
                            {doc.note ||
                              "Couldn't process this file. Try re-uploading, or check that it isn't corrupted or password-protected."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}