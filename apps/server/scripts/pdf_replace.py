import sys
import json
import fitz  # PyMuPDF
from pathlib import Path
import os
import re
import subprocess
import tempfile


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



def extract_text_from_content_stream(content_stream: str):
  """Extract text strings and their positions from PDF content stream"""
  text_blocks = []

  # Pattern to match Tj commands (simple text strings)
  tj_pattern = r'\(([^)]*)\)\s+Tj'
  # Pattern to match TJ commands (array of text/numbers)
  tj_array_pattern = r'\[([^\]]*)\]\s+TJ'

  # Find all Tj commands
  for match in re.finditer(tj_pattern, content_stream):
    text = match.group(1)
    start_pos = match.start()
    end_pos = match.end()
    text_blocks.append({
      'type': 'Tj',
      'text': text,
      'start': start_pos,
      'end': end_pos,
      'full_match': match.group(0)
    })

  # Find all TJ commands
  for match in re.finditer(tj_array_pattern, content_stream):
    array_content = match.group(1)
    start_pos = match.start()
    end_pos = match.end()

    # Parse TJ array content
    items = []
    current_item = ""
    in_string = False
    string_start = -1

    for i, char in enumerate(array_content):
      if char == '(' and not in_string:
        in_string = True
        string_start = i
        current_item = ""
      elif char == ')' and in_string:
        in_string = False
        items.append(('text', current_item))
        current_item = ""
      elif in_string:
        current_item += char
      elif char.isdigit() or char == '-':
        # Number
        if not in_string:
          num_str = ""
          j = i
          while j < len(array_content) and (array_content[j].isdigit() or array_content[j] in '.-'):
            num_str += array_content[j]
            j += 1
          if num_str:
            try:
              num = float(num_str)
              items.append(('number', num))
            except ValueError:
              pass

    text_blocks.append({
      'type': 'TJ',
      'items': items,
      'start': start_pos,
      'end': end_pos,
      'full_match': match.group(0)
    })

  return text_blocks


def replace_text_in_content_stream(content_stream: str, original_text: str, translated_text: str):
  """Replace text directly in content stream while preserving formatting"""
  print(f"[Content Stream] Replacing: '{original_text}' -> '{translated_text}'")

  # Normalize text for matching
  original_normalized = original_text.strip()
  translated_normalized = translated_text.strip()

  print(f"[Content Stream] Debug: Looking for text: '{original_normalized}'")

  # Find and replace in Tj commands
  tj_pattern = r'\(([^)]*)\)\s+Tj'
  tj_matches = list(re.finditer(tj_pattern, content_stream))

  print(f"[Content Stream] Debug: Found {len(tj_matches)} Tj commands")
  for i, match in enumerate(tj_matches[:10]):  # Show first 10 matches
    text = match.group(1)
    print(f"[Content Stream] Debug: Tj {i+1}: '{text}'")

  # Find and replace in TJ commands
  tj_array_pattern = r'\[([^\]]*)\]\s+TJ'
  tj_array_matches = list(re.finditer(tj_array_pattern, content_stream))

  print(f"[Content Stream] Debug: Found {len(tj_array_matches)} TJ commands")
  for i, match in enumerate(tj_array_matches[:5]):  # Show first 5 matches
    array_content = match.group(1)
    print(f"[Content Stream] Debug: TJ {i+1}: '{array_content[:200]}...'")

  # Try exact match first
  def replace_tj(match):
    text = match.group(1)
    if text.strip() == original_normalized:
      print(f"[Content Stream] Found exact Tj match: '{text}'")
      return f'({translated_normalized}) Tj'
    return match.group(0)

  content_stream = re.sub(tj_pattern, replace_tj, content_stream)

  # Try partial match if exact match failed
  if original_normalized not in content_stream:
    print(f"[Content Stream] Debug: Trying partial match...")
    # Try matching by words
    original_words = original_normalized.split()
    if len(original_words) > 3:
      # Try matching first few words
      partial_text = ' '.join(original_words[:3])
      print(f"[Content Stream] Debug: Trying partial match with: '{partial_text}'")

      def replace_tj_partial(match):
        text = match.group(1)
        if partial_text in text:
          print(f"[Content Stream] Found partial Tj match: '{text}'")
          # Replace the partial text
          new_text = text.replace(partial_text, translated_normalized)
          return f'({new_text}) Tj'
        return match.group(0)

      content_stream = re.sub(tj_pattern, replace_tj_partial, content_stream)

  # Try TJ array replacement
  def replace_tj_array(match):
    array_content = match.group(1)
    if original_normalized in array_content:
      print(f"[Content Stream] Found TJ match in: '{array_content}'")
      new_array = array_content.replace(f'({original_normalized})', f'({translated_normalized})')
      return f'[{new_array}] TJ'
    return match.group(0)

  content_stream = re.sub(tj_array_pattern, replace_tj_array, content_stream)

  return content_stream


