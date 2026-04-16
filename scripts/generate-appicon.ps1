param(
  [string]$OutputPath = "..\assets\appicon.png",
  [int]$Size = 1024
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-Color {
  param(
    [Parameter(Mandatory = $true)][string]$Hex,
    [int]$Alpha = 255
  )

  $value = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-VerticalBrush {
  param(
    [float]$X,
    [float]$Top,
    [float]$Bottom,
    [string[]]$Colors,
    [float[]]$Positions
  )

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($X, $Top)),
    (New-Object System.Drawing.PointF($X, $Bottom)),
    ([System.Drawing.Color]::Black),
    ([System.Drawing.Color]::White)
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = $Colors | ForEach-Object { New-Color $_ }
  $blend.Positions = $Positions
  $brush.InterpolationColors = $blend
  return $brush
}

function New-DiagonalBrush {
  param(
    [float]$X1,
    [float]$Y1,
    [float]$X2,
    [float]$Y2,
    [string[]]$Colors,
    [float[]]$Positions
  )

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($X1, $Y1)),
    (New-Object System.Drawing.PointF($X2, $Y2)),
    ([System.Drawing.Color]::Black),
    ([System.Drawing.Color]::White)
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = $Colors | ForEach-Object { New-Color $_ }
  $blend.Positions = $Positions
  $brush.InterpolationColors = $blend
  return $brush
}

