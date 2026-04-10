const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')

const COOKIE_STORE_FILE = 'zapapi-cookies.json'
const COOKIE_LIMIT_DEFAULT = 2000

function getUserDataDir() {
  if (window.ztools && typeof window.ztools.getPath === 'function') {
    try {
      const dir = window.ztools.getPath('userData')
      if (dir) {
        return dir
      }
    } catch {}
  }

  try {
    return window.ztools.getPath('downloads')
  } catch {
    return process.cwd()
  }
}

function getCookieStorePath() {
  return path.join(getUserDataDir(), COOKIE_STORE_FILE)
}

function loadCookieState() {
  try {
    const filePath = getCookieStorePath()
    if (!fs.existsSync(filePath)) {
      return { version: 1, cookies: [] }
    }
    const raw = fs.readFileSync(filePath, { encoding: 'utf-8' })
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.cookies)) {
      return { version: 1, cookies: [] }
    }
    return { version: 1, cookies: parsed.cookies }
  } catch {
    return { version: 1, cookies: [] }
  }
}

function saveCookieState(state) {
  try {
    const filePath = getCookieStorePath()
    fs.writeFileSync(filePath, JSON.stringify(state), { encoding: 'utf-8' })
  } catch {}
}

const cookieState = loadCookieState()

function nowMs() {
  return Date.now()
}

function normalizeDomain(domain) {
  return (domain || '').trim().toLowerCase().replace(/^\.+/, '')
}

function normalizePath(value) {
  if (!value || value[0] !== '/') {
    return '/'
  }
  return value
}

function domainMatch(hostname, cookieDomain, hostOnly) {
  const host = hostname.toLowerCase()
  const cd = normalizeDomain(cookieDomain)
  if (!cd) return false
  if (hostOnly) return host === cd
  return host === cd || host.endsWith(`.${cd}`)
}

function pathMatch(reqPath, cookiePath) {
  const rp = reqPath || '/'
  const cp = normalizePath(cookiePath)
  if (rp === cp) return true
  if (!rp.startsWith(cp)) return false
  if (cp.endsWith('/')) return true
  return rp.charAt(cp.length) === '/'
}

function defaultPath(urlPathname) {
  if (!urlPathname || urlPathname[0] !== '/') {
    return '/'
  }
  if (urlPathname === '/') {
    return '/'
  }
  const idx = urlPathname.lastIndexOf('/')
  if (idx <= 0) {
    return '/'
  }
  return urlPathname.slice(0, idx)
}

function parseSetCookie(setCookieValue, responseUrl) {
  if (!setCookieValue || typeof setCookieValue !== 'string') {
    return null
  }

  let parsedUrl
  try {
    parsedUrl = new URL(responseUrl)
  } catch {
    return null
  }

  const parts = setCookieValue.split(';').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) {
    return null
  }

  const nvIdx = parts[0].indexOf('=')
  if (nvIdx <= 0) {
    return null
  }

  const name = parts[0].slice(0, nvIdx).trim()
  const value = parts[0].slice(nvIdx + 1)
  if (!name) {
    return null
  }

  const now = nowMs()
  let domain = parsedUrl.hostname.toLowerCase()
  let hostOnly = true
  let cookiePath = defaultPath(parsedUrl.pathname)
  let secure = false
  let httpOnly = false
  let sameSite = ''
  let expiresAt = null
  let session = true

  for (let i = 1; i < parts.length; i += 1) {
    const item = parts[i]
    const eq = item.indexOf('=')
    const attrName = (eq === -1 ? item : item.slice(0, eq)).trim().toLowerCase()
    const attrValue = eq === -1 ? '' : item.slice(eq + 1).trim()

    if (attrName === 'domain') {
      const nextDomain = normalizeDomain(attrValue)
      if (nextDomain) {
        domain = nextDomain
        hostOnly = false
      }
      continue
    }

    if (attrName === 'path') {
      cookiePath = normalizePath(attrValue)
      continue
    }

    if (attrName === 'secure') {
      secure = true
      continue
    }

    if (attrName === 'httponly') {
      httpOnly = true
      continue
    }

    if (attrName === 'samesite') {
      const normalized = attrValue.toLowerCase()
      if (normalized === 'strict') sameSite = 'Strict'
      else if (normalized === 'lax') sameSite = 'Lax'
      else if (normalized === 'none') sameSite = 'None'
      continue
    }

    if (attrName === 'max-age') {
      const seconds = Number.parseInt(attrValue, 10)
      if (!Number.isNaN(seconds)) {
        expiresAt = now + Math.max(0, seconds) * 1000
        session = false
      }
      continue
    }

    if (attrName === 'expires') {
      const parsed = Date.parse(attrValue)
      if (!Number.isNaN(parsed)) {
        expiresAt = parsed
        session = false
      }
      continue
    }
  }

  if (!domainMatch(parsedUrl.hostname, domain, hostOnly)) {
    return null
  }

  const id = `${name}\t${domain}\t${cookiePath}`
  return {
    id,
    name,
    value,
    domain,
    path: cookiePath,
    hostOnly,
    secure,
    httpOnly,
    sameSite,
    expiresAt,
    session,
    createdAt: now,
    updatedAt: now
  }
}

