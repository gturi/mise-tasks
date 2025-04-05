param ( [string]$ShortcutPath )

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
Write-Output $Shortcut.TargetPath
