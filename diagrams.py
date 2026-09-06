"""Deterministic, illustrative scientific diagrams; no external plotting runtime."""

from math import atan, atan2, cos, degrees, hypot, isfinite, pi, sin, sqrt, tan

SAMPLES = {
    "opposed": [3, 8, 19, 26, 19, 8, 3, 2, 3, 8, 19, 26, 19, 8, 3, 2],
    "balanced": [8] * 16,
}

DEFAULT_RESULTANT = 0.65
DEFAULT_CENTER = 67.5
DEFAULT_SIZE = 120


def sample_at_resultant(target, center=DEFAULT_CENTER, size=DEFAULT_SIZE):
    """Symmetric wrapped-Cauchy quantiles calibrated to empirical R, not population R."""
    if not isinstance(target, (int, float)) or not isfinite(target) or not 0 <= target <= 1:
        raise ValueError("Target resultant must be between 0 and 1.")
    if not isinstance(size, int) or size < 2 or size % 2:
        raise ValueError("Sample size must be an even integer of at least two.")
    if not isfinite(center):
        raise ValueError("Centre must be finite.")
    tangents = [tan((2 * pi * (j + 0.5) / size - pi) / 2) for j in range(size)]
    if target == 0:
        scale = 1
    elif target == 1:
        scale = 0
    else:
        lower, upper = 0.0, 1.0
        for _ in range(52):
            scale = (lower + upper) / 2
            resultant = sum(cos(2 * atan(scale * t)) for t in tangents) / size
            if resultant > target:
                lower = scale
            else:
                upper = scale
        scale = (lower + upper) / 2
    return [(center + degrees(2 * atan(scale * t))) % 360 for t in tangents]


def histogram(angles, bins=16):
    counts = [0] * bins
    for angle in angles:
        counts[min(bins - 1, int((angle % 360) / (360 / bins)))] += 1
    return counts


def sample_angles(counts):
    return [(i + (j + 0.5) / count) * 22.5 for i, count in enumerate(counts) for j in range(count)]


def summary(angles):
    sx = sum(sin(a * pi / 180) for a in angles)
    sy = sum(cos(a * pi / 180) for a in angles)
    resultant = hypot(sx, sy) / len(angles)
    mean = degrees(atan2(sx, sy)) % 360 if resultant > 1e-10 else None
    return {"n": len(angles), "mean": mean, "resultant": resultant}


def point(angle, radius, center=280):
    a = angle * pi / 180
    return f"{center + radius * sin(a):.3f},{center - radius * cos(a):.3f}"


def rose_svg():
    angles = sample_at_resultant(DEFAULT_RESULTANT)
    counts = histogram(angles)
    stats = summary(angles)
    parts = ['<svg class="rose-plot" viewBox="0 0 560 560" role="img" aria-labelledby="rose-title rose-desc">',
             '<title id="rose-title">Rose diagram of illustrative directions</title>',
             '<desc id="rose-desc">Sixteen equal angular bins. Sector area represents count. North is zero degrees; angles increase clockwise. An orange arrow shows the mean direction.</desc>',
             '<g class="rose-grid">']
    for fraction in (0.25, 0.5, 0.75, 1):
        parts.append(f'<circle cx="280" cy="280" r="{190 * sqrt(fraction):.3f}"/>')
    for angle in range(0, 360, 45):
        parts.append(f'<path d="M280,280 L{point(angle, 202)}"/>')
    parts.append('</g><g class="rose-ticks">')
    for angle in range(0, 360, 5):
        parts.append(f'<path d="M{point(angle, 221 if angle % 30 == 0 else 226)} L{point(angle, 233)}"/>')
    parts.append('</g><g data-sectors>')
    for i, count in enumerate(counts):
        if count == 0:
            continue
        radius = 190 * sqrt(count / max(counts))
        parts.append(f'<path d="M280,280 L{point(i * 22.5, radius)} A{radius:.3f},{radius:.3f} 0 0 1 {point((i + 1) * 22.5, radius)} Z"><title>{i * 22.5:g}–{(i + 1) * 22.5:g}°: {count} observations</title></path>')
    parts.append('</g><g data-observations>')
    for angle in angles:
        x, y = point(angle, 210).split(',')
        parts.append(f'<circle cx="{x}" cy="{y}" r="1.7"/>')
    parts.append(f'</g><g class="mean-arrow" data-mean-arrow transform="rotate({stats["mean"]:.4f} 280 280)"><path class="mean-halo" d="M280 294 L280 100 M280 90 L274 105 L286 105 Z"/><path d="M280 294 L280 100"/><path class="arrowhead" d="M280 90 L274 105 L286 105 Z"/></g>')
    parts.append('<circle class="rose-origin" cx="280" cy="280" r="5"/>')
    parts.append('<g class="rose-cardinals"><text x="280" y="25">N</text><text x="535" y="287">E</text><text x="280" y="546">S</text><text x="25" y="287">W</text></g>')
    parts.append('<g class="rose-degrees"><text x="280" y="45">0° / 360°</text><text x="503" y="307">90°</text><text x="280" y="523">180°</text><text x="55" y="307">270°</text></g></svg>')
    return ''.join(parts)


