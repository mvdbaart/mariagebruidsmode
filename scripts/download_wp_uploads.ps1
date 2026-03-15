param(
  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "https://www.mariagebruidsmode.nl",

  [Parameter(Mandatory = $false)]
  [string]$OutDir = ".\downloads\wp-uploads",

  [Parameter(Mandatory = $false)]
  [int]$ThrottleMs = 50,

  [Parameter(Mandatory = $false)]
  [switch]$OptimizedOnly,

  [Parameter(Mandatory = $false)]
  [switch]$NewestFirst,

  [Parameter(Mandatory = $false)]
  [switch]$SkipResized
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-BaseUrl {
  param([string]$Url)
  return $Url.TrimEnd("/")
}

function Get-UploadsRelativePath {
  param([string]$Url)
  $marker = "/wp-content/uploads/"
  $idx = $Url.IndexOf($marker, [System.StringComparison]::OrdinalIgnoreCase)
  if ($idx -lt 0) { return $null }
  return $Url.Substring($idx + $marker.Length)
}

function Add-IfUploadUrl {
  param(
    [System.Collections.Generic.HashSet[string]]$Set,
    [string]$Url
  )
  if ([string]::IsNullOrWhiteSpace($Url)) { return }
  if ($Url -notmatch '^https?://') { return }
  if ($Url -notmatch '/wp-content/uploads/') { return }

  $name = [System.IO.Path]::GetFileName($Url)

  if ($SkipResized -and $name -match '-\d{2,5}x\d{2,5}\.[a-zA-Z0-9]+$') {
    return
  }

  if ($OptimizedOnly) {
    $isOptimizedName = $name -match '(-\d{2,5}x\d{2,5}|-scaled)\.[a-zA-Z0-9]+$' -or $name -match '\.webp($|\?)'
    if (-not $isOptimizedName) { return }
  }
  [void]$Set.Add($Url)
}

function Get-WpApiMediaUrls {
  param([string]$SiteBase)

  $urls = New-Object 'System.Collections.Generic.HashSet[string]'
  $page = 1
  $totalPages = $null

  while ($true) {
    $apiUrl = "$SiteBase/wp-json/wp/v2/media?per_page=100&page=$page&_fields=source_url,media_details"
    Write-Host "API page ${page}: $apiUrl"

    try {
      $resp = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing
    } catch {
      Write-Warning "REST API failed on page ${page}: $($_.Exception.Message)"
      break
    }

    if (-not $totalPages -and $resp.Headers["X-WP-TotalPages"]) {
      $totalPages = [int]$resp.Headers["X-WP-TotalPages"]
    }

    $items = @()
    if ($resp.Content) {
      $items = $resp.Content | ConvertFrom-Json
    }

    if (-not $items -or $items.Count -eq 0) { break }

    foreach ($item in $items) {
      if (-not $OptimizedOnly) {
        Add-IfUploadUrl -Set $urls -Url $item.source_url
      }

      if ($item.media_details -and $item.media_details.sizes) {
        foreach ($prop in $item.media_details.sizes.PSObject.Properties) {
          if ($prop.Value -and $prop.Value.source_url) {
            Add-IfUploadUrl -Set $urls -Url $prop.Value.source_url
          }
        }
      }
    }

    if ($totalPages -and $page -ge $totalPages) { break }
    $page++
  }

  return $urls
}

function Get-SitemapUrls {
  param([string]$SiteBase)

  $pageUrls = New-Object 'System.Collections.Generic.HashSet[string]'
  $sitemapQueue = New-Object System.Collections.Queue
  $visited = New-Object 'System.Collections.Generic.HashSet[string]'

  $rootSitemaps = @(
    "$SiteBase/sitemap_index.xml",
    "$SiteBase/wp-sitemap.xml"
  )

  foreach ($u in $rootSitemaps) { $sitemapQueue.Enqueue($u) }

  while ($sitemapQueue.Count -gt 0) {
    $sitemapUrl = [string]$sitemapQueue.Dequeue()
    if ($visited.Contains($sitemapUrl)) { continue }
    [void]$visited.Add($sitemapUrl)
    Write-Host "Sitemap: $sitemapUrl"

    try {
      [xml]$xml = (Invoke-WebRequest -Uri $sitemapUrl -UseBasicParsing).Content
    } catch {
      continue
    }

    if ($xml.sitemapindex -and $xml.sitemapindex.sitemap) {
      foreach ($sm in $xml.sitemapindex.sitemap) {
        if ($sm.loc) { $sitemapQueue.Enqueue([string]$sm.loc) }
      }
    }

    if ($xml.urlset -and $xml.urlset.url) {
      foreach ($u in $xml.urlset.url) {
        if ($u.loc) { [void]$pageUrls.Add([string]$u.loc) }
      }
    }
  }

  return $pageUrls
}

function Get-CrawledUploadUrls {
  param([string]$SiteBase)

  $uploads = New-Object 'System.Collections.Generic.HashSet[string]'
  $pages = Get-SitemapUrls -SiteBase $SiteBase

  if ($pages.Count -eq 0) {
    Write-Warning "No sitemap pages found. Falling back to homepage crawl only."
    [void]$pages.Add($SiteBase + "/")
  }

  $i = 0
  foreach ($page in $pages) {
    $i++
    Write-Host "Crawl page $i/$($pages.Count): $page"
    try {
      $html = (Invoke-WebRequest -Uri $page -UseBasicParsing).Content
    } catch {
      continue
    }

    $srcMatches = [regex]::Matches($html, '(?i)(src|data-src)=["'']([^"'']+)["'']')
    foreach ($m in $srcMatches) {
      $url = $m.Groups[2].Value
      if ($url.StartsWith("//")) { $url = "https:$url" }
      if ($url.StartsWith("/")) { $url = "$SiteBase$url" }
      Add-IfUploadUrl -Set $uploads -Url $url
    }

    $srcsetMatches = [regex]::Matches($html, '(?i)srcset=["'']([^"'']+)["'']')
    foreach ($m in $srcsetMatches) {
      $parts = $m.Groups[1].Value.Split(",")
      foreach ($part in $parts) {
        $url = $part.Trim().Split(" ")[0]
        if ([string]::IsNullOrWhiteSpace($url)) { continue }
        if ($url.StartsWith("//")) { $url = "https:$url" }
        if ($url.StartsWith("/")) { $url = "$SiteBase$url" }
        Add-IfUploadUrl -Set $uploads -Url $url
      }
    }
  }

  return $uploads
}

function Download-Uploads {
  param(
    [System.Collections.Generic.HashSet[string]]$Urls,
    [string]$OutputPath,
    [int]$DelayMs
  )

  if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
  }

  if ($NewestFirst) {
    $ordered = @($Urls) | Sort-Object -Descending
  } else {
    $ordered = @($Urls) | Sort-Object
  }
  $total = $ordered.Count
  $done = 0

  foreach ($url in $ordered) {
    $done++
    $rel = Get-UploadsRelativePath -Url $url
    if (-not $rel) { continue }

    $target = Join-Path $OutputPath $rel
    $targetDir = Split-Path $target -Parent
    if (-not (Test-Path $targetDir)) {
      New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    if (Test-Path $target) {
      Write-Host "[$done/$total] Skip existing: $rel"
      continue
    }

    Write-Host "[$done/$total] Download: $rel"
    try {
      Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
    } catch {
      Write-Warning "Failed: $url"
    }

    if ($DelayMs -gt 0) {
      Start-Sleep -Milliseconds $DelayMs
    }
  }
}

$site = Normalize-BaseUrl -Url $BaseUrl
Write-Host "Base URL: $site"
Write-Host "Output:   $OutDir"
$modeLabel = "all-uploads"
if ($OptimizedOnly) { $modeLabel = "optimized-only" }
Write-Host "Mode:     $modeLabel"
Write-Host "Order:    $(if ($NewestFirst) { 'newest-first' } else { 'oldest-first' })"
Write-Host "SkipResized: $SkipResized"

$uploadUrls = Get-WpApiMediaUrls -SiteBase $site
if ($null -eq $uploadUrls) {
  $uploadUrls = New-Object 'System.Collections.Generic.HashSet[string]'
}
if ($uploadUrls -isnot [System.Collections.Generic.HashSet[string]]) {
  $normalized = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($u in @($uploadUrls)) {
    Add-IfUploadUrl -Set $normalized -Url ([string]$u)
  }
  $uploadUrls = $normalized
}

if ($uploadUrls.Count -eq 0) {
  Write-Warning "REST API returned no media URLs. Trying sitemap/page crawl..."
  $uploadUrls = Get-CrawledUploadUrls -SiteBase $site
}

Write-Host "Found $($uploadUrls.Count) upload URLs."
if ($uploadUrls.Count -eq 0) {
  throw "No upload URLs found. Check if site/API is reachable or protected."
}

Download-Uploads -Urls $uploadUrls -OutputPath $OutDir -DelayMs $ThrottleMs
Write-Host "Done."
