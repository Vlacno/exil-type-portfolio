# Create a fresh portfolio repository

These are instructions for a later, separately authorized publication. They
have not been executed. The original `.git` directory, index, history and remote
must remain unchanged.

Resolve the blockers in [the publication audit](PUBLICATION_AUDIT.md) first.
The copyright notice does not establish permission to redistribute third-party
images, text or branding.

## Why a clean working-tree export is required

The existing Git index/history contains proprietary font files and an earlier
deployment workflow. The current working tree has their replacements, including
new files that are not yet tracked. Cloning, copying `.git`, or using
`git archive HEAD` would carry the wrong history or restore outdated files.

Export current file contents, including untracked source and font licenses,
while respecting the current ignore rules. Do not copy dependencies, environment
files, local credentials, build output, CMS exports or generated reports.

## 1. Export to a new sibling directory

Run the following PowerShell instructions from the original repository root
only when the audit blockers are resolved. Stop editing files while copying.
The destination must not already exist; the original is never deleted or moved.

```powershell
$ErrorActionPreference = 'Stop'
foreach ($name in @('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE',
                    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES')) {
    if (Test-Path -LiteralPath "Env:$name") {
        throw "Use a clean shell without $name overrides."
    }
}

$source = [IO.Path]::GetFullPath((Get-Location).Path)
$repositoryRoot = (git -C $source rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or
    [IO.Path]::GetFullPath($repositoryRoot) -ne $source) {
    throw 'Start in the original repository root.'
}
$destination = [IO.Path]::GetFullPath(
    (Join-Path (Split-Path -Parent $source) 'exil-type-portfolio-public'))
$sourcePrefix = $source + [IO.Path]::DirectorySeparatorChar
$destinationPrefix = $destination + [IO.Path]::DirectorySeparatorChar
if ($destination -eq $source -or
    $destination.StartsWith($sourcePrefix, [StringComparison]::OrdinalIgnoreCase) -or
    (Test-Path -LiteralPath $destination)) {
    throw 'Choose a new sibling directory outside the original repository.'
}
if ((Get-Item -LiteralPath $source).Attributes -band
    [IO.FileAttributes]::ReparsePoint) {
    throw 'Resolve the source junction/symlink before exporting.'
}

$entries = @(git -C $source -c core.quotepath=false ls-files `
    --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'Could not list current project files.' }
$files = @()
$fontFamilies = @('source-serif-4', 'inter', 'unbounded',
                  'roboto-condensed', 'russo-one', 'ruslan-display')
foreach ($relative in ($entries | Sort-Object -Unique)) {
    if ($relative -match '(^|[\\/])\.git([\\/]|$)') {
        throw 'Git metadata must never enter the export.'
    }
    $sourceFile = [IO.Path]::GetFullPath((Join-Path $source $relative))
    if (-not $sourceFile.StartsWith($sourcePrefix,
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'A source path escaped the repository.'
    }
    # Deleted tracked files are intentionally absent from this snapshot.
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { continue }
    git -C $source check-ignore --no-index --quiet -- $relative
    if ($LASTEXITCODE -eq 0) { continue }
    if ($LASTEXITCODE -ne 1) { throw 'Ignore-rule check failed.' }
    if ($relative -match '^src/assets/fonts/([^/]+)/' -and
        $Matches[1] -notin $fontFamilies) {
        throw 'An unreviewed font family is present.'
    }
    $item = Get-Item -LiteralPath $sourceFile
    for ($entry = $item; $entry -and $entry.FullName -ne $source;
         $entry = if ($entry.PSIsContainer) { $entry.Parent } else { $entry.Directory }) {
        if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw 'Review symlinks/junctions before exporting.'
        }
    }
    $target = [IO.Path]::GetFullPath((Join-Path $destination $relative))
    if (-not $target.StartsWith($destinationPrefix,
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'A destination path escaped the new directory.'
    }
    $files += $relative
}

# Review this manifest before continuing with the copy block below.
$files
```

Check that the manifest includes the README, copyright notice, both lockfiles,
tests, source, Studio, eight replacement WOFF2 files and all 12 OFL copies.
It must exclude `.git`, `.env.local`, proprietary font binaries and generated
data. The example environment file should be included.

After reviewing the manifest, use the same shell:

```powershell
New-Item -ItemType Directory -Path $destination | Out-Null
foreach ($relative in $files) {
    $sourceFile = Join-Path $source $relative
    $target = [IO.Path]::GetFullPath((Join-Path $destination $relative))
    if (-not $target.StartsWith($destinationPrefix,
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Destination check failed.'
    }
    [IO.Directory]::CreateDirectory((Split-Path -Parent $target)) | Out-Null
    Copy-Item -LiteralPath $sourceFile -Destination $target
    if ((Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash) {
        throw 'Copy verification failed; inspect the new directory.'
    }
}
if (Test-Path -LiteralPath (Join-Path $destination '.git')) {
    throw 'The exported copy unexpectedly contains Git metadata.'
}
```

No repository has been initialized or remote changed by these copy steps.
Keep the original directory as the untouched historical checkout.

## 2. Verify the clean copy

In the new directory, use Node.js 24.x:

```powershell
Set-Location -LiteralPath $destination
npm.cmd ci --ignore-scripts
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e:quick
npm.cmd run test:cms
npm.cmd run test:sanity
node --test migration/tests/*.test.js
```

The copy should run in local-content mode without an environment file. Inspect
the built site and confirm all font licenses are included in `dist/licenses/`.
Review images, citations, identity/affiliation statements and contact details
before making them public. Never copy an old token to enable the independent CMS.

## 3. Initialize new history, then review before publication

Only in the verified new directory:

```powershell
git -C $destination init -b main
git -C $destination remote -v
git -C $destination status --short
```

The new repository should have no remotes and no commits. Confirm the path
before staging anything. Once publication is explicitly approved:

```powershell
git -C $destination add --all
git -C $destination diff --cached --name-only
git -C $destination diff --cached --stat
```

Review the actual staged contents for secrets, copyrighted assets and all font
license files. Configure the intended author name and a suitable GitHub noreply
email in this new repository. Do not select an open-source license template:
this project uses the portfolio-review terms in [COPYRIGHT.md](COPYRIGHT.md).

After that review and separate authorization, create the initial commit and
an empty GitHub repository. Add only its new URL to the new repository, then
push its initial branch. Do not reuse or fetch the old remote. The first commit
must have no parent; `git rev-list --count HEAD` should return `1` immediately
after that initial commit. Do not use a force push or import the old branches,
tags, Git directory, alternates or object store.

This preparation task did not execute any copy, initialization, staging, commit,
remote change, push or deployment commands from this guide.
