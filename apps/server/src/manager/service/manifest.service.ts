import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import { v4 as uuidv4 } from 'uuid';
import { FileEntity } from '#LocalProject/Entities';
import axios from 'axios';
import FormData from 'form-data';
import * as path from 'path';
import mammoth from 'mammoth';
import * as fs from 'fs';
import { AsposeService } from './aspose.service';


// Dynamic import for pdfjs-dist to avoid import issues
let pdfjs: any = null;

// Hàm mới sử dụng OCR.space API
async function extractTextWithOcrSpace(fileBuffer: Buffer, apiKey: string): Promise<string> {
  try {
    console.log('[OCR] Starting OCR extraction...');
    console.log('[OCR] Buffer size:', fileBuffer.length, 'bytes');

    // Check file size - OCR.space free API has 1MB limit
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    console.log('[OCR] File size in MB:', fileSizeMB.toFixed(2));

    let form: FormData;
    if (fileSizeMB > 1) {
      console.warn('[OCR] File is too large for free OCR.space API (>1MB). Trying with compression...');

      // Try to compress the PDF or use a different approach
      // For now, we'll try with a different OCR engine that might handle larger files
      form = new FormData();
      form.append('apikey', apiKey);
      form.append('isOverlayRequired', 'false');
      form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
      form.append('language', 'eng');
      form.append('OCREngine', '1'); // Try engine 1 which might be more lenient
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');

      console.log('[OCR] Trying with OCR engine 1 for large file...');
    } else {
      form = new FormData();
      form.append('apikey', apiKey);
      form.append('isOverlayRequired', 'false');
      form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
      form.append('language', 'eng');
      form.append('OCREngine', '2'); // Use more accurate OCR engine
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');

      console.log('[OCR] Sending request to OCR.space API...');
    }

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 minute timeout for large files
    });

    console.log('[OCR] Response received, status:', response.status);
    console.log('[OCR] Response data keys:', Object.keys(response.data || {}));

    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      const extractedText = response.data.ParsedResults.map((result: any) => result.ParsedText).join('\n');
      console.log('[OCR] Text extracted successfully, length:', extractedText.length);
      console.log('[OCR] First 200 chars:', extractedText.substring(0, 200));
      return extractedText;
    } else {
      console.warn('[OCR] No parsed results found in response');
      console.log('[OCR] Full response:', JSON.stringify(response.data, null, 2));

      // If file is too large, provide a helpful error message
      if (fileSizeMB > 1) {
        throw new Error(`File is too large (${fileSizeMB.toFixed(2)}MB) for OCR processing. Please try a smaller file or use a PDF with selectable text.`);
      }

      return '';
    }
  } catch (error: any) {
    console.error('[OCR] OCR.space API error:', error?.response ? error.response.data : error?.message || error);
    if (error?.response) {
      console.error('[OCR] Response status:', error.response.status);
      console.error('[OCR] Response data:', error.response.data);
    }
    throw new Error('Failed to extract text using OCR service: ' + (error?.message || error));
  }
}

// OCR.space with overlay (bounding boxes)
async function extractOverlayWithOcrSpace(fileBuffer: Buffer, apiKey: string): Promise<{
  items: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  }[];
}> {
  try {
    const form = new FormData();
    form.append('apikey', apiKey);
    form.append('isOverlayRequired', 'true');
    form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
    form.append('language', 'eng');
    form.append('OCREngine', '2');
    form.append('scale', 'true');
    form.append('detectOrientation', 'true');

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
      timeout: 180000,
    });

    const items: any[] = [];
    if (response.data && Array.isArray(response.data.ParsedResults)) {
      for (let idx = 0; idx < response.data.ParsedResults.length; idx++) {
        const pr = response.data.ParsedResults[idx];
        const pageNum = Number(pr.Page) || idx + 1;
        const overlay = pr.TextOverlay;
        if (overlay && overlay.Lines && Array.isArray(overlay.Lines)) {
          for (const line of overlay.Lines) {
            if (!line || !Array.isArray(line.Words)) continue;
            for (const w of line.Words) {
              const text: string = (w.WordText || '').trim();
              if (!text) continue;
              const x = Number(w.Left) || 0;
              const y = Number(w.Top) || 0;
              const width = Number(w.Width) || Math.max(5, text.length * 5);
              const height = Number(w.Height) || 10;
              items.push({ text, x, y, width, height, page: pageNum });
            }
          }
        }
      }
    }

    return { items };
  } catch (error: any) {
    console.error('[OCR] OCR.space overlay API error:', error?.response ? error.response.data : error?.message || error);
    throw new Error('Failed to extract overlay using OCR service: ' + (error?.message || error));
  }
}

