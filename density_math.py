"""Stable circular densities and build-time constants for the density explorer.

This is a standard-library translation of the density calculations in Xiang Ye's
``vm/vm.R`` and ``lavm/lavm.R``.  The browser receives a small table of log-scaled
Bessel values; it never evaluates exp(kappa) or an unscaled large Bessel value.

The Bessel implementation uses the positive series in DLMF 10.25.2 for kappa <=
50, and the exponentially scaled asymptotic expansion in DLMF 10.40.1, with the
coefficients from 10.17.1, above 50.  The latter includes the large-kappa regime
(> 1e5) handled by the R approximation, retaining more correction terms.

References: https://dlmf.nist.gov/10.25.E2,
https://dlmf.nist.gov/10.40.E1, https://dlmf.nist.gov/10.17.E1.
"""

from __future__ import annotations

import math


TAU = 2.0 * math.pi
LOG_TAU = math.log(TAU)
KAPPA_MAX = 100
KAPPA_STEP = 0.1


def _finite(value: float, name: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError(f"{name} must be finite") from error
    if not math.isfinite(result):
        raise ValueError(f"{name} must be finite")
    return result


def _concentration(kappa: float) -> float:
    kappa = _finite(kappa, "kappa")
    if kappa < 0.0:
        raise ValueError("kappa must be non-negative")
    return kappa


def log_bessel_i0_scaled(kappa: float) -> float:
    """Return log(exp(-kappa) I_0(kappa)) for finite, non-negative kappa.

    No SciPy, R, compiler, or runtime numerical service is required.  The
    unscaled positive series is used only where its largest values are safely
    below overflow.  log1p preserves the small-kappa correction.  Above that
    range, summing the scaled asymptotic correction avoids exp(kappa) entirely.
    """
    kappa = _concentration(kappa)
    if kappa == 0.0:
        return 0.0
    if kappa <= 50.0:
        quarter_square = (kappa / 2.0) ** 2
        term = 1.0
        terms = []
        approximate_total = 1.0
        for order in range(1, 1000):
            term *= quarter_square / (order * order)
            terms.append(term)
            approximate_total += term
            if term <= 1e-17 * approximate_total:
                break
        return math.log1p(math.fsum(terms)) - kappa

    # I0e(k) ~ (2*pi*k)^(-1/2) * [1 + 1/(8k) + 9/(128k²) + ...].
    # The recurrence stays scaled, even for k near the largest finite float.
    # Stop before growing terms: this is asymptotic, not a convergent series.
    term = 1.0
    corrections = []
    for order in range(1, 1000):
        next_term = term * (((2 * order - 1) ** 2 / (8.0 * order)) / kappa)
        if next_term >= term:
            break
        corrections.append(next_term)
        term = next_term
        if term < 1e-17:
            break
    return -0.5 * (LOG_TAU + math.log(kappa)) + math.log1p(math.fsum(corrections))


def _scaled_normalizer(kappa: float, log_scaled: float | None) -> float:
    if log_scaled is None:
        return log_bessel_i0_scaled(kappa)
    return _finite(log_scaled, "log_scaled")


def log_vm_density(
    x: float, mu: float, kappa: float, log_scaled: float | None = None
) -> float:
    """Log von Mises density, with angles x and mu in radians.

    An optional log_scaled value must be log_bessel_i0_scaled(kappa); callers
    drawing a curve can compute it once and reuse it for every angle.
    """
    x = _finite(x, "x")
    mu = _finite(mu, "mu")
    kappa = _concentration(kappa)
    normalizer = _scaled_normalizer(kappa, log_scaled)
    # Reducing each angle first also avoids overflow in x - mu.
    half_difference = (math.remainder(x, TAU) - math.remainder(mu, TAU)) / 2.0
    sine = math.sin(half_difference)
    return -kappa * (2.0 * sine * sine) - LOG_TAU - normalizer


def log_lavm_density(
    x: float, eta: float, kappa: float, log_scaled: float | None = None
) -> float:
    """Log link-adjusted von Mises density, extended periodically at +/-pi.

    For the R transformation y=tan(x/2), u=y-eta, z=2*atan(u), let
    c=cos(x/2), a=sin(x/2)-eta*c, and h=hypot(c,a).  Then
    sin(z/2)^2=(a/h)^2 and the log-Jacobian is -2*log(h).  This equivalent
    expression avoids tan poles, squared overflow, and cancellation between
    large logarithms at the circle's seam.
    """
    x = _finite(x, "x")
    eta = _finite(eta, "eta")
    kappa = _concentration(kappa)
    normalizer = _scaled_normalizer(kappa, log_scaled)
    x = math.remainder(x, TAU)
    if abs(x) == math.pi:
        # Exact endpoint limit, independent of eta (do not approximate cos(pi/2)).
        return -kappa * 2.0 - LOG_TAU - normalizer
    c = math.cos(x / 2.0)
    a = math.sin(x / 2.0) - eta * c
    h = math.hypot(c, a)
    sine = a / h
    return -kappa * (2.0 * sine * sine) - LOG_TAU - normalizer - 2.0 * math.log(h)


def density_settings() -> dict[str, int | float | list[float]]:
    """Build the exact log-Bessel lookup table for all explorer slider stops.

    Slider index j represents kappa=j/10.  Runtime JavaScript evaluates the
    densities at arbitrary angles using this normalizer; plotted densities
    are not re-normalized samples or a lookup of pre-rendered pictures.
    """
    return {
        "mu_min": -math.pi,
        "mu_max": math.pi,
        "kappa_max": KAPPA_MAX,
        "kappa_step": KAPPA_STEP,
        "log_bessel_scaled": [
            log_bessel_i0_scaled(index / 10.0)
            for index in range(KAPPA_MAX * 10 + 1)
        ],
    }
