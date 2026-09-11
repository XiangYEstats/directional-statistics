#!/usr/bin/env python3
"""Dependency-free checks for the circular-density explorer's Python reference."""

from decimal import Decimal, localcontext
import json
import math
from pathlib import Path
import sys
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from density_math import (  # noqa: E402
    density_settings,
    log_bessel_i0_scaled,
    log_lavm_density,
    log_vm_density,
)


TAU = 2.0 * math.pi


def decimal_log_i0_scaled(kappa):
    """Independent 70-digit convergent-series reference, safe through kappa=100."""
    with localcontext() as context:
        context.prec = 70
        k = Decimal(str(kappa))
        q = k * k / 4
        term = Decimal(1)
        total = term
        for order in range(1, 2000):
            term *= q / (order * order)
            updated = total + term
            if updated == total:
                break
            total = updated
        return float(total.ln() - k)


class DensityMathTests(unittest.TestCase):
    def test_bessel_against_high_precision_series(self):
        for kappa in (0, 1e-12, 0.001, 0.1, 1, 5, 20, 49.9, 50, 50.0001, 50.1, 75, 100):
            with self.subTest(kappa=kappa):
                self.assertAlmostEqual(
                    log_bessel_i0_scaled(kappa),
                    decimal_log_i0_scaled(kappa),
                    delta=1.5e-14,
                )

    def test_bessel_against_r_scaled_bessel(self):
        # Generated using R's log(besselI(kappa, 0, expon.scaled=TRUE)).
        references = {
            0.1: -0.09750156076612379,
            1: -0.76408564149282132,
            2: -1.1760064585170438,
            10: -2.0570279168813039,
            50: -2.8724244981281957,
            100: -3.220267310057416,
            1000: -4.3726911101305346,
            100000: -6.675400015683536,
        }
        for kappa, reference in references.items():
            with self.subTest(kappa=kappa):
                self.assertAlmostEqual(log_bessel_i0_scaled(kappa), reference, delta=1.5e-14)

    def test_large_kappa_uses_stable_scaled_asymptotic(self):
        for kappa in (100000.1, 1e6, 1e12, 1e308):
            with self.subTest(kappa=kappa):
                reference = -0.5 * (math.log(TAU) + math.log(kappa)) + 0.125 / kappa
                actual = log_bessel_i0_scaled(kappa)
                self.assertTrue(math.isfinite(actual))
                # Higher-order terms contribute O(kappa^-2), below 6.3e-12 here.
                self.assertAlmostEqual(actual, reference, delta=6.3e-12)
        self.assertTrue(math.isfinite(log_vm_density(0, 0, 1e6)))
        self.assertTrue(math.isfinite(log_vm_density(math.pi, 0, 1e6)))
        for eta in (-5, -4, 0, 4, 5):
            self.assertTrue(math.isfinite(log_lavm_density(2 * math.atan(eta), eta, 1e6)))
            self.assertTrue(math.isfinite(log_lavm_density(math.pi, eta, 1e6)))

    def test_vm_matches_stated_formula(self):
        for x in (-3, -1, 0, 0.9, 3):
            for mu in (-2, 0, 1.1):
                for kappa in (0, 0.1, 1, 10, 30):
                    log_i0 = decimal_log_i0_scaled(kappa) + kappa
                    reference = kappa * math.cos(x - mu) - math.log(TAU) - log_i0
                    self.assertAlmostEqual(log_vm_density(x, mu, kappa), reference, delta=2e-14)

    def test_lavm_matches_stated_formula_and_r_transform(self):
        for x in (-3, -1, 0, 0.9, 3):
            for eta in (-5, -4, -1, 0, 1, 4, 5):
                for kappa in (0, 0.1, 1, 10, 30):
                    y = math.tan(x / 2)
                    u = y - eta
                    z = 2 * math.atan(u)
                    denominator = 1 + eta * eta - eta * math.sin(x) - eta * eta * math.sin(x / 2) ** 2
                    log_i0 = decimal_log_i0_scaled(kappa) + kappa
                    formula = kappa * math.cos(z) - math.log(TAU) - log_i0 - math.log(denominator)
                    r_transform = log_vm_density(z, 0, kappa) + math.log1p(y * y) - math.log1p(u * u)
                    actual = log_lavm_density(x, eta, kappa)
                    self.assertAlmostEqual(actual, formula, delta=6e-14)
                    self.assertAlmostEqual(actual, r_transform, delta=6e-14)

    def test_density_normalization_over_circle(self):
        count = 16384
        width = TAU / count
        points = [-math.pi + (index + 0.5) * width for index in range(count)]
        for kappa in (0, 0.1, 1, 10, 100):
            log_scaled = log_bessel_i0_scaled(kappa)
            for mu in (-math.pi, -1.1, 0, 2.3):
                with self.subTest(distribution="vm", kappa=kappa, mu=mu):
                    integral = width * math.fsum(math.exp(log_vm_density(x, mu, kappa, log_scaled)) for x in points)
                    self.assertAlmostEqual(integral, 1, delta=2e-12)
            for eta in (-5, -4, -1, 0, 1, 4, 5):
                with self.subTest(distribution="lavm", kappa=kappa, eta=eta):
                    integral = width * math.fsum(math.exp(log_lavm_density(x, eta, kappa, log_scaled)) for x in points)
                    self.assertAlmostEqual(integral, 1, delta=2e-12)

    def test_eta_zero_identity_reflection_and_endpoints(self):
        for kappa in (0, 0.1, 5, 100, 1e6):
            for x in (-math.pi, -2.5, 0, 0.9, math.pi):
                self.assertAlmostEqual(log_lavm_density(x, 0, kappa), log_vm_density(x, 0, kappa), delta=5e-10)
                for eta in (-5, -4, 0, 4, 5):
                    self.assertEqual(log_lavm_density(-x, -eta, kappa), log_lavm_density(x, eta, kappa))
                    self.assertAlmostEqual(log_lavm_density(x + TAU, eta, kappa), log_lavm_density(x, eta, kappa), delta=1e-8)
            for eta in (-5, -4, 0, 4, 5):
                self.assertEqual(log_lavm_density(-math.pi, eta, kappa), log_lavm_density(math.pi, eta, kappa))
                self.assertEqual(log_lavm_density(math.pi, eta, kappa), log_vm_density(math.pi, 0, kappa))

    def test_uniform_cases_and_nonuniform_lavm_at_kappa_zero(self):
        uniform = -math.log(TAU)
        for x in (-math.pi, -2, 0, 1.5, math.pi):
            self.assertEqual(log_vm_density(x, 1.2, 0), uniform)
            self.assertAlmostEqual(log_lavm_density(x, 0, 0), uniform, delta=1e-15)
        self.assertNotAlmostEqual(log_lavm_density(0, 2, 0), log_lavm_density(math.pi, 2, 0))

    def test_lookup_matches_all_slider_positions(self):
        settings = density_settings()
        self.assertEqual(settings["kappa_max"], 100)
        self.assertEqual(settings["kappa_step"], 0.1)
        table = settings["log_bessel_scaled"]
        self.assertEqual(len(table), 1001)
        self.assertEqual(table[0], 0)
        self.assertTrue(all(left > right for left, right in zip(table, table[1:])))
        for index, value in enumerate(table):
            kappa = index / 10
            self.assertEqual(value, log_bessel_i0_scaled(kappa))
            self.assertEqual(log_vm_density(0.7, -0.2, kappa, value), log_vm_density(0.7, -0.2, kappa))
            self.assertEqual(log_lavm_density(0.7, 1.2, kappa, value), log_lavm_density(0.7, 1.2, kappa))
        json.dumps(settings, allow_nan=False)

    def test_invalid_parameters_raise(self):
        for invalid in (math.nan, math.inf, -math.inf, None):
            for call in (
                lambda: log_bessel_i0_scaled(invalid),
                lambda: log_vm_density(invalid, 0, 1),
                lambda: log_vm_density(0, invalid, 1),
                lambda: log_vm_density(0, 0, invalid),
                lambda: log_lavm_density(invalid, 0, 1),
                lambda: log_lavm_density(0, invalid, 1),
                lambda: log_lavm_density(0, 0, invalid),
            ):
                with self.assertRaises(ValueError):
                    call()
        for invalid in (math.nan, math.inf, -math.inf):
            with self.assertRaises(ValueError):
                log_vm_density(0, 0, 1, invalid)
            with self.assertRaises(ValueError):
                log_lavm_density(0, 0, 1, invalid)
        with self.assertRaises(ValueError):
            log_bessel_i0_scaled(-1)
        with self.assertRaises(ValueError):
            log_vm_density(0, 0, -1)
        with self.assertRaises(ValueError):
            log_lavm_density(0, 0, -1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
