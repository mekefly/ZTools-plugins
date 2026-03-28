/**
 * AutoMode - ZTools 插件预加载脚本
 * 支持定时模式和日出日落模式管理系统深浅色主题切换
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { calcTimeWithOffset, generateTaskXml, generateUpdaterScript, generateThemeSwitchScript, validateSunConfig } = require('./lib/utils');

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
  try {
    const psCmd = [
      'powershell -Command "',
      'try {',
      '  $r = Invoke-RestMethod -Uri \'' + GEO_API + '\' -TimeoutSec 8;',
      '  @{lat=[double]$r.latitude;lng=[double]$r.longitude;city=$r.city;region=$r.region_name;country=$r.country_name}',
      '} catch { @{error=$_.Exception.Message }',
      '} | ConvertTo-Json -Compress"'
    ].join('\n');

    const result = execSync(psCmd, { windowsHide: true, encoding: 'utf8', timeout: 12000 });
    const data = JSON.parse(result);
    if (data.error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * 获取日出日落时间（返回本地时间 HH:mm 格式）
 */
function fetchSunTimes(lat, lng) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const url = SUN_API + '?lat=' + lat + '&lng=' + lng + '&formatted=0&date=' + date;

    const psCmd = [
      'powershell -Command "',
      'try {',
      '  $r = Invoke-RestMethod -Uri \'' + url + '\' -TimeoutSec 10;',
      '  $sr = [DateTime]::Parse($r.results.sunrise).ToLocalTime();',
      '  $ss = [DateTime]::Parse($r.results.sunset).ToLocalTime();',
      '  @{sunrise=$sr.ToString(\'HH:mm\');sunset=$ss.ToString(\'HH:mm\');dayLength=$r.results.day_length;tz=$r.results.timezone}',
      '} catch { @{error=$_.Exception.Message }',
      '} | ConvertTo-Json -Compress"'
    ].join('\n');

    const result = execSync(psCmd, { windowsHide: true, encoding: 'utf8', timeout: 15000 });
    const data = JSON.parse(result);
    if (data.error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * 生成每日日出日落更新脚本（委托给 lib/utils.js）
 */
function generateUpdaterScriptForConfig(config) {
  return generateUpdaterScript(config, SCRIPTS_DIR);
}

/**
 * 创建每日更新计划任务（每天 00:05 运行）
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
      '      <StartBoundary>' + new Date().toISOString().split('T')[0] + 'T00:05:00</StartBoundary>',
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
  // config: { lat, lng, city, offsetDark, offsetLight }
  try {
    ensureScripts();

    // 保存配置到文件（供每日更新脚本读取）
    fs.writeFileSync(SUN_CONFIG_FILE, JSON.stringify(config), 'utf8');

    // 先持久化到 dbStorage，失败则不创建任务
    try {
      window.ztools.dbStorage.setItem('automode-sun-config', JSON.stringify(config));
      window.ztools.dbStorage.setItem('automode-mode', 'sun');
      window.ztools.dbStorage.setItem('automode-enabled', 'true');
    } catch (e) {
      return { success: false, error: '保存配置失败: ' + e.message };
    }

    // 获取今天的日出日落时间
    const sunTimes = fetchSunTimes(config.lat, config.lng);
    if (!sunTimes) {
      return { success: false, error: '无法获取日出日落时间，请检查网络连接' };
    }

    // 计算偏移后的时间（使用 lib/utils.js 纯函数）
    const [srH, srM] = sunTimes.sunrise.split(':').map(Number);
    const [ssH, ssM] = sunTimes.sunset.split(':').map(Number);
    const lightTime = calcTimeWithOffset(srH, srM, config.offsetLight || 0);
    const darkTime = calcTimeWithOffset(ssH, ssM, config.offsetDark || 0);

    // 创建主题切换任务
    const resultDark = createScheduledTask('dark', darkTime);
    const resultLight = createScheduledTask('light', lightTime);

    if (!resultDark.success || !resultLight.success) {
      const errors = [];
      if (!resultDark.success) errors.push('深色任务: ' + resultDark.error);
      if (!resultLight.success) errors.push('浅色任务: ' + resultLight.error);
      return { success: false, error: errors.join('; ') };
    }

    // 创建每日更新任务
    const updaterResult = createUpdaterTask(config);
    if (!updaterResult.success) {
      console.error('创建每日更新任务失败:', updaterResult.error);
      // 不算致命错误，今天的任务已经创建成功
    }

    return {
      success: true,
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      darkTime: darkTime,
      lightTime: lightTime
    };
  } catch (err) {
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

    if (mode === 'sun') {
      const sunConfig = window.ztools.dbStorage.getItem('automode-sun-config');
      if (sunConfig) {
        return { mode: 'sun', config: JSON.parse(sunConfig), enabled: enabled === 'true' };
      }
    }

    const configStr = window.ztools.dbStorage.getItem('automode-config');
    if (configStr) {
      return { mode: 'schedule', config: JSON.parse(configStr), enabled: enabled === 'true' };
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
