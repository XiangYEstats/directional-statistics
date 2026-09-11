"""Initial density plots, available even before browser interaction loads."""

from math import atan, cos, exp, pi, sin, sqrt, tan

from density_math import log_bessel_i0_scaled, log_lavm_density, log_vm_density


def density_panel(kind, location, kappa=2.0):
    angles = [-pi + 2 * pi * i / 1440 for i in range(1441)]
    if kind == "lavm" or kappa >= 1:
        width = min(pi - 1e-9, 8 / sqrt(max(1, kappa)))
        for j in range(385):
            z = -width + 2 * width * j / 384
            angles.append((z + location + pi) % (2 * pi) - pi if kind == "vm" else 2 * atan(tan(z / 2) + location))
    log_scaled = log_bessel_i0_scaled(kappa)
    density = log_vm_density if kind == "vm" else log_lavm_density
    points = [(x, exp(density(x, location, kappa, log_scaled=log_scaled))) for x in sorted(set(angles))]
    peak = max(f for _, f in points)
    scale = 0.25 + 1.1 * peak
    polar, linear = [], []
    for i, (x, f) in enumerate(points):
        command = "L" if i else "M"
        r = 95 + 125 * f / scale
        polar.append(f"{command}{280 + r * cos(x):.3f},{280 - r * sin(x):.3f}")
        linear.append(f"{command}{50 + 480 * (x + pi) / (2 * pi):.3f},{135 - 110 * f / scale:.3f}")
    line = " ".join(linear)
    polar_line = " ".join(polar) + " Z"
    return {"kind": kind, "name": "von Mises" if kind == "vm" else "Link-adjusted von Mises",
            "location": location, "kappa": kappa, "scale": f"{scale:.3g}",
            "polar": polar_line,
            "polar_area": polar_line + " M185,280 A95,95 0 1,0 375,280 A95,95 0 1,0 185,280 Z", "line": line,
            "area": line + " L530,135 L50,135 Z"}


def density_panels():
    return [density_panel("vm", 0.0), density_panel("lavm", 1.0)]
