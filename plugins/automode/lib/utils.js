/**
 * AutoMode - 纯逻辑模块
 * 可独立测试，无副作用，不依赖 Node.js API
 */

const TASK_PREFIX = 'AutoMode';
const TASK_DARK = TASK_PREFIX + '_Dark';
const TASK_LIGHT = TASK_PREFIX + '_Light';

function normalizeIpLocation(raw) {
  if (!raw || typeof raw.latitude !== 'number' || typeof raw.longitude !== 'number' || !raw.timezone) {
    return null;
  }
  return {
    name: raw.city || '',
    region: raw.region || raw.region_name || '',
    country: raw.country_name || raw.country || '',
    lat: raw.latitude,
    lng: raw.longitude,
    timezone: raw.timezone,
    source: 'auto'
  };
}

function normalizeGeocodeResult(raw) {
  if (!raw || typeof raw.latitude !== 'number' || typeof raw.longitude !== 'number' || !raw.timezone) {
    return null;
  }
  return {
    name: raw.name || '',
    region: raw.admin1 || '',
    country: raw.country || '',
    lat: raw.latitude,
    lng: raw.longitude,
    timezone: raw.timezone,
    source: 'search'
  };
}

function pickWindowEvents(events, windowStart, windowEnd) {
  if (!Array.isArray(events) || !(windowStart instanceof Date) || !(windowEnd instanceof Date)) {
    return null;
  }

  function pick(kind) {
    return events.find(function(event) {
      if (!event || event.kind !== kind || !event.iso) {
        return false;
      }
      var time = new Date(event.iso);
      return !isNaN(time.getTime()) && time >= windowStart && time < windowEnd;
    }) || null;
  }

  var lightEvent = pick('light');
  var darkEvent = pick('dark');
  if (!lightEvent || !darkEvent) {
    return null;
  }

  return {
    lightEvent: lightEvent,
    darkEvent: darkEvent
  };
}

/**
 * 计算偏移后的时间字符串
 * @param {number} hours - 小时 (0-23)
 * @param {number} minutes - 分钟 (0-59)
 * @param {number} offset - 偏移分钟数（可为负数）
 * @returns {string} HH:mm 格式时间
 */
function calcTimeWithOffset(hours, minutes, offset) {
  var totalMin = hours * 60 + minutes + offset;
  var wrapped = ((totalMin % 1440) + 1440) % 1440;
  return String(Math.floor(wrapped / 60)).padStart(2, '0') + ':' + String(wrapped % 60).padStart(2, '0');
}

/**
 * 生成 schtasks XML 任务定义
 * @param {string} mode - 'dark' 或 'light'
 * @param {string} time - HH:mm 格式
 * @param {string} scriptsDir - 脚本目录路径
 * @returns {Buffer} UTF-16 LE with BOM
 */
function generateTaskXml(mode, time, scriptsDir) {
  var taskName = mode === 'dark' ? TASK_DARK : TASK_LIGHT;
  var vbsScript = (mode === 'dark' ? 'switch-dark.vbs' : 'switch-light.vbs');
  var vbsPath = scriptsDir + '\\' + vbsScript;
  var description = mode === 'dark'
    ? 'AutoMode: 定时切换到深色模式'
    : 'AutoMode: 定时切换到浅色模式';
  var parts = time.split(':');
  var hour = parts[0];
  var minute = parts[1];
  var today = new Date().toISOString().split('T')[0];
  var vbsArgs = '"' + vbsPath.replace(/\\/g, '\\\\') + '"';

  var xml = [
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '  <RegistrationInfo>',
    '    <Description>' + description + '</Description>',
    '    <Author>AutoMode</Author>',
    '  </RegistrationInfo>',
    '  <Triggers>',
    '    <CalendarTrigger>',
    '      <StartBoundary>' + today + 'T' + hour + ':' + minute + ':00</StartBoundary>',
    '      <Enabled>true</Enabled>',
    '      <ScheduleByDay>',
    '        <DaysInterval>1</DaysInterval>',
    '      </ScheduleByDay>',
    '    </CalendarTrigger>',
    '  </Triggers>',
    '  <Principals>',
    '    <Principal id="Author">',
    '      <LogonType>InteractiveToken</LogonType>',
    '      <RunLevel>LeastPrivilege</RunLevel>',
    '    </Principal>',
    '  </Principals>',
    '  <Settings>',
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>',
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>',
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>',
    '    <AllowHardTerminate>true</AllowHardTerminate>',
    '    <StartWhenAvailable>false</StartWhenAvailable>',
    '    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>',
    '    <IdleSettings>',
    '      <StopOnIdleEnd>false</StopOnIdleEnd>',
    '      <RestartOnIdle>false</RestartOnIdle>',
    '    </IdleSettings>',
    '    <AllowStartOnDemand>true</AllowStartOnDemand>',
    '    <Enabled>true</Enabled>',
    '    <Hidden>true</Hidden>',
    '    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>',
    '    <Priority>7</Priority>',
    '  </Settings>',
    '  <Actions Context="Author">',
    '    <Exec>',
    '      <Command>wscript.exe</Command>',
    '      <Arguments>' + vbsArgs + '</Arguments>',
    '    </Exec>',
  '  </Actions>',
    '</Task>'
  ].join('\n');

  var bom = Buffer.from([0xFF, 0xFE]);
  var content = Buffer.from(xml, 'utf16le');
  return Buffer.concat([bom, content]);
}

