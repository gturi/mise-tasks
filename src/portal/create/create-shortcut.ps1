param ( [string]$ShortcutTargetPath, [string]$ShortcutPath )

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ShortcutTargetPath
$Shortcut.Save()
