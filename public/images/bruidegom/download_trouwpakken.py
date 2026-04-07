#!/usr/bin/env python3
"""
Download en organiseer ALLE afbeeldingen (galerij) van trouwpakken - Mariage Bruidsmode
Mappenstructuur: Trouwpakken / Merk / Kleur / Productnaam / afbeelding_1.jpg, afbeelding_2.jpg ...

Gebruik: python download_trouwpakken.py
Vereisten: pip install requests beautifulsoup4
"""

import os
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlparse

# --- Instellingen ---
BASE_URL = "https://www.mariagebruidsmode.nl/bruidsmode/trouwpakken/"
OUTPUT_DIR = Path("Trouwpakken")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
DELAY = 0.4   # seconden wachten tussen requests (beleefd crawlen)

# --- Merk- en kleur-detectie ---
def get_brand(name):
    l = name.lower()
    if "immediate" in l:         return "Immediate"
    if "crinol" in l:            return "Crinoligne"   # dekt ook typefout 'crinologine'
    if "vicentti" in l:          return "Roberto Vicentti"
    if "cleofe" in l or "finati" in l: return "Cleofe Finati"
    return "Overig"

def get_type(name):
    l = name.lower()
    if any(w in l for w in ["beige","ecru","camel","sand","ivory","cream"]): return "Beige"
    if any(w in l for w in ["grijs","grey","gray","antraciet"]):             return "Grijs"
    if any(w in l for w in ["blauw","blue","navy","marine"]):                return "Blauw"
    if any(w in l for w in ["groen","green","vert"]):                        return "Groen"
    if any(w in l for w in ["bordeaux","roze","rose","pink","rood","terra"]): return "Bordeaux-Rood"
    if any(w in l for w in ["bruin","brown","cognac","brun"]):               return "Bruin"
    if any(w in l for w in ["zwart","black","noir"]):                        return "Zwart"
    if any(w in l for w in ["wit","white","blanc"]):                         return "Wit"
    return "Klassiek"

def safe_name(text, max_len=80):
    """Verwijder/vervang tekens die niet in bestandsnamen mogen."""
    text = re.sub(r"[–—]", "-", text)
    text = re.sub(r'[\\/*?:"<>|]', "", text)
    return text.strip()[:max_len]

# --- Pagina's scrapen: lijst van producten ---
def get_product_list():
    """Scrape alle pagina's en retourneer lijst van {name, page_url}."""
    products = []
    page = 1
    while True:
        url = BASE_URL if page == 1 else f"{BASE_URL}page/{page}/"
        print(f"  Overzichtspagina {page} ophalen...")
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            break
        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select(".product")
        if not items:
            break
        for item in items:
            name_el = item.select_one(".woocommerce-loop-product__title")
            link_el = item.select_one("a.woocommerce-LoopProduct-link")
            if name_el and link_el:
                products.append({
                    "name": name_el.get_text(strip=True),
                    "page_url": link_el["href"]
                })
        next_btn = soup.select_one("a.next")
        if not next_btn:
            break
        page += 1
        time.sleep(DELAY)
    return products

# --- Galerij-afbeeldingen ophalen van een productpagina ---
def get_gallery_images(page_url):
    """
    Bezoek productpagina en retourneer lijst van volledige afbeelding-URLs.
    Prioriteit: WooCommerce gallery-links → JSON-LD → og:image fallback.
    """
    resp = requests.get(page_url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # 1. WooCommerce product gallery (meest betrouwbaar)
    gallery_links = soup.select(".woocommerce-product-gallery__image a[href]")
    if gallery_links:
        return [a["href"] for a in gallery_links if "wp-content/uploads" in a["href"]]

    # 2. Alle grote product-afbeeldingen via data-large_image
    imgs = soup.select(".woocommerce-product-gallery__image img[data-large_image]")
    if imgs:
        return list({img["data-large_image"] for img in imgs})

    # 3. Fallback: og:image metatag
    og = soup.select_one('meta[property="og:image"]')
    if og and og.get("content"):
        return [og["content"]]

    return []

# --- Afbeelding downloaden ---
def download_image(url, save_path):
    resp = requests.get(url, headers=HEADERS, stream=True, timeout=30)
    resp.raise_for_status()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "wb") as f:
        for chunk in resp.iter_content(8192):
            f.write(chunk)

# --- Hoofd-logica ---
def main():
    print("=" * 55)
    print("  Mariage Trouwpakken — Galerij Downloader")
    print("=" * 55)
    print()

    print("Stap 1: Productenlijst ophalen van alle pagina's...")
    products = get_product_list()
    print(f"  → {len(products)} producten gevonden.\n")

    totaal_producten = len(products)
    totaal_fotos = 0
    fotos_geslaagd = 0
    mislukt = []

    print("Stap 2: Per product alle galerij-foto's downloaden...\n")

    for i, p in enumerate(products, 1):
        name     = p["name"]
        page_url = p["page_url"]
        brand    = get_brand(name)
        ptype    = get_type(name)
        folder   = OUTPUT_DIR / brand / ptype / safe_name(name)

        print(f"[{i:02d}/{totaal_producten}] {brand} / {ptype} / {safe_name(name, 40)}")

        # Galerij-URLs ophalen
        try:
            img_urls = get_gallery_images(page_url)
            time.sleep(DELAY)
        except Exception as e:
            print(f"           ✗ Fout bij ophalen pagina: {e}")
            mislukt.append({"product": name, "url": page_url, "fout": str(e)})
            continue

        if not img_urls:
            print(f"           ⚠ Geen afbeeldingen gevonden op {page_url}")
            continue

        print(f"           {len(img_urls)} foto(s) gevonden")
        totaal_fotos += len(img_urls)

        # Download elke foto
        for j, img_url in enumerate(img_urls, 1):
            ext = Path(urlparse(img_url).path).suffix or ".jpg"
            filename = f"{safe_name(name)}_{j:02d}{ext}"
            save_path = folder / filename

            if save_path.exists():
                print(f"           [{j}] Al aanwezig, overgeslagen.")
                fotos_geslaagd += 1
                continue

            try:
                download_image(img_url, save_path)
                fotos_geslaagd += 1
                print(f"           [{j}] ✓ {filename}")
                time.sleep(DELAY)
            except Exception as e:
                print(f"           [{j}] ✗ Fout: {e}")
                mislukt.append({"product": name, "foto": img_url, "fout": str(e)})

    # --- Samenvatting ---
    print()
    print("=" * 55)
    print("  KLAAR!")
    print("=" * 55)
    print(f"  Producten verwerkt : {totaal_producten}")
    print(f"  Foto's gevonden    : {totaal_fotos}")
    print(f"  Foto's gedownload  : {fotos_geslaagd}")
    print(f"  Mislukt            : {len(mislukt)}")
    if mislukt:
        print("\n  Mislukte downloads:")
        for m in mislukt:
            print(f"    - {m.get('product','?')}: {m['fout']}")
    print(f"\n  Opgeslagen in: {OUTPUT_DIR.resolve()}")

    # Mappenstructuur overzicht
    print("\n  Mappenstructuur:")
    for brand_dir in sorted(OUTPUT_DIR.iterdir()):
        if brand_dir.is_dir():
            for type_dir in sorted(brand_dir.iterdir()):
                if type_dir.is_dir():
                    n_products = sum(1 for d in type_dir.iterdir() if d.is_dir())
                    n_photos   = sum(1 for f in type_dir.rglob("*") if f.is_file())
                    print(f"    {brand_dir.name} / {type_dir.name}: "
                          f"{n_products} producten, {n_photos} foto's")

if __name__ == "__main__":
    main()
