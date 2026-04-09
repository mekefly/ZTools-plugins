import type { RequestState } from '../store/request'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
type SocketMethod = 'WS' | 'TCP' | 'UDP'

function isHttpMethod(method: string): method is HttpMethod {
  return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)
}

function isSocketMethod(method: string): method is SocketMethod {
  return ['WS', 'TCP', 'UDP'].includes(method)
}

function escapeSingleQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function escapeDoubleQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function getEnabledQueryPairs(req: RequestState): Array<{ key: string; value: string }> {
  return req.params
    .filter((p) => p.enabled && p.key)
    .map((p) => ({ key: p.key, value: p.value }))
}

function getEnabledUrlEncodedBody(req: RequestState): string {
  return req.body.formData
    .filter((f) => f.enabled && f.key)
    .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
    .join('&')
}

function getEnabledFormDataFields(req: RequestState): Array<{ key: string; value: string; isFile: boolean }> {
  return req.body.formData
    .filter((f) => f.enabled && f.key)
    .map((f) => ({ key: f.key, value: f.value, isFile: !!f.isFile }))
}

function toFilePathPlaceholder(fileName: string): string {
  const safeName = (fileName || 'file.bin').replace(/[\\/]/g, '_')
  return `/path/to/${safeName}`
}

function appendQuery(url: string, pairs: Array<{ key: string; value: string }>): string {
  if (pairs.length === 0) return url
  const query = pairs.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

function resolveBodyKind(req: RequestState): 'none' | 'text' | 'structured' | 'binary' | 'other' {
  if (req.body.kind) {
    return req.body.kind
  }
  if (req.body.type === 'none') return 'none'
  if (req.body.type === 'urlencoded' || req.body.type === 'formdata') return 'structured'
  if (req.body.type === 'json') return 'text'
  return 'other'
}

function resolveBodyContentType(req: RequestState): string {
  if (req.body.contentType) {
    return req.body.contentType
  }
  if (req.body.type === 'json') return 'application/json'
  if (req.body.type === 'urlencoded') return 'application/x-www-form-urlencoded'
  if (req.body.type === 'formdata') return 'multipart/form-data'
  return ''
}

function isBodyFormData(req: RequestState): boolean {
  return resolveBodyKind(req) === 'structured' && resolveBodyContentType(req) === 'multipart/form-data'
}

function isBodyUrlencoded(req: RequestState): boolean {
  return resolveBodyKind(req) === 'structured' && resolveBodyContentType(req) === 'application/x-www-form-urlencoded'
}

function isBodyBinary(req: RequestState): boolean {
  return resolveBodyKind(req) === 'binary' || resolveBodyContentType(req) === 'application/octet-stream'
}

function isBodyJson(req: RequestState): boolean {
  return resolveBodyContentType(req) === 'application/json'
}

function collectHeaders(req: RequestState): Record<string, string> {
  const headers: Record<string, string> = {}

  if (req.auth.type === 'bearer' && req.auth.token) {
    headers.Authorization = `Bearer ${req.auth.token}`
  } else if (req.auth.type === 'jwt-bearer') {
    headers.Authorization = 'Bearer <generated-jwt-token>'
  } else if (req.auth.type === 'digest') {
    headers.Authorization = 'Digest <calculated-response>'
  } else if (req.auth.type === 'apikey' && req.auth.apiKeyLocation === 'header' && req.auth.apiKey) {
    headers[req.auth.apiKeyHeader || 'X-API-Key'] = req.auth.apiKey
  }

  req.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[h.key] = h.value
    })

  const bodyKind = resolveBodyKind(req)
  const bodyContentType = resolveBodyContentType(req)
  if (bodyKind !== 'none' && bodyContentType && bodyContentType !== 'multipart/form-data' && !headers['Content-Type']) {
    headers['Content-Type'] = bodyContentType
  }

  return headers
}

function resolveHttpUrl(req: RequestState): string {
  let url = appendQuery(req.url, getEnabledQueryPairs(req))
  if (req.auth.type === 'apikey' && req.auth.apiKeyLocation === 'query' && req.auth.apiKey) {
    const key = req.auth.apiKeyHeader || 'api_key'
    url = appendQuery(url, [{ key, value: req.auth.apiKey }])
  }
  return url
}

function resolveWsUrl(req: RequestState): string {
  return appendQuery(req.url, getEnabledQueryPairs(req))
}

