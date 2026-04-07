#!/usr/bin/env python3
"""Download bruidsmeisjes product images into public/images/bruidsmeisjes.

The script crawls the bruidsmeisjes collection page, discovers product pages,
extracts the highest-resolution image for each gallery item on every product
page, and stores them in per-product folders.

Usage:
  python scripts/download_bruidsmeisjes_images.py
  python scripts/download_bruidsmeisjes_images.py --dry-run
  python scripts/download_bruidsmeisjes_images.py --limit 12 --delay-ms 150
"""

from __future__ import annotations

import argparse
import html
import mimetypes
import os
import re
import sys
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen


DEFAULT_START_URL = "https://www.mariagebruidsmode.nl/bruidsmode/bruidsmeisjes-jurken/"
DEFAULT_OUTPUT_DIR = Path("public") / "images" / "bruidsmeisjes"
USER_AGENT = "Mozilla/5.0 (compatible; bruidsmeisjes-image-downloader/1.0)"


def slugify(value: str) -> str:
    text = html.unescape(value or "")
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-") or "product"


def safe_filename(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)


def strip_fragment(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse(parsed._replace(fragment=""))


def is_same_domain(url: str, base: str) -> bool:
    return urlparse(url).netloc.lower() == urlparse(base).netloc.lower()


def is_probable_html_link(url: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.lower()
    if path.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg")):
        return False
    return path.endswith("/") or "." not in Path(path).name


def normalize_url(base_url: str, candidate: str | None) -> str | None:
    if not candidate:
        return None
    candidate = candidate.strip()
    if not candidate or candidate.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    if candidate.startswith("//"):
        candidate = f"{urlparse(base_url).scheme}:{candidate}"
    return strip_fragment(urljoin(base_url, candidate))


def choose_best_srcset(srcset: str | None, base_url: str) -> str | None:
    if not srcset:
        return None

    best_url = None
    best_score = -1.0
    for chunk in srcset.split(","):
      part = chunk.strip()
      if not part:
          continue
      pieces = part.split()
      url = normalize_url(base_url, pieces[0])
      if not url:
          continue

      score = 0.0
      if len(pieces) > 1:
          descriptor = pieces[1].strip().lower()
          m_w = re.match(r"^(\d+)w$", descriptor)
          m_x = re.match(r"^(\d+(?:\.\d+)?)x$", descriptor)
          if m_w:
              score = float(m_w.group(1))
          elif m_x:
              score = float(m_x.group(1)) * 1000.0
      if score <= 0.0:
          score = float(len(url))

      if score > best_score:
          best_score = score
          best_url = url

    return best_url


def guess_extension(url: str, content_type: str | None = None) -> str:
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}:
        return ext
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip().lower())
        if guessed in {".jpe", ".jfif"}:
            return ".jpg"
        if guessed:
            return guessed
    return ".jpg"


def image_key(url: str) -> str:
    parsed = urlparse(url)
    filename = Path(parsed.path).name.lower()
    while True:
        updated = re.sub(r"\.(?:png|jpe?g|webp|gif|avif|svg)$", "", filename)
        if updated == filename:
            break
        filename = updated
    while True:
        updated = re.sub(r"-(?:\d{2,5}x\d{2,5}|scaled)$", "", filename)
        if updated == filename:
            break
        filename = updated
    return filename


def image_priority(url: str) -> tuple[int, int]:
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix.lower()
    order = {
        ".webp": 0,
        ".avif": 1,
        ".jpg": 2,
        ".jpeg": 3,
        ".png": 4,
        ".gif": 5,
        ".svg": 6,
    }
    return (order.get(ext, 99), -len(url))


def fetch_text(url: str) -> tuple[str, str]:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=30) as resp:
        final_url = resp.geturl()
        charset = resp.headers.get_content_charset() or "utf-8"
        body = resp.read().decode(charset, errors="replace")
        return body, final_url


def fetch_binary(url: str) -> tuple[bytes, str | None]:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"})
    with urlopen(req, timeout=60) as resp:
        content_type = resp.headers.get_content_type()
        content_subtype = resp.headers.get_content_subtype()
        full_type = f"{content_type}/{content_subtype}" if content_type and content_subtype else None
        return resp.read(), full_type


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.images: list[dict[str, str]] = []
        self.current_gallery_context = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {k.lower(): v for k, v in attrs if v is not None}
        if tag.lower() == "a":
            href = attrs_map.get("href")
            if href:
                self.links.append(href)

        if tag.lower() in {"img", "source"}:
            self.images.append(attrs_map)


class GalleryCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.images: list[dict[str, str]] = []
        self._stack: list[bool] = []
        self._gallery_depth = 0

    @staticmethod
    def _has_gallery_class(class_name: str | None) -> bool:
        if not class_name:
            return False
        classes = class_name.lower().split()
        return any(
            marker in classes
            for marker in (
                "woocommerce-product-gallery",
                "woocommerce-product-gallery__wrapper",
                "woocommerce-product-gallery__image",
                "flex-control-thumbs",
            )
        )

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {k.lower(): v for k, v in attrs if v is not None}
        is_gallery_root = self._has_gallery_class(attrs_map.get("class"))
        self._stack.append(is_gallery_root)
        if is_gallery_root:
            self._gallery_depth += 1

        if self._gallery_depth > 0 and tag.lower() in {"img", "source"}:
            self.images.append(attrs_map)

    def handle_endtag(self, tag: str) -> None:
        if not self._stack:
            return
        is_gallery_root = self._stack.pop()
        if is_gallery_root:
            self._gallery_depth = max(0, self._gallery_depth - 1)


@dataclass
class ProductPage:
    title: str
    url: str
    slug: str
    image_urls: list[str]


def extract_page_title(html_text: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html_text, flags=re.I | re.S)
    if match:
        return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", match.group(1))).strip())
    match = re.search(r'<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)</h1>', html_text, flags=re.I | re.S)
    if match:
        return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", match.group(1))).strip())
    return "product"


def collect_product_links(collection_html: str, base_url: str) -> list[str]:
    parser = LinkCollector()
    parser.feed(collection_html)

    collection_path = urlparse(base_url).path.rstrip("/")
    discovered: list[str] = []
    for href in parser.links:
        abs_url = normalize_url(base_url, href)
        if not abs_url or not is_same_domain(abs_url, base_url):
            continue
        path = urlparse(abs_url).path.rstrip("/")
        if "/online-bruidsmode/" not in path:
            continue
        if "bruidsmeisjes" not in path:
            continue
        if path == collection_path:
            continue
        if "/page/" in path and path.startswith(collection_path):
            discovered.append(abs_url)
            continue
        if path.startswith("/online-bruidsmode/") and path.count("/") >= 2:
            discovered.append(abs_url)

    seen: set[str] = set()
    unique: list[str] = []
    for url in discovered:
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def collect_pagination_links(collection_html: str, base_url: str) -> list[str]:
    parser = LinkCollector()
    parser.feed(collection_html)
    collection_path = urlparse(base_url).path.rstrip("/")
    urls: list[str] = []
    for href in parser.links:
        abs_url = normalize_url(base_url, href)
        if not abs_url or not is_same_domain(abs_url, base_url):
            continue
        path = urlparse(abs_url).path.rstrip("/")
        if path.startswith(collection_path) and "/page/" in path:
            urls.append(abs_url)
            continue
        if re.search(r"[?&](?:paged|page)=\d+", abs_url):
            urls.append(abs_url)
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def choose_gallery_image(attrs: dict[str, str], base_url: str) -> str | None:
    for key in ("data-large_image", "data-src", "data-lazy-src", "data-original", "src"):
        chosen = normalize_url(base_url, attrs.get(key))
        if chosen:
            return chosen

    srcset = attrs.get("srcset") or attrs.get("data-srcset")
    if srcset:
        return choose_best_srcset(srcset, base_url)

    return None


def collect_product_images(product_html: str, base_url: str) -> list[str]:
    parser = GalleryCollector()
    parser.feed(product_html)

    candidates: list[str] = []
    for attrs in parser.images:
        chosen = choose_gallery_image(attrs, base_url)
        if chosen and "/wp-content/uploads/" in chosen:
            candidates.append(chosen)

    if not candidates:
        regex = re.compile(r'https?://[^"\']+/wp-content/uploads/[^"\']+\.(?:jpg|jpeg|png|webp|avif|gif|svg)(?:\?[^"\']*)?', re.I)
        candidates.extend(match.group(0) for match in regex.finditer(product_html))

    best_by_key: dict[str, str] = {}
    for url in candidates:
        key = image_key(url)
        current = best_by_key.get(key)
        if current is None or image_priority(url) < image_priority(current):
            best_by_key[key] = url

    images = [best_by_key[key] for key in sorted(best_by_key)]
    return images


