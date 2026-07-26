Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-ResizedBitmap {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$SourceBitmap,
    [Parameter(Mandatory = $true)][int]$TargetSize
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
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$SourceBitmap,
    [Parameter(Mandatory = $true)][int]$TargetSize
  )

  $memoryStream = New-Object System.IO.MemoryStream
  $resizedBitmap = New-ResizedBitmap -SourceBitmap $SourceBitmap -TargetSize $TargetSize
  try {
    $resizedBitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
    return [byte[]]$memoryStream.ToArray()
  }
  finally {
    $resizedBitmap.Dispose()
    $memoryStream.Dispose()
  }
}

function Write-IcoFromBitmap {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$SourceBitmap,
    [Parameter(Mandatory = $true)][string]$DestinationPath,
    [int[]]$Sizes = @(16, 24, 32, 48, 64, 128, 256)
  )

  $directory = Split-Path -Parent $DestinationPath
  [System.IO.Directory]::CreateDirectory($directory) | Out-Null

  $entries = foreach ($size in $Sizes) {
    [PSCustomObject]@{
      Size = $size
      Bytes = Get-PngBytes -SourceBitmap $SourceBitmap -TargetSize $size
    }
  }

  $fileStream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = New-Object System.IO.BinaryWriter($fileStream)
  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$entries.Count)

    $offset = 6 + (16 * $entries.Count)
    foreach ($entry in $entries) {
      $dimension = if ($entry.Size -ge 256) { [byte]0 } else { [byte]$entry.Size }
      $writer.Write($dimension)
      $writer.Write($dimension)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$entry.Bytes.Length)
      $writer.Write([UInt32]$offset)
      $offset += $entry.Bytes.Length
    }

    foreach ($entry in $entries) {
      $writer.Write([byte[]]$entry.Bytes)
    }
  }
  finally {
    $writer.Dispose()
    $fileStream.Dispose()
  }
}

function Write-BigEndianUInt32 {
  param(
    [Parameter(Mandatory = $true)][System.IO.BinaryWriter]$Writer,
    [Parameter(Mandatory = $true)][UInt32]$Value
  )

  [byte[]]$bytes = [System.BitConverter]::GetBytes($Value)
  [System.Array]::Reverse($bytes)
  $Writer.Write($bytes)
}

function Write-IcnsFromBitmap {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$SourceBitmap,
    [Parameter(Mandatory = $true)][string]$DestinationPath
  )

  $specs = @(
    [PSCustomObject]@{ Type = "icp4"; Size = 16 },
    [PSCustomObject]@{ Type = "icp5"; Size = 32 },
    [PSCustomObject]@{ Type = "icp6"; Size = 64 },
    [PSCustomObject]@{ Type = "ic07"; Size = 128 },
    [PSCustomObject]@{ Type = "ic08"; Size = 256 },
    [PSCustomObject]@{ Type = "ic09"; Size = 512 },
    [PSCustomObject]@{ Type = "ic10"; Size = 1024 }
  )

  $directory = Split-Path -Parent $DestinationPath
  [System.IO.Directory]::CreateDirectory($directory) | Out-Null

  $entries = foreach ($spec in $specs) {
    [PSCustomObject]@{
      Type = $spec.Type
      Bytes = Get-PngBytes -SourceBitmap $SourceBitmap -TargetSize $spec.Size
    }
  }

  [UInt32]$totalLength = 8
  foreach ($entry in $entries) {
    $totalLength += [UInt32](8 + $entry.Bytes.Length)
  }

  $fileStream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = New-Object System.IO.BinaryWriter($fileStream)
  try {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes("icns"))
    Write-BigEndianUInt32 -Writer $writer -Value $totalLength

    foreach ($entry in $entries) {
      $writer.Write([System.Text.Encoding]::ASCII.GetBytes($entry.Type))
      Write-BigEndianUInt32 -Writer $writer -Value ([UInt32](8 + $entry.Bytes.Length))
      $writer.Write([byte[]]$entry.Bytes)
    }
  }
  finally {
    $writer.Dispose()
    $fileStream.Dispose()
  }
}

function Assert-SourceBitmap {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)][string]$Path
  )

  if ($Bitmap.Width -ne 1024 -or $Bitmap.Height -ne 1024) {
    throw "App icon source must be 1024x1024: $Path"
  }
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$windowsPngPath = Join-Path $projectRoot "assets\icons\windows\appicon.png"
$windowsIcoPath = Join-Path $projectRoot "assets\icons\windows\appicon.ico"
$macOSPngPath = Join-Path $projectRoot "assets\icons\macos\appicon.png"
$macOSIcnsPath = Join-Path $projectRoot "assets\icons\macos\appicon.icns"
$canonicalPngPath = Join-Path $projectRoot "assets\appicon.png"
$buildPngPath = Join-Path $projectRoot "build\appicon.png"
$buildWindowsIconPath = Join-Path $projectRoot "build\windows\icon.ico"
$buildWindowsAssocIconPath = Join-Path $projectRoot "build\windows\appicon.ico"
$buildMacOSIconPath = Join-Path $projectRoot "build\darwin\appicon.icns"

$windowsBitmap = New-Object System.Drawing.Bitmap($windowsPngPath)
$macOSBitmap = New-Object System.Drawing.Bitmap($macOSPngPath)
try {
  Assert-SourceBitmap -Bitmap $windowsBitmap -Path $windowsPngPath
  Assert-SourceBitmap -Bitmap $macOSBitmap -Path $macOSPngPath

  Write-IcoFromBitmap -SourceBitmap $windowsBitmap -DestinationPath $windowsIcoPath
  Write-IcnsFromBitmap -SourceBitmap $macOSBitmap -DestinationPath $macOSIcnsPath

  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $buildPngPath)) | Out-Null
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $buildWindowsIconPath)) | Out-Null
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $buildMacOSIconPath)) | Out-Null

  Copy-Item -LiteralPath $windowsPngPath -Destination $canonicalPngPath -Force
  Copy-Item -LiteralPath $windowsPngPath -Destination $buildPngPath -Force
  Copy-Item -LiteralPath $windowsIcoPath -Destination $buildWindowsIconPath -Force
  Copy-Item -LiteralPath $windowsIcoPath -Destination $buildWindowsAssocIconPath -Force
  Copy-Item -LiteralPath $macOSIcnsPath -Destination $buildMacOSIconPath -Force
}
finally {
  $windowsBitmap.Dispose()
  $macOSBitmap.Dispose()
}

Write-Output "Saved Windows PNG and ICO assets under assets/icons/windows"
Write-Output "Saved macOS PNG and ICNS assets under assets/icons/macos"
Write-Output "Synced canonical and local Wails build icon assets"
