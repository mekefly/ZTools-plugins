/**
 * AutoMode - ZTools 插件预加载脚本
 * 支持定时模式和日出日落模式管理系统深浅色主题切换
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  generateTaskXml,
  generateUpdaterScript,
  generateThemeSwitchScript,
  validateSunConfig,
  normalizeIpLocation,
  normalizeGeocodeResult,
  pickWindowEvents
} = require('./lib/utils');

// ========== 常量 ==========
const SCRIPTS_DIR = path.join(os.homedir(), '.automode-scripts');
const TASK_PREFIX = 'AutoMode';
const TASK_DARK = TASK_PREFIX + '_Dark';
const TASK_LIGHT = TASK_PREFIX + '_Light';
const TASK_UPDATER = TASK_PREFIX + '_Updater';
const PS_DARK = path.join(SCRIPTS_DIR, 'switch-dark.ps1');
const PS_LIGHT = path.join(SCRIPTS_DIR, 'switch-light.ps1');
const VBS_DARK = path.join(SCRIPTS_DIR, 'switch-dark.vbs');
const VBS_LIGHT = path.join(SCRIPTS_DIR, 'switch-light.vbs');
const PS_UPDATER = path.join(SCRIPTS_DIR, 'sun-updater.ps1');
const SUN_CONFIG_FILE = path.join(SCRIPTS_DIR, 'sun-config.json');
const SUN_API = 'https://api.sunrise-sunset.org/json';
const GEO_API = 'https://ipapi.co/json/';
const GEO_SEARCH_API = 'https://geocoding-api.open-meteo.com/v1/search';

function ok(data) {
  return { success: true, data: data };
}

function fail(code, error) {
  return { success: false, code: code, error: error };
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function formatLocalTime(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

function formatDateInTimeZone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = {};
  parts.forEach(function(part) {
    values[part.type] = part.value;
  });
  return values.year + '-' + values.month + '-' + values.day;
}

function formatTimeInTimeZone(isoString, timezone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(isoString));
}

function createLocalDayWindow(offsetDays) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (offsetDays || 0));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start, end: end };
}

function getWindowDateCandidates(windowStart) {
  const seen = Object.create(null);
  const dates = [];
  [-1, 0, 1].forEach(function(delta) {
    const value = new Date(windowStart);
    value.setDate(value.getDate() + delta);
    const key = formatLocalDate(value);
    if (!seen[key]) {
      seen[key] = true;
      dates.push(key);
    }
  });
  return dates;
}

function shiftIsoMinutes(isoString, offsetMinutes) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + (offsetMinutes || 0));
  return date.toISOString();
}

function invokeRestJson(url, timeoutSec) {
  const safeUrl = url.replace(/'/g, "''");
  const psCmd = [
    'powershell -Command "',
    'try {',
    '  Invoke-RestMethod -Uri \'' + safeUrl + '\' -TimeoutSec ' + timeoutSec,
    '} catch { @{error=$_.Exception.Message} } | ConvertTo-Json -Compress -Depth 8"',
  ].join('\n');

  try {
    return JSON.parse(execSync(psCmd, {
      windowsHide: true,
      encoding: 'utf8',
      timeout: Math.max(12000, timeoutSec * 1000 + 4000)
    }));
  } catch (err) {
    return { error: err.message };
  }
}

function buildSunConfig(config) {
  return {
    lat: Number(config.lat),
    lng: Number(config.lng),
    name: config.name || config.city || '',
    region: config.region || '',
    country: config.country || '',
    timezone: config.timezone || '',
    offsetDark: Number(config.offsetDark) || 0,
    offsetLight: Number(config.offsetLight) || 0
  };
}

function rollbackSunModeState() {
  deleteScheduledTask(TASK_DARK);
  deleteScheduledTask(TASK_LIGHT);
  deleteScheduledTask(TASK_UPDATER);
  try {
    window.ztools.dbStorage.setItem('automode-enabled', 'false');
    window.ztools.dbStorage.setItem('automode-mode', '');
  } catch (e) {}
}

// ========== 主题切换脚本 ==========

function ensureScripts() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
  }

  const darkScript = generateThemeSwitchScript('dark');
  const lightScript = generateThemeSwitchScript('light');

  fs.writeFileSync(PS_DARK, darkScript, 'utf8');
  fs.writeFileSync(PS_LIGHT, lightScript, 'utf8');

  // VBS 包装器：通过 WScript.Shell.Run 启动 PowerShell，完全隐藏窗口
  function makeVbs(psName) {
    return [
      'Set fso = CreateObject("Scripting.FileSystemObject")',
      'sd = fso.GetParentFolderName(WScript.ScriptFullName)',
      'Set ws = CreateObject("WScript.Shell")',
      'ws.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & sd & "\\' + psName + '""", 0'
    ].join('\r\n');
  }
  fs.writeFileSync(VBS_DARK, makeVbs('switch-dark.ps1'), 'utf8');
  fs.writeFileSync(VBS_LIGHT, makeVbs('switch-light.ps1'), 'utf8');
}

// ========== 计划任务管理 ==========

function createScheduledTask(mode, time) {
  try {
    ensureScripts();
    const taskName = mode === 'dark' ? TASK_DARK : TASK_LIGHT;

    try {
      execSync('schtasks /Delete /TN "' + taskName + '" /F', { windowsHide: true });
    } catch (e) {}

    const xmlBuffer = generateTaskXml(mode, time, SCRIPTS_DIR);
    const xmlPath = path.join(SCRIPTS_DIR, 'task-' + mode + '.xml');
    fs.writeFileSync(xmlPath, xmlBuffer);

    execSync(
      'schtasks /Create /TN "' + taskName + '" /XML "' + xmlPath + '" /F',
      { windowsHide: true, encoding: 'utf8' }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteScheduledTask(taskName) {
  try {
    execSync('schtasks /Delete /TN "' + taskName + '" /F', { windowsHide: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function queryTask(taskName) {
  try {
    // 使用 CSV 格式，避免中英文 Windows 输出差异
    const output = execSync(
      'schtasks /Query /TN "' + taskName + '" /FO CSV /NH',
      { windowsHide: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    // CSV 格式: "任务名","下次运行时间","状态",...
    const fields = output.split('","').map(function(s) { return s.replace(/^"|"$/g, '').trim(); });
    const status = fields[2] || '未知';
    const rawRun = fields[1] || '';
    // "YYYY/MM/DD HH:mm:ss" → "HH:mm:ss"
    const timePart = rawRun.includes(' ') ? rawRun.split(' ').pop() : rawRun;

    return {
      exists: true,
      status: status,
      nextRun: timePart === 'N/A' || timePart === '' ? '未安排' : timePart
    };
  } catch (err) {
    return { exists: false };
  }
}

// ========== 日出日落模式 ==========

/**
 * 通过 IP 获取用户位置信息
 */