function Draw-Orb {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [System.Drawing.Color]$CenterColor
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($X, $Y, $Width, $Height)
  $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $brush.CenterColor = $CenterColor
  $brush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $CenterColor))
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function New-PagePath {
  param(
    [ValidateSet("Left", "Right")][string]$Side
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath

  if ($Side -eq "Left") {
    $path.StartFigure()
    $path.AddBezier(330, 332, 306, 340, 286, 370, 286, 404)
    $path.AddBezier(286, 404, 279, 510, 286, 667, 342, 744)
    $path.AddBezier(342, 744, 396, 739, 455, 726, 492, 704)
    $path.AddBezier(492, 704, 486, 612, 486, 420, 498, 312)
    $path.AddBezier(498, 312, 474, 298, 388, 301, 330, 332)
    $path.CloseFigure()
  }
  else {
    $path.StartFigure()
    $path.AddBezier(694, 332, 718, 340, 738, 370, 738, 404)
    $path.AddBezier(738, 404, 745, 510, 738, 667, 682, 744)
    $path.AddBezier(682, 744, 628, 739, 569, 726, 532, 704)
    $path.AddBezier(532, 704, 538, 612, 538, 420, 526, 312)
    $path.AddBezier(526, 312, 550, 298, 636, 301, 694, 332)
    $path.CloseFigure()
  }

  return $path
}

function Draw-TranslatedPath {
  param(
    [System.Drawing.Drawing2D.GraphicsPath]$Path,
    [float]$OffsetX,
    [float]$OffsetY
  )

  $clone = $Path.Clone()
  $matrix = New-Object System.Drawing.Drawing2D.Matrix
  $matrix.Translate($OffsetX, $OffsetY)
  $clone.Transform($matrix)
  $matrix.Dispose()
  return $clone
}

function Draw-PageSurface {
  param(
    [System.Drawing.Graphics]$Graphics,
    [ValidateSet("Left", "Right")][string]$Side
  )

  $path = New-PagePath -Side $Side
  $shadowPath = Draw-TranslatedPath -Path $path -OffsetX 14 -OffsetY 26
  $shadowBrush = New-Object System.Drawing.SolidBrush((New-Color "#07111B" 62))
  $Graphics.FillPath($shadowBrush, $shadowPath)

  if ($Side -eq "Left") {
    $pageBrush = New-DiagonalBrush 320 300 520 760 @("#FFFDF8", "#F4EEE4", "#E6DACA") @(0.0, 0.58, 1.0)
  }
  else {
    $pageBrush = New-DiagonalBrush 704 300 512 760 @("#FFFDF8", "#F3EDE3", "#E4D7C6") @(0.0, 0.58, 1.0)
  }

  $Graphics.FillPath($pageBrush, $path)

  $outlinePen = New-Object System.Drawing.Pen((New-Color "#F7F2E8" 150), 5)
  $Graphics.DrawPath($outlinePen, $path)

  $highlightPen = New-Object System.Drawing.Pen((New-Color "#FFFFFF" 78), 7)
  $highlightPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $highlightPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $detailPen = New-Object System.Drawing.Pen((New-Color "#B6A790" 86), 16)
  $detailPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $detailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $accentPen = New-Object System.Drawing.Pen((New-Color "#C7A66C" 72), 14)
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $spinePen = New-Object System.Drawing.Pen((New-Color "#B8A890" 88), 8)
  $spinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $spinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  if ($Side -eq "Left") {
    $Graphics.DrawLine($highlightPen, 350, 348, 470, 318)
    $Graphics.DrawLine($detailPen, 356, 410, 462, 396)
    $Graphics.DrawLine($accentPen, 368, 486, 454, 478)
    $Graphics.DrawLine($spinePen, 494, 328, 490, 690)
  }
  else {
    $Graphics.DrawLine($highlightPen, 674, 348, 554, 318)
    $Graphics.DrawLine($detailPen, 562, 396, 668, 410)
    $Graphics.DrawLine($accentPen, 570, 478, 656, 486)
    $Graphics.DrawLine($spinePen, 530, 328, 534, 690)
  }

  $spinePen.Dispose()
  $accentPen.Dispose()
  $detailPen.Dispose()
  $highlightPen.Dispose()
  $outlinePen.Dispose()
  $pageBrush.Dispose()
  $shadowBrush.Dispose()
  $shadowPath.Dispose()
  $path.Dispose()
}

function Draw-Bookmark {
  param(
    [System.Drawing.Graphics]$Graphics
  )

  $shadowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $shadowPath.AddPolygon([System.Drawing.PointF[]]@(
      (New-Object System.Drawing.PointF(483, 194)),
      (New-Object System.Drawing.PointF(553, 194)),
      (New-Object System.Drawing.PointF(553, 464)),
      (New-Object System.Drawing.PointF(518, 434)),
      (New-Object System.Drawing.PointF(483, 464))
    ))
  $shadowBrush = New-Object System.Drawing.SolidBrush((New-Color "#151109" 74))
  $Graphics.FillPath($shadowBrush, $shadowPath)
  $shadowBrush.Dispose()
  $shadowPath.Dispose()

  $ribbonPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $ribbonPath.AddPolygon([System.Drawing.PointF[]]@(
      (New-Object System.Drawing.PointF(477, 180)),
      (New-Object System.Drawing.PointF(547, 180)),
      (New-Object System.Drawing.PointF(547, 450)),
      (New-Object System.Drawing.PointF(512, 420)),
      (New-Object System.Drawing.PointF(477, 450))
    ))

  $ribbonBrush = New-VerticalBrush 512 180 450 @("#F2E0B4", "#D2A45B", "#93662B") @(0.0, 0.54, 1.0)
  $Graphics.FillPath($ribbonBrush, $ribbonPath)

  $edgePen = New-Object System.Drawing.Pen((New-Color "#FFF2CF" 140), 4)
  $edgePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $edgePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Graphics.DrawLine($edgePen, 479, 182, 545, 182)

  $shinePen = New-Object System.Drawing.Pen((New-Color "#FFFFFF" 78), 8)
  $shinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Graphics.DrawLine($shinePen, 493, 204, 493, 392)

  $shinePen.Dispose()
  $edgePen.Dispose()
  $ribbonBrush.Dispose()
  $ribbonPath.Dispose()
}

function New-ResizedBitmap {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [int]$TargetSize
  )

  $resizedBitmap = New-Object System.Drawing.Bitmap($TargetSize, $TargetSize)
  $graphics = [System.Drawing.Graphics]::FromImage($resizedBitmap)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($SourceBitmap, 0, 0, $TargetSize, $TargetSize)
  }
  finally {
    $graphics.Dispose()
  }

  return $resizedBitmap
}

function Get-PngBytes {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [int]$TargetSize
  )

  $memoryStream = New-Object System.IO.MemoryStream
  $resizedBitmap = New-ResizedBitmap -SourceBitmap $SourceBitmap -TargetSize $TargetSize
  try {
    $resizedBitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
    [byte[]]$pngBytes = $memoryStream.ToArray()
    return $pngBytes
  }
  finally {
    $resizedBitmap.Dispose()
    $memoryStream.Dispose()
  }
}

function Write-IcoFromBitmap {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [string]$DestinationPath,
    [int[]]$Sizes = @(16, 24, 32, 48, 64, 128, 256)
  )

  $directory = Split-Path -Parent $DestinationPath
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $imageEntries = @()
  foreach ($size in $Sizes) {
    [byte[]]$pngBytes = Get-PngBytes -SourceBitmap $SourceBitmap -TargetSize $size
    $imageEntries += [PSCustomObject]@{
      Size = $size
      Bytes = $pngBytes
    }
  }

  $fileStream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = New-Object System.IO.BinaryWriter($fileStream)
  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$imageEntries.Count)

    $offset = 6 + (16 * $imageEntries.Count)
    foreach ($entry in $imageEntries) {
      $dimensionByte = if ($entry.Size -ge 256) { 0 } else { [byte]$entry.Size }
      $writer.Write([byte]$dimensionByte)
      $writer.Write([byte]$dimensionByte)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]([byte[]]$entry.Bytes).Length)
      $writer.Write([UInt32]$offset)
      $offset += ([byte[]]$entry.Bytes).Length
    }

    foreach ($entry in $imageEntries) {
      $writer.Write([byte[]]$entry.Bytes)
    }
  }
  finally {
    $writer.Dispose()
    $fileStream.Dispose()
  }
}