def wrap_comparison_svg():
    """Compare a misleading linear mean with the exact 2° circular separation."""
    cx, cy, radius = 230, 172, 105
    def xy(bearing):
        radians = bearing * pi / 180
        return cx + radius * sin(radians), cy - radius * cos(radians)
    left, right = xy(359), xy(1)
    return f'''<svg class="wrap-circle" viewBox="0 0 460 350" role="img" aria-labelledby="wrap-title wrap-description">
      <title id="wrap-title">359° and 1° are neighbours on a circle</title>
      <desc id="wrap-description">Two observations lie one degree either side of north. Their shortest separation is two degrees. Their circular mean is north, zero degrees. The arithmetic mean, 180 degrees, points south, opposite the observations. Labels use leader lines; angular positions are drawn to scale.</desc>
      <g class="wrap-grid"><circle cx="230" cy="172" r="105"/><path d="M230 57V287M115 172H345"/></g>
      <path class="wrap-vector" d="M230 172L{left[0]:.4f} {left[1]:.4f}M230 172L{right[0]:.4f} {right[1]:.4f}"/>
      <path class="wrap-mean" d="M230 172V71M225 83L230 71L235 83"/>
      <path class="wrap-wrong" d="M230 181V266M225 257L230 267L235 257"/>
      <path class="wrap-short-arc" d="M{left[0]:.4f} {left[1]:.4f} A105 105 0 0 1 {right[0]:.4f} {right[1]:.4f}"/>
      <g class="wrap-observation"><circle cx="{left[0]:.4f}" cy="{left[1]:.4f}" r="1.4"/><circle cx="{right[0]:.4f}" cy="{right[1]:.4f}" r="1.4"/></g>
      <g class="wrap-leaders"><path d="M{left[0]:.4f} {left[1]:.4f}L183 44H129"/><path d="M{right[0]:.4f} {right[1]:.4f}L277 44H330"/></g>
      <g class="wrap-label"><text x="128" y="36" text-anchor="middle">359°</text><text x="332" y="36" text-anchor="middle">1°</text><text x="230" y="26" text-anchor="middle">N · 0°</text><text x="364" y="177">E</text><text x="86" y="177">W</text></g>
      <circle class="wrap-center" cx="230" cy="172" r="3"/>
      <text class="wrap-gap-label" x="248" y="110">2° apart</text>
      <text class="wrap-wrong-label" x="230" y="310" text-anchor="middle">180° points the other way</text>
      <text class="wrap-scale-note" x="230" y="335" text-anchor="middle">Angles drawn to scale</text>
    </svg>'''


def geometry_svg(kind):
    start = '<svg class="geometry-icon" viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">'
    if kind == 'sphere':
        return start + '<circle cx="80" cy="60" r="45"/><ellipse cx="80" cy="60" rx="45" ry="16"/><ellipse cx="80" cy="60" rx="18" ry="45"/><path d="M35 60H125M80 15V105" opacity=".3"/><circle cx="113" cy="42" r="4" fill="currentColor"/></svg>'
    if kind == 'axes':
        return start + '<circle cx="80" cy="60" r="45" stroke-dasharray="3 5"/><path d="M48 92L112 28" stroke-width="2"/><circle cx="48" cy="92" r="4" fill="currentColor"/><circle cx="112" cy="28" r="4" fill="currentColor"/></svg>'
    if kind == 'manifold':
        return start + '<path d="M25 83Q55 5 135 43M25 83Q70 115 135 43M29 72Q72 18 127 54M38 56Q74 35 115 68M51 39Q76 54 99 83M70 27Q80 77 78 96M95 27Q106 60 48 96"/><circle cx="84" cy="60" r="4" fill="currentColor"/></svg>'
    return start + '<circle cx="80" cy="60" r="45"/><path d="M80 60L108 25" stroke-width="2"/><path d="M80 15V105M35 60H125" opacity=".3"/><circle cx="108" cy="25" r="4" fill="currentColor"/><circle cx="92" cy="17" r="3" fill="currentColor"/><circle cx="116" cy="33" r="3" fill="currentColor"/></svg>'
