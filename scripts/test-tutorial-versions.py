"""Regression checks for stale embedded tutorial documents. Uses temporary copies."""

from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build as builder
import validate as validator


class TutorialVersionTests(unittest.TestCase):
    def test_current_build(self):
        with redirect_stdout(StringIO()):
            validator.validate(ROOT / "docs")

    def test_stale_document_urls_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="tutorial-version-test-") as temporary:
            output = Path(temporary) / "docs"
            shutil.copytree(ROOT / "docs", output)
            page = output / "tutorials" / "pc-prior" / "index.html"
            doc = validator.Document(page)
            current_url = doc.iframes[0]["src"]
            stale_url = current_url.split("?", 1)[0] + "?v=outdated"
            page.write_text(page.read_text().replace(current_url, stale_url))
            with self.assertRaisesRegex(ValueError, "current content version"):
                validator.validate(output)

    def test_replacing_html_changes_url_even_with_preserved_timestamp(self):
        with tempfile.TemporaryDirectory(prefix="tutorial-version-test-") as temporary:
            fixture = Path(temporary)
            for folder in ("templates", "static", "content"):
                shutil.copytree(ROOT / folder, fixture / folder)
            output = fixture / "docs"
            with patch.object(builder, "ROOT", fixture), patch.object(builder, "OUTPUT", output), \
                    patch.object(validator, "ROOT", fixture), redirect_stdout(StringIO()):
                builder.build()
                page = output / "tutorials" / "pc-prior" / "index.html"
                first_url = validator.Document(page).iframes[0]["src"]
                source = fixture / "content" / "tutorials" / "pc-prior" / "pc_prior.html"
                original_stat = source.stat()
                source.write_bytes(source.read_bytes() + b"\n<!-- version-regression-test -->\n")
                os.utime(source, ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
                builder.build()
                second_url = validator.Document(page).iframes[0]["src"]
                self.assertNotEqual(first_url, second_url)
                self.assertEqual(first_url.split("?")[0], second_url.split("?")[0])
                self.assertEqual(source.read_bytes(), (output / "assets" / "tutorials" / "pc-prior" / "pc_prior.html").read_bytes())


if __name__ == "__main__":
    unittest.main()
