param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $projectDir

function Fail {
  param([string]$Message)
  Write-Host ""
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

function Run-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  return $LASTEXITCODE
}

function Print-Command {
  param([string]$CommandLine)
  Write-Host "  [DRY-RUN] $CommandLine" -ForegroundColor Yellow
}

Write-Host "============================================"
Write-Host "  XMReader: Release Tag Helper"
Write-Host "============================================"
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "git 未安装或不在 PATH 中"
}

$isGitRepo = (& git rev-parse --is-inside-work-tree 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $isGitRepo -ne "true") {
  Fail "当前目录不是 Git 仓库：$projectDir"
}

$statusLines = @(& git status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) {
  Fail "无法检查工作区状态"
}
if ($statusLines.Count -gt 0) {
  if ($DryRun) {
    Write-Host "[WARN] 工作区存在未提交改动；Dry run 将继续，但正式执行会被阻止" -ForegroundColor Yellow
    & git status --short
    Write-Host ""
  } else {
    Write-Host "[ERROR] 工作区存在未提交改动，请先提交或清理后再打发布 tag" -ForegroundColor Red
    & git status --short
    exit 1
  }
}

$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  Fail "无法获取当前分支"
}
if ($currentBranch -eq "HEAD") {
  Fail "当前处于 detached HEAD，无法自动推送当前分支"
}

$upstreamRef = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null).Trim()
$hasUpstream = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstreamRef)

if ($hasUpstream) {
  $parts = $upstreamRef -split '/', 2
  $remoteName = $parts[0]
  $remoteBranch = if ($parts.Length -gt 1) { $parts[1] } else { $currentBranch }
}
else {
  $remoteName = "origin"
  $remoteBranch = $currentBranch
}

& git remote get-url $remoteName > $null 2>&1
if ($LASTEXITCODE -ne 0) {
  Fail "远端不存在：$remoteName"
}

Write-Host "[Info] 当前分支: $currentBranch"
Write-Host "[Info] 推送远端: $remoteName"
Write-Host "[Info] 远端分支: $remoteBranch"
Write-Host ""

Write-Host "[1/5] 同步远端 tags..."
if ($DryRun) {
  Print-Command "git fetch --tags $remoteName"
}
else {
  $code = Run-Git @("fetch", "--tags", $remoteName)
  if ($code -ne 0) {
    Fail "git fetch --tags $remoteName 失败"
  }
}
Write-Host "  Done"
Write-Host ""

Write-Host "[2/5] 生成新的发布 tag..."
$start = Get-Date
$releaseTag = $null
for ($i = 0; $i -lt 180; $i++) {
  $candidate = $start.AddMinutes($i).ToString("'v'yy'.'MMdd'.'HHmm")
  & git show-ref --tags --verify --quiet ("refs/tags/" + $candidate) 2>$null
  if ($LASTEXITCODE -ne 0) {
    $releaseTag = $candidate
    break
  }
}

if ([string]::IsNullOrWhiteSpace($releaseTag)) {
  Fail "无法在接下来 180 分钟内找到可用 tag，请稍后重试"
}

$releaseVersion = $releaseTag.Substring(1)
Write-Host "  Tag: $releaseTag"
Write-Host "  Version: $releaseVersion"
Write-Host ""

Write-Host "[3/5] 推送当前分支到远端..."
if ($DryRun) {
  if ($hasUpstream) {
    Print-Command "git push $remoteName HEAD:$remoteBranch"
  }
  else {
    Print-Command "git push -u $remoteName HEAD:$remoteBranch"
  }
}
else {
  if ($hasUpstream) {
    $code = Run-Git @("push", $remoteName, "HEAD:$remoteBranch")
  }
  else {
    $code = Run-Git @("push", "-u", $remoteName, "HEAD:$remoteBranch")
  }
  if ($code -ne 0) {
    Fail "当前分支推送失败"
  }
}
Write-Host "  Done"
Write-Host ""

Write-Host "[4/5] 创建本地 annotated tag..."
if ($DryRun) {
  Print-Command "git tag -a $releaseTag -m `"Release $releaseTag`""
}
else {
  $code = Run-Git @("tag", "-a", $releaseTag, "-m", "Release $releaseTag")
  if ($code -ne 0) {
    Fail "创建本地 tag 失败"
  }
}
Write-Host "  Done"
Write-Host ""

Write-Host "[5/5] 推送 tag 到远端..."
if ($DryRun) {
  Print-Command "git push $remoteName $releaseTag"
}
else {
  $code = Run-Git @("push", $remoteName, $releaseTag)
  if ($code -ne 0) {
    & git tag -d $releaseTag > $null 2>&1
    Fail "tag 推送失败，已回滚本地 tag"
  }
}
Write-Host "  Done"
Write-Host ""

Write-Host "============================================"
if ($DryRun) {
  Write-Host "  Dry run 完成"
}
else {
  Write-Host "  发布 tag 已创建并推送成功"
}
Write-Host "  Tag:     $releaseTag"
Write-Host "  Branch:  $currentBranch"
Write-Host "  Remote:  $remoteName"
Write-Host "============================================"
Write-Host ""
Write-Host "GitHub Release 工作流会在 tag push 后自动触发："
Write-Host "  .github/workflows/release.yml"
Write-Host ""
Write-Host "版本号规则："
Write-Host "  v{yy}.{MMdd}.{HHmm}"
Write-Host ""
Write-Host "用法："
Write-Host "  release-tag.bat"
Write-Host "  release-tag.bat -DryRun"
Write-Host "  release-tag.bat --dry-run"
Write-Host ""
