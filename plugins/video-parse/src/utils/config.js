const data = {
  downloadPath: window.utools.getPath('downloads'), // 默认下载路径
}

export function setConfig(key, value) {
  window.utools.dbStorage.setItem(key, value);
}

export function getConfig(key) {
  return window.utools.dbStorage.getItem(key);
}