function getUserLocation() {
  const data = invokeRestJson(GEO_API, 8);
  if (data.error) {
    return fail('network_error', data.error);
  }

  const location = normalizeIpLocation(data);
  if (!location) {
    return fail('provider_error', '定位服务返回了不完整的位置数据');
  }
  return ok(location);
}

/**
 * 搜索城市候选
 */
function searchCities(query) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) {
    return ok([]);
  }

  const url = GEO_SEARCH_API + '?name=' + encodeURIComponent(trimmed) + '&count=8&format=json';
  const data = invokeRestJson(url, 10);
  if (data.error) {
    return fail('network_error', data.error);
  }

  const rawResults = Array.isArray(data.results) ? data.results : [];
  const results = rawResults.map(normalizeGeocodeResult).filter(Boolean);
  return ok(results);
}

function fetchSunApiDate(lat, lng, timezone, date) {
  const url = SUN_API +
    '?lat=' + encodeURIComponent(String(lat)) +
    '&lng=' + encodeURIComponent(String(lng)) +
    '&formatted=0' +
    '&date=' + encodeURIComponent(date) +
    '&tzid=' + encodeURIComponent(timezone);
  const data = invokeRestJson(url, 12);
  if (data.error) {
    return fail('network_error', data.error);
  }
  if (!data.results || !data.results.sunrise || !data.results.sunset) {
    return fail('provider_error', '日出日落接口返回了无效数据');
  }
  return ok({
    sunriseIso: data.results.sunrise,
    sunsetIso: data.results.sunset,
    timezone: data.results.timezone || timezone,
    date: date
  });
}

