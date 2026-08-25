import React from "react";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
        Total: {total} item{total === 1 ? "" : "s"}
      </p>
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 0.5rem",
            fontSize: "0.875rem",
          }}
        >
          Page {page} of {totalPages}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
