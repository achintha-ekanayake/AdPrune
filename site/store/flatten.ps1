<#
  Flattens a Chromium screenshot to the formats the Chrome Web Store accepts for
  promo tiles: 24-bit PNG (no alpha) and JPEG. Chromium always writes RGBA, so
  the source is composited onto white first.

  Usage: pwsh -File flatten.ps1 -In tile.png -OutPng tile-24.png -OutJpg tile.jpg
#>
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$OutPng,
  [Parameter(Mandatory = $true)][string]$OutJpg,
  [int]$Quality = 92
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile((Resolve-Path $In).Path)
$size = "$($src.Width)x$($src.Height)"
try {
  $flat = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($flat)
  try {
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  } finally { $g.Dispose() }

  $flat.Save($OutPng, [System.Drawing.Imaging.ImageFormat]::Png)

  $jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
  $flat.Save($OutJpg, $jpg, $params)

  $flat.Dispose()
} finally { $src.Dispose() }

Write-Output "  $(Split-Path -Leaf $OutPng) / $(Split-Path -Leaf $OutJpg)  $size"