function parseSocketHostPort(input: string): { host: string; port: number } {
  const url = input.trim()
  let host = 'localhost'
  let port = 80

  try {
    if (url.includes('://')) {
      const parsed = new URL(url)
      host = parsed.hostname || host
      port = parsed.port ? parseInt(parsed.port, 10) : port
      if (!Number.isNaN(port)) return { host, port }
    }
  } catch {
    // fallback below
  }

  if (url.startsWith('[')) {
    const end = url.indexOf(']')
    if (end > 0) {
      host = url.slice(1, end)
      const rawPort = url.slice(end + 1)
      if (rawPort.startsWith(':')) {
        const p = parseInt(rawPort.slice(1), 10)
        if (!Number.isNaN(p)) port = p
      }
      return { host, port }
    }
  }

  const lastColon = url.lastIndexOf(':')
  if (lastColon > 0) {
    host = url.slice(0, lastColon) || host
    const p = parseInt(url.slice(lastColon + 1), 10)
    if (!Number.isNaN(p)) port = p
  } else if (url) {
    host = url
  }

  return { host, port }
}

function jsonToSingleQuoteObject(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")
}

function buildCurl(req: RequestState): string {
  const url = resolveHttpUrl(req)
  let cmd = `curl -X ${req.method} '${escapeSingleQuote(url)}'`

  if (req.auth.type === 'basic' && req.auth.username) {
    cmd += ` \\\n+  -u '${escapeSingleQuote(req.auth.username)}:${escapeSingleQuote(req.auth.password)}'`
  }

  const headers = collectHeaders(req)
  Object.entries(headers).forEach(([k, v]) => {
    cmd += ` \\\n+  -H '${escapeSingleQuote(k)}: ${escapeSingleQuote(v)}'`
  })

  if (isBodyJson(req) && req.body.raw) {
    cmd += ` \\\n+  -d '${escapeSingleQuote(req.body.raw)}'`
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    cmd += ` \\\n++  --data-binary '@${escapeSingleQuote(toFilePathPlaceholder(req.body.binary.fileName))}'`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    cmd += ` \\\n+  --data-raw '${escapeSingleQuote(req.body.raw)}'`
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) {
      cmd += ` \\\n+  --data '${escapeSingleQuote(data)}'`
    }
  } else if (isBodyFormData(req)) {
    getEnabledFormDataFields(req).forEach((f) => {
      if (f.isFile) {
        cmd += ` \\\n+  -F '${escapeSingleQuote(f.key)}=@${escapeSingleQuote(toFilePathPlaceholder(f.value))}'`
      } else {
        cmd += ` \\\n+  -F '${escapeSingleQuote(f.key)}=${escapeSingleQuote(f.value)}'`
      }
    })
  }

  return cmd
}

function buildFetch(req: RequestState): string {
  const url = resolveHttpUrl(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const formLines = fields.map((field) => {
      if (field.isFile) {
        return `formData.append('${escapeSingleQuote(field.key)}', /* File */ fileInput.files[0], '${escapeSingleQuote(field.value || 'file.bin')}')`
      }
      return `formData.append('${escapeSingleQuote(field.key)}', '${escapeSingleQuote(field.value)}')`
    }).join('\n')

    return `// Select a file in your UI and assign to fileInput first
const fileInput = document.querySelector('input[type="file"]');
const formData = new FormData();
${formLines || "// formData.append('field', 'value')"}

fetch('${escapeSingleQuote(url)}', {
  method: '${req.method}',
  body: formData
})
  .then(async (response) => {
    const text = await response.text();
    console.log('status:', response.status);
    console.log('data:', text);
  })
  .catch((error) => console.error('Error:', error));`
  }

  const options: Record<string, unknown> = { method: req.method }
  const headers = collectHeaders(req)
  if (Object.keys(headers).length > 0) options.headers = headers

  if (isBodyJson(req) && req.body.raw) {
    options.body = req.body.raw
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    options.body = `/* binary file: ${toFilePathPlaceholder(req.body.binary.fileName)} */`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    options.body = req.body.raw
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) options.body = data
  }

  const optionsStr = jsonToSingleQuoteObject(options)
  return `fetch('${escapeSingleQuote(url)}', ${optionsStr})\n  .then(async (response) => {\n    const text = await response.text();\n    let data;\n    try {\n      data = JSON.parse(text);\n    } catch {\n      data = text;\n    }\n    console.log('status:', response.status);\n    console.log('data:', data);\n  })\n  .catch((error) => console.error('Error:', error));`
}