if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
}
else {
  $resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $OutputPath))
}

$defaultAssetOutput = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\appicon.png"))

$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$designSize = 1024
$bitmap = New-Object System.Drawing.Bitmap($designSize, $designSize)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundPath = New-RoundedRectPath 72 72 880 880 220
  $backgroundBrush = New-DiagonalBrush 152 110 886 924 @("#0B1016", "#132334", "#0C1825") @(0.0, 0.5, 1.0)
  $graphics.FillPath($backgroundBrush, $backgroundPath)
  $backgroundBrush.Dispose()

  $contentState = $graphics.Save()
  $graphics.SetClip($backgroundPath)
  try {
    Draw-Orb -Graphics $graphics -X (-64) -Y (-84) -Width 644 -Height 644 -CenterColor (New-Color "#FFFFFF" 54)
    Draw-Orb -Graphics $graphics -X 536 -Y 546 -Width 500 -Height 500 -CenterColor (New-Color "#C8A265" 44)

    $glossBrush = New-Object System.Drawing.SolidBrush((New-Color "#FFFFFF" 16))
    $graphics.FillEllipse($glossBrush, 88, 88, 850, 290)
    $glossBrush.Dispose()

    Draw-PageSurface -Graphics $graphics -Side Left
    Draw-PageSurface -Graphics $graphics -Side Right

    $spineShape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $spineShape.AddPolygon([System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF(510, 322)),
        (New-Object System.Drawing.PointF(514, 322)),
        (New-Object System.Drawing.PointF(522, 728)),
        (New-Object System.Drawing.PointF(502, 728))
      ))
    $spineBrush = New-Object System.Drawing.SolidBrush((New-Color "#0A1622" 118))
    $graphics.FillPath($spineBrush, $spineShape)
    $spineBrush.Dispose()
    $spineShape.Dispose()

    Draw-Bookmark -Graphics $graphics
  }
  finally {
    $graphics.Restore($contentState)
  }

  $rimBrush = New-DiagonalBrush 112 92 912 932 @("#F4E1B6", "#D2AF71", "#8B6227") @(0.0, 0.48, 1.0)
  $rimPen = New-Object System.Drawing.Pen($rimBrush, 10)
  $graphics.DrawPath($rimPen, $backgroundPath)
  $rimPen.Dispose()
  $rimBrush.Dispose()

  $innerPen = New-Object System.Drawing.Pen((New-Color "#FFFFFF" 24), 3)
  $innerPath = New-RoundedRectPath 96 96 832 832 196
  $graphics.DrawPath($innerPen, $innerPath)
  $innerPen.Dispose()
  $innerPath.Dispose()

  if ($Size -eq $designSize) {
    $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  else {
    $resizedOutput = New-ResizedBitmap -SourceBitmap $bitmap -TargetSize $Size
    try {
      $resizedOutput.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $resizedOutput.Dispose()
    }
  }

  $buildPngPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\build\appicon.png"))
  $buildWindowsIconPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\build\windows\icon.ico"))
  $buildWindowsAssocIconPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\build\windows\appicon.ico"))

  if ($resolvedOutput -eq $defaultAssetOutput -and $Size -eq 1024) {
    $buildPngDirectory = Split-Path -Parent $buildPngPath
    if (-not (Test-Path -LiteralPath $buildPngDirectory)) {
      New-Item -ItemType Directory -Path $buildPngDirectory | Out-Null
    }

    Copy-Item -LiteralPath $resolvedOutput -Destination $buildPngPath -Force
    Write-IcoFromBitmap -SourceBitmap $bitmap -DestinationPath $buildWindowsIconPath
    Write-IcoFromBitmap -SourceBitmap $bitmap -DestinationPath $buildWindowsAssocIconPath
  }
}
finally {
  $backgroundPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output "Saved app icon to $resolvedOutput"
if ($resolvedOutput -eq $defaultAssetOutput -and $Size -eq 1024) {
  Write-Output "Synced build icon assets to $buildPngPath"
  Write-Output "Generated Windows ICO files at $buildWindowsIconPath and $buildWindowsAssocIconPath"
}
else {
  Write-Output "Skipped build asset sync because this run is using a custom output path or non-default size"
}
