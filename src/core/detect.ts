import { CORNERS, quarterRect } from "./blob/quarters.ts";
import { isRectTransparent, type RgbaImage } from "./image/rgba.ts";
import { TEMPLATES } from "./templates/index.ts";
import type { Template, TemplateId } from "./templates/types.ts";

export type IssueLevel = "error" | "warning" | "info";

export interface Issue {
  readonly level: IssueLevel;
  readonly code: "unknown-size" | "size-mismatch" | "tile-too-small" | "odd-tile-size" | "empty-slot" | "oversized";
  readonly message: string;
}

export interface SourceAnalysis {
  readonly template: Template | null;
  readonly tileSize: number | null;
  readonly issues: readonly Issue[];
}

/** Guesses the template from the image's aspect ratio (5×3 vs 2×3 tiles). */
export function detectTemplate(width: number, height: number): Template | null {
  if (width <= 0 || height <= 0) return null;
  const exact = TEMPLATES.find((t) => width * t.rows === height * t.columns);
  if (exact) return exact;
  // not an exact ratio: pick the closest one so we can explain how to fix the image
  let best: Template | null = null;
  let bestErr = Number.POSITIVE_INFINITY;
  for (const t of TEMPLATES) {
    const err = Math.abs(width / height - t.columns / t.rows);
    if (err < bestErr) [best, bestErr] = [t, err];
  }
  return bestErr < 0.2 ? best : null;
}

/**
 * Works out template and tile size for a source image and reports problems. `templateId` / `tileSize` override the
 * detection when given.
 */
export function analyzeSource(img: RgbaImage, templateId?: TemplateId, tileSize?: number): SourceAnalysis {
  const issues: Issue[] = [];
  const template = templateId
    ? (TEMPLATES.find((t) => t.id === templateId) ?? null)
    : detectTemplate(img.width, img.height);
  if (!template) {
    issues.push({
      level: "error",
      code: "unknown-size",
      message: `Can't tell the template from a ${img.width}×${img.height} image. Use 5×3 tiles (Autotiler 13-tile) or 2×3 tiles (RPG Maker A2).`,
    });
    return { template: null, tileSize: null, issues };
  }

  let ts = tileSize ?? null;
  if (ts === null) {
    const tw = img.width / template.columns;
    const th = img.height / template.rows;
    if (Number.isInteger(tw) && tw === th) {
      ts = tw;
    } else {
      const guess = Math.floor(Math.min(tw, th));
      issues.push({
        level: "error",
        code: "size-mismatch",
        message:
          `A ${template.name} image must be ${template.columns}×${template.rows} tiles, but ${img.width}×${img.height} isn't.` +
          (guess >= 2
            ? ` For ${guess} px tiles, crop it to ${guess * template.columns}×${guess * template.rows} or set the tile size.`
            : ""),
      });
      return { template, tileSize: null, issues };
    }
  }

  if (ts < 2) {
    issues.push({ level: "error", code: "tile-too-small", message: `Tile size must be at least 2 px (got ${ts}).` });
    return { template, tileSize: null, issues };
  }
  if (img.width < template.columns * ts || img.height < template.rows * ts) {
    issues.push({
      level: "error",
      code: "size-mismatch",
      message: `At ${ts} px a ${template.name} image needs ${template.columns * ts}×${template.rows * ts} px; this one is ${img.width}×${img.height}.`,
    });
    return { template, tileSize: null, issues };
  }
  if (img.width > template.columns * ts || img.height > template.rows * ts) {
    issues.push({
      level: "info",
      code: "oversized",
      message: `Only the top-left ${template.columns * ts}×${template.rows * ts} px are used.`,
    });
  }
  if (ts % 2 !== 0) {
    issues.push({
      level: "warning",
      code: "odd-tile-size",
      message: `${ts} px is odd: quarters split unevenly, and the dual-grid layout needs an even size.`,
    });
  }

  for (const slot of template.slots) {
    if (!slot.used) continue;
    const quarters = CORNERS.filter((c) => template.pieceAt(slot.tx, slot.ty, c) !== null);
    const empty = quarters.every((c) => {
      const r = quarterRect(ts, c);
      return isRectTransparent(img, slot.tx * ts + r.x, slot.ty * ts + r.y, r.w, r.h);
    });
    if (quarters.length > 0 && empty) {
      issues.push({
        level: "warning",
        code: "empty-slot",
        message: `The ${slot.label} slot (column ${slot.tx + 1}, row ${slot.ty + 1}) is empty.`,
      });
    }
  }
  return { template, tileSize: ts, issues };
}