function groupTextByLine(items: any[], yThreshold = 8) {
  if (!items.length) {
    return [];
  }

  // Prepare angle bucket (0, 90, 180, 270) for each item if available
  for (const it of items) {
    if (typeof it.angle === 'number') {
      const a = ((Math.round(it.angle / 90) * 90) % 360 + 360) % 360; // snap to nearest 90
      it.angleBucket = a;
    } else {
      it.angleBucket = 0;
    }
  }

  // Helper to get median
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  // Sort by page, then angle bucket to keep orientations separate
  items.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.angleBucket !== b.angleBucket) return a.angleBucket - b.angleBucket;
    return 0;
  });

  // Group by page then by angle bucket
  const itemsByPage = new Map<number, Map<number, any[]>>();
  for (const it of items) {
    const p = it.page || 1;
    const a = it.angleBucket || 0;
    if (!itemsByPage.has(p)) itemsByPage.set(p, new Map());
    const byAngle = itemsByPage.get(p)!;
    if (!byAngle.has(a)) byAngle.set(a, []);
    byAngle.get(a)!.push(it);
  }

  const lines: any[][] = [];

  for (const [page, byAngle] of Array.from(itemsByPage.entries()).sort((a, b) => a[0] - b[0])) {
    for (const [angleBucket, pageItemsRaw] of Array.from(byAngle.entries()).sort((a, b) => a[0] - b[0])) {
      const pageItems = [...pageItemsRaw];
      const vertical = angleBucket === 90 || angleBucket === 270;

      // Sort to detect columns: use x when horizontal, use y when vertical text
      pageItems.sort((a: any, b: any) => (vertical ? a.y - b.y : a.x - b.x));

      const baseMeasure = (i: any) => (vertical ? (i.height || 0) : (i.width || 0)) || Math.max(1, i.text?.length || 1);
      const widths = pageItems.map(baseMeasure);
      const medianWidth = Math.max(2, median(widths));
      const columnGapThreshold = medianWidth * 1.5;

      // --- Lightweight XY-cut block segmentation (separate main body vs sidebars/notes) ---
      // Heuristics-driven thresholds
      const heights = pageItems.map((i: any) => i.height || i.fontSize || 10);
      const medianHeight = Math.max(6, median(heights));
      const blockGapX = medianWidth * 4;   // large horizontal whitespace indicates a vertical cut
      const blockGapY = medianHeight * 3;  // large vertical whitespace indicates a horizontal cut

      // Build blocks by proximity and whitespace gaps
      type Block = { items: any[]; minX: number; maxX: number; minY: number; maxY: number };
      const blocks: Block[] = [];

      const sortedForBlocks = [...pageItems].sort((a: any, b: any) => (a.y === b.y ? a.x - b.x : a.y - b.y));
      for (const it of sortedForBlocks) {
        let assigned = false;
        for (const blk of blocks) {
          const horizGap = Math.max(0, Math.max(blk.minX, it.x) - Math.min(blk.maxX, (it.x || 0) + (it.width || 0)));
          const vertGap = Math.max(0, Math.max(blk.minY, it.y) - Math.min(blk.maxY, (it.y || 0) + (it.height || 0)));
          const overlapsX = horizGap < blockGapX; // enough closeness on X
          const overlapsY = vertGap < blockGapY;  // enough closeness on Y
          if (overlapsX && overlapsY) {
            blk.items.push(it);
            blk.minX = Math.min(blk.minX, it.x);
            blk.maxX = Math.max(blk.maxX, (it.x || 0) + (it.width || 0));
            blk.minY = Math.min(blk.minY, it.y);
            blk.maxY = Math.max(blk.maxY, (it.y || 0) + (it.height || 0));
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          blocks.push({
            items: [it],
            minX: it.x,
            maxX: (it.x || 0) + (it.width || 0),
            minY: it.y,
            maxY: (it.y || 0) + (it.height || 0),
          });
        }
      }

      // Order blocks in reading order: left-to-right, then top-to-bottom
      blocks.sort((a: any, b: any) => (Math.abs(a.minX - b.minX) > columnGapThreshold ? a.minX - b.minX : a.minY - b.minY));

      // Process each block independently with column detection and line grouping
      for (const blk of blocks) {
        const blockItems = blk.items.sort((a: any, b: any) => (vertical ? a.y - b.y : a.x - b.x));

        // Detect table-like blocks: many items with recurring aligned x and y positions
        const xCenters = blockItems.map((it: any) => it.x + (it.width || 0) / 2).sort((a: number, b: number) => a - b);
        const yCenters = blockItems.map((it: any) => it.y + (it.height || 0) / 2).sort((a: number, b: number) => a - b);
        const cluster = (vals: number[], gap: number) => {
          const groups: number[][] = [];
          let current: number[] = [];
          for (let i = 0; i < vals.length; i++) {
            if (current.length === 0) { current.push(vals[i]); continue; }
            if (Math.abs(vals[i] - current[current.length - 1]) <= gap) current.push(vals[i]); else { groups.push(current); current = [vals[i]]; }
          }
          if (current.length) groups.push(current);
          return groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);
        };
        const xClusterCenters = cluster(xCenters, medianWidth);
        const yClusterCenters = cluster(yCenters, medianHeight * 0.8);

        const isTableBlock = xClusterCenters.length >= 3 && yClusterCenters.length >= 3 && blockItems.length >= 12;

        if (isTableBlock) {
          // Group items into rows by nearest y cluster, then sort each row by x
          const rowsMap = new Map<number, any[]>();
          for (const it of blockItems) {
            const centerY = it.y + (it.height || 0) / 2;
            let bestIdx = 0; let bestDist = Infinity;
            for (let i = 0; i < yClusterCenters.length; i++) {
              const d = Math.abs(centerY - yClusterCenters[i]);
              if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            if (!rowsMap.has(bestIdx)) rowsMap.set(bestIdx, []);
            rowsMap.get(bestIdx)!.push(it);
          }
          const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);
          for (const rk of sortedRowKeys) {
            const rowItems = rowsMap.get(rk)!.sort((a: any, b: any) => a.x - b.x);
            if (rowItems.length === 0) continue;
            const line = [...rowItems];
            line.sort((a: any, b: any) => a.x - b.x);
            lines.push(line.map((t: any) => ({ ...t, page, angleBucket })));
          }
          // Move to next block; skip column logic for table-like block
          continue;
        }

        // Build columns by large gaps between boxes (swap axes if vertical)
        const columns: any[][] = [];
        let currentCol: any[] = [];
        let lastEdge = -Infinity;
        for (const it of blockItems) {
          const lead = vertical ? it.y : it.x;
          const tail = vertical ? (it.y || 0) + (it.height || 0) : (it.x || 0) + (it.width || 0);
          if (currentCol.length === 0) {
            currentCol.push(it);
            lastEdge = tail;
            continue;
          }
          const gap = lead - lastEdge;
          if (gap > columnGapThreshold) {
            columns.push(currentCol);
            currentCol = [it];
          } else {
            currentCol.push(it);
          }
          lastEdge = Math.max(lastEdge, tail);
        }
        if (currentCol.length) columns.push(currentCol);

        // Normalize columns order by their average X (or Y if vertical)
        const colsWithPos = columns.map((col) => ({
          avg: col.reduce((s, i) => s + (vertical ? i.x : i.x), 0) / Math.max(1, col.length),
          items: col,
        }));
        colsWithPos.sort((a, b) => a.avg - b.avg);

        // For each column, group into lines by proximity perpendicular to column flow
        for (const col of colsWithPos) {
          // Sort by Y (horizontal text) or by X (vertical text)
          col.items.sort((a: any, b: any) => {
            if (vertical) {
              return Math.abs(a.x - b.x) > yThreshold ? a.x - b.x : a.y - b.y;
            }
            return Math.abs(a.y - b.y) > yThreshold ? a.y - b.y : a.x - b.x;
          });

          let line: any[] = [];
          for (const token of col.items) {
            if (line.length === 0) {
              line.push(token);
              continue;
            }

            const base = line[0];
            const baseHeight = base.height || base.fontSize || 10;
            const itemHeight = token.height || token.fontSize || 10;
            const dynamic = Math.max(2, Math.min(6, Math.min(baseHeight, itemHeight) * 0.35));

            const delta = vertical ? Math.abs(token.x - base.x) : Math.abs(token.y - base.y);
            if (delta < Math.min(yThreshold, dynamic)) {
              line.push(token);
            } else {
              line.sort((a: any, b: any) => (vertical ? a.y - b.y : a.x - b.x));
              lines.push(line.map((t: any) => ({ ...t, page, angleBucket })));
              line = [token];
            }
          }
          if (line.length) {
            line.sort((a: any, b: any) => (vertical ? a.y - b.y : a.x - b.x));
            lines.push(line.map((t: any) => ({ ...t, page, angleBucket })));
          }
        }
      }
    }
  }

  // Post-process: merge hyphenated line breaks within same column/page
  const mergedLines: any[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    if (mergedLines.length === 0) {
      mergedLines.push(current);
      continue;
    }

    const prev = mergedLines[mergedLines.length - 1];
    const prevPage = prev[0]?.page;
    const currPage = current[0]?.page;

    // Same page and roughly same column (x overlap)
    const prevMinX = Math.min(...prev.map((t: any) => t.x));
    const prevMaxX = Math.max(...prev.map((t: any) => (t.x || 0) + (t.width || 0)));
    const currMinX = Math.min(...current.map((t: any) => t.x));
    const currMaxX = Math.max(...current.map((t: any) => (t.x || 0) + (t.width || 0)));
    const xOverlap = Math.min(prevMaxX, currMaxX) - Math.max(prevMinX, currMinX);
    const overlapRatio = xOverlap / Math.max(1, Math.min(prevMaxX - prevMinX, currMaxX - currMinX));

    // Compute previous line text quickly
    const prevText = prev.map((t: any) => t.text).join('');

    if (
      prevPage === currPage &&
      overlapRatio > 0.5 &&
      /-$/.test(prevText.trim())
    ) {
      // De-hyphenate: remove trailing hyphen from prev last token
      const last = prev[prev.length - 1];
      if (last && typeof last.text === 'string') {
        last.text = last.text.replace(/-\s*$/, '');
      }
      // Merge tokens without inserting extra space
      mergedLines[mergedLines.length - 1] = prev.concat(current);
    } else {
      mergedLines.push(current);
    }
  }

  // Detect repeated headers/footers across pages to improve reading order
  const headerFooterCandidates = new Map<string, number>();
  const signatureOfLine = (lineItems: any[]) => {
    const text = lineItems.map((i: any) => i.text).join('').replace(/\s+/g, ' ').trim();
    const pageHeight = lineItems[0]?.pageHeight || 0;
    const minY = Math.min(...lineItems.map((i: any) => i.y));
    const maxY = Math.max(...lineItems.map((i: any) => (i.y || 0) + (i.height || 0)));
    const posBucket = pageHeight > 0 && (minY < pageHeight * 0.08 ? 'TOP' : (maxY > pageHeight * 0.92 ? 'BOTTOM' : 'MID'));
    return `${posBucket}|${text}`;
  };
  for (const l of mergedLines) {
    if (!l || l.length === 0) continue;
    const sig = signatureOfLine(l);
    if (sig.startsWith('TOP') || sig.startsWith('BOTTOM')) {
      headerFooterCandidates.set(sig, (headerFooterCandidates.get(sig) || 0) + 1);
    }
  }
  const repeatedHeaderFooter = new Set<string>(
    Array.from(headerFooterCandidates.entries())
      .filter(([, cnt]) => cnt >= 3)
      .map(([sig]) => sig)
  );

  // Build result objects with text and items, preserve per-line order and handle RTL
  const result: any[] = [];
  for (const rawLineItems of mergedLines) {
    // All line items are from same page by construction
    const lineItems = [...rawLineItems];

    // Skip repeated header/footer lines
    const sig = signatureOfLine(lineItems);
    if (repeatedHeaderFooter.has(sig)) {
      continue;
    }

    // Detect RTL by presence of strong RTL characters
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const sampleText = lineItems.map((i: any) => i.text).join('');
    const isRTL = rtlRegex.test(sampleText);
    const isVertical = (lineItems[0]?.angleBucket === 90 || lineItems[0]?.angleBucket === 270);

    // Sort items appropriately
    lineItems.sort((a: any, b: any) => {
      if (isVertical) return a.y - b.y;
      return isRTL ? b.x - a.x : a.x - b.x;
    });

    let lineText = '';
    let lastX = 0;
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const currentX = item.x;
      if (!isVertical) {
        if (i > 0) {
          const gap = currentX - lastX;
          const avgHeight = lineItems.reduce((sum: number, it: any) => sum + (it.height || 10), 0) / lineItems.length;
          const spaceThreshold = avgHeight * 0.2;
          if (!isRTL && gap > spaceThreshold) lineText += ' ';
        }
      }
      lineText += item.text;
      lastX = currentX + (item.width || 0);
    }

    lineText = lineText.trim();
    if (lineText.length < 1) continue;

    result.push({ text: lineText, items: lineItems });
  }

  // Merge consecutive lines into paragraphs when alignment/spacing is consistent
  const paragraphs: any[] = [];
  const areSimilar = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
  const getLineMetrics = (line: any) => {
    const items = line.items;
    const minX = Math.min(...items.map((i: any) => i.x));
    const maxX = Math.max(...items.map((i: any) => (i.x || 0) + (i.width || 0)));
    const avgH = items.reduce((s: number, i: any) => s + (i.height || i.fontSize || 10), 0) / Math.max(1, items.length);
    const avgFont = items.reduce((s: number, i: any) => s + (i.fontSize || i.height || 10), 0) / Math.max(1, items.length);
    const italic = items.some((i: any) => i.italic);
    const bold = items.some((i: any) => i.bold);
    const page = items[0]?.page || 1;
    return { minX, maxX, width: maxX - minX, avgH, avgFont, italic, bold, page };
  };

  const isTitleLike = (m: any) => m.avgFont >= 1.6 * (m.avgH || 10) || m.width >= 0.8 * m.width; // rough large font
  const isQuoteLike = (text: string, m: any) => m.italic || /^"/.test(text) || /"$/.test(text);

  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const metrics = getLineMetrics(line);

    // Start new paragraph if first, title-like, or quote-like
    const isTitle = isTitleLike(metrics);
    const isQuote = isQuoteLike(line.text, metrics);
    if (paragraphs.length === 0 || isTitle || isQuote) {
      paragraphs.push({ text: line.text, items: [...line.items], metrics });
      continue;
    }

    // Try to merge with previous paragraph when:
    // - same page
    // - left margin aligned (within 1.5x avg height)
    // - vertical gap small relative to line height
    // - similar font size (within 20%) and style not title/quote
    const prev = paragraphs[paragraphs.length - 1];
    const pm = prev.metrics;
    const samePage = pm.page === metrics.page;
    const leftAligned = areSimilar(pm.minX, metrics.minX, Math.max(2, pm.avgH * 1.5));
    const prevBottom = Math.max(...prev.items.map((i: any) => (i.y || 0) + (i.height || 0)));
    const currTop = Math.min(...line.items.map((i: any) => i.y));
    const vGap = Math.max(0, currTop - prevBottom);
    const smallVGap = vGap <= Math.max(pm.avgH, metrics.avgH) * 1.2;
    const fontClose = metrics.avgFont > 0 && Math.abs(metrics.avgFont - pm.avgFont) / metrics.avgFont <= 0.2;

    const currentIsQuoteOrTitle = isTitle || isQuote;
    const prevIsQuoteOrTitle = isTitleLike(pm) || isQuoteLike(prev.text, pm);

    if (samePage && leftAligned && smallVGap && fontClose && !currentIsQuoteOrTitle && !prevIsQuoteOrTitle) {
      prev.text = `${prev.text}${prev.text.endsWith('-') ? '' : ' '}${line.text}`.replace(/\s+/g, ' ').trim();
      prev.items.push(...line.items);
      // update metrics
      prev.metrics = getLineMetrics({ items: prev.items, text: prev.text });
    } else {
      paragraphs.push({ text: line.text, items: [...line.items], metrics });
    }
  }

  // Replace result with merged paragraphs
  const mergedResult = paragraphs.map(p => ({ text: p.text, items: p.items }));

  // Debug info
  const pageDistributionAfterGrouping = new Map();
  mergedResult.forEach((line: any) => {
    const p = line.items[0]?.page || 1;
    pageDistributionAfterGrouping.set(p, (pageDistributionAfterGrouping.get(p) || 0) + 1);
  });
  console.log('[PDF] Page distribution after grouping:', Array.from(pageDistributionAfterGrouping.entries()).sort((a, b) => a[0] - b[0]));

  return mergedResult;
}