function buildAxios(req: RequestState): string {
  const url = resolveHttpUrl(req)
  const headers = collectHeaders(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const appendLines = fields.map((field) => {
      if (field.isFile) {
        return `formData.append('${escapeSingleQuote(field.key)}', /* File/Blob */ file, '${escapeSingleQuote(field.value || 'file.bin')}');`
      }
      return `formData.append('${escapeSingleQuote(field.key)}', '${escapeSingleQuote(field.value)}');`
    }).join('\n')

    return `import axios from 'axios';

const file = /* e.g. from <input type="file"> */ null;
const formData = new FormData();
${appendLines || "// formData.append('field', 'value');"}

axios({
  method: '${req.method.toLowerCase()}',
  url: '${escapeSingleQuote(url)}',
  data: formData
})
  .then((response) => {
    console.log('status:', response.status);
    console.log('data:', response.data);
  })
  .catch((error) => {
    if (error.response) {
      console.error('status:', error.response.status);
      console.error('data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  });`
  }

  const config: Record<string, unknown> = {
    method: req.method.toLowerCase(),
    url
  }
  if (Object.keys(headers).length > 0) config.headers = headers

  if (req.auth.type === 'basic' && req.auth.username) {
    config.auth = { username: req.auth.username, password: req.auth.password }
  }

  if (isBodyJson(req) && req.body.raw) {
    config.data = req.body.raw
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    config.data = `/* binary file: ${toFilePathPlaceholder(req.body.binary.fileName)} */`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    config.data = req.body.raw
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) config.data = data
  }

  const configStr = jsonToSingleQuoteObject(config)
  return `import axios from 'axios';\n\naxios(${configStr})\n  .then((response) => {\n    console.log('status:', response.status);\n    console.log('data:', response.data);\n  })\n  .catch((error) => {\n    if (error.response) {\n      console.error('status:', error.response.status);\n      console.error('data:', error.response.data);\n    } else {\n      console.error('Error:', error.message);\n    }\n  });`
}

function buildTypeScriptFetch(req: RequestState): string {
  const url = resolveHttpUrl(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const appendLines = fields.map((field) => {
      if (field.isFile) {
        return `  formData.append('${escapeSingleQuote(field.key)}', file as File, '${escapeSingleQuote(field.value || 'file.bin')}')`
      }
      return `  formData.append('${escapeSingleQuote(field.key)}', '${escapeSingleQuote(field.value)}')`
    }).join('\n')

    return `async function callApi(file: File | null): Promise<void> {
  const formData = new FormData()
${appendLines || "  // formData.append('field', 'value')"}

  const response = await fetch('${escapeSingleQuote(url)}', {
    method: '${req.method}',
    body: formData
  })

  const text = await response.text()
  console.log('status:', response.status)
  console.log('data:', text)
}

callApi(null).catch((error: unknown) => {
  console.error('Error:', error)
})`
  }

  const headers = collectHeaders(req)
  const headersStr = JSON.stringify(headers, null, 2)
  let bodyExpr = ''
  if (isBodyJson(req) && req.body.raw) {
    bodyExpr = `'${escapeSingleQuote(req.body.raw)}'`
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    bodyExpr = `/* binary file: ${toFilePathPlaceholder(req.body.binary.fileName)} */ undefined`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    bodyExpr = `'${escapeSingleQuote(req.body.raw)}'`
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) bodyExpr = `'${escapeSingleQuote(data)}'`
  }

  return `type ApiResult = unknown;\n\nasync function callApi(): Promise<void> {\n  const response = await fetch('${escapeSingleQuote(url)}', {\n    method: '${req.method}',\n    headers: ${headersStr},${bodyExpr ? `\n    body: ${bodyExpr},` : ''}\n  });\n\n  const text = await response.text();\n  let data: ApiResult | string = text;\n  try {\n    data = JSON.parse(text) as ApiResult;\n  } catch {}\n\n  console.log('status:', response.status);\n  console.log('data:', data);\n}\n\ncallApi().catch((error: unknown) => {\n  console.error('Error:', error);\n});`
}