function isExpired(cookie, now) {
  return typeof cookie.expiresAt === 'number' && cookie.expiresAt <= now
}

function pruneExpiredCookies() {
  const now = nowMs()
  const before = cookieState.cookies.length
  cookieState.cookies = cookieState.cookies.filter((cookie) => !isExpired(cookie, now))
  if (before !== cookieState.cookies.length) {
    saveCookieState(cookieState)
  }
}

function trimCookieStore(maxCookies) {
  const limit = maxCookies > 0 ? maxCookies : COOKIE_LIMIT_DEFAULT
  if (cookieState.cookies.length <= limit) {
    return
  }

  cookieState.cookies.sort((a, b) => {
    const at = typeof a.updatedAt === 'number' ? a.updatedAt : 0
    const bt = typeof b.updatedAt === 'number' ? b.updatedAt : 0
    return bt - at
  })
  cookieState.cookies = cookieState.cookies.slice(0, limit)
}

function storeCookiesFromResponse(headersRaw, responseUrl, policy) {
  if (!policy || !policy.enabled) {
    return
  }

  const setCookieHeaders = headersRaw
    .filter((header) => String(header.name || '').toLowerCase() === 'set-cookie')
    .map((header) => String(header.value || ''))
    .filter(Boolean)

  if (setCookieHeaders.length === 0) {
    return
  }

  for (const raw of setCookieHeaders) {
    const parsed = parseSetCookie(raw, responseUrl)
    if (!parsed) {
      continue
    }

    const index = cookieState.cookies.findIndex(
      (cookie) => cookie.name === parsed.name && cookie.domain === parsed.domain && cookie.path === parsed.path
    )

    if (index >= 0) {
      parsed.createdAt = cookieState.cookies[index].createdAt || parsed.createdAt
      cookieState.cookies[index] = parsed
    } else {
      cookieState.cookies.push(parsed)
    }
  }

  pruneExpiredCookies()
  trimCookieStore(policy.maxCookies)
  if (!policy.persistSessionCookies) {
    cookieState.cookies = cookieState.cookies.filter((cookie) => !cookie.session || cookie.expiresAt !== null)
  }
  saveCookieState(cookieState)
}

function getMatchedCookies(requestUrl) {
  let target
  try {
    target = new URL(requestUrl)
  } catch {
    return []
  }

  const now = nowMs()
  const isHttps = target.protocol === 'https:'
  const matched = cookieState.cookies.filter((cookie) => {
    if (isExpired(cookie, now)) {
      return false
    }
    if (!domainMatch(target.hostname, cookie.domain, Boolean(cookie.hostOnly))) {
      return false
    }
    if (!pathMatch(target.pathname || '/', cookie.path || '/')) {
      return false
    }
    if (cookie.secure && !isHttps) {
      return false
    }
    return true
  })

  matched.sort((a, b) => {
    const ap = (a.path || '/').length
    const bp = (b.path || '/').length
    if (bp !== ap) {
      return bp - ap
    }
    const at = typeof a.createdAt === 'number' ? a.createdAt : 0
    const bt = typeof b.createdAt === 'number' ? b.createdAt : 0
    return at - bt
  })

  return matched
}

