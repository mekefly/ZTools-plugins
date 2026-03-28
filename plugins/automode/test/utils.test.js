/**
 * TDD Tests for lib/utils.js — AutoMode 纯逻辑模块
 *
 * 这些测试在 lib/utils.js 创建之前编写（RED 阶段）
 * 测试运行时应该 FAIL 因为模块不存在
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let utils;

describe('lib/utils.js', () => {

  before(() => {
    utils = require('../lib/utils');
  });

  describe('calcTimeWithOffset(hours, minutes, offset)', () => {

    it('should return same time with zero offset', () => {
      assert.equal(utils.calcTimeWithOffset(6, 0, 0), '06:00');
    });

    it('should add positive offset within same day', () => {
      assert.equal(utils.calcTimeWithOffset(6, 0, 15), '06:15');
    });

    it('should subtract with negative offset within same day', () => {
      assert.equal(utils.calcTimeWithOffset(18, 0, -10), '17:50');
    });

    it('should wrap forward past midnight (23:00 + 120 = 01:00)', () => {
      assert.equal(utils.calcTimeWithOffset(23, 0, 120), '01:00');
    });

    it('should wrap backward past midnight (01:00 - 120 = 23:00)', () => {
      assert.equal(utils.calcTimeWithOffset(1, 0, -120), '23:00');
    });

    it('should handle 00:00 - 1 = 23:59', () => {
      assert.equal(utils.calcTimeWithOffset(0, 0, -1), '23:59');
    });

    it('should handle 23:59 + 1 = 00:00', () => {
      assert.equal(utils.calcTimeWithOffset(23, 59, 1), '00:00');
    });

    it('should handle full day offset (24h wrap)', () => {
      assert.equal(utils.calcTimeWithOffset(12, 0, 1440), '12:00');
    });

    it('should handle real sunrise case (05:47 - 10 = 05:37)', () => {
      assert.equal(utils.calcTimeWithOffset(5, 47, -10), '05:37');
    });

    it('should handle real sunset case (18:32 + 15 = 18:47)', () => {
      assert.equal(utils.calcTimeWithOffset(18, 32, 15), '18:47');
    });

    it('should handle extreme sunrise (00:05 - 30 = 23:35)', () => {
      assert.equal(utils.calcTimeWithOffset(0, 5, -30), '23:35');
    });

    it('should handle extreme sunset (23:55 + 30 = 00:25)', () => {
      assert.equal(utils.calcTimeWithOffset(23, 55, 30), '00:25');
    });
  });

  describe('generateTaskXml(mode, time, scriptsDir)', () => {

    it('should generate valid UTF-16 LE XML with BOM', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      // Check BOM
      assert.equal(xml[0], 0xFF);
      assert.equal(xml[1], 0xFE);
    });

    it('should contain description matching the mode', () => {
      const xmlDark = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const xmlLight = utils.generateTaskXml('light', '07:00', 'C:\\test');
      const textDark = xmlDark.toString('utf16le');
      const textLight = xmlLight.toString('utf16le');
      assert.ok(textDark.includes('深色模式'));
      assert.ok(textLight.includes('浅色模式'));
    });

    it('should use different script files for dark and light', () => {
      const xmlDark = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const xmlLight = utils.generateTaskXml('light', '07:00', 'C:\\test');
      const textDark = xmlDark.toString('utf16le');
      const textLight = xmlLight.toString('utf16le');
      assert.ok(textDark.includes('switch-dark.vbs') && !textDark.includes('switch-light.vbs'));
      assert.ok(textLight.includes('switch-light.vbs') && !textLight.includes('switch-dark.vbs'));
    });

    it('should embed the time in StartBoundary', () => {
      const xml = utils.generateTaskXml('dark', '19:30', 'C:\\test');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('T19:30:00'));
    });

    it('should use current date in StartBoundary (not hardcoded)', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const text = xml.toString('utf16le');
      const today = new Date().toISOString().split('T')[0];
      assert.ok(text.includes(today), 'Should use current date, not 2024-01-01');
      assert.ok(!text.includes('2024-01-01'), 'Should not have hardcoded date');
    });

    it('should have StartWhenAvailable=false for theme tasks', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('StartWhenAvailable>false'), 'Theme tasks should not auto-trigger on wake');
    });

    it('should reference the correct PowerShell script path', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\Users\\test\\.automode-scripts');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('switch-dark.vbs'));
    });

    it('should reference switch-light.vbs for light mode', () => {
      const xml = utils.generateTaskXml('light', '07:00', 'C:\\Users\\test\\.automode-scripts');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('switch-light.vbs'));
    });

    it('should include wscript.exe as Command', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('<Command>wscript.exe</Command>'));
    });

    it('should pass the wrapped VBS path as the task argument', () => {
      const xml = utils.generateTaskXml('dark', '19:00', 'C:\\test');
      const text = xml.toString('utf16le');
      assert.ok(text.includes('<Arguments>"C:\\\\test\\\\switch-dark.vbs"</Arguments>'));
    });
  });

  describe('generateUpdaterScript(config, scriptsDir)', () => {

    it('should read lat and lng from config file (not hardcoded)', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      assert.ok(script.includes('$lat = $config.lat'));
      assert.ok(script.includes('$lng = $config.lng'));
    });

    it('should read offsets from config file', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 15, offsetLight: -10 },
        'C:\\test'
      );
      assert.ok(script.includes('$offsetDark = [int]$config.offsetDark'));
      assert.ok(script.includes('$offsetLight = [int]$config.offsetLight'));
    });

    it('should have here-string closing "@ on its own line', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      const lines = script.split(/\r?\n/);
      // Find all "@" lines
      const closingHereStrings = lines.filter(l => l.trim() === '"@');
      // There should be 2 (one for dark XML, one for light XML)
      assert.equal(closingHereStrings.length, 2, 'Should have exactly 2 here-string closers on their own lines');
    });

    it('should NOT have "@ appended to XML content (the critical bug)', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      // The bug was </Task>"@  — closing should be separate lines
      assert.ok(!script.includes('</Task>"@'), 'Here-string closer must be on its own line');
      assert.ok(!script.includes('</Task>\r\n"@') || script.includes('</Task>\r\n"@'),
        'Closing "@ must be alone');
    });

    it('should reference sunrise-sunset API', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      assert.ok(script.includes('api.sunrise-sunset.org'));
    });

    it('should include schtasks /Create commands for both tasks', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      assert.ok(script.includes('schtasks /Create /TN "AutoMode_Dark"'));
      assert.ok(script.includes('schtasks /Create /TN "AutoMode_Light"'));
    });

    it('should reference the config file path', () => {
      const script = utils.generateUpdaterScript(
        { lat: 31.23, lng: 121.47, offsetDark: 0, offsetLight: 0 },
        'C:\\test'
      );
      assert.ok(script.includes('sun-config.json'));
    });
  });

  describe('generateThemeSwitchScript(mode)', () => {

    it('should generate a valid shell refresh block for dark mode', () => {
      const script = utils.generateThemeSwitchScript('dark');
      assert.ok(script.includes('EntryPoint = "SendMessageTimeoutW"'));
      assert.ok(script.includes('EntryPoint = "FindWindowW"'));
      assert.ok(script.includes('FindWindow("Shell_TrayWnd", $null)'));
      assert.ok(script.includes('ImmersiveColorSet'));
    });

    it('should write both app and system theme values for light mode', () => {
      const script = utils.generateThemeSwitchScript('light');
      assert.ok(script.includes('/v AppsUseLightTheme /t REG_DWORD /d 1 /f'));
      assert.ok(script.includes('/v SystemUsesLightTheme /t REG_DWORD /d 1 /f'));
    });

    it('should generate a direct taskbar refresh call', () => {
      const script = utils.generateThemeSwitchScript('dark');
      assert.ok(script.includes('SendMessageTimeout($tray, $WM_SETTINGCHANGE'));
    });
  });

  describe('validateSunConfig(config)', () => {

    it('should return valid for correct config', () => {
      const result = utils.validateSunConfig({
        lat: 31.23, lng: 121.47, city: 'Shanghai',
        offsetDark: 15, offsetLight: -10
      });
      assert.equal(result.valid, true);
    });

    it('should reject lat > 90', () => {
      const result = utils.validateSunConfig({ lat: 91, lng: 0, offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, false);
    });

    it('should reject lat < -90', () => {
      const result = utils.validateSunConfig({ lat: -91, lng: 0, offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, false);
    });

    it('should reject lng > 180', () => {
      const result = utils.validateSunConfig({ lat: 0, lng: 181, offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, false);
    });

    it('should reject lng < -180', () => {
      const result = utils.validateSunConfig({ lat: 0, lng: -181, offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, false);
    });

    it('should accept boundary values (90, 180)', () => {
      const result = utils.validateSunConfig({ lat: 90, lng: 180, offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, true);
    });

    it('should reject offset outside -120..120', () => {
      const r1 = utils.validateSunConfig({ lat: 0, lng: 0, offsetDark: 121, offsetLight: 0 });
      const r2 = utils.validateSunConfig({ lat: 0, lng: 0, offsetDark: 0, offsetLight: -121 });
      assert.equal(r1.valid, false);
      assert.equal(r2.valid, false);
    });

    it('should handle missing lat/lng', () => {
      const result = utils.validateSunConfig({ offsetDark: 0, offsetLight: 0 });
      assert.equal(result.valid, false);
    });
  });
});