function resolveSunSchedule(config, windowOffsetDays) {
  const window = createLocalDayWindow(windowOffsetDays || 0);
  const dates = getWindowDateCandidates(window.start);
  const events = [];

  for (let i = 0; i < dates.length; i += 1) {
    const daily = fetchSunApiDate(config.lat, config.lng, config.timezone, dates[i]);
    if (!daily.success) {
      return daily;
    }
    events.push({
      kind: 'light',
      iso: shiftIsoMinutes(daily.data.sunriseIso, config.offsetLight || 0)
    });
    events.push({
      kind: 'dark',
      iso: shiftIsoMinutes(daily.data.sunsetIso, config.offsetDark || 0)
    });
  }

  const picked = pickWindowEvents(events, window.start, window.end);
  if (!picked) {
    return fail('empty_result', '无法在本机当天窗口内解析有效的日出日落切换时间');
  }

  return ok({
    lightEventIso: picked.lightEvent.iso,
    darkEventIso: picked.darkEvent.iso,
    lightTimeLocal: formatLocalTime(new Date(picked.lightEvent.iso)),
    darkTimeLocal: formatLocalTime(new Date(picked.darkEvent.iso)),
    windowStart: formatLocalDate(window.start)
  });
}

/**
 * 获取日出日落时间
 */
function fetchSunTimes(lat, lng, timezone, offsets) {
  const config = buildSunConfig({
    lat: lat,
    lng: lng,
    timezone: timezone,
    offsetDark: offsets && offsets.offsetDark,
    offsetLight: offsets && offsets.offsetLight,
    name: 'selected-location'
  });
  const cityDate = formatDateInTimeZone(new Date(), timezone);
  const display = fetchSunApiDate(config.lat, config.lng, config.timezone, cityDate);
  if (!display.success) {
    return display;
  }

  const schedule = resolveSunSchedule(config, offsets && typeof offsets.windowOffsetDays === 'number' ? offsets.windowOffsetDays : 0);
  if (!schedule.success) {
    return schedule;
  }

  return ok({
    sunrise: formatTimeInTimeZone(display.data.sunriseIso, config.timezone),
    sunset: formatTimeInTimeZone(display.data.sunsetIso, config.timezone),
    timezone: config.timezone,
    cityDate: cityDate,
    sunriseIso: display.data.sunriseIso,
    sunsetIso: display.data.sunsetIso,
    lightTimeLocal: schedule.data.lightTimeLocal,
    darkTimeLocal: schedule.data.darkTimeLocal,
    lightEventIso: schedule.data.lightEventIso,
    darkEventIso: schedule.data.darkEventIso
  });
}

/**
 * 生成每日日出日落更新脚本（委托给 lib/utils.js）
 */
function generateUpdaterScriptForConfig(config) {
  return generateUpdaterScript(config, SCRIPTS_DIR);
}

/**
 * 创建每日更新计划任务（每天 23:50 运行）
 */
