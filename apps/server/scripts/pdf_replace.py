import sys
import json
import fitz  # PyMuPDF
from pathlib import Path
import os


def parse_color(hex_color: str):
  if not hex_color:
    return (0, 0, 0)
  s = hex_color.strip()
  if s.startswith('#'):
    s = s[1:]
  if len(s) != 6:
    return (0, 0, 0)
  try:
    r = int(s[0:2], 16) / 255.0
    g = int(s[2:4], 16) / 255.0
    b = int(s[4:6], 16) / 255.0
    return (r, g, b)
  except Exception:
    return (0, 0, 0)


def map_font_name(style: dict, font_name: str | None):
  # Base-14 fallbacks
  is_bold = bool(style.get('bold'))
  is_italic = bool(style.get('italic'))
  if is_bold and is_italic:
    return "helvBI"  # Helvetica Bold Italic
  if is_bold:
    return "helvB"   # Helvetica Bold
  if is_italic:
    return "helvI"   # Helvetica Italic
  return "helv"        # Helvetica Regular


def pick_unicode_fontfile(style: dict):
  # Allow overriding via env vars
  env_regular = os.getenv('PDF_REPLACE_FONT_REGULAR')
  env_bold = os.getenv('PDF_REPLACE_FONT_BOLD')
  env_italic = os.getenv('PDF_REPLACE_FONT_ITALIC')
  env_bolditalic = os.getenv('PDF_REPLACE_FONT_BOLDITALIC')

  is_bold = bool(style.get('bold'))
  is_italic = bool(style.get('italic'))

  # Prefer env-configured font files
  if is_bold and is_italic and env_bolditalic and Path(env_bolditalic).exists():
    return env_bolditalic
  if is_bold and env_bold and Path(env_bold).exists():
    return env_bold
  if is_italic and env_italic and Path(env_italic).exists():
    return env_italic
  if env_regular and Path(env_regular).exists():
    return env_regular

  # System fallbacks (Windows / Linux)
  windows_fonts = {
    'regular': r"C:\\Windows\\Fonts\\arial.ttf",
    'bold': r"C:\\Windows\\Fonts\\arialbd.ttf",
    'italic': r"C:\\Windows\\Fonts\\ariali.ttf",
    'bolditalic': r"C:\\Windows\\Fonts\\arialbi.ttf",
  }
  linux_fonts = {
    'regular': "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    'bold': "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    'italic': "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    'bolditalic': "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
  }

  fonts = windows_fonts if os.name == 'nt' else linux_fonts
  if is_bold and is_italic and Path(fonts['bolditalic']).exists():
    return fonts['bolditalic']
  if is_bold and Path(fonts['bold']).exists():
    return fonts['bold']
  if is_italic and Path(fonts['italic']).exists():
    return fonts['italic']
  if Path(fonts['regular']).exists():
    return fonts['regular']

  return None


def needs_unicode_font(text: str) -> bool:
  try:
    text.encode('ascii')
    return False
  except Exception:
    return True


def estimate_required_height(page, rect, text, fontsize, fontname=None, fontfile=None):
  try:
    text_width = page.get_text_length(text, fontsize=fontsize, fontname=fontname, fontfile=fontfile)
  except Exception:
    # fallback rough estimation: width ~ 0.5 * fontsize * chars
    text_width = 0.5 * fontsize * max(1, len(text))

  rect_width = max(1.0, rect.width)
  num_lines = max(1, int((text_width / rect_width) + 0.999))
  line_height = fontsize * 1.2
  required_height = num_lines * line_height
  return required_height, num_lines, line_height


def try_insert_textbox(page, rect, text, fontsize, fontname, fontfile, color):
  # iterative attempts: expand height, then reduce fontsize if still failing
  attempts = []
  r = fitz.Rect(rect)
  fs = float(fontsize)

  for step in range(5):
    used = page.insert_textbox(
      r,
      text,
      fontsize=fs,
      fontname=fontname,
      fontfile=fontfile,
      color=color,
      align=fitz.TEXT_ALIGN_LEFT,
    )
    attempts.append((step, r, fs, used))
    if used > 0:
      return used, r, fs

    # expand height a bit and retry
    r = fitz.Rect(r.x0, max(0, r.y0 - (fs * 1.2)), r.x1, r.y1)
    if (r.y1 - r.y0) > page.rect.height:
      # reduce fontsize if we already expanded too much
      fs = max(5.0, fs * 0.9)

  # return last attempt's rect even if failed
  return 0, r, fs