function buildGo(req: RequestState): string {
  const url = resolveHttpUrl(req)
  const headers = collectHeaders(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const textLines = fields
      .filter((f) => !f.isFile)
      .map((f) => `\t_ = writer.WriteField("${escapeDoubleQuote(f.key)}", "${escapeDoubleQuote(f.value)}")`)
      .join('\n')
    const firstFile = fields.find((f) => f.isFile)
    const fileLine = firstFile
      ? `\t// add file field example\n\tfileWriter, _ := writer.CreateFormFile("${escapeDoubleQuote(firstFile.key)}", "${escapeDoubleQuote(firstFile.value || 'file.bin')}")\n\t_ = fileWriter // copy file bytes into fileWriter`
      : ''

    return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
\t"mime/multipart"
\t"net/http"
)

func main() {
\tbody := &bytes.Buffer{}
\twriter := multipart.NewWriter(body)
${textLines ? `${textLines}\n` : ''}${fileLine ? `${fileLine}\n` : ''}\t_ = writer.Close()

\treq, err := http.NewRequest("${req.method}", "${escapeDoubleQuote(url)}", body)
\tif err != nil {
\t\tpanic(err)
\t}
\treq.Header.Set("Content-Type", writer.FormDataContentType())

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\trespBody, _ := io.ReadAll(resp.Body)
\tfmt.Println("status:", resp.StatusCode)
\tfmt.Println("body:", string(respBody))
}`
  }

  let payloadLine = 'var payload io.Reader = nil'
  if (isBodyJson(req) && req.body.raw) {
    payloadLine = `payload := strings.NewReader(${JSON.stringify(req.body.raw)})`
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    payloadLine = `payload := strings.NewReader("/* binary file: ${escapeDoubleQuote(toFilePathPlaceholder(req.body.binary.fileName))} */")`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    payloadLine = `payload := strings.NewReader(${JSON.stringify(req.body.raw)})`
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) payloadLine = `payload := strings.NewReader(${JSON.stringify(data)})`
  }

  const applyHeaders = Object.entries(headers)
    .map(([k, v]) => `\treq.Header.Set("${escapeDoubleQuote(k)}", "${escapeDoubleQuote(v)}")`)
    .join('\n')

  return `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n\t${payloadLine}\n\treq, err := http.NewRequest("${req.method}", "${escapeDoubleQuote(url)}", payload)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n${applyHeaders ? `${applyHeaders}\n` : ''}\tclient := &http.Client{}\n\tresp, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer resp.Body.Close()\n\n\tbody, err := io.ReadAll(resp.Body)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\n\tfmt.Println("status:", resp.StatusCode)\n\tfmt.Println("body:", string(body))\n}`
}

function buildJavaOkHttp(req: RequestState): string {
  const url = resolveHttpUrl(req)
  const headers = collectHeaders(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const formParts = fields.map((f) => {
      if (f.isFile) {
        return `    .addFormDataPart("${escapeDoubleQuote(f.key)}", "${escapeDoubleQuote(f.value || 'file.bin')}", RequestBody.create(new File("${escapeDoubleQuote(toFilePathPlaceholder(f.value))}"), MediaType.parse("application/octet-stream")))`
      }
      return `    .addFormDataPart("${escapeDoubleQuote(f.key)}", "${escapeDoubleQuote(f.value)}")`
    }).join('\n')

    const headerLines = Object.entries(headers)
      .filter(([k]) => k.toLowerCase() !== 'content-type')
      .map(([k, v]) => `    .addHeader("${escapeDoubleQuote(k)}", "${escapeDoubleQuote(v)}")`)
      .join('\n')

    return `import java.io.File;
import java.io.IOException;
import okhttp3.*;

