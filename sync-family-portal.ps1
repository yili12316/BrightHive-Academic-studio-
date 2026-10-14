$ErrorActionPreference = 'Stop'

# Keep the family portal bundle inside the enrollment site's deploy root.
$source = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $PSScriptRoot 'family-portal'
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$files = @(
  'index.html', 'app.js', 'style.css', 'auth.css', 'supabase-config.js',
  'teacher.html', 'teacher.js', 'teacher.css', 'privacy.html', 'terms.html',
  'google-logo.jpg'
)
$files += Get-ChildItem -LiteralPath $source -Filter 'menu-*.png' -File | ForEach-Object Name

foreach ($file in $files | Select-Object -Unique) {
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $destination $file) -Force
}

# The portal lives one level below the enrollment site's root; reuse the
# enrollment site's existing brand image and send its enrollment link home.
foreach ($name in @('index.html', 'teacher.html', 'app.js')) {
  $target = Join-Path $destination $name
  $text = [System.IO.File]::ReadAllText($target)
  $text = $text.Replace('brighthive-logo.png?v=1', '../brighthive-logo.png?v=1')
  $text = $text.Replace('brighthive-animation-tile.png?v=1', '../brighthive-logo.png?v=1')
  $text = $text.Replace('href="enrollment-site/"', 'href="../"')
  [System.IO.File]::WriteAllText($target, $text, [System.Text.UTF8Encoding]::new($false))
}
