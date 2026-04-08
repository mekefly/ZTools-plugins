export default {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    export: 'Export',
    create: 'Create',
    add: 'Add',
    enabled: 'Enabled',
    disabled: 'Disabled',
    noData: 'No data',
    select: 'Select',
    copy: 'Copy',
    copied: 'Copied!',
    confirm: 'Confirm',
    settings: 'Settings',
    edit: 'Edit'
  },

  app: {
    title: 'ZapApi',
    env: 'Environment',
    noEnv: 'No environment',
    manageEnv: 'Manage Environments',
    code: 'Code',
    collections: 'Collections',
    newRequest: 'New Request',
    saved: 'Saved',
    envManagerTitle: 'Environment Manager',
    codeGeneratorTitle: 'Generate Code',
    collectionManagerTitle: 'Collection Manager'
  },

  sidebar: {
    collections: 'Collections',
    newCollection: 'New Collection',
    addRequest: '+ Add Request',
    noCollections: 'No collections',
    createCollection: 'Create Collection',
    manageCollections: 'Manage Collections',
    tabCollections: 'Collections',
    tabHistory: 'History',
    deleteHistoryItem: 'Delete this record',
    clearHistory: 'Clear History',
    noHistory: 'No history yet'
  },

  request: {
    urlPlaceholder: 'Enter request URL, supports {variables}',
    send: 'Send',
    sending: 'Sending...',
    saveRequest: 'Save Request',
    params: 'Params',
    headers: 'Headers',
    auth: 'Auth',
    body: 'Body',
    paramName: 'Parameter name',
    value: 'Value',
    addParam: 'Add Parameter',
    addHeader: 'Add Header',
    authType: 'Auth Type',
    none: 'None',
    bearer: 'Bearer Token',
    basic: 'Basic Auth',
    apikey: 'API Key',
    bearerToken: 'Enter Bearer Token',
    username: 'Username',
    password: 'Password',
    apiKeyValue: 'API Key value',
    addTo: 'Add to',
    headerName: 'Header Name',
    bodyType: 'Body Type',
    bodyNone: 'none',
    bodyJson: 'JSON',
    bodyRaw: 'Raw',
    bodyFormdata: 'form-data',
    bodyUrlencoded: 'x-www-form-urlencoded',
    bodyPlaceholder: 'Enter request body',
    fieldName: 'Field name',
    addField: 'Add Field',
    headerPlaceholder: 'Header name',
    noAuth: 'This request does not use authentication',
    noBody: 'This request does not have a body',
    cancel: 'Cancel Request'
  },

  tabs: {
    newTab: 'New Tab',
    untitledRequest: 'New Request',
    renameTitle: 'Rename Tab',
    renamePlaceholder: 'Enter tab name',
    resizeDialog: 'Resize rename dialog',
    scrollLeft: 'Scroll tabs left',
    scrollRight: 'Scroll tabs right',
    closeCurrent: 'Close Tab',
    closeOthers: 'Close Other Tabs',
    closeRight: 'Close Tabs to the Right',
    duplicate: 'Duplicate Tab',
    copySuffix: 'Copy',
    unsavedTitle: 'Unsaved changes',
    unsavedMsgSingle: 'This tab has unsaved changes. Close anyway?',
    unsavedMsgBatch: '{count} tabs have unsaved changes. Close anyway?',
    closeAnyway: 'Close Anyway',
    saveNeedCollection: 'Create or select a collection before saving',
    savedAsNewRequest: 'Saved as a new request'
  },

  response: {
    title: 'Response',
    waiting: 'Waiting for response...',
    failed: 'Request failed',
    empty: 'Send a request to see the response',
    emptyBody: '(Empty response)',
    body: 'Body',
    headers: 'Headers',
    raw: 'Raw',
    statusLabel: 'Status',
    timeLabel: 'Time',
    sizeLabel: 'Size',
    searchPlaceholder: 'Search JSON key/value/path',
    download: 'Download',
    copyField: 'Copy field',
    copyKey: 'Copy key',
    copyPath: 'Copy path',
    copyValue: 'Copy value',
    toggleNode: 'Toggle node',
    binaryDetected: 'Binary response detected',
    imagePreview: 'Image preview',
    noInlinePreview: 'Inline preview is not supported for this binary type. Download to view.',
    noSearchResult: 'No matching JSON result',
    cookies: 'Cookies',
    modeJson: 'JSON',
    modeXml: 'XML',
    modeHtml: 'HTML',
    modeJs: 'JavaScript',
    modeRaw: 'Raw',
    modeHex: 'Hex',
    modeBase64: 'Base64',
    preview: 'Preview',
    filter: 'Filter',
    search: 'Search',
    filterPlaceholder: 'Filter',
    copy: 'Copy',
    noCookies: 'No cookies'
  },

  env: {
    title: 'Environments',
    new: 'New',
    variables: 'Variables',
    addVariable: 'Add Variable',
    varName: 'Variable name',
    value: 'Value',
    selectEnv: 'Select an environment to edit',
    defaultName: 'Environment'
  },

  collection: {
    title: 'Collections',
    new: 'New Collection',
    requests: 'requests',
    noCollections: 'No collections, click the button above to create one',
    defaultName: 'Collection',
    confirmDelete: 'Are you sure you want to delete this collection?'
  },

  code: {
    curl: 'cURL',
    javascript: 'JavaScript',
    python: 'Python',
    copy: 'Copy',
    copied: 'Copied!'
  },

  kv: {
    add: 'Add',
    noData: 'No data, click the button above to add',
    delete: 'Delete'
  },

  settings: {
    title: 'Settings',
    theme: 'Theme',
    language: 'Language',
    about: 'About',
    techStack: 'Tech Stack',
    systemTheme: 'System',
    darkTheme: 'Dark',
    lightTheme: 'Light',
    projectTitle: 'ZapApi',
    projectDesc: 'A modern API debugging tool that supports request building, environment management, collection management, and code generation, providing developers with an efficient and intuitive API testing experience.',
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
    noData: 'No data'
  },

  select: {
    placeholder: 'Select'
  },

  confirm: {
    deleteCollection: 'Delete this collection?',
    deleteCollectionMsg: 'This action cannot be undone. All requests in this collection will also be deleted.',
    deleteRequest: 'Delete this request?',
    deleteRequestMsg: 'This action cannot be undone.'
  },

  history: {
    justNow: 'Just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago'
  }
}