function createUpdaterTask(config) {
  try {
    ensureScripts();

    const script = generateUpdaterScriptForConfig(config);
    fs.writeFileSync(PS_UPDATER, script, 'utf8');

    // 先删除旧的 updater 任务
    try {
      execSync('schtasks /Delete /TN "' + TASK_UPDATER + '" /F', { windowsHide: true });
    } catch (e) {}

    const updaterXml = [
      '<?xml version="1.0" encoding="UTF-16"?>',
      '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
      '  <RegistrationInfo>',
      '    <Description>AutoMode: 每日更新日出日落时间</Description>',
      '    <Author>AutoMode</Author>',
      '  </RegistrationInfo>',
      '  <Triggers>',
      '    <CalendarTrigger>',
      '      <StartBoundary>' + formatLocalDate(new Date()) + 'T23:50:00</StartBoundary>',
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
      '    <StartWhenAvailable>true</StartWhenAvailable>',
      '    <AllowStartOnDemand>true</AllowStartOnDemand>',
      '    <Enabled>true</Enabled>',
      '    <Hidden>true</Hidden>',
      '    <ExecutionTimeLimit>PT2M</ExecutionTimeLimit>',
      '    <Priority>7</Priority>',
      '  </Settings>',
      '  <Actions Context="Author">',
      '    <Exec>',
      '      <Command>powershell.exe</Command>',
      '      <Arguments>-WindowStyle Hidden -ExecutionPolicy Bypass -File "' + PS_UPDATER.replace(/\\/g, '\\\\') + '"</Arguments>',
      '    </Exec>',
      '  </Actions>',
      '</Task>'
    ].join('\n');

    const bom = Buffer.from([0xFF, 0xFE]);
    const content = Buffer.from(updaterXml, 'utf16le');
    const xmlPath = path.join(SCRIPTS_DIR, 'task-updater.xml');
    fs.writeFileSync(xmlPath, Buffer.concat([bom, content]));

    execSync(
      'schtasks /Create /TN "' + TASK_UPDATER + '" /XML "' + xmlPath + '" /F',
      { windowsHide: true, encoding: 'utf8' }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ========== 主题切换核心 ==========

function getCurrentThemeFromRegistry() {
  try {
    const output = execSync(
      'reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v AppsUseLightTheme',
      { windowsHide: true, encoding: 'utf8' }
    );
    const match = output.match(/AppsUseLightTheme\s+REG_DWORD\s+0x(\d+)/);
    const isLight = match ? parseInt(match[1], 16) === 1 : false;
    return { dark: !isLight };
  } catch (err) {
    try {
      return { dark: window.ztools.isDarkColors() };
    } catch (e2) {
      return { dark: false };
    }
  }
}

function switchThemeImmediate(mode) {
  try {
    ensureScripts();
    const script = mode === 'dark' ? VBS_DARK : VBS_LIGHT;

    execSync(
      'wscript.exe "' + script + '"',
      { windowsHide: true, timeout: 15000 }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ========== 对外 API：定时模式 ==========

function enableScheduler(config) {
  // 先持久化配置，失败则不创建任务
  try {
    window.ztools.dbStorage.setItem('automode-config', JSON.stringify(config));
    window.ztools.dbStorage.setItem('automode-mode', 'schedule');
    window.ztools.dbStorage.setItem('automode-enabled', 'true');
  } catch (e) {
    return { success: false, error: '保存配置失败: ' + e.message };
  }

  const resultDark = createScheduledTask('dark', config.darkTime);
  const resultLight = createScheduledTask('light', config.lightTime);

  if (!resultDark.success || !resultLight.success) {
    // 回滚配置
    window.ztools.dbStorage.setItem('automode-enabled', 'false');
    const errors = [];
    if (!resultDark.success) errors.push('深色任务: ' + resultDark.error);
    if (!resultLight.success) errors.push('浅色任务: ' + resultLight.error);
    return { success: false, error: errors.join('; ') };
  }

  return { success: true };
}

// ========== 对外 API：日出日落模式 ==========

function enableSunScheduler(config) {
  const sunConfig = buildSunConfig(config);
  const validation = validateSunConfig(sunConfig);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    ensureScripts();
    const sunTimes = fetchSunTimes(sunConfig.lat, sunConfig.lng, sunConfig.timezone, {
      offsetDark: sunConfig.offsetDark,
      offsetLight: sunConfig.offsetLight,
      windowOffsetDays: 0
    });
    if (!sunTimes.success) {
      return { success: false, error: sunTimes.error, code: sunTimes.code };
    }

    // 创建主题切换任务
    const resultDark = createScheduledTask('dark', sunTimes.data.darkTimeLocal);
    const resultLight = createScheduledTask('light', sunTimes.data.lightTimeLocal);

    if (!resultDark.success || !resultLight.success) {
      deleteScheduledTask(TASK_DARK);
      deleteScheduledTask(TASK_LIGHT);
      const errors = [];
      if (!resultDark.success) errors.push('深色任务: ' + resultDark.error);
      if (!resultLight.success) errors.push('浅色任务: ' + resultLight.error);
      return { success: false, error: errors.join('; ') };
    }

    fs.writeFileSync(SUN_CONFIG_FILE, JSON.stringify(sunConfig), 'utf8');
    try {
      window.ztools.dbStorage.setItem('automode-sun-config', JSON.stringify(sunConfig));
      window.ztools.dbStorage.setItem('automode-mode', 'sun');
      window.ztools.dbStorage.setItem('automode-enabled', 'true');
    } catch (e) {
      rollbackSunModeState();
      return { success: false, error: '保存配置失败: ' + e.message };
    }

    // 创建每日更新任务
    const updaterResult = createUpdaterTask(sunConfig);
    if (!updaterResult.success) {
      rollbackSunModeState();
      return { success: false, error: '创建每日更新任务失败: ' + updaterResult.error };
    }

    return {
      success: true,
      sunrise: sunTimes.data.sunrise,
      sunset: sunTimes.data.sunset,
      darkTime: sunTimes.data.darkTimeLocal,
      lightTime: sunTimes.data.lightTimeLocal
    };
  } catch (err) {
    rollbackSunModeState();
    return { success: false, error: err.message };
  }
}

// ========== 对外 API：禁用 ==========

function disableScheduler() {
  const tasks = [TASK_DARK, TASK_LIGHT, TASK_UPDATER];
  const results = {};

  tasks.forEach(function (name) {
    results[name] = deleteScheduledTask(name).success;
  });

  try {
    window.ztools.dbStorage.setItem('automode-enabled', 'false');
    window.ztools.dbStorage.setItem('automode-mode', '');
  } catch (e) {}

  return { success: true, tasks: results };
}

// ========== 对外 API：查询 ==========

function getCurrentTheme() {
  return getCurrentThemeFromRegistry();
}

function getTaskStatus() {
  const darkTask = queryTask(TASK_DARK);
  const lightTask = queryTask(TASK_LIGHT);
  const updaterTask = queryTask(TASK_UPDATER);
  return {
    dark: darkTask,
    light: lightTask,
    updater: updaterTask,
    enabled: darkTask.exists && lightTask.exists,
    isSunMode: updaterTask.exists
  };
}

function switchImmediate(mode) {
  return switchThemeImmediate(mode);
}

function getSavedConfig() {
  try {
    const mode = window.ztools.dbStorage.getItem('automode-mode');
    const enabled = window.ztools.dbStorage.getItem('automode-enabled');
    const sunConfig = window.ztools.dbStorage.getItem('automode-sun-config');
    const scheduleConfig = window.ztools.dbStorage.getItem('automode-config');

    if (mode === 'sun' && sunConfig) {
      return { mode: 'sun', config: JSON.parse(sunConfig), enabled: enabled === 'true' };
    }
    if (mode === 'schedule' && scheduleConfig) {
      return { mode: 'schedule', config: JSON.parse(scheduleConfig), enabled: enabled === 'true' };
    }
    if (sunConfig) {
      return { mode: 'sun', config: JSON.parse(sunConfig), enabled: false };
    }
    if (scheduleConfig) {
      return { mode: 'schedule', config: JSON.parse(scheduleConfig), enabled: false };
    }

    return { mode: 'schedule', config: null, enabled: enabled === 'true' };
  } catch (e) {
    return { mode: 'schedule', config: null, enabled: false };
  }
}

// ========== 插件入口 ==========

window.themeAPI = {
  // 定时模式
  enableScheduler: enableScheduler,
  // 日出日落模式
  enableSunScheduler: enableSunScheduler,
  // 禁用（通用）
  disableScheduler: disableScheduler,
  // 立即切换
  switchImmediate: switchImmediate,
  // 获取当前主题
  getCurrentTheme: getCurrentTheme,
  // 获取任务状态
  getTaskStatus: getTaskStatus,
  // 获取保存的配置
  getSavedConfig: getSavedConfig,
  // 获取用户位置
  getUserLocation: getUserLocation,
  // 搜索城市候选
  searchCities: searchCities,
  // 获取日出日落时间
  fetchSunTimes: fetchSunTimes
};

try {
  window.ztools.onPluginEnter(function () {
    console.log('[AutoMode] 插件已激活');
    ensureScripts();
  });
} catch (e) {
  console.error('[AutoMode] onPluginEnter 初始化失败:', e);
  ensureScripts();
}