function buildCookieHeader(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}

function mergeRequestHeaders(rawHeaders) {
  const entries = []
  for (const item of rawHeaders || []) {
    const name = String(item.name || '').trim()
    if (!name) {
      continue
    }
    entries.push([name, String(item.value || '')])
  }
  return entries
}

function collectRawHeaders(incoming) {
  const raw = incoming.rawHeaders
  if (Array.isArray(raw) && raw.length >= 2) {
    const collected = []
    for (let i = 0; i < raw.length; i += 2) {
      collected.push({
        name: String(raw[i] || ''),
        value: String(raw[i + 1] || '')
      })
    }
    return collected
  }

  const fallback = []
  const headers = incoming.headers || {}
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const single of value) {
        fallback.push({ name, value: String(single) })
      }
    } else {
      fallback.push({ name, value: String(value) })
    }
  }
  return fallback
}

function executeHttpRequest(payload, redirectCount) {
  return new Promise((resolve, reject) => {
    let urlObj
    try {
      urlObj = new URL(payload.url)
    } catch {
      reject(new Error('Invalid URL'))
      return
    }

    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    const timeoutMs = Number(payload.timeoutMs || 15000)
    const maxRedirects = Number(payload.maxRedirects || 5)
    const method = String(payload.method || 'GET').toUpperCase()
    const headersEntries = mergeRequestHeaders(payload.headers)
    const headersObject = {}

    for (const [name, value] of headersEntries) {
      headersObject[name] = value
    }

    const hasManualCookie = headersEntries.some(([name]) => name.toLowerCase() === 'cookie')
    if (!hasManualCookie && payload.cookieJar && payload.cookieJar.enabled) {
      pruneExpiredCookies()
      const matched = getMatchedCookies(payload.url)
      if (matched.length > 0) {
        headersObject.Cookie = buildCookieHeader(matched)
      }
    }

    const requestOptions = {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || undefined,
      method,
      path: `${urlObj.pathname}${urlObj.search}`,
      headers: headersObject
    }

    const startedAt = Date.now()
    const req = client.request(requestOptions, (res) => {
      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })

      res.on('end', async () => {
        const elapsed = Date.now() - startedAt
        const headersRaw = collectRawHeaders(res)
        const status = Number(res.statusCode || 0)
        const locationHeader = headersRaw.find((header) => header.name.toLowerCase() === 'location')

        if (payload.cookieJar && payload.cookieJar.enabled) {
          storeCookiesFromResponse(headersRaw, payload.url, payload.cookieJar)
        }

        if (
          locationHeader &&
          status >= 300 &&
          status < 400 &&
          redirectCount < maxRedirects
        ) {
          let nextUrl
          try {
            nextUrl = new URL(locationHeader.value, payload.url).toString()
          } catch {
            nextUrl = ''
          }

          if (nextUrl) {
            const shouldRewriteMethod = status === 301 || status === 302 || status === 303
            const redirectedPayload = {
              ...payload,
              url: nextUrl,
              method: shouldRewriteMethod ? 'GET' : method,
              bodyBase64: shouldRewriteMethod ? undefined : payload.bodyBase64
            }

            try {
              const redirected = await executeHttpRequest(redirectedPayload, redirectCount + 1)
              resolve(redirected)
            } catch (error) {
              reject(error)
            }
            return
          }
        }

        const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0)
        resolve({
          status,
          statusText: String(res.statusMessage || ''),
          headersRaw,
          bodyBase64: bodyBuffer.toString('base64'),
          time: elapsed
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout (${timeoutMs}ms)`))
    })

    if (payload.bodyBase64) {
      try {
        req.write(Buffer.from(payload.bodyBase64, 'base64'))
      } catch {
        reject(new Error('Invalid base64 request body'))
        req.destroy()
        return
      }
    }

    req.end()
  })
}

function sendHttpRequest(payload) {
  if (!payload || payload.bodyMode !== 'base64') {
    return Promise.reject(new Error('Unsupported request body mode'))
  }
  return executeHttpRequest(payload, 0)
}

function cookiesList(domain) {
  pruneExpiredCookies()
  if (!domain) {
    return [...cookieState.cookies]
  }
  const normalized = normalizeDomain(domain)
  return cookieState.cookies.filter((cookie) => cookie.domain === normalized || cookie.domain.endsWith(`.${normalized}`))
}

function cookiesDelete(id) {
  const before = cookieState.cookies.length
  cookieState.cookies = cookieState.cookies.filter((cookie) => cookie.id !== id)
  if (before !== cookieState.cookies.length) {
    saveCookieState(cookieState)
    return true
  }
  return false
}

function cookiesClear(domain) {
  const before = cookieState.cookies.length
  if (!domain) {
    cookieState.cookies = []
  } else {
    const normalized = normalizeDomain(domain)
    cookieState.cookies = cookieState.cookies.filter(
      (cookie) => !(cookie.domain === normalized || cookie.domain.endsWith(`.${normalized}`))
    )
  }
  const removed = before - cookieState.cookies.length
  if (removed > 0) {
    saveCookieState(cookieState)
  }
  return removed
}

function cookiesAdd(cookiesToAdd) {
  if (!Array.isArray(cookiesToAdd)) {
    cookiesToAdd = [cookiesToAdd]
  }
  for (const cookie of cookiesToAdd) {
    if (!cookie || !cookie.name || !cookie.domain) {
      continue
    }
    const now = nowMs()
    const existingIdx = cookieState.cookies.findIndex(
      (c) => c.name === cookie.name && c.domain === cookie.domain && c.path === (cookie.path || '/')
    )
    const newCookie = {
      id: `${cookie.name}\t${cookie.domain}\t${cookie.path || '/'}`,
      name: cookie.name,
      value: cookie.value || '',
      domain: normalizeDomain(cookie.domain),
      path: normalizePath(cookie.path || '/'),
      secure: Boolean(cookie.secure),
      httpOnly: Boolean(cookie.httpOnly),
      sameSite: cookie.sameSite || '',
      expiresAt: cookie.expiresAt || null,
      session: !cookie.expiresAt,
      createdAt: existingIdx >= 0 ? cookieState.cookies[existingIdx].createdAt : now,
      updatedAt: now
    }
    if (existingIdx >= 0) {
      cookieState.cookies[existingIdx] = newCookie
    } else {
      cookieState.cookies.push(newCookie)
    }
  }
  trimCookieStore()
  saveCookieState(cookieState)
  return cookiesToAdd.length
}

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
  sendHttpRequest,
  cookiesList,
  cookiesDelete,
  cookiesClear,
  cookiesAdd,
  // 暴露 net 模块和 dgram 模块的创建方法以避开序列化限制
  createTcpClient(host, port, onMessage, onError, onClose) {
    const net = require('node:net')
    const client = new net.Socket()
    client.connect(port, host, () => {
      onMessage('System', `Connected to TCP ${host}:${port}`)
    })
    client.on('data', (data) => {
      onMessage('Received', data.toString())
    })
    client.on('error', (err) => {
      onError(err.message)
    })
    client.on('close', () => {
      onClose()
    })
    return {
      send: (text) => client.write(text),
      close: () => client.destroy()
    }
  },
  createUdpClient(host, port, onMessage, onError) {
    const dgram = require('node:dgram')
    const client = dgram.createSocket('udp4')
    client.on('message', (msg) => {
      onMessage('Received', msg.toString())
    })
    client.on('error', (err) => {
      onError(err.message)
      client.close()
    })
    return {
      send: (text) => {
        const buf = Buffer.from(text)
        client.send(buf, 0, buf.length, port, host, (err) => {
          if (err) onError(err.message)
        })
      },
      close: () => client.close()
    }
  }
}