/**
 * 生成每日日出日落更新 PowerShell 脚本
 * @param {{ lat: number, lng: number, offsetDark: number, offsetLight: number }} config
 * @param {string} scriptsDir
 * @returns {string} PowerShell 脚本内容
 */
function generateUpdaterScript(config, scriptsDir) {
  var sunConfigFile = scriptsDir + '\\sun-config.json';
  var vbsDark = scriptsDir.replace(/\\/g, '\\\\') + '\\switch-dark.vbs';
  var vbsLight = scriptsDir.replace(/\\/g, '\\\\') + '\\switch-light.vbs';

  var lines = [
    '# AutoMode: 每日更新日出日落时间并刷新计划任务',
    '$ErrorActionPreference = "SilentlyContinue"',
    '',
    '$configFile = "' + sunConfigFile + '"',
    '$scriptsDir = "' + scriptsDir.replace(/\\/g, '\\\\') + '"',
    '',
    'if (-not (Test-Path $configFile)) { exit 1 }',
    '',
    '$config = Get-Content $configFile -Raw | ConvertFrom-Json',
    '$lat = $config.lat',
    '$lng = $config.lng',
    '$timezone = $config.timezone',
    '$offsetDark = [int]$config.offsetDark',
    '$offsetLight = [int]$config.offsetLight',
    '$windowStart = (Get-Date).Date.AddDays(1)',
    '$windowEnd = $windowStart.AddDays(1)',
    '$candidateDates = @(',
    '  $windowStart.AddDays(-1).ToString("yyyy-MM-dd")',
    '  $windowStart.ToString("yyyy-MM-dd")',
    '  $windowStart.AddDays(1).ToString("yyyy-MM-dd")',
    ') | Select-Object -Unique',
    '',
    'try {',
    '  $events = @()',
    '  foreach ($date in $candidateDates) {',
    '    $apiUrl = "https://api.sunrise-sunset.org/json?lat=$lat&lng=$lng&formatted=0&date=$date&tzid=$timezone"',
    '    $result = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 15',
    '    $sunrise = [DateTimeOffset]::Parse($result.results.sunrise).ToLocalTime().AddMinutes($offsetLight)',
    '    $sunset = [DateTimeOffset]::Parse($result.results.sunset).ToLocalTime().AddMinutes($offsetDark)',
    '    $events += [pscustomobject]@{ Kind = "light"; Time = $sunrise }',
    '    $events += [pscustomobject]@{ Kind = "dark"; Time = $sunset }',
    '  }',
    '',
    '  $lightEvent = $events | Where-Object { $_.Kind -eq "light" -and $_.Time -ge $windowStart -and $_.Time -lt $windowEnd } | Sort-Object Time | Select-Object -First 1',
    '  $darkEvent = $events | Where-Object { $_.Kind -eq "dark" -and $_.Time -ge $windowStart -and $_.Time -lt $windowEnd } | Sort-Object Time | Select-Object -First 1',
    '  if (-not $lightEvent -or -not $darkEvent) { exit 1 }',
    '',
    '  $darkStr = $darkEvent.Time.ToString("HH:mm")',
    '  $lightStr = $lightEvent.Time.ToString("HH:mm")',
    '',
    '  schtasks /Delete /TN "' + TASK_DARK + '" /F 2>$null',
    '  schtasks /Delete /TN "' + TASK_LIGHT + '" /F 2>$null',
    '',
    '  $regPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"',
    '',
    '  $hour = $darkStr.Split(":")[0]',
    '  $minute = $darkStr.Split(":")[1]',
    '  $xmlDark = @"',
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '  <RegistrationInfo><Description>AutoMode: 日出日落 - 切换到深色模式</Description><Author>AutoMode</Author></RegistrationInfo>',
    '  <Triggers><CalendarTrigger>',
    '    <StartBoundary>2024-01-01T$($hour.PadLeft(2,"0")):$($minute.PadLeft(2,"0")):00</StartBoundary>',
    '    <Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>',
    '  </CalendarTrigger></Triggers>',
    '  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>',
    '  <Settings>',
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>',
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>',
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>',
    '    <StartWhenAvailable>true</StartWhenAvailable>',
    '    <AllowStartOnDemand>true</AllowStartOnDemand>',
    '    <Enabled>true</Enabled><Hidden>true</Hidden>',
    '    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit><Priority>7</Priority>',
    '  </Settings>',
    '  <Actions Context="Author"><Exec>',
    '    <Command>wscript.exe</Command>',
    '    <Arguments>"' + vbsDark + '"</Arguments>',
    '  </Exec></Actions>',
    '</Task>',
    '"@',
    '',
    '  $hour2 = $lightStr.Split(":")[0]',
    '  $minute2 = $lightStr.Split(":")[1]',
    '  $xmlLight = @"',
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '  <RegistrationInfo><Description>AutoMode: 日出日落 - 切换到浅色模式</Description><Author>AutoMode</Author></RegistrationInfo>',
    '  <Triggers><CalendarTrigger>',
    '    <StartBoundary>2024-01-01T$($hour2.PadLeft(2,"0")):$($minute2.PadLeft(2,"0")):00</StartBoundary>',
    '    <Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>',
    '  </CalendarTrigger></Triggers>',
    '  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>',
    '  <Settings>',
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>',
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>',
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>',
    '    <StartWhenAvailable>true</StartWhenAvailable>',
    '    <AllowStartOnDemand>true</AllowStartOnDemand>',
    '    <Enabled>true</Enabled><Hidden>true</Hidden>',
    '    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit><Priority>7</Priority>',
    '  </Settings>',
    '  <Actions Context="Author"><Exec>',
    '    <Command>wscript.exe</Command>',
    '    <Arguments>"' + vbsLight + '"</Arguments>',
    '  </Exec></Actions>',
    '</Task>',
    '"@',
    '',
    '  $utf16 = New-Object System.Text.UnicodeEncoding $false, $true',
    '  [System.IO.File]::WriteAllText("$scriptsDir\\task-dark.xml", $xmlDark, $utf16)',
    '  [System.IO.File]::WriteAllText("$scriptsDir\\task-light.xml", $xmlLight, $utf16)',
    '',
    '  schtasks /Create /TN "' + TASK_DARK + '" /XML "$scriptsDir\\task-dark.xml" /F',
    '  schtasks /Create /TN "' + TASK_LIGHT + '" /XML "$scriptsDir\\task-light.xml" /F',
    '} catch {',
    '  exit 1',
    '}',
  ];

  return lines.join('\r\n');
}

