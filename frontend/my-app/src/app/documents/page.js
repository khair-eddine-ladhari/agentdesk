"use client";

import { useState, useRef } from "react";
import AppShell from "@/components/AppShell";
import { Upload, FileText, CheckCircle2, Loader2, XCircle, Sparkles } from "lucide-react";

// Placeholder data — swap for real fetches later
const INITIAL_DOCUMENTS = [
  {
    id: "d1",
    name: "contract-notes.docx",
    status: "embedded",
    uploadedAt: "2 days ago",
    size: "48 KB",
  },
  {
    id: "d2",
    name: "standup-2026-07-25.txt",
    status: "embedded",
    uploadedAt: "1 hour ago",
    size: "4 KB",
  },
  {
    id: "d3",
    name: "vendor-agreement-draft.pdf",
    status: "pending",
    uploadedAt: "5 min ago",
    size: "212 KB",
  },
  {
    id: "d4",
    name: "old-scan-illegible.pdf",
    status: "failed",
    uploadedAt: "1 day ago",
    size: "1.1 MB",
  },
];

const STATUS_CONFIG = {
  embedded: { label: "Embedded", icon: CheckCircle2, className: "text-accent bg-accent-soft" },
  pending: { label: "Processing", icon: Loader2, className: "text-warn bg-warn-soft" },
  failed: { label: "Failed", icon: XCircle, className: "text-danger bg-danger-soft" },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  function handleFiles(fileList) {
    const files = Array.from(fileList);
    const newDocs = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: "pending",
      uploadedAt: "just now",
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));
    setDocuments((prev) => [...newDocs, ...prev]);
    // TODO: actually upload via POST /api/documents (FormData)
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function handleStructure(id) {
    // TODO: call POST /api/documents/:id/structure
    console.log("Structuring document", id);
  }

  return (
    <AppShell title="Documents">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Upload dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-10 text-center transition-colors ${
            isDragging ? "border-accent bg-accent-soft" : "border-border bg-surface"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-control bg-accent-soft text-accent">
            <Upload size={18} />
          </div>
          <p className="text-sm font-medium text-ink">
            Drop files here, or click to browse
          </p>
          <p className="text-xs text-muted">
            PDF, DOCX, and TXT supported
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          />
        </div>

        {/* Document list */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </h2>

          <div className="divide-y divide-border rounded-card border border-border bg-surface shadow-soft">
            {documents.map((doc) => {
              const status = STATUS_CONFIG[doc.status];
              const StatusIcon = status.icon;
              const isExpanded = selectedDoc === doc.id;

              return (
                <div key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(isExpanded ? null : doc.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={16} className="shrink-0 text-muted" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted">
                          {doc.size} · {doc.uploadedAt}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium ${status.className}`}
                    >
                      <StatusIcon
                        size={12}
                        className={doc.status === "pending" ? "animate-spin" : ""}
                      />
                      {status.label}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-bg px-4 py-4">
                      {doc.status === "embedded" ? (
                        <>
                          <p className="mb-3 text-xs text-muted">
                            Extracted text preview would go here — swap in a
                            real fetch of the document's parsed content.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleStructure(doc.id)}
                            className="flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                          >
                            <Sparkles size={13} />
                            Structure this
                          </button>
                        </>
                      ) : doc.status === "pending" ? (
                        <p className="text-xs text-muted">
                          Still processing — this'll be searchable once embedding finishes.
                        </p>
                      ) : (
                        <p className="text-xs text-danger">
                          Couldn't process this file. Try re-uploading, or check that it isn't corrupted or password-protected.
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
    </AppShell>
  );
}