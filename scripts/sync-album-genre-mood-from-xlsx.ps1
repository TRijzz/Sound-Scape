param(
  [string]$WorkbookPath = 'D:\vinyl-demo\rebuilt_album_genre_mood_table.xlsx',
  [string]$ApiBaseUrl = 'http://localhost:5000/api',
  [string]$AdminCode = '1245'
)

$ErrorActionPreference = 'Stop'

function Get-XlsxRows {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)

  try {
    $sharedEntry = $zip.Entries | Where-Object FullName -eq 'xl/sharedStrings.xml'
    $sr = New-Object IO.StreamReader($sharedEntry.Open())
    [xml]$sharedXml = $sr.ReadToEnd()
    $sr.Close()

    $sharedNs = New-Object System.Xml.XmlNamespaceManager($sharedXml.NameTable)
    $sharedNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

    $shared = @()
    foreach ($si in $sharedXml.SelectNodes('//x:si', $sharedNs)) {
      $parts = $si.SelectNodes('.//x:t', $sharedNs) | ForEach-Object { $_.'#text' }
      $shared += (($parts -join ''))
    }

    $sheetEntry = $zip.Entries | Where-Object FullName -eq 'xl/worksheets/sheet1.xml'
    $sr = New-Object IO.StreamReader($sheetEntry.Open())
    [xml]$sheetXml = $sr.ReadToEnd()
    $sr.Close()

    $sheetNs = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
    $sheetNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

    $rows = $sheetXml.SelectNodes('//x:sheetData/x:row', $sheetNs)
    if (-not $rows -or $rows.Count -lt 2) {
      throw 'Workbook does not contain enough rows.'
    }

    $headers = @()
    foreach ($cell in $rows[0].SelectNodes('x:c', $sheetNs)) {
      $valueNode = $cell.SelectSingleNode('x:v', $sheetNs)
      if ($cell.GetAttribute('t') -eq 's' -and $valueNode) {
        $headers += $shared[[int]$valueNode.InnerText]
      } else {
        $headers += $valueNode.InnerText
      }
    }

    $data = @()
    for ($i = 1; $i -lt $rows.Count; $i++) {
      $values = @()
      foreach ($cell in $rows[$i].SelectNodes('x:c', $sheetNs)) {
        $type = $cell.GetAttribute('t')
        $valueNode = $cell.SelectSingleNode('x:v', $sheetNs)
        $value = ''
        if ($type -eq 's' -and $valueNode) {
          $value = $shared[[int]$valueNode.InnerText]
        } elseif ($valueNode) {
          $value = $valueNode.InnerText
        } else {
          $inline = $cell.SelectSingleNode('x:is/x:t', $sheetNs)
          if ($inline) { $value = $inline.InnerText }
        }
        $values += $value
      }

      $row = [ordered]@{}
      for ($c = 0; $c -lt $headers.Count; $c++) {
        $row[$headers[$c]] = if ($c -lt $values.Count) { [string]$values[$c] } else { '' }
      }
      $data += [pscustomobject]$row
    }

    return $data
  } finally {
    $zip.Dispose()
  }
}

function Split-Genres {
  param([string]$Value)
  $text = [string]$Value
  if (-not $text.Trim()) { return @() }
  if ($text.Trim().ToLower() -eq 'unknown / needs review') { return @() }
  $items = $text -split '\/|,' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique
  return @($items)
}

function Split-Moods {
  param([string]$Value)
  $text = [string]$Value
  if (-not $text.Trim()) { return @() }
  if ($text.Trim().ToLower() -eq 'unknown / needs review') { return @() }
  $items = $text -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique
  return @($items)
}

if (-not (Test-Path $WorkbookPath)) {
  throw "Workbook not found: $WorkbookPath"
}

$headers = @{ 'x-admin-code' = $AdminCode }
$albumsResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/albums?page=1&limit=5000" -Headers $headers -Method Get
$albums = @($albumsResponse.albums)
$albumMap = @{}
foreach ($album in $albums) {
  $albumMap[[string]$album.name] = $album
}

$rows = Get-XlsxRows -Path $WorkbookPath
$updated = 0
$missing = New-Object System.Collections.Generic.List[string]
$failed = New-Object System.Collections.Generic.List[string]

foreach ($row in $rows) {
  $title = [string]$row.Title
  if (-not $title.Trim()) { continue }

  $album = $albumMap[$title]
  if (-not $album) {
    $missing.Add($title)
    continue
  }

  $genres = Split-Genres -Value $row.Genre
  $moods = Split-Moods -Value $row.Mood
  $body = @{
    genres = ($genres -join ', ')
    moods = ($moods -join ', ')
  } | ConvertTo-Json

  try {
    Invoke-RestMethod -Uri "$ApiBaseUrl/albums/$($album._id)" -Headers ($headers + @{ 'Content-Type' = 'application/json' }) -Method Put -Body $body | Out-Null
    $updated++
  } catch {
    $failed.Add($title)
  }
}

[pscustomobject]@{
  workbook_rows = $rows.Count
  albums_found = $albums.Count
  updated = $updated
  missing_titles = $missing.Count
  failed_updates = $failed.Count
} | Format-List

if ($missing.Count -gt 0) {
  Write-Output 'Missing titles:'
  $missing | Select-Object -First 25 | ForEach-Object { Write-Output "- $_" }
}

if ($failed.Count -gt 0) {
  Write-Output 'Failed updates:'
  $failed | Select-Object -First 25 | ForEach-Object { Write-Output "- $_" }
}