def get_safe_font_name(font_name: str) -> str:
  """Convert any font name to a safe Base-14 font name"""
  if not font_name:
    return "helv"

  font_lower = font_name.lower()

  # Map common fonts to Base-14
  font_mapping = {
    'times': 'tibo',      # Times-Bold
    'times-roman': 'tibo',
    'times new roman': 'tibo',
    'arial': 'helv',      # Helvetica
    'helvetica': 'helv',
    'courier': 'cour',    # Courier
    'courier new': 'cour',
    'symbol': 'symb',     # Symbol
    'zapfdingbats': 'zadb' # ZapfDingbats
  }

  for key, value in font_mapping.items():
    if key in font_lower:
      return value

  # Default fallback
  return "helv"


def replace_text_with_qpdf_approach(pdf_path: str, replacements: list, output_path: str):
  """Professional PDF text replacement using qpdf + PyMuPDF hybrid approach"""
  print(f"[Professional] Opening PDF: {pdf_path}")
  doc = fitz.open(pdf_path)

  replacements_made = 0

  for page_num in range(len(doc)):
    page = doc[page_num]
    print(f"[Professional] Processing page {page_num + 1}")

    # Apply replacements for this page
    page_replacements = [r for r in replacements if r.get('page', 1) == page_num + 1]

    for replacement in page_replacements:
      original = replacement.get('original', '').strip()
      translated = replacement.get('translated', '').strip()

      if original and translated and original != translated:
        print(f"[Professional] Page {page_num + 1}: Replacing '{original}' -> '{translated}'")

        # Get detailed text information
        text_dict = page.get_text("dict")

        # Find exact text blocks that match
        matching_blocks = []
        for block in text_dict.get("blocks", []):
          if "lines" in block:
            for line in block["lines"]:
              for span in line["spans"]:
                span_text = span.get("text", "").strip()
                if original in span_text:
                  matching_blocks.append({
                    "span": span,
                    "bbox": span["bbox"],
                    "font": span.get("font", "helv"),
                    "size": span.get("size", 12),
                    "color": span.get("color", 0),
                    "text": span_text
                  })

        if matching_blocks:
          print(f"[Professional] Found {len(matching_blocks)} matching text blocks")

          for block_info in matching_blocks:
            # Create redaction annotation with exact original style
            rect = fitz.Rect(block_info["bbox"])

            # Redact the original text
            page.add_redact_annot(rect, fill=None)

          # Apply redactions
          page.apply_redactions()

          # Insert new text with exact original style
          for block_info in matching_blocks:
            rect = fitz.Rect(block_info["bbox"])

            # Convert color to RGB
            color = block_info["color"]
            if isinstance(color, int):
              if color == 0:
                rgb_color = (0, 0, 0)  # Black
              elif color == 1:
                rgb_color = (1, 1, 1)  # White
              else:
                rgb_color = (0, 0, 0)  # Default black
            else:
              rgb_color = color

            # Get safe font name
            safe_font = get_safe_font_name(block_info["font"])
            print(f"[Professional] Using font: {safe_font} (original: {block_info['font']})")

            # Insert with exact original style
            page.insert_text(
              rect.tl,  # Top-left position
              translated,
              fontsize=block_info["size"],  # Exact original size
              fontname=safe_font,           # Safe font name
              color=rgb_color               # Exact original color
            )

          replacements_made += 1
          print(f"[Professional] Successfully replaced with exact original style")
        else:
          print(f"[Professional] No exact text blocks found, trying search approach")

          # Fallback to search approach
          text_instances = page.search_for(original)
          if text_instances:
            for rect in text_instances:
              # Get style from the area
              area_text_dict = page.get_text("dict", clip=rect)
              style_info = extract_style_from_area(area_text_dict, rect)

              # Redact and insert
              page.add_redact_annot(rect, fill=None)

            page.apply_redactions()

            for rect in text_instances:
              area_text_dict = page.get_text("dict", clip=rect)
              style_info = extract_style_from_area(area_text_dict, rect)

              # Get safe font name
              safe_font = get_safe_font_name(style_info["font"])
              print(f"[Professional] Search approach using font: {safe_font}")

              page.insert_text(
                rect.tl,
                translated,
                fontsize=style_info["size"],
                fontname=safe_font,
                color=style_info["color"]
              )

            replacements_made += 1
            print(f"[Professional] Replaced using search approach")
          else:
            print(f"[Professional] No text found to replace")

  # Save the modified PDF
  doc.save(output_path)
  doc.close()

  print(f"[Professional] PDF saved to: {output_path}")
  print(f"[Professional] Total replacements made: {replacements_made}")

  return replacements_made > 0