def main():
  if len(sys.argv) < 4:
    print("Usage: python pdf_replace.py <input.pdf> <entries.json> <output.pdf>", file=sys.stderr)
    sys.exit(2)

  input_path = Path(sys.argv[1])
  entries_path = Path(sys.argv[2])
  output_path = Path(sys.argv[3])

  print('[PyMuPDF] Starting replacement...', file=sys.stderr)
  with open(entries_path, 'r', encoding='utf-8') as f:
    entries = json.load(f)

  doc = fitz.open(input_path)

  # Group entries by page (1-based in data, convert to 0-based)
  page_to_entries = {}
  for e in entries:
    pos = (e.get('position') or {})
    page_index = max(0, int(pos.get('page', 1)) - 1)
    page_to_entries.setdefault(page_index, []).append(e)

  # Direct text replacement: delete text in rect, then insert translated text
  for page_index, page_entries in page_to_entries.items():
    if page_index < 0 or page_index >= len(doc):
      continue
    page = doc[page_index]
    ph = page.rect.height

    for e in page_entries:
      translated = (e.get('translatedText') or '').strip()
      if not translated:
        continue

      pos = e.get('position') or {}
      x = float(pos.get('x', 50))
      y_top = float(pos.get('y', 50))
      width = float(pos.get('width', 0))
      style = e.get('style') or {}
      fontsize = float(style.get('fontSize', 12) or 12)
      line_height = fontsize * 1.2
      height = float(pos.get('height', line_height))

      # Convert to bottom-left coordinate system
      y_bottom = max(0.0, ph - y_top)
      rect = fitz.Rect(x, y_bottom - height, x + max(1.0, width if width > 0 else 1.0), y_bottom)
      rect = rect & page.rect
      if rect.is_empty or rect.width <= 0 or rect.height <= 0:
        rect = fitz.Rect( max(0, x), max(0, y_bottom - line_height), min(page.rect.x1, x + max(50, width)), y_bottom )

      # Prefer precise deletion via searching the original text within rect
      original = (e.get('originalText') or '').strip()
      deleted_any = False
      if original:
        # search_for returns rectangles for matches; filter to our rect neighborhood
        try:
          hits = page.search_for(original)
          # keep those that intersect our area
          hits = [h for h in hits if h.intersects(rect)]
          if not hits:
            expand = 6.0
            grown = fitz.Rect(rect.x0 - expand, rect.y0 - expand, rect.x1 + expand, rect.y1 + expand)
            hits = [h for h in page.search_for(original) if h.intersects(grown)]

          # Union hits to a single rect for later insertion
          hit_union = None
          for h in hits:
            if hit_union is None:
              hit_union = fitz.Rect(h)
            else:
              hit_union |= h
            try:
              page.add_redact_annot(h, fill=None)  # remove text without painting white
              deleted_any = True
            except Exception:
              pass
          if hit_union is not None:
            e['__hit_rect'] = [hit_union.x0, hit_union.y0, hit_union.x1, hit_union.y1]
          if hits:
            try:
              page.apply_redactions()
            except Exception:
              pass
        except Exception as ex:
          print(f"[PyMuPDF] WARN: search_for failed at page={page_index+1}: {ex}", file=sys.stderr)

      if not deleted_any:
        # Fallback: delete any text objects in the approximated rect (will require PyMuPDF >=1.24: delete_text for quads)
        try:
          page.add_redact_annot(rect, fill=None)
          page.apply_redactions()
        except Exception as ex:
          print(f"[PyMuPDF] WARN: redact fallback failed at page={page_index+1}, rect={rect}: {ex}", file=sys.stderr)

  # Second pass: insert translated text into the same rectangles
  for page_index, page_entries in page_to_entries.items():
    if page_index < 0 or page_index >= len(doc):
      continue
    page = doc[page_index]
    ph = page.rect.height

    for e in page_entries:
      translated = (e.get('translatedText') or '').strip()
      if not translated:
        continue

      pos = e.get('position') or {}
      x = float(pos.get('x', 50))
      y_top = float(pos.get('y', 50))
      width = float(pos.get('width', 0))
      style = e.get('style') or {}
      fontsize = float(style.get('fontSize', 12) or 12)
      line_height = fontsize * 1.2
      height = float(pos.get('height', line_height))

      color = parse_color(style.get('color'))
      # Pick a Unicode-capable font file when needed
      fontfile = pick_unicode_fontfile(style) if needs_unicode_font(translated) else None
      fontname = None if fontfile else map_font_name(style, e.get('font'))

      y_bottom = max(0.0, ph - y_top)
      rect = fitz.Rect(x, y_bottom - height, x + max(1.0, width if width > 0 else 1.0), y_bottom)
      # Clamp rect to page bounds
      rect = rect & page.rect
      if e.get('__hit_rect'):
        try:
          hx0, hy0, hx1, hy1 = e['__hit_rect']
          rect = fitz.Rect(hx0, hy0, hx1, hy1) & page.rect
        except Exception:
          pass
      if rect.is_empty or rect.width <= 0 or rect.height <= 0:
        rect = fitz.Rect( max(0, x), max(0, y_bottom - line_height), min(page.rect.x1, x + max(50, width)), y_bottom )

      # Ensure fontsize fits and expand rect as needed by iterative attempts
      used, adj_rect, adj_fontsize = try_insert_textbox(page, rect, translated, fontsize, fontname, fontfile, color)
      if used <= 0 and fontfile:
        print(f"[PyMuPDF] WARN: insert_textbox used=0 at page={page_index+1}, rect={rect}, retrying with base-14.", file=sys.stderr)
        used, adj_rect, adj_fontsize = try_insert_textbox(page, rect, translated, fontsize, map_font_name(style, e.get('font')), None, color)
      if used <= 0:
        print(f"[PyMuPDF] ERROR: could not place text at page={page_index+1} even after retries.", file=sys.stderr)

  doc.save(output_path)
  print('[PyMuPDF] Replacement finished successfully.', file=sys.stderr)
  doc.close()


if __name__ == "__main__":
  main()


