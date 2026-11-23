$ErrorActionPreference = 'Stop'
$library = Join-Path $PSScriptRoot 'audio-library.mjs'
$request = node $library --pending
if ($LASTEXITCODE -ne 0) { throw 'Unable to list missing recordings.' }
$lines = @($request | ConvertFrom-Json)
if ($lines.Count -eq 0) { Write-Output 'All current recordings are ready.'; return }

Add-Type -AssemblyName System.Speech
$staging = [IO.Directory]::CreateDirectory((Join-Path ([IO.Path]::GetTempPath()) ('wordwander-' + [Guid]::NewGuid())))
$voice = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $voice.SelectVoice('Microsoft Zira Desktop')
  $voice.Rate = -1
  [IO.File]::WriteAllText((Join-Path $staging.FullName 'lines.json'), $request)
  for ($index = 0; $index -lt $lines.Count; $index++) {
    $path = Join-Path $staging.FullName ($index.ToString() + '.wav')
    $voice.SetOutputToWaveFile($path)
    $voice.Speak($lines[$index])
    $voice.SetOutputToNull()
  }
  node $library --add $staging.FullName
  if ($LASTEXITCODE -ne 0) { throw 'Unable to import the new recordings.' }
} finally {
  $voice.Dispose()
  Get-ChildItem -LiteralPath $staging.FullName -File | ForEach-Object { Remove-Item -LiteralPath $_.FullName }
  Remove-Item -LiteralPath $staging.FullName
}