def extract_style_from_area(text_dict, rect):
  """Extract style information from a specific area"""
  try:
    for block in text_dict.get("blocks", []):
      if "lines" in block:
        for line in block["lines"]:
          for span in line["spans"]:
            span_rect = fitz.Rect(span["bbox"])
            if span_rect.intersects(rect):
              font_name = span.get("font", "helv")
              font_size = span.get("size", 12)
              color = span.get("color", 0)

              # Convert color
              if isinstance(color, int):
                if color == 0:
                  rgb_color = (0, 0, 0)
                elif color == 1:
                  rgb_color = (1, 1, 1)
                else:
                  rgb_color = (0, 0, 0)
              else:
                rgb_color = color

              # Get safe font name
              safe_font = get_safe_font_name(font_name)

              return {
                "font": safe_font,
                "size": font_size,
                "color": rgb_color
              }
  except Exception as e:
    print(f"[Style Extract] Error: {e}")

  # Fallback
  return {
    "font": "helv",
    "size": 12,
    "color": (0, 0, 0)
  }


def main():
  if len(sys.argv) < 4:
    print("Usage: python pdf_replace.py <input_pdf> <output_pdf> <replacements_json>")
    sys.exit(1)

  input_pdf = sys.argv[1]
  output_pdf = sys.argv[2]
  replacements_json = sys.argv[3]

  print(f"[Professional] Starting professional PDF replacement...")
  print(f"[Professional] Input: {input_pdf}")
  print(f"[Professional] Output: {output_pdf}")
  print(f"[Professional] Replacements: {replacements_json}")

  try:
    # Load replacements
    with open(replacements_json, 'r', encoding='utf-8') as f:
      replacements = json.load(f)

    print(f"[Professional] Loaded {len(replacements)} replacements")

    # Perform professional replacement
    success = replace_text_with_qpdf_approach(input_pdf, replacements, output_pdf)

    if success:
      print("[Professional] Text replacement completed successfully")
      sys.exit(0)
    else:
      print("[Professional] No replacements were made")
      sys.exit(1)

  except Exception as e:
    print(f"[Professional] Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


if __name__ == "__main__":
  # Set UTF-8 encoding for stdout to handle Unicode characters
  import sys
  import os

  # Force UTF-8 encoding for Windows
  if os.name == 'nt':  # Windows
    try:
      # Set console code page to UTF-8
      os.system('chcp 65001 > nul')
      # Set environment variable
      os.environ['PYTHONIOENCODING'] = 'utf-8'
    except:
      pass

  # Try to set UTF-8 encoding for stdout
  try:
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
  except:
    pass  # Fallback to default encoding if this fails

  main()