public class ApiCall {
  public static void main(String[] args) throws IOException {
    OkHttpClient client = new OkHttpClient();

    RequestBody body = new MultipartBody.Builder()
    .setType(MultipartBody.FORM)
${formParts || '    // .addFormDataPart("field", "value")'}
    .build();

    Request request = new Request.Builder()
    .url("${escapeDoubleQuote(url)}")
${headerLines ? `${headerLines}\n` : ''}    .method("${req.method}", body)
    .build();

    try (Response response = client.newCall(request).execute()) {
      String responseBody = response.body() != null ? response.body().string() : "";
      System.out.println("status: " + response.code());
      System.out.println("body: " + responseBody);
    }
  }
}`
  }

  let bodyBuilder = 'RequestBody body = null;'
  if (isBodyJson(req) && req.body.raw) {
    bodyBuilder = `RequestBody body = RequestBody.create(\n    ${JSON.stringify(req.body.raw)},\n    MediaType.parse("application/json")\n);`
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    bodyBuilder = `RequestBody body = RequestBody.create(\n    new File("${escapeDoubleQuote(toFilePathPlaceholder(req.body.binary.fileName))}"),\n    MediaType.parse("application/octet-stream")\n);`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    bodyBuilder = `RequestBody body = RequestBody.create(\n    ${JSON.stringify(req.body.raw)},\n    null\n);`
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) {
      bodyBuilder = `RequestBody body = RequestBody.create(\n    ${JSON.stringify(data)},\n    MediaType.parse("application/x-www-form-urlencoded")\n);`
    }
  }

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `    .addHeader("${escapeDoubleQuote(k)}", "${escapeDoubleQuote(v)}")`)
    .join('\n')

  return `import java.io.IOException;\nimport okhttp3.*;\n\npublic class ApiCall {\n  public static void main(String[] args) throws IOException {\n    OkHttpClient client = new OkHttpClient();\n\n    ${bodyBuilder}\n\n    Request request = new Request.Builder()\n    .url("${escapeDoubleQuote(url)}")\n${headerLines ? `${headerLines}\n` : ''}    .method("${req.method}", body)\n    .build();\n\n    try (Response response = client.newCall(request).execute()) {\n      String responseBody = response.body() != null ? response.body().string() : \"\";\n      System.out.println(\"status: \" + response.code());\n      System.out.println(\"body: \" + responseBody);\n    }\n  }\n}`
}

function buildPython(req: RequestState): string {
  const url = resolveHttpUrl(req)
  const headers = collectHeaders(req)

  if (isBodyFormData(req)) {
    const fields = getEnabledFormDataFields(req)
    const dataFields = fields.filter((f) => !f.isFile)
    const fileFields = fields.filter((f) => f.isFile)

    let code = 'import requests\n\n'
    code += `url = "${escapeDoubleQuote(url)}"\n`
    if (Object.keys(headers).length > 0) {
      const filtered = Object.fromEntries(Object.entries(headers).filter(([k]) => k.toLowerCase() !== 'content-type'))
      if (Object.keys(filtered).length > 0) {
        code += `headers = ${JSON.stringify(filtered, null, 2).replace(/"/g, "'")}\n`
      }
    }

    if (dataFields.length > 0) {
      const dataObj = Object.fromEntries(dataFields.map((f) => [f.key, f.value]))
      code += `data = ${JSON.stringify(dataObj, null, 2).replace(/"/g, "'")}\n`
    }

    if (fileFields.length > 0) {
      const lines = fileFields.map((f) => `    '${escapeSingleQuote(f.key)}': open('${escapeSingleQuote(toFilePathPlaceholder(f.value))}', 'rb')`).join(',\n')
      code += `files = {\n${lines}\n}\n`
    }

    const args = [`'${req.method}'`, 'url']
    if (Object.keys(headers).some((k) => k.toLowerCase() !== 'content-type')) args.push('headers=headers')
    if (dataFields.length > 0) args.push('data=data')
    if (fileFields.length > 0) args.push('files=files')

    code += `\nresponse = requests.request(${args.join(', ')})\n`
    code += 'print("status:", response.status_code)\n'
    code += 'print(response.text)\n'
    if (fileFields.length > 0) {
      code += '\nfor f in files.values():\n    f.close()\n'
    }
    return code
  }

  let code = 'import requests\n\n'
  code += `url = "${escapeDoubleQuote(url)}"\n`
  if (Object.keys(headers).length > 0) {
    code += `headers = ${JSON.stringify(headers, null, 2).replace(/"/g, "'")}\n`
  }

  if (req.auth.type === 'basic' && req.auth.username) {
    code += `auth = ('${escapeSingleQuote(req.auth.username)}', '${escapeSingleQuote(req.auth.password)}')\n`
  }

  if (isBodyJson(req) && req.body.raw) {
    code += `payload = ${req.body.raw}\n`
  } else if (isBodyBinary(req) && req.body.binary.fileName) {
    code += `with open('${escapeSingleQuote(toFilePathPlaceholder(req.body.binary.fileName))}', 'rb') as f:\n    payload = f.read()\n`
  } else if (resolveBodyKind(req) !== 'none' && req.body.raw) {
    code += `payload = '''${req.body.raw}'''\n`
  } else if (isBodyUrlencoded(req)) {
    const data = getEnabledUrlEncodedBody(req)
    if (data) code += `payload = '${escapeSingleQuote(data)}'\n`
  }

  const args = [`'${req.method}'`, 'url']
  if (Object.keys(headers).length > 0) args.push('headers=headers')
  if (req.auth.type === 'basic' && req.auth.username) args.push('auth=auth')
  if (isBodyJson(req) && req.body.raw) args.push('json=payload')
  if (
    (isBodyBinary(req) && req.body.binary.fileName)
    || (resolveBodyKind(req) !== 'none' && !isBodyJson(req) && req.body.raw)
    || (isBodyUrlencoded(req) && getEnabledUrlEncodedBody(req))
  ) args.push('data=payload')

  code += `\nresponse = requests.request(${args.join(', ')})\n`
  code += 'print("status:", response.status_code)\n'
  code += 'print(response.text)\n'
  return code
}

function buildWsJavaScript(req: RequestState): string {
  const url = resolveWsUrl(req)
  return `const ws = new WebSocket('${escapeSingleQuote(url)}');\n\nws.onopen = () => {\n  console.log('connected');\n  ws.send('hello from client');\n};\n\nws.onmessage = (event) => {\n  console.log('received:', event.data);\n};\n\nws.onerror = (error) => {\n  console.error('WebSocket error:', error);\n};\n\nws.onclose = () => {\n  console.log('disconnected');\n};\n\n// close when needed\n// ws.close();`
}

function buildWsTypeScript(req: RequestState): string {
  const url = resolveWsUrl(req)
  return `const ws = new WebSocket('${escapeSingleQuote(url)}');\n\nws.addEventListener('open', () => {\n  console.log('connected');\n  ws.send('hello from client');\n});\n\nws.addEventListener('message', (event: MessageEvent<string>) => {\n  console.log('received:', event.data);\n});\n\nws.addEventListener('error', (event: Event) => {\n  console.error('WebSocket error:', event);\n});\n\nws.addEventListener('close', () => {\n  console.log('disconnected');\n});\n\n// ws.close();`
}

function buildWsPython(req: RequestState): string {
  const url = resolveWsUrl(req)
  return `# pip install websocket-client\nimport websocket\n\ndef on_open(ws):\n    print('connected')\n    ws.send('hello from client')\n\ndef on_message(ws, message):\n    print('received:', message)\n\ndef on_error(ws, error):\n    print('error:', error)\n\ndef on_close(ws, close_status_code, close_msg):\n    print('disconnected')\n\nws = websocket.WebSocketApp(\n    '${escapeSingleQuote(url)}',\n    on_open=on_open,\n    on_message=on_message,\n    on_error=on_error,\n    on_close=on_close,\n)\nws.run_forever()`
}

function buildWsGo(req: RequestState): string {
  const url = resolveWsUrl(req)
  return `// go get github.com/gorilla/websocket\npackage main\n\nimport (\n\t"log"\n\n\t"github.com/gorilla/websocket"\n)\n\nfunc main() {\n\tconn, _, err := websocket.DefaultDialer.Dial("${escapeDoubleQuote(url)}", nil)\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tdefer conn.Close()\n\n\terr = conn.WriteMessage(websocket.TextMessage, []byte("hello from client"))\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\n\tfor {\n\t\t_, message, err := conn.ReadMessage()\n\t\tif err != nil {\n\t\t\tlog.Fatal(err)\n\t\t}\n\t\tlog.Printf("received: %s", string(message))\n\t}\n}`
}

function buildWsJava(req: RequestState): string {
  const url = resolveWsUrl(req)
  return `import okhttp3.*;\n\npublic class WsClient {\n  public static void main(String[] args) {\n    OkHttpClient client = new OkHttpClient();\n\n    Request request = new Request.Builder()\n      .url("${escapeDoubleQuote(url)}")\n      .build();\n\n    WebSocket ws = client.newWebSocket(request, new WebSocketListener() {\n      @Override\n      public void onOpen(WebSocket webSocket, Response response) {\n        System.out.println("connected");\n        webSocket.send("hello from client");\n      }\n\n      @Override\n      public void onMessage(WebSocket webSocket, String text) {\n        System.out.println("received: " + text);\n      }\n\n      @Override\n      public void onFailure(WebSocket webSocket, Throwable t, Response response) {\n        t.printStackTrace();\n      }\n\n      @Override\n      public void onClosed(WebSocket webSocket, int code, String reason) {\n        System.out.println("disconnected");\n      }\n    });\n\n    Runtime.getRuntime().addShutdownHook(new Thread(() -> ws.close(1000, "bye")));\n  }\n}`
}

function buildTcpJavaScript(req: RequestState): string {
  const { host, port } = parseSocketHostPort(req.url)
  return `const net = require('net');\n\nconst client = net.createConnection({ host: '${escapeSingleQuote(host)}', port: ${port} }, () => {\n  console.log('connected');\n  client.write('hello from client');\n});\n\nclient.on('data', (data) => {\n  console.log('received:', data.toString());\n});\n\nclient.on('error', (err) => {\n  console.error('error:', err.message);\n});\n\nclient.on('close', () => {\n  console.log('disconnected');\n});\n\n// client.end();`
}

function buildUdpJavaScript(req: RequestState): string {
  const { host, port } = parseSocketHostPort(req.url)
  return `const dgram = require('dgram');\n\nconst client = dgram.createSocket('udp4');\n\nclient.on('message', (msg, rinfo) => {\n  console.log('received:', msg.toString(), 'from', rinfo.address + ':' + rinfo.port);\n});\n\nclient.on('error', (err) => {\n  console.error('error:', err.message);\n  client.close();\n});\n\nconst payload = Buffer.from('hello from client');\nclient.send(payload, ${port}, '${escapeSingleQuote(host)}', (err) => {\n  if (err) {\n    console.error('send error:', err.message);\n  } else {\n    console.log('sent');\n  }\n});\n\n// close when needed\n// setTimeout(() => client.close(), 1000);`
}

function buildSocketTypeScript(req: RequestState): string {
  if (req.method === 'WS') {
    return buildWsTypeScript(req)
  }

  const { host, port } = parseSocketHostPort(req.url)
  if (req.method === 'TCP') {
    return `import net from 'node:net';\n\nconst client = net.createConnection({ host: '${escapeSingleQuote(host)}', port: ${port} }, () => {\n  console.log('connected');\n  client.write('hello from client');\n});\n\nclient.on('data', (data: Buffer) => {\n  console.log('received:', data.toString());\n});\n\nclient.on('error', (err: Error) => {\n  console.error('error:', err.message);\n});\n\nclient.on('close', () => {\n  console.log('disconnected');\n});`
  }

  return `import dgram from 'node:dgram';\n\nconst client = dgram.createSocket('udp4');\n\nclient.on('message', (msg: Buffer, rinfo) => {\n  console.log('received:', msg.toString(), 'from', rinfo.address + ':' + rinfo.port);\n});\n\nclient.on('error', (err: Error) => {\n  console.error('error:', err.message);\n  client.close();\n});\n\nconst payload = Buffer.from('hello from client');\nclient.send(payload, ${port}, '${escapeSingleQuote(host)}', (err?: Error) => {\n  if (err) {\n    console.error('send error:', err.message);\n  } else {\n    console.log('sent');\n  }\n});`
}

function buildSocketPython(req: RequestState): string {
  if (req.method === 'WS') {
    return buildWsPython(req)
  }

  const { host, port } = parseSocketHostPort(req.url)
  if (req.method === 'TCP') {
    return `import socket\n\nhost = '${escapeSingleQuote(host)}'\nport = ${port}\n\nwith socket.create_connection((host, port)) as sock:\n    print('connected')\n    sock.sendall(b'hello from client')\n    data = sock.recv(4096)\n    print('received:', data.decode('utf-8', errors='replace'))`
  }

  return `import socket\n\nhost = '${escapeSingleQuote(host)}'\nport = ${port}\n\nsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)\ntry:\n    sock.sendto(b'hello from client', (host, port))\n    print('sent')\n\n    # if server replies\n    sock.settimeout(3)\n    data, addr = sock.recvfrom(4096)\n    print('received:', data.decode('utf-8', errors='replace'), 'from', addr)\nexcept socket.timeout:\n    print('no response (timeout)')\nfinally:\n    sock.close()`
}

function buildSocketGo(req: RequestState): string {
  if (req.method === 'WS') {
    return buildWsGo(req)
  }

  const { host, port } = parseSocketHostPort(req.url)
  if (req.method === 'TCP') {
    return `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"net"\n\t"os"\n)\n\nfunc main() {\n\tconn, err := net.Dial("tcp", "${escapeDoubleQuote(host)}:${port}")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer conn.Close()\n\n\tfmt.Fprintln(conn, "hello from client")\n\n\treader := bufio.NewReader(conn)\n\tline, err := reader.ReadString('\\n')\n\tif err != nil {\n\t\tfmt.Println("received (raw):", err)\n\t\tos.Exit(0)\n\t}\n\tfmt.Println("received:", line)\n}`
  }

  return `package main\n\nimport (\n\t"fmt"\n\t"net"\n\t"time"\n)\n\nfunc main() {\n\tconn, err := net.Dial("udp", "${escapeDoubleQuote(host)}:${port}")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer conn.Close()\n\n\t_, err = conn.Write([]byte("hello from client"))\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tfmt.Println("sent")\n\n\t_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))\n\tbuf := make([]byte, 4096)\n\tn, err := conn.Read(buf)\n\tif err != nil {\n\t\tfmt.Println("no response:", err)\n\t\treturn\n\t}\n\tfmt.Println("received:", string(buf[:n]))\n}`
}

function buildSocketJava(req: RequestState): string {
  if (req.method === 'WS') {
    return buildWsJava(req)
  }

  const { host, port } = parseSocketHostPort(req.url)
  if (req.method === 'TCP') {
    return `import java.io.*;\nimport java.net.Socket;\n\npublic class TcpClient {\n  public static void main(String[] args) throws Exception {\n    try (Socket socket = new Socket("${escapeDoubleQuote(host)}", ${port})) {\n      System.out.println("connected");\n\n      OutputStream out = socket.getOutputStream();\n      out.write("hello from client".getBytes());\n      out.flush();\n\n      InputStream in = socket.getInputStream();\n      byte[] buffer = new byte[4096];\n      int n = in.read(buffer);\n      if (n > 0) {\n        System.out.println("received: " + new String(buffer, 0, n));\n      }\n    }\n  }\n}`
  }

  return `import java.net.*;\n\npublic class UdpClient {\n  public static void main(String[] args) throws Exception {\n    try (DatagramSocket socket = new DatagramSocket()) {\n      byte[] payload = "hello from client".getBytes();\n      InetAddress address = InetAddress.getByName("${escapeDoubleQuote(host)}");\n\n      DatagramPacket packet = new DatagramPacket(payload, payload.length, address, ${port});\n      socket.send(packet);\n      System.out.println("sent");\n\n      socket.setSoTimeout(3000);\n      byte[] buf = new byte[4096];\n      DatagramPacket response = new DatagramPacket(buf, buf.length);\n      try {\n        socket.receive(response);\n        System.out.println("received: " + new String(response.getData(), 0, response.getLength()));\n      } catch (SocketTimeoutException e) {\n        System.out.println("no response (timeout)");\n      }\n    }\n  }\n}`
}

function buildSocketCurlLike(req: RequestState): string {
  if (req.method === 'WS') {
    const url = resolveWsUrl(req)
    return `# Install: https://github.com/vi/websocat\nwebsocat '${escapeSingleQuote(url)}'\n# Then type messages and press Enter to send.`
  }

  const { host, port } = parseSocketHostPort(req.url)
  if (req.method === 'TCP') {
    return `# netcat (TCP)\nprintf 'hello from client' | nc ${escapeSingleQuote(host)} ${port}`
  }

  return `# netcat (UDP)\nprintf 'hello from client' | nc -u ${escapeSingleQuote(host)} ${port}`
}

function buildSocketByLanguage(req: RequestState, language: CodeLanguage): string {
  switch (language) {
    case 'curl':
      return buildSocketCurlLike(req)
    case 'javascript':
    case 'javascriptAxios':
      if (req.method === 'WS') return buildWsJavaScript(req)
      if (req.method === 'TCP') return buildTcpJavaScript(req)
      return buildUdpJavaScript(req)
    case 'typescriptFetch':
      return buildSocketTypeScript(req)
    case 'python':
      return buildSocketPython(req)
    case 'go':
      return buildSocketGo(req)
    case 'javaOkHttp':
      return buildSocketJava(req)
    default:
      return ''
  }
}

export type CodeLanguage =
  | 'curl'
  | 'javascript'
  | 'javascriptAxios'
  | 'typescriptFetch'
  | 'python'
  | 'go'
  | 'javaOkHttp'

export function generateCode(req: RequestState, language: CodeLanguage): string {
  if (isSocketMethod(req.method)) {
    return buildSocketByLanguage(req, language)
  }

  if (!isHttpMethod(req.method)) {
    return `// Unsupported request method: ${req.method}`
  }

  switch (language) {
    case 'curl':
      return buildCurl(req)
    case 'javascript':
      return buildFetch(req)
    case 'javascriptAxios':
      return buildAxios(req)
    case 'typescriptFetch':
      return buildTypeScriptFetch(req)
    case 'python':
      return buildPython(req)
    case 'go':
      return buildGo(req)
    case 'javaOkHttp':
      return buildJavaOkHttp(req)
    default:
      return ''
  }
}
