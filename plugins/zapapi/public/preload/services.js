const fs = require('node:fs')
const path = require('node:path')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile(text) {
    const filePath = path.join(window.ztools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile(base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(
      window.ztools.getPath('downloads'),
      Date.now().toString() + '.' + matchs[1]
    )
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // 暴露 net 模块和 dgram 模块的创建方法以避开序列化限制
  createTcpClient(host, port, onMessage, onError, onClose) {
    const net = require('node:net');
    const client = new net.Socket();
    client.connect(port, host, () => {
      onMessage('System', `Connected to TCP ${host}:${port}`);
    });
    client.on('data', (data) => {
      onMessage('Received', data.toString());
    });
    client.on('error', (err) => {
      onError(err.message);
    });
    client.on('close', () => {
      onClose();
    });
    return {
      send: (text) => client.write(text),
      close: () => client.destroy()
    };
  },
  createUdpClient(host, port, onMessage, onError) {
    const dgram = require('node:dgram');
    const client = dgram.createSocket('udp4');
    client.on('message', (msg, rinfo) => {
      onMessage('Received', msg.toString());
    });
    client.on('error', (err) => {
      onError(err.message);
      client.close();
    });
    return {
      send: (text) => {
        const buf = Buffer.from(text);
        client.send(buf, 0, buf.length, port, host, (err) => {
          if (err) onError(err.message);
        });
      },
      close: () => client.close()
    };
  }
}
