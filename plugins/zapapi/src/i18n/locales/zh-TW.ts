export default {
  common: {
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    export: '匯出',
    create: '建立',
    add: '新增',
    enabled: '已啟用',
    disabled: '已停用',
    noData: '尚無資料',
    select: '請選擇',
    copy: '複製',
    copied: '已複製!',
    confirm: '確定',
    settings: '設定',
    edit: '編輯'
  },

  app: {
    title: 'ZapApi',
    env: '環境',
    noEnv: '無環境',
    manageEnv: '管理環境',
    code: '程式碼',
    collections: '集合',
    newRequest: '新請求',
    saved: '已儲存',
    envManagerTitle: '環境管理',
    codeGeneratorTitle: '產生程式碼',
    collectionManagerTitle: '集合管理'
  },

  sidebar: {
    collections: '集合',
    newCollection: '建立集合',
    addRequest: '+ 新增請求',
    noCollections: '尚無集合',
    createCollection: '建立集合',
    manageCollections: '管理集合',
    tabCollections: '集合',
    tabHistory: '歷史',
    deleteHistoryItem: '刪除此記錄',
    clearHistory: '清除歷史',
    noHistory: '尚無歷史記錄'
  },

  request: {
    urlPlaceholder: '輸入請求 URL，支援 {變數}',
    send: '發送',
    sending: '發送中',
    saveRequest: '儲存請求',
    params: 'Params',
    headers: 'Headers',
    auth: 'Auth',
    body: 'Body',
    paramName: '參數名',
    value: '值',
    addParam: '新增參數',
    addHeader: '新增 Header',
    authType: '認證類型',
    none: '無認證',
    bearer: 'Bearer Token',
    basic: 'Basic Auth',
    apikey: 'API Key',
    bearerToken: '輸入 Bearer Token',
    username: '使用者名稱',
    password: '密碼',
    apiKeyValue: 'API Key 值',
    addTo: '新增到',
    headerName: 'Header 名稱',
    bodyType: 'Body 類型',
    bodyNone: 'none',
    bodyJson: 'JSON',
    bodyRaw: 'Raw',
    bodyFormdata: 'form-data',
    bodyUrlencoded: 'x-www-form-urlencoded',
    bodyPlaceholder: '輸入請求本體',
    fieldName: '欄位名',
    addField: '新增欄位',
    headerPlaceholder: 'Header 名',
    noAuth: '此請求未使用認證',
    noBody: '此請求未使用請求體',
    cancel: '取消請求'
  },

  tabs: {
    newTab: '新建分頁',
    untitledRequest: '新請求',
    renameTitle: '重新命名分頁',
    renamePlaceholder: '輸入分頁名稱',
    resizeDialog: '調整重新命名彈窗大小',
    scrollLeft: '向左捲動分頁',
    scrollRight: '向右捲動分頁',
    closeCurrent: '關閉分頁',
    closeOthers: '關閉其他分頁',
    closeRight: '關閉右側分頁',
    duplicate: '複製分頁',
    copySuffix: '副本',
    unsavedTitle: '有未儲存的修改',
    unsavedMsgSingle: '此分頁有未儲存內容，確定仍要關閉嗎？',
    unsavedMsgBatch: '即將關閉 {count} 個有未儲存修改的分頁，確定繼續嗎？',
    closeAnyway: '仍要關閉',
    saveNeedCollection: '請先建立或選擇一個集合再儲存',
    savedAsNewRequest: '已儲存為新請求'
  },

  response: {
    title: '回應',
    waiting: '等待回應...',
    failed: '請求失敗',
    empty: '發送請求以查看回應',
    emptyBody: '(空回應)',
    body: 'Body',
    headers: 'Headers',
    raw: 'Raw',
    statusLabel: '狀態',
    timeLabel: '時間',
    sizeLabel: '大小',
    searchPlaceholder: '搜尋 JSON 欄位/值/路徑',
    download: '下載回應',
    copyField: '複製欄位',
    copyKey: '複製鍵名',
    copyPath: '複製路徑',
    copyValue: '複製值',
    toggleNode: '展開或摺疊節點',
    binaryDetected: '偵測到二進位回應',
    imagePreview: '圖片預覽',
    noInlinePreview: '此二進位類型不支援內嵌預覽，請下載查看',
    noSearchResult: '沒有符合的 JSON 結果',
    cookies: 'Cookies',
    modeJson: 'JSON',
    modeXml: 'XML',
    modeHtml: 'HTML',
    modeJs: 'JavaScript',
    modeRaw: 'Raw',
    modeHex: 'Hex',
    modeBase64: 'Base64',
    preview: '預覽',
    filter: '篩選',
    search: '搜尋',
    filterPlaceholder: '篩選',
    copy: '複製',
    noCookies: '暫無 Cookies'
  },

  env: {
    title: '環境列表',
    new: '建立',
    variables: '變數',
    addVariable: '新增變數',
    varName: '變數名',
    value: '值',
    selectEnv: '選擇一個環境進行編輯',
    defaultName: '環境'
  },

  collection: {
    title: '集合列表',
    new: '建立集合',
    requests: '請求',
    noCollections: '尚無集合，點擊上方按鈕建立',
    defaultName: '集合',
    confirmDelete: '確定要刪除這個集合嗎？'
  },

  code: {
    curl: 'cURL',
    javascript: 'JavaScript',
    python: 'Python',
    copy: '複製',
    copied: '已複製!'
  },

  kv: {
    add: '新增',
    noData: '尚無資料，點擊上方按鈕新增',
    delete: '刪除'
  },

  settings: {
    title: '設定',
    theme: '主題模式',
    language: '語言',
    about: '關於專案',
    techStack: '技術堆疊',
    systemTheme: '跟隨系統',
    darkTheme: '深色模式',
    lightTheme: '淺色模式',
    projectTitle: 'ZapApi',
    projectDesc: '一款現代化的 API 介面除錯工具，支援請求構建、環境管理、集合管理和程式碼產生等功能，為開發者提供高效、直觀的介面測試體驗。',
    langZhCN: '简体中文',
    langZhTW: '繁體中文',
    langEn: 'English'
  },

  tech: {
    vue: 'Vue 3',
    typescript: 'TypeScript',
    vite: 'Vite',
    vueI18n: 'Vue I18n',
    compositionApi: 'Composition API',
    reactiveStore: 'Reactive Store',
    cssVariables: 'CSS Variables',
    glassmorphism: 'Glassmorphism UI'
  },

  empty: {
    noData: '尚無資料'
  },

  select: {
    placeholder: '請選擇'
  },

  confirm: {
    deleteCollection: '確定要刪除這個集合嗎？',
    deleteCollectionMsg: '此操作不可撤銷，集合內的所有請求也將被刪除。',
    deleteRequest: '確定要刪除這個請求嗎？',
    deleteRequestMsg: '此操作不可撤銷。'
  },

  history: {
    justNow: '剛剛',
    minutesAgo: '{count} 分鐘前',
    hoursAgo: '{count} 小時前',
    daysAgo: '{count} 天前'
  }
}
