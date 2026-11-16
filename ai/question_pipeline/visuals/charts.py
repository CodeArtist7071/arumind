"""Conservative chart validation and Mermaid generation; no model imports."""
import math
import re


VERSION = 1


def number(text):
    text = text.strip().replace('−', '-')
    if not re.fullmatch(r'[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?', text):
        raise ValueError(f'Unsupported numeric cell: {text!r}')
    value = float(text.rstrip('%').replace(',', ''))
    if not math.isfinite(value):
        raise ValueError('Non-finite chart value')
    return value


def parse_table(text):
    lines = [line.strip() for line in text.replace('<0x0A>', '\n').splitlines() if line.strip()]
    title = ''
    if lines and lines[0].startswith('TITLE |'):
        title = lines.pop(0).split('|', 1)[1].strip()
    rows = [[cell.strip() for cell in line.split('|')] for line in lines]
    if len(rows) < 3 or any(len(row) != 2 for row in rows):
        raise ValueError('Only complete single-series, two-column tables are supported')
    labels = [row[0] for row in rows[1:]]
    if any(not label for label in labels) or len(set(labels)) != len(labels):
        raise ValueError('Empty or duplicate chart labels')
    units = {row[1].endswith('%') for row in rows[1:]}
    if len(units) != 1:
        raise ValueError('Mixed percent and absolute values')
    return {'title': title, 'category': rows[0][0], 'measure': rows[0][1],
            'labels': labels, 'values': [number(row[1]) for row in rows[1:]],
            'percent': units == {True}}


def corroborate(table, ocr):
    trusted = [item['text'] for item in ocr if item['score'] >= 0.85]
    normalize = lambda text: re.sub(r'\W+', '', text).casefold()
    joined = normalize(' '.join(trusted))
    if any(normalize(label) not in joined for label in table['labels']):
        raise ValueError('PaddleOCR does not corroborate every DePlot label')
    observed = []
    for text in trusted:
        for token in re.findall(r'(?<!\w)[+-]?\d[\d,]*(?:\.\d+)?%?', text):
            try:
                observed.append(number(token))
            except ValueError:
                continue
    if any(not any(math.isclose(value, other, rel_tol=0, abs_tol=0.000001)
                   for other in observed) for value in table['values']):
        raise ValueError('Some DePlot values are not readable in PaddleOCR; manual review needed')


def label(text):
    # Disallow syntax/control injection. Keep original labels in the JSON audit.
    if any(char in text for char in ('"', '\\', '`', '<', '>', '\n', '\r', ';', '{', '}')):
        raise ValueError('Chart label contains unsupported Mermaid characters')
    return '"' + text + '"'


def mermaid(kind, table):
    values = table['values']
    if kind == 'pie':
        if any(value < 0 for value in values) or sum(values) <= 0:
            raise ValueError('Pie values must be nonnegative with a positive total')
        if table['percent'] and not math.isclose(sum(values), 100, abs_tol=0.5):
            raise ValueError('Pie percentages do not total 100')
        lines = ['pie showData']
        lines.extend(f'    {label(name)} : {value:g}' for name, value in zip(table['labels'], values))
    elif kind == 'bar':
        lines = ['xychart-beta', '    x-axis [' + ', '.join(label(name) for name in table['labels']) + ']',
                 '    y-axis ' + label(table['measure'] + (' (%)' if table['percent'] else '')),
                 '    bar [' + ', '.join(f'{value:g}' for value in values) + ']']
    else:
        raise ValueError('Unknown chart type')
    return '```mermaid\n' + '\n'.join(lines) + '\n```'


def chart_kind(hint, image):
    """Caption/OCR hints plus conservative geometry; uncertain images stay images."""
    import cv2
    gray = cv2.imread(str(image), cv2.IMREAD_GRAYSCALE)
    if gray is None:
        raise ValueError('Cannot read chart image')
    scale = min(1, 900 / max(gray.shape))
    gray = cv2.resize(gray, None, fx=scale, fy=scale)
    height, width = gray.shape
    if min(height, width) < 40:
        return None
    circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, 1.2, minDist=max(20, height // 3),
                              param1=100, param2=45, minRadius=max(10, min(height, width) // 8),
                              maxRadius=min(height, width) // 2)
    edges = cv2.Canny(gray, 60, 160)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.025 * perimeter, True)
        x, y, w, h = cv2.boundingRect(contour)
        if len(polygon) == 4 and w * h > width * height * 0.002 and h > height * 0.08 and w < width * 0.35:
            boxes.append((x, y, w, h))
    aligned = any(sum(abs((y + h) - (yy + hh)) < height * 0.04 for _, yy, _, hh in boxes) >= 3
                  for _, y, _, h in boxes)
    pie_hint = bool(re.search(r'\bpie\s*(?:chart|graph|diagram)\b', hint, re.I))
    bar_hint = bool(re.search(r'\bbar\s*(?:chart|graph|diagram)\b', hint, re.I))
    if pie_hint and not bar_hint:
        return 'pie'
    if bar_hint and not pie_hint:
        return 'bar'
    if circles is not None and not aligned:
        return 'pie'
    if aligned and circles is None:
        return 'bar'
    return None