def discover_products(start_url: str, max_pages: int, max_products: int) -> list[str]:
    queue = [start_url]
    seen_pages: set[str] = set()
    seen_products: set[str] = set()
    product_urls: list[str] = []

    while queue and len(seen_pages) < max_pages:
        current = queue.pop(0)
        if current in seen_pages:
            continue
        seen_pages.add(current)
        try:
            html_text, final_url = fetch_text(current)
        except (HTTPError, URLError, TimeoutError, OSError) as err:
            print(f"[warn] skip page {current}: {err}", file=sys.stderr)
            continue

        product_links = collect_product_links(html_text, final_url)
        for product_url in product_links:
            if product_url in seen_products:
                continue
            seen_products.add(product_url)
            product_urls.append(product_url)
            if len(product_urls) >= max_products:
                return product_urls

        for page_url in collect_pagination_links(html_text, final_url):
            if page_url not in seen_pages:
                queue.append(page_url)

    return product_urls


def download_product(product_url: str, output_dir: Path, dry_run: bool, overwrite: bool, delay_ms: int) -> tuple[str, int]:
    try:
        product_html, final_url = fetch_text(product_url)
    except (HTTPError, URLError, TimeoutError, OSError) as err:
        print(f"[warn] skip product {product_url}: {err}", file=sys.stderr)
        return product_url, 0

    title = extract_page_title(product_html)
    slug = slugify(Path(urlparse(final_url).path.rstrip("/")).name or title)
    images = collect_product_images(product_html, final_url)

    product_dir = output_dir / slug
    if not dry_run:
        product_dir.mkdir(parents=True, exist_ok=True)

    if not images:
        print(f"[warn] no images found for {title} ({final_url})", file=sys.stderr)
        return final_url, 0

    downloaded = 0
    for index, image_url in enumerate(images, start=1):
        try:
            data, content_type = fetch_binary(image_url)
        except (HTTPError, URLError, TimeoutError, OSError) as err:
            print(f"[warn] skip image {image_url}: {err}", file=sys.stderr)
            continue

        ext = guess_extension(image_url, content_type)
        filename = safe_filename(f"{slug}-{index:02d}{ext}")
        target_path = product_dir / filename

        if target_path.exists() and not overwrite:
            print(f"[skip] {target_path.as_posix()}")
            downloaded += 1
            continue

        print(f"[save] {target_path.as_posix()} <- {image_url}")
        if not dry_run:
            target_path.write_bytes(data)
        downloaded += 1
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

    print(f"[done] {title} ({downloaded}/{len(images)} images)")
    return final_url, downloaded


def main() -> int:
    parser = argparse.ArgumentParser(description="Download bruidsmeisjes images from mariagebruidsmode.nl")
    parser.add_argument("--start-url", default=DEFAULT_START_URL, help="Collection page URL to crawl")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for downloaded images")
    parser.add_argument("--dry-run", action="store_true", help="Log actions without writing files")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing files")
    parser.add_argument("--max-pages", type=int, default=20, help="Max collection pages to crawl")
    parser.add_argument("--limit", type=int, default=200, help="Max product pages to download")
    parser.add_argument("--delay-ms", type=int, default=100, help="Delay between image downloads")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    print(f"Start URL : {args.start_url}")
    print(f"Output dir: {output_dir.resolve()}")
    print(f"Mode      : {'dry-run' if args.dry_run else 'download'}")
    print(f"Limit     : {args.limit}")

    product_urls = discover_products(args.start_url, args.max_pages, args.limit)
    print(f"Products  : {len(product_urls)}")

    total_images = 0
    for product_url in product_urls:
        _, count = download_product(
            product_url=product_url,
            output_dir=output_dir,
            dry_run=args.dry_run,
            overwrite=args.overwrite,
            delay_ms=args.delay_ms,
        )
        total_images += count

    print(f"Total images processed: {total_images}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