/**
 * 生成切换系统主题并刷新任务栏的 PowerShell 脚本
 * @param {'dark'|'light'} mode
 * @returns {string}
 */
function generateThemeSwitchScript(mode) {
  var isDark = mode === 'dark';
  var value = isDark ? 0 : 1;
  var description = isDark
    ? '# AutoMode: 切换到深色模式'
    : '# AutoMode: 切换到浅色模式';

  return [
    description,
    '$ErrorActionPreference = "Stop"',
    'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme /t REG_DWORD /d ' + value + ' /f',
    'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme /t REG_DWORD /d ' + value + ' /f',
    '$nativeCode = @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public static class NativeMethods {',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "SendMessageTimeoutW")]',
    '  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "FindWindowW")]',
    '  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);',
    '}',
    '"@',
    'Add-Type -TypeDefinition $nativeCode',
    '$HWND_BROADCAST = [IntPtr]0xffff',
    '$WM_SETTINGCHANGE = 0x001A',
    '$SMTO_ABORTIFHUNG = 0x0002',
    '$result = [UIntPtr]::Zero',
    '[void][NativeMethods]::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "ImmersiveColorSet", $SMTO_ABORTIFHUNG, 5000, [ref]$result)',
    '$tray = [NativeMethods]::FindWindow("Shell_TrayWnd", $null)',
    'if ($tray -ne [IntPtr]::Zero) {',
    '  [void][NativeMethods]::SendMessageTimeout($tray, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "ImmersiveColorSet", $SMTO_ABORTIFHUNG, 5000, [ref]$result)',
    '}'
  ].join('\r\n');
}

/**
 * 校验日出日落配置
 * @param {*} config
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSunConfig(config) {
  if (!config || typeof config.lat !== 'number' || typeof config.lng !== 'number') {
    return { valid: false, error: '缺少有效的 lat/lng' };
  }
  if (!(config.name || config.city) || !config.timezone) {
    return { valid: false, error: '缺少有效的地点名称或时区' };
  }
  if (config.lat < -90 || config.lat > 90) {
    return { valid: false, error: '纬度必须在 -90 到 90 之间' };
  }
  if (config.lng < -180 || config.lng > 180) {
    return { valid: false, error: '经度必须在 -180 到 180 之间' };
  }
  var od = config.offsetDark || 0;
  var ol = config.offsetLight || 0;
  if (od < -120 || od > 120) {
    return { valid: false, error: '深色偏移必须在 -120 到 120 之间' };
  }
  if (ol < -120 || ol > 120) {
    return { valid: false, error: '浅色偏移必须在 -120 到 120 之间' };
  }
  return { valid: true };
}

module.exports = {
  calcTimeWithOffset: calcTimeWithOffset,
  generateTaskXml: generateTaskXml,
  generateUpdaterScript: generateUpdaterScript,
  generateThemeSwitchScript: generateThemeSwitchScript,
  validateSunConfig: validateSunConfig,
  normalizeIpLocation: normalizeIpLocation,
  normalizeGeocodeResult: normalizeGeocodeResult,
  pickWindowEvents: pickWindowEvents
};
