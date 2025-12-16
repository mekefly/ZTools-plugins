const fs = require('node:fs')
const path = require('node:path')
const { parseInfo } = require('./parser');

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // 下载视频到本地下载目录
  async downloadVideo (url, type = 'pic') {
    const https = require('https');
    const fs = require('fs');
    return new Promise((resolve, reject) => {
      // 从URL提取文件名，如果没有则使用时间戳
      let filename = '';
      if (!filename || filename === '/') {
        filename = Date.now().toString() + (type === 'video' ? '.mp4' : '.jpg');
      }
      const filePath = path.join(window.utools.dbStorage.getItem('downloadPath'), filename);
      
      const file = fs.createWriteStream(filePath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  },
  parseInfo (sharedUrl) {
    return parseInfo(sharedUrl);
  },
}