// Strict reading-order grouping: page -> y -> x, adaptive y-band to avoid mid-line splits
function groupTextByLineStrict(items: any[], yThreshold = 6) {
  if (!items || items.length === 0) return [];

  // Group by page
  const byPage = new Map<number, any[]>();
  for (const it of items) {
    const p = Number(it.page) || 1;
    if (!byPage.has(p)) byPage.set(p, []);
    byPage.get(p)!.push(it);
  }

  const lines: { text: string; items: any[] }[] = [];
  const pages = Array.from(byPage.keys()).sort((a, b) => a - b);
  for (const p of pages) {
    const pageItems = byPage.get(p)!;
    // sort strictly top-to-bottom then left-to-right
    pageItems.sort((a: any, b: any) => (a.y === b.y ? a.x - b.x : a.y - b.y));

    let currentLine: any[] = [];
    let avgY = 0;
    let avgH = 0;

    for (const token of pageItems) {
      const tokenY = token.y;
      const tokenH = token.height || token.fontSize || 10;
      if (currentLine.length === 0) {
        currentLine.push(token);
        avgY = tokenY;
        avgH = tokenH;
        continue;
      }

      const band = Math.max(yThreshold, Math.min(10, avgH * 0.85));
      const sameLine = Math.abs(tokenY - avgY) <= band;
      if (sameLine) {
        currentLine.push(token);
        avgY = (avgY * (currentLine.length - 1) + tokenY) / currentLine.length;
        avgH = (avgH * (currentLine.length - 1) + tokenH) / currentLine.length;
      } else {
        currentLine.sort((a: any, b: any) => a.x - b.x);
        const text = currentLine.map((t: any) => String(t.text || '').trim()).filter(Boolean).join(' ').trim();
        if (text) lines.push({ text, items: currentLine.map((t: any) => ({ ...t, page: p })) });
        currentLine = [token];
        avgY = tokenY;
        avgH = tokenH;
      }
    }

    if (currentLine.length) {
      currentLine.sort((a: any, b: any) => a.x - b.x);
      const text = currentLine.map((t: any) => String(t.text || '').trim()).filter(Boolean).join(' ').trim();
      if (text) lines.push({ text, items: currentLine.map((t: any) => ({ ...t, page: p })) });
    }
  }

  return lines;
}

// Enhanced sentence splitter with exceptions for abbreviations, decimals, ellipses, quotes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function splitIntoSentences(text: string): string[] {
  const original = String(text || '').trim();
  if (!original) return [];

  // Protect ellipses
  const ELLIPSIS_TOKEN = '[[ELLIPSIS]]';
  let s = original.replace(/\.\.\./g, ELLIPSIS_TOKEN);

  // Normalize spaced initials like "M R." -> "MR." and "J. R. R." -> "J.R.R."
  // remove spaces between single-letter initials and a following dotted initial
  s = s
    .replace(/\b([A-Za-z])\s+([A-Za-z])\s*\./g, '$1$2.')
    .replace(/\b([A-Za-z])\s*\.\s+([A-Za-z])\s*\./g, '$1.$2.')
    .replace(/\b([A-Za-z])\s+([A-Za-z])\b/g, (m, a, b) => (a.length === 1 && b.length === 1 ? `${a}${b}` : m));

  // Common English abbreviations and titles
  const abbrev = new Set([
    'mr','mrs','ms','dr','prof','rev','hon','sr','jr','st','gen','col','capt','lt','sen','gov','pres','supt','det',
    'e.g','i.e','etc','cf','vs','approx','ca','al','ibid','no','ave','blvd','rd','st','apt','dept',
    'u.s','u.k','e.u','u.n','ph.d','m.sc','b.a','b.sc','inc','ltd','co','a.m','p.m','am','pm'
  ]);

  // Tokenize on potential sentence enders while preserving punctuation
  const parts: string[] = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = s[i + 1] || '';
      const prev = s[i - 1] || '';

      // decimal number 3.14 or version 2.1.5
      const isDecimal = /\d/.test(prev) && /\d/.test(next);

      // abbreviation check: take last word before dot
      const m = buf.match(/([A-Za-z]\.?[A-Za-z]?\.?|[A-Za-z]+)\.$/);
      const lastWord = (m && m[1] ? m[1] : '').replace(/\./g, '').toLowerCase();
      const isAbbrev = abbrev.has(lastWord) || (/^(?:[A-Za-z]\.){2,}$/.test(buf.trim()));

      // ellipsis already protected; if it's one dot of ellipsis, it would be tokenized above
      if (!isDecimal && !isAbbrev) {
        // lookahead: allow closing quotes/parentheses/dash after ender
        parts.push(buf.trim());
        buf = '';
        // skip trailing spaces
        while (i + 1 < s.length && /[\s)\]"'”’-]/.test(s[i + 1])) {
          buf += s[++i];
        }
      }
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  // Restore ellipses
  const normalized = parts
    .map(p => p.replace(new RegExp(ELLIPSIS_TOKEN, 'g'), '...'))
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0);

  // Merge too-short fragments back
  const result: string[] = [];
  for (const piece of normalized) {
    if (result.length === 0) {
      result.push(piece);
      continue;
    }
    if (piece.length < 4) {
      result[result.length - 1] = `${result[result.length - 1]} ${piece}`.replace(/\s+/g, ' ').trim();
    } else {
      result.push(piece);
    }
  }

  // Merge dialogue attribution that follows a closing quote, e.g.
  // “... ?” he asked.  -> keep as a single sentence
  const isAttributionStart = (s: string) => /^(?:["'“”‘’)\]]\s*)?(?:he|she|they|we|i|the\s+\w+|mr|mrs|ms|dr)\s+(?:said|asked|replied|answered|whispered|shouted|cried|murmured|added|called|retorted|muttered|remarked)\b/i.test(s.trim());
  const mergedAttribution: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const prev = mergedAttribution[mergedAttribution.length - 1];
    const curr = result[i];
    if (prev && /[.!?]["'”’)\]]?$/.test(prev) && isAttributionStart(curr)) {
      mergedAttribution[mergedAttribution.length - 1] = `${prev} ${curr}`.replace(/\s+/g, ' ').trim();
    } else {
      mergedAttribution.push(curr);
    }
  }

  // Fallback if everything collapsed
  if (mergedAttribution.length === 0) return [original];
  return mergedAttribution;
}

// Hàm mới để chia DOCX theo trang thực tế - làm giống hệt như PDF
function assignFilePartsForDocx(manifestEntries: any[]): void {
  // Đảm bảo mỗi page có đúng 15 strings (trừ page cuối có thể ít hơn)
  const STRINGS_PER_PAGE = 15;
  let expectedPage = 1;
  let currentCount = 0;

  for (const entry of manifestEntries) {
    if (currentCount >= STRINGS_PER_PAGE) {
      expectedPage++;
      currentCount = 0;
    }
    entry.position.page = expectedPage;
    entry.filePart = expectedPage - 1; // filePart bắt đầu từ 0, giống như PDF
    currentCount++;
  }

  // Debug: in ra thông tin phân trang
  const pageDistribution = new Map<number, number>();
  manifestEntries.forEach((entry: any) => {
    const page = entry.position?.page || 1;
    pageDistribution.set(page, (pageDistribution.get(page) || 0) + 1);
  });

  console.log('[DOCX] Page distribution based on 15 strings per page:');
  const sortedPages = Array.from(pageDistribution.keys()).sort((a, b) => a - b);
  for (const page of sortedPages) {
    console.log(`[DOCX] Page ${page}: ${pageDistribution.get(page)} entries`);
  }

  // Thông báo tổng quan
  console.log(`[DOCX] Total pages detected: ${sortedPages.length}`);
  console.log(`[DOCX] Total entries: ${manifestEntries.length}`);
  console.log(`[DOCX] Final page assignment completed. Each page now has max ${STRINGS_PER_PAGE} strings.`);
  console.log(`[DOCX] Using filePart (0-based) for pagination, just like PDF!`);
}

// Enhanced function to divide PDF by original pages
function assignFilePartsByPage(manifestEntries: any[]): void {
  // Group entries by page
  const entriesByPage = new Map<number, any[]>();

  for (const entry of manifestEntries) {
    const page = entry.position?.page || 1;
    if (!entriesByPage.has(page)) {
      entriesByPage.set(page, []);
    }
    entriesByPage.get(page)!.push(entry);
  }

  // Sort pages and assign filePart
  const sortedPages = Array.from(entriesByPage.keys()).sort((a, b) => a - b);
  console.log('[PDF] Pages found:', sortedPages);
  console.log('[PDF] Total pages in PDF:', sortedPages.length);

  // Ensure we have entries for all pages from 1 to max page
  const maxPage = Math.max(...sortedPages);
  const minPage = Math.min(...sortedPages);
  console.log(`[PDF] Page range: ${minPage} to ${maxPage}`);

  // Create new page mapping: skip pages with only images
  const pagesWithText = sortedPages.filter((page: number) => {
    const entries = entriesByPage.get(page) || [];
    return entries.length > 0; // Only pages with text entries
  });

  console.log('[PDF] Pages with text only:', pagesWithText);
  console.log('[PDF] Total pages with text:', pagesWithText.length);

  // Assign filePart based on new page order (0-based index)
  for (const entry of manifestEntries) {
    const page = (entry as any).position?.page || 1;
    const newPageIndex = pagesWithText.indexOf(page);
    if (newPageIndex !== -1) {
      (entry as any).filePart = newPageIndex;
    } else {
      // Skip pages with only images
      (entry as any).filePart = -1; // Mark for removal
    }
  }

  // Remove entries from pages with only images
  const filteredEntries = manifestEntries.filter((entry: any) => entry.filePart !== -1);
  manifestEntries.length = 0;
  manifestEntries.push(...filteredEntries);

  console.log('[PDF] Successfully assigned file parts by text pages only');
  console.log(`[PDF] Total entries after filtering: ${manifestEntries.length}`);
}

@Injectable()
export class ManifestService {
  constructor(
    @InjectModel(TranslationString.name)
    private readonly translationModel: Model<TranslationStringDocument>,
    private readonly asposeService: AsposeService,
  ) {}

  async generateManifest(file: FileEntity): Promise<void> {
    // Check if file has required project and branch relationships
    if (!file.project || !file.branch) {
      console.warn(`Skipping manifest generation for file ${file.id}: missing project or branch relationship`);
      return;
    }

    // Resolve target language from request/project context (prefer project's first target language)
    const projectAny: any = file.project as any;
    const targetLanguage: string = Array.isArray(projectAny?.targetLanguages) && projectAny.targetLanguages.length > 0
      ? String(projectAny.targetLanguages[0])
      : String(projectAny?.defaultLanguage || 'en');

    const manifestEntries: Partial<TranslationString>[] = [];
    const apiKey = 'K89333403988957';

    switch (file.fileType) {
      case 'application/pdf': {
        let text = '';
        let items = [];
        let usedOcr = false;

        console.log('=== PDF PROCESSING START ===');
        console.log('[PDF] File name:', file.fileName);
        console.log('[PDF] File type:', file.fileType);
        console.log('[PDF] File size:', file.fileContent.length, 'bytes');
        console.log('[PDF] File ID:', file.id);
        console.log('[PDF] Project ID:', file.project?.id);
        console.log('[PDF] Branch ID:', file.branch?.id);

        // Check if file content is valid
        if (!file.fileContent || file.fileContent.length === 0) {
          console.error('[PDF] ERROR: File content is empty or null');
          throw new Error('File content is empty or null');
        }

        // Check file header to verify it's actually a PDF
        const header = file.fileContent.slice(0, 4).toString('hex');
        console.log('[PDF] File header (hex):', header);
        if (header !== '25504446') {
          console.error('[PDF] ERROR: File is not a valid PDF (header should be %PDF)');
          throw new Error('File is not a valid PDF');
        }

        let result: any = null;
        try {
          // Use PDF.js directly as primary method
          console.log('[PDF] Step 1: Parsing with pdfjs-dist...');
          result = await parsePdfWithFonts(file.fileContent);
          items = result.items;
          console.log('[PDF] pdfjs-dist result - items count:', items?.length || 0);
          console.log('[PDF] pdfjs-dist result - text length:', result.text?.length || 0);

          // If items exist but look garbled (encoding issue), prefer OCR fallback
          if (items && items.length > 0) {
            const sample = items.slice(0, Math.min(200, items.length)).map((i: any) => i.text).join(' ');
            const readable = sample.replace(/[^a-zA-ZÀ-ỹ0-9\s.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>-]/g, '');
            const ratio = readable.length / Math.max(1, sample.length);
            const suspicious = /[%�]{3,}|\?{3,}/.test(sample);
            console.log(`[PDF] pdfjs-dist readability ratio: ${ratio.toFixed(2)}, suspicious: ${suspicious}`);
            if (ratio < 0.35 || suspicious) {
              console.warn('[PDF] Detected low-quality text extraction from pdfjs (encoding issue). Falling back to OCR...');
              // Force OCR fallback
              try {
                text = await extractTextWithOcrSpace(file.fileContent, apiKey);
                usedOcr = true;
                console.log('[PDF] OCR result - text length:', text?.length || 0);
                console.log('[PDF] OCR result - first 200 chars:', text ? text.substring(0, 200) : '[EMPTY]');
                // Clear items so the OCR path below will be used
                items = [] as any[];
              } catch (ocrError: any) {
                console.error('[PDF] ERROR: OCR failed after low-quality pdfjs extraction:', ocrError?.message || ocrError);
                // Keep pdfjs items as last resort
              }
            } else {
              console.log('[PDF] SUCCESS: Parsed with pdfjs-dist, found', items.length, 'items');
            }
          } else {
            console.warn('[PDF] WARNING: No text items found with pdfjs-dist, falling back to OCR.');
            // Fallback to OCR.space with overlay for bbox
            try {
              console.log('[PDF] Step 2: Falling back to OCR.space overlay for bbox...');
              const overlay = await extractOverlayWithOcrSpace(file.fileContent, apiKey);
              usedOcr = true;
              const ocrItems = overlay.items.map((w: any) => ({
                text: w.text,
                font: 'ocr',
                fontSize: w.height,
                bold: false,
                italic: false,
                color: '#000000',
                x: w.x,
                // OCR overlay uses top-left origin; align with our coordinate system (top-down)
                y: w.y,
                width: w.width,
                height: w.height,
                page: w.page,
                pageHeight: undefined,
                angle: 0,
              }));
              items = ocrItems;
              console.log('[PDF] OCR overlay items count:', items.length);
            } catch (ocrError: any) {
              console.error('[PDF] ERROR: OCR overlay failed, trying plain text OCR:', ocrError?.message || ocrError);
              try {
                text = await extractTextWithOcrSpace(file.fileContent, apiKey);
                usedOcr = true;
                console.log('[PDF] OCR result - text length:', text?.length || 0);
                console.log('[PDF] OCR result - first 200 chars:', text ? text.substring(0, 200) : '[EMPTY]');
              } catch (plainError: any) {
                console.error('[PDF] ERROR: OCR failed:', plainError?.message || plainError);
                console.error('[PDF] OCR error stack:', plainError?.stack);
                throw new Error('Failed to extract text from PDF: ' + (plainError?.message || plainError));
              }
            }
          }
        }
        catch(error: any) {
          console.error('[PDF] ERROR: Failed to extract text from PDF:', error?.message || error);
          console.error('[PDF] Error stack:', error?.stack);
          throw new Error('Failed to extract text from PDF: ' + (error?.message || error));
        }

        if (items && items.length > 0) {
          // Group các đoạn text lại thành dòng
          console.log('[PDF] Step 3: Grouping text items into lines (strict)...');
          const groupedLines = groupTextByLineStrict(items, 8);
          console.log('[PDF] Grouped lines count:', groupedLines.length);

          // Merge visual lines into paragraphs first
          type Para = { text: string; items: any[] };
          const paragraphs: Para[] = [];
          const areSimilar = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
          const getMetrics = (line: any) => {
            const minX = Math.min(...line.items.map((i: any) => i.x));
            const maxX = Math.max(...line.items.map((i: any) => (i.x || 0) + (i.width || 0)));
            const avgH = line.items.reduce((s: number, i: any) => s + (i.height || i.fontSize || 10), 0) / Math.max(1, line.items.length);
            const page = line.items[0]?.page || 1;
            const topY = Math.min(...line.items.map((i: any) => i.y));
            const bottomY = Math.max(...line.items.map((i: any) => (i.y || 0) + (i.height || 0)));
            return { minX, maxX, avgH, page, topY, bottomY };
          };
          const startsWithAttribution = (txt: string) => /^(?:["'“”‘’)\]]\s*)?(?:he|she|they|we|i|the\s+\w+|mr|mrs|ms|dr)\s+(?:said|asked|replied|answered|whispered|shouted|cried|murmured|added|called|retorted|muttered|remarked)\b/i.test((txt||'').trim());

          for (const lineObj of groupedLines) {
            // Đảm bảo tất cả items trong line có cùng page
            const pages = new Set(lineObj.items.map(i => i.page));
            if (pages.size > 1) {
              console.warn(`[PDF] WARNING: Line has items from different pages:`, pages);
              console.warn(`[PDF] Line text:`, lineObj.text.substring(0, 100));

              // Nếu có items từ nhiều pages, tách thành nhiều entries
              const itemsByPage = new Map();
              lineObj.items.forEach((item: any) => {
                const page = item.page;
                if (!itemsByPage.has(page)) {
                  itemsByPage.set(page, []);
                }
                itemsByPage.get(page).push(item);
              });

              // Tạo entry riêng cho mỗi page
              for (const [page, pageItems] of itemsByPage) {
                const pageText = pageItems.map((i: any) => i.text).join(' ').trim();
                if (pageText.length >= 5) {
                  const minX = Math.min(...pageItems.map((i: any) => i.x));
                  const maxX = Math.max(...pageItems.map((i: any) => (i.x || 0) + (i.width || 0)));
                  const maxH = Math.max(...pageItems.map((i: any) => i.height || i.fontSize || 0));
                  manifestEntries.push({
                    projectId: String(file.project.id),
                    branchId: String(file.branch.id),
                    fileId: String(file.id),
                    manifestEntryId: uuidv4(),
                    originalText: pageText,
                    language: targetLanguage,
                    font: pageItems[0]?.font || 'default',
                    style: {
                      bold: pageItems.some((i: any) => i.bold),
                      italic: pageItems.some((i: any) => i.italic),
                      color: pageItems[0]?.color,
                      fontSize: pageItems[0]?.fontSize || maxH || undefined,
                    },
                    position: {
                      x: minX,
                      y: Math.min(...pageItems.map((i: any) => i.y)),
                      width: isFinite(maxX - minX) ? maxX - minX : undefined,
                      height: maxH || undefined,
                      page: page,
                    },
                  });
                }
              }
              continue; // Skip the original logic for this line
            }

            const metrics = getMetrics(lineObj);
            if (paragraphs.length === 0) {
              paragraphs.push({ text: lineObj.text, items: [...lineObj.items] });
            } else {
              const prev = paragraphs[paragraphs.length - 1];
              const pm = getMetrics({ items: prev.items });
              const samePage = pm.page === metrics.page;
              const leftAligned = areSimilar(pm.minX, metrics.minX, Math.max(2, pm.avgH * 1.2));
              const vGap = Math.max(0, metrics.topY - pm.bottomY);
              const smallVGap = vGap <= Math.max(pm.avgH, metrics.avgH) * 1.15;
              if (samePage && leftAligned && smallVGap) {
                prev.text = `${prev.text} ${lineObj.text}`.replace(/\s+/g, ' ').trim();
                prev.items.push(...lineObj.items);
              } else {
                // Special-case: dialogue attribution moved to a new visual line
                if (samePage && startsWithAttribution(lineObj.text)) {
                  prev.text = `${prev.text} ${lineObj.text}`.replace(/\s+/g, ' ').trim();
                  prev.items.push(...lineObj.items);
                } else {
                  paragraphs.push({ text: lineObj.text, items: [...lineObj.items] });
                }
              }
            }
          }

          // Emit sentences from paragraphs
          for (const para of paragraphs) {
            const page = para.items[0]?.page || 1;
            const minX = Math.min(...para.items.map((i: any) => i.x));
            const maxX = Math.max(...para.items.map((i: any) => (i.x || 0) + (i.width || 0)));
            const maxH = Math.max(...para.items.map((i: any) => i.height || i.fontSize || 0));
            const sentences = splitIntoSentences(para.text);
            for (const sentence of sentences) {
              if (!sentence || !sentence.trim()) continue;
              manifestEntries.push({
                projectId: String(file.project.id),
                branchId: String(file.branch.id),
                fileId: String(file.id),
                manifestEntryId: uuidv4(),
                originalText: sentence.trim(),
                language: targetLanguage,
                font: para.items[0]?.font || 'default',
                style: {
                  bold: para.items.some((i: any) => i.bold),
                  italic: para.items.some((i: any) => i.italic),
                  color: para.items[0]?.color,
                  fontSize: para.items[0]?.fontSize || maxH || undefined,
                },
                position: {
                  x: minX,
                  y: Math.min(...para.items.map((i: any) => i.y)),
                  width: isFinite(maxX - minX) ? maxX - minX : undefined,
                  height: maxH || undefined,
                  page: page,
                },
              });
            }
          }
          console.log('[PDF] SUCCESS: manifestEntries from parser (grouped lines):', manifestEntries.length);
          console.log('[PDF] Sample manifest entries:', manifestEntries.slice(0, 2).map((entry: any) => ({
            text: entry.originalText?.substring(0, 50),
            page: entry.position?.page,
            font: entry.font
          })));
        } else if (text) {
          // Xử lý kết quả text thô từ OCR
          console.log('[PDF] Step 3: Processing OCR text into lines...');
          const lines = text.split('\n').filter((l: string) => l.trim());
          console.log('[PDF] OCR lines count:', lines.length);

          // Thử phân tích page từ OCR text
          let currentPage = 1;
          const pageBreakIndicators = [
            /^page\s+\d+/i,
            /^trang\s+\d+/i,
            /^\d+\s*$/,
            /^page\s*$/i,
            /^trang\s*$/i
          ];

          for (const rawLine of lines) {
            // Kiểm tra xem line có phải là page break indicator không
            let isPageBreak = false;
            for (const indicator of pageBreakIndicators) {
              if (indicator.test(rawLine.trim())) {
                const pageMatch = rawLine.match(/\d+/);
                if (pageMatch) {
                  currentPage = parseInt(pageMatch[0]);
                } else {
                  currentPage++;
                }
                isPageBreak = true;
                console.log(`[PDF] OCR detected page break: "${rawLine}" -> page ${currentPage}`);
                break;
              }
            }

            // Bỏ qua page break indicators, chỉ thêm content
            if (!isPageBreak) {
              const sentences = splitIntoSentences(rawLine);
              for (const sentence of sentences) {
                if (!sentence || !sentence.trim()) continue;
                manifestEntries.push({
                  projectId: String(file.project.id),
                  branchId: String(file.branch.id),
                  fileId: String(file.id),
                  manifestEntryId: uuidv4(),
                  originalText: sentence.trim(),
                  language: targetLanguage,
                  font: 'default',
                  style: {},
                  position: { x: 0, y: 0, page: currentPage },
                });
              }
            }
          }
          console.log('[PDF] SUCCESS: manifestEntries from OCR:', manifestEntries.length);
          console.log('[PDF] Sample OCR entries:', manifestEntries.slice(0, 2).map((entry: any) => ({
            text: entry.originalText?.substring(0, 50),
            page: entry.position?.page
          })));
        } else {
          console.error('[PDF] ERROR: No text extracted from PDF (parser and OCR failed)');
          console.error('[PDF] Items count:', items?.length || 0);
          console.error('[PDF] Text length:', text?.length || 0);
          throw new Error('No text could be extracted from PDF (parser and OCR failed)');
        }

        // Safety: ensure the first textual line of each page is captured
        try {
          if (items && items.length > 0) {
            const byPage: Record<number, any[]> = {} as any;
            for (const it of items as any[]) {
              const p = Number((it as any).page) || 1;
              (byPage[p] ||= []).push(it);
            }
            for (const [pStr, list] of Object.entries(byPage)) {
              const p = Number(pStr);
              list.sort((a: any, b: any) => (a.y === b.y ? a.x - b.x : a.y - b.y));
              if (list.length === 0) continue;
              const firstY = list[0].y;
              const band = Math.max(6, (list[0].height || list[0].fontSize || 10) * 0.9);
              const firstLine = list.filter((t: any) => Math.abs(t.y - firstY) <= band).sort((a: any, b: any) => a.x - b.x);
              const firstText = firstLine.map((t: any) => String(t.text || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
              if (firstText && firstText.length >= 4) {
                const exists = manifestEntries.some((e: any) => (e.position?.page === p) && typeof e.originalText === 'string' && e.originalText.includes(firstText.substring(0, Math.min(20, firstText.length))));
                if (!exists) {
                  const minX = Math.min(...firstLine.map((i: any) => i.x));
                  const maxX = Math.max(...firstLine.map((i: any) => (i.x || 0) + (i.width || 0)));
                  const maxH = Math.max(...firstLine.map((i: any) => i.height || i.fontSize || 0));
                  manifestEntries.unshift({
                    projectId: String(file.project.id),
                    branchId: String(file.branch.id),
                    fileId: String(file.id),
                    manifestEntryId: uuidv4(),
                    originalText: firstText,
                    language: targetLanguage,
                    font: firstLine[0]?.font || 'default',
                    style: {
                      bold: firstLine.some((i: any) => i.bold),
                      italic: firstLine.some((i: any) => i.italic),
                      color: firstLine[0]?.color,
                      fontSize: firstLine[0]?.fontSize || maxH || undefined,
                    },
                    position: {
                      x: minX,
                      y: Math.min(...firstLine.map((i: any) => i.y)),
                      width: isFinite(maxX - minX) ? maxX - minX : undefined,
                      height: maxH || undefined,
                      page: p,
                    },
                  });
                }
              }
            }
          }
        } catch (e) {
          console.log('[PDF] First-line safeguard skipped due to error:', (e as any)?.message || e);
        }

        // Store images separately for export (not in manifest entries)
        if (result.images && result.images.length > 0) {
          console.log('[PDF] Step 4: Processing images (basic info only)...');
          console.log('[PDF] Found', result.images.length, 'images - storing basic info for preview');

          // Store basic image info for preview purposes only
          // Skip detailed image processing to focus on text quality
          const imageData = result.images.map((image: any, i: number) => ({
            index: i + 1,
            data: image.data,
            type: image.type,
            position: {
              x: image.x,
              y: image.y,
              width: image.width,
              height: image.height,
              page: image.page,
            }
          }));

          // Store image data for preview only - not for detailed processing
          console.log('[PDF] SUCCESS: Stored basic image info for', result.images.length, 'images (preview only)');
          console.log('[PDF] Image data stored for preview:', imageData.length, 'images');
        }

        // Debug: Kiểm tra page distribution
        const pageDistribution = new Map<number, number>();
        manifestEntries.forEach((entry: any) => {
          const page = entry.position?.page || 1;
          pageDistribution.set(page, (pageDistribution.get(page) || 0) + 1);
        });

        console.log('[PDF] Page distribution:');
        const sortedPages = Array.from(pageDistribution.keys()).sort((a, b) => a - b);
        for (const page of sortedPages) {
          console.log(`[PDF] Page ${page}: ${pageDistribution.get(page)} entries`);
        }

        console.log('=== PDF PROCESSING COMPLETE ===');
        console.log('[PDF] Final manifest entries count:', manifestEntries.length);
        console.log('[PDF] Used OCR:', usedOcr);
        console.log('[PDF] Processing method:', usedOcr ? 'OCR' : 'Parser');
        console.log('[PDF] Total pages found:', sortedPages.length);
        break;
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        console.log(`[DOCX] Starting DOCX to TXT conversion for proper order...`);
        
        // Convert DOCX to plain text to preserve document order
        const { value: plainText } = await mammoth.extractRawText({
          buffer: file.fileContent
        });

        console.log(`[DOCX] Converted to plain text, length: ${plainText.length}`);
        console.log(`[DOCX] First 300 chars: "${plainText.substring(0, 300)}"`);

        // Function to split text into sentences while preserving order
        function splitIntoSentences(text: string): string[] {
          if (!text || !text.trim()) return [];
          
          // Split by sentence endings: . ? ! ...
          const sentenceEndings = /[.!?]+/g;
          const sentences = text.split(sentenceEndings);

          // Filter empty sentences and add back endings
          const result: string[] = [];
          let currentIndex = 0;

          for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            if (sentence.length > 0) {
              // Find corresponding ending
              const match = text.slice(currentIndex).match(sentenceEndings);
              const ending = match ? match[0] : '';

              result.push(sentence + ending);
              currentIndex += sentence.length + ending.length;
            }
          }

          return result.filter(s => s.trim().length > 0);
        }

        // Process plain text line by line to maintain document order
        const lines = plainText.split('\n').filter((line: string) => line.trim().length > 0);
        let totalEntries = 0;

        console.log(`[DOCX] Processing ${lines.length} lines in document order...`);

        // Process each line in order
        let orderIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip empty lines
          if (!line) continue;

          // Skip lines that are just punctuation or whitespace
          const cleanText = line.replace(/^[^\w]*$/, '').trim();
          if (cleanText.length === 0) {
            console.log(`[DOCX] Skipping punctuation-only line: "${line}"`);
            continue;
          }

          // Handle different line types based on content and position
          if (i === 0 || i === 1 || i === 2) {
            // First 3 lines are likely title, author, subtitle
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              orderIndex: orderIndex++,
              originalText: line,
              language: targetLanguage,
              font: 'default',
              style: { bold: true },
              position: { x: 0, y: 0, page: 1 },
            });
            totalEntries++;
            console.log(`[DOCX] Added title/header line ${i + 1}: "${line}"`);
          } else if (line.length <= 50) {
            // Short lines (likely headings, titles, or short phrases)
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              orderIndex: orderIndex++,
              originalText: line,
              language: targetLanguage,
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 },
            });
            totalEntries++;
            console.log(`[DOCX] Added short line ${i + 1}: "${line}"`);
          } else {
            // Long lines: split into sentences
            const sentences = splitIntoSentences(line);
            sentences.forEach((sentence: string) => {
              if (sentence.trim().length > 0) {
                manifestEntries.push({
                  projectId: String(file.project.id),
                  branchId: String(file.branch.id),
                  fileId: String(file.id),
                  manifestEntryId: uuidv4(),
                  orderIndex: orderIndex++,
                  originalText: sentence.trim(),
                  language: targetLanguage,
                  font: 'default',
                  style: {},
                  position: { x: 0, y: 0, page: 1 },
                });
                totalEntries++;
              }
            });
            console.log(`[DOCX] Added long line ${i + 1} with ${sentences.length} sentences`);
          }
        }

        console.log(`[DOCX] Created ${totalEntries} entries maintaining document order`);

        // Assign pages: 15 strings per page
        const STRINGS_PER_PAGE = 15;
        const totalPages = Math.ceil(manifestEntries.length / STRINGS_PER_PAGE);

        console.log(`[DOCX] Assigning ${STRINGS_PER_PAGE} strings per page across ${totalPages} pages`);

        // Assign page numbers while preserving order
        manifestEntries.forEach((entry: any, index: number) => {
          const pageNumber = Math.floor(index / STRINGS_PER_PAGE) + 1;
          entry.position = {
            x: 0,
            y: 0,
            page: pageNumber
          };
        });

        console.log(`[DOCX] Successfully assigned pages while maintaining document order`);
        console.log(`[DOCX] Total entries: ${totalEntries}, Total pages: ${totalPages}`);
        break;
      }

      case 'text/plain': {
        // Treat as plain text, one line per entry
        const lines = file.fileContent
          .toString()
          .split('\n')
          .filter((l: string) => l.trim());
        for (const line of lines) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: line,
            language: targetLanguage,
            font: 'default',
            style: {},
            position: { x: 0, y: 0, page: 1 }, // Plain text không có thông tin trang, mặc định page 1
          });
        }
        break;
      }

      case 'application/json': {
        // Parse JSON and extract all string values (recursively)
        function extractStrings(obj: any, out: string[] = []): string[] {
          if (typeof obj === 'string') {
            out.push(obj);
          } else if (Array.isArray(obj)) {
            for (const item of obj) extractStrings(item, out);
          } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) extractStrings(obj[key], out);
          }
          return out;
        }
        let jsonContent: any;
        try {
          jsonContent = JSON.parse(file.fileContent.toString());
        } catch (e: any) {
          break;
        }
        const strings = extractStrings(jsonContent);
        for (const str of strings) {
          if (str && str.trim()) {
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: str,
              language: targetLanguage,
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 }, // JSON không có thông tin trang, mặc định page 1
            });
          }
        }
        break;
      }

      default: {
        // fallback plain text
        const lines = file.fileContent
          .toString()
          .split('\n')
          .filter((l: string) => l.trim());
        for (const line of lines) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: line,
            language: targetLanguage,
            font: 'default',
            style: {},
            position: { x: 0, y: 0, page: 1 }, // Fallback không có thông tin trang, mặc định page 1
          });
        }
      }
    }

    // Chia part theo loại file
    if (file.fileType === 'application/pdf') {
      // PDF: chia theo page gốc
      assignFilePartsByPage(manifestEntries);
      console.log(`[MANIFEST] Assigned file parts by page for PDF. Total entries: ${manifestEntries.length}`);
    } else {
      // DOCX và file khác: chia theo 15 strings/trang
      assignFilePartsForDocx(manifestEntries);
      console.log(`[MANIFEST] Assigned file parts by 15 strings per page for DOCX. Total entries: ${manifestEntries.length}`);
    }

    // Trước khi insertMany, set obsolete: false cho từng manifestEntries
    for (const entry of manifestEntries) {
      entry.obsolete = false;
    }
    // Tăng tốc: upsert hàng loạt, hạn chế round-trip
    const bulkOps = manifestEntries.map((entry) => ({
      updateOne: {
        filter: { fileId: entry.fileId, originalText: entry.originalText, language: entry.language },
        update: {
          $set: {
            ...entry,
            obsolete: false,
          },
        },
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) {
      await this.translationModel.bulkWrite(bulkOps, { ordered: false });
    }
  }
}

async function parsePdfWithFonts(buffer: Buffer): Promise<{
  text: string;
  items: {
    text: string;
    font: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    pageHeight?: number;
  }[];
  images: {
    data: Buffer;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    type: string;
  }[];
}> {
  try {
    console.log('[PDF] Starting PDF parsing with pdfjs-dist...');
    console.log('[PDF] Buffer size:', buffer.length, 'bytes');

    // Initialize pdfjs if not already done
    if (!pdfjs) {
      try {
        pdfjs = await import('pdfjs-dist');
        console.log('[PDF] PDF.js imported successfully');
      } catch (importError) {
        console.error('[PDF] Failed to import PDF.js:', importError);
        throw new Error('PDF.js library not available');
      }
    }

    // Set up worker for pdfjs-dist
    const possibleWorkerPaths = [
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.js'),
      path.resolve(process.cwd(), '../../node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(process.cwd(), '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'),
    ];

    let workerPath = null;
    for (const workerPathOption of possibleWorkerPaths) {
      try {
        fs.accessSync(workerPathOption);
        workerPath = workerPathOption;
        console.log('[PDF] Found worker at:', workerPath);
        break;
      } catch (e) {
        console.log('[PDF] Worker not found at:', workerPathOption);
      }
    }

    if (!workerPath) {
      console.warn('[PDF] No worker found, using default');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
    }

    console.log('[PDF] Loading PDF document...');
    // Convert Buffer to Uint8Array as required by pdfjs-dist
    const uint8Array = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    console.log('[PDF] PDF loaded successfully, pages:', doc.numPages);

    const numPages = doc.numPages;
    const allItems = [];
    const allImages = [];
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      console.log(`[PDF] Processing page ${i}/${numPages}...`);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent({ disableCombineTextItems: true });

      console.log(`[PDF] Page ${i} has ${textContent.items.length} text items`);

      fullText += textContent.items.map((item: any) => item.str).join(' ');

      // Extract images from page
      try {
        const operatorList = await page.getOperatorList();
        const images = [];

        for (let j = 0; j < operatorList.fnArray.length; j++) {
          if (operatorList.fnArray[j] === pdfjs.OPS.paintImageXObject) {
            const imageObj = operatorList.argsArray[j][0];
            const img = page.objs.get(imageObj);

            if (img && img.data) {
              // Get transform matrix for position calculation
              const transform = operatorList.argsArray[j][1];
              const x = transform ? transform[4] || 0 : 0;
              const y = transform ? transform[5] || 0 : 0;

              images.push({
                data: Buffer.from(img.data),
                x: x,
                y: y,
                width: img.width || 100,
                height: img.height || 100,
                page: i,
                type: img.format || 'jpeg'
              });
            }
          }
        }

        allImages.push(...images);
        console.log(`[PDF] Page ${i} has ${images.length} images`);
      } catch (error) {
        console.log(`[PDF] Error extracting images from page ${i}:`, error);
      }

      for (const item of textContent.items) {
        if (!item.str.trim()) continue;

        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // y in pdfjs is calculated from bottom up
        // derive rotation angle from transform matrix (snap to 0/90/180/270 later)
        const a = tx[0];
        const b = tx[1];
        let angleDeg = Math.round((Math.atan2(b, a) * 180) / Math.PI);
        if (angleDeg < 0) angleDeg += 360;
        const height = item.height;
        const width = item.width;
        const fontName = item.fontName;

        // Simple heuristics to determine style from font name
        const isBold = fontName.toLowerCase().includes('bold');
        const isItalic = fontName.toLowerCase().includes('italic');

        // Enhanced text cleaning for better extraction
        let cleanText = item.str
          // normalize unicode spaces to normal space
          .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
          // remove zero width no-break
          .replace(/\uFEFF/g, '')
          // map common ligatures
          .replace(/[\uFB00-\uFB04]/g, (m: string) => ({
            '\uFB00': 'ff',
            '\uFB01': 'fi',
            '\uFB02': 'fl',
            '\uFB03': 'ffi',
            '\uFB04': 'ffl',
          } as any)[m] || m);

        // Try multiple encoding approaches - only use supported encodings
        const encodingAttempts = [
          () => cleanText, // Original
          () => Buffer.from(cleanText, 'latin1').toString('utf8'),
          () => Buffer.from(cleanText, 'latin1').toString('ascii'),
        ];

        let bestText = cleanText;
        let bestScore = 0;

        for (const attempt of encodingAttempts) {
          try {
            const decoded = attempt();
            // Score based on Vietnamese characters and readability
            const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
            const hasVietnamese = vietnameseRegex.test(decoded);

            // Calculate readability score
            const readableChars = decoded.replace(/[^a-zA-ZÀ-ỹ0-9\s.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>]/g, '');
            const score = readableChars.length / decoded.length;

            if (hasVietnamese || score > bestScore) {
              bestText = decoded;
              bestScore = score;
            }
          } catch (e) {
            // Continue with next attempt
          }
        }

        // Less aggressive validation - only skip obviously garbled text
        if (bestText.length > 15) {
          const charCount: Record<string, number> = {};
          for (const char of bestText) {
            charCount[char] = (charCount[char] || 0) + 1;
          }
          const maxCharCount = Math.max(...Object.values(charCount));
          const totalChars = bestText.length;

          // Only skip if more than 60% is the same character (very garbled)
          if (maxCharCount / totalChars > 0.6) {
            console.log(`[PDF] Skipping very garbled text: ${bestText.substring(0, 50)}`);
            continue;
          }
        }

        cleanText = bestText;

        allItems.push({
          text: cleanText,
          font: fontName,
          fontSize: height,
          bold: isBold,
          italic: isItalic,
          color: '#000000', // pdfjs-dist doesn't easily get colors, set default
          x,
          y,
          width,
          height,
          page: i,
          pageHeight: viewport.height,
          angle: angleDeg,
        });
      }
    }

    console.log('[PDF] Parsing completed. Total items:', allItems.length, 'Total images:', allImages.length, 'Total text length:', fullText.length);
    return { text: fullText, items: allItems, images: allImages };
  } catch (error: any) {
    console.error('[PDF] Error in parsePdfWithFonts:', error?.message || error);
    console.error('[PDF] Error stack:', error?.stack);
    throw error;
  }
}


