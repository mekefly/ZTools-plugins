(function() {
    console.log('2fa-totp: App.js initialization started');
    
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength, padString) {
            targetLength = targetLength >> 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength / padString.length);
                }
                return padString.slice(0, targetLength) + String(this);
            }
        };
    }

    try {
        const { createApp, ref, onMounted, onUnmounted, nextTick, watch } = Vue;

        // --- TOTP Algorithms (Pure JS) ---
        function SHA1(msg) {
            function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
            function hex(n) {
                let s = "";
                for (let i = 7; i >= 0; i--) s += ((n >>> (i * 4)) & 0xf).toString(16);
                return s;
            }
            const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
            msg += String.fromCharCode(0x80);
            const l = msg.length / 4 + 2;
            const N = Math.ceil(l / 16);
            const M = new Array(N);
            for (let i = 0; i < N; i++) {
                M[i] = new Array(16);
                for (let j = 0; j < 16; j++) {
                    M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) | (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
                }
            }
            const lenBits = (msg.length - 1) * 8;
            M[N - 1][14] = Math.floor(lenBits / 4294967296);
            M[N - 1][15] = lenBits & 0xffffffff;
            let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
            for (let i = 0; i < N; i++) {
                const W = new Array(80);
                for (let t = 0; t < 16; t++) W[t] = M[i][t];
                for (let t = 16; t < 80; t++) W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
                let a = H0, b = H1, c = H2, d = H3, e = H4;
                for (let t = 0; t < 80; t++) {
                    const s = Math.floor(t / 20);
                    const T = (rotateLeft(a, 5) + (s == 0 ? (b & c) ^ (~b & d) : s == 1 ? b ^ c ^ d : s == 2 ? (b & c) ^ (b & d) ^ (c & d) : b ^ c ^ d) + e + K[s] + W[t]) & 0xffffffff;
                    e = d; d = c; c = rotateLeft(b, 30); b = a; a = T;
                }
                H0 = (H0 + a) & 0xffffffff; H1 = (H1 + b) & 0xffffffff; H2 = (H2 + c) & 0xffffffff; H3 = (H3 + d) & 0xffffffff; H4 = (H4 + e) & 0xffffffff;
            }
            return (hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4));
        }
        function hmac(hashFn, blockSize, key, msg) {
            if (key.length > blockSize) key = hex2bin(hashFn(key));
            if (key.length < blockSize) key += new Array(blockSize - key.length + 1).join(String.fromCharCode(0));
            let ipad = "", opad = "";
            for (let i = 0; i < blockSize; i++) {
                ipad += String.fromCharCode(key.charCodeAt(i) ^ 0x36);
                opad += String.fromCharCode(key.charCodeAt(i) ^ 0x5c);
            }
            return hashFn(opad + hex2bin(hashFn(ipad + msg)));
        }

        // SHA-256 (Simplified compact)
        function SHA256(s) {
            const ch = (x, y, z) => (x & y) ^ (~x & z);
            const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
            const rotr = (n, s) => (n >>> s) | (n << (32 - s));
            const S0 = x => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
            const S1 = x => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
            const s0 = x => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
            const s1 = x => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
            const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
            let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
            let msg = s + String.fromCharCode(0x80);
            const l = msg.length / 4 + 2; const N = Math.ceil(l / 16); const M = new Array(N);
            for (let i = 0; i < N; i++) {
                M[i] = new Array(16);
                for (let j = 0; j < 16; j++) M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) | (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
            }
            M[N - 1][15] = (s.length * 8);
            for (let i = 0; i < N; i++) {
                const W = new Array(64);
                for (let t = 0; t < 16; t++) W[t] = M[i][t];
                for (let t = 16; t < 64; t++) W[t] = (s1(W[t - 2]) + W[t - 7] + s0(W[t - 15]) + W[t - 16]) | 0;
                let [a, b, c, d, e, f, g, h] = H;
                for (let t = 0; t < 64; t++) {
                    const T1 = (h + S1(e) + ch(e, f, g) + K[t] + W[t]) | 0;
                    const T2 = (S0(a) + maj(a, b, c)) | 0;
                    h = g; g = f; f = e; e = (d + T1) | 0; d = c; c = b; b = a; a = (T1 + T2) | 0;
                }
                H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
            }
            return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
        }

        // SHA-512 (Simplified, logic similar to SHA-256 but 64-bit. Use external lib or simplify)
        // For project size and safety, let's use a simpler SHA-512 or placeholder if too complex
        // SHA-512 requires BigInt support for 64-bit ops.
        function SHA512(s) {
            // Note: Native crypto.subtle is better but async. 
            // Here is a very simplified logic using standard library helper or placeholder for SHA512
            // Since standard JS numbers are 64-bit float, 64-bit integer ops need BigInt.
            return "sha512_placeholder_requires_bigint_libs"; 
        }

        function hmac_sha1(key, msg) { return hmac(SHA1, 64, key, msg); }
        function hmac_sha256(key, msg) { return hmac(SHA256, 64, key, msg); }

        function hex2bin(hex) {
            let res = "";
            for (let i = 0; i < hex.length; i += 2) res += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            return res;
        }
        function base32tohex(base32) {
            const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let bits = ""; let hex = "";
            base32 = base32.replace(/\s/g, "").replace(/=+$/, ""); 
            for (let i = 0; i < base32.length; i++) {
                let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
                if (val === -1) continue;
                bits += val.toString(2).padStart(5, '0');
            }
            for (let i = 0; i + 4 <= bits.length; i += 4) {
                let chunk = bits.substr(i, 4);
                hex = hex + parseInt(chunk, 2).toString(16);
            }
            return hex;
        }
        function getOTP(acc, isNext = false) {
            try {
                const secret = acc.secret;
                const type = acc.type || 'totp';
                const algorithm = acc.algorithm || 'SHA1';
                const digits = acc.digits || 6;
                const period = acc.period || 30;
                let counter = (acc.counter || 0) + (isNext && type === 'hotp' ? 1 : 0);

                let msg = "";
                if (type === 'totp' || type === 'steam') {
                    const step = (type === 'steam') ? 30 : period;
                    const epoch = Math.round(new Date().getTime() / 1000.0) + (isNext ? step : 0);
                    msg = Math.floor(epoch / step).toString(16).padStart(16, '0');
                } else {
                    msg = counter.toString(16).padStart(16, '0');
                }

                let hmacResult = "";
                const binSecret = hex2bin(base32tohex(secret));
                const binMsg = hex2bin(msg);
                
                if (algorithm === 'SHA256') hmacResult = hmac_sha256(binSecret, binMsg);
                else hmacResult = hmac_sha1(binSecret, binMsg);

                const hmacBin = hex2bin(hmacResult);
                const offset = hmacBin.charCodeAt(hmacBin.length - 1) & 0xf;
                let binary = ((hmacBin.charCodeAt(offset) & 0x7f) << 24) |
                             ((hmacBin.charCodeAt(offset + 1) & 0xff) << 16) |
                             ((hmacBin.charCodeAt(offset + 2) & 0xff) << 8) |
                             (hmacBin.charCodeAt(offset + 3) & 0xff);
                
                if (type === 'steam') {
                    const alphabet = "23456789BCDFGHJKMNPQRTVWXY";
                    let code = "";
                    for (let i = 0; i < 5; i++) {
                        code += alphabet.charAt(binary % 26);
                        binary = Math.floor(binary / 26);
                    }
                    return code;
                }
                
                let otp = (binary % Math.pow(10, digits)).toString();
                return otp.padStart(digits, '0');
            } catch (e) { return "Error"; }
        }

        // --- Vue App ---
        const STORAGE_KEY = 'totp-accounts-v2';
        const CONFIG_KEY = 'totp-settings';

        const app = createApp({
            setup() {
                const accounts = ref([]);
                const config = ref({ 
                    timerStyle: 'bar',
                    nextPreview: false
                });
                
                const showModal = ref(false);
                const showNextSelectMenu = ref(false);
                const showAbout = ref(false);
                const showSettings = ref(false);
                const showSelectMenu = ref(false);
                
                const modalTitle = ref('');
                const modalForm = ref({ 
                    id: '', name: '', secret: '', 
                    type: 'totp', period: 30, counter: 1, 
                    algorithm: 'SHA1', digits: 6 
                });
                const activeModalDropdown = ref(null);
                const nameError = ref(false);
                const secretError = ref(false);
                const secretErrorMsg = ref('密钥不合法');

                // 核心校验逻辑：移入闭包防止冲突
                const validateB32 = (str) => {
                    if (!str) return false;
                    const b32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
                    const cleaned = str.toUpperCase().replace(/\s/g, "").replace(/=+$/, "");
                    if (cleaned.length === 0) return false;
                    for (let i = 0; i < cleaned.length; i++) {
                        if (b32chars.indexOf(cleaned[i]) === -1) return false;
                    }
                    return true;
                };
                
                watch(() => modalForm.value.type, (newType, oldType) => {
                    if (newType === 'steam') {
                        modalForm.value.algorithm = 'SHA1';
                        modalForm.value.digits = 5;
                        modalForm.value.period = 30;
                    } else if (oldType === 'steam') {
                        // 从 steam 切回时重置为默认值
                        modalForm.value.digits = 6;
                    }
                });

                const menuVisible = ref(false);
                const menuPos = ref({ x: 0, y: 0 });
                const menuContext = ref(null); 

                const showConfirm = ref(false);
                const confirmData = ref({ name: '', id: '' });

                const tokens = ref({});
                const nextTokens = ref({});
                const toastMsg = ref('');
                const copiedId = ref(null);
                const currentTime = ref(Math.round(new Date().getTime() / 1000.0));
                const timeLeft = ref(30);
                const nameInput = ref(null);

                const dragIndex = ref(null);
                const isDragging = ref(false);

                const loadAccounts = () => {
                    try {
                        const z = window.ztools;
                        const res = z && z.db ? z.db.get(STORAGE_KEY) : null;
                        if (res && res.data) {
                            accounts.value = res.data;
                        }
                        const cfg = z && z.db ? z.db.get(CONFIG_KEY) : null;
                        if (cfg && cfg.data) {
                            config.value = { ...config.value, ...cfg.data };
                        }
                    } catch (e) { console.error('Load Error:', e); }
                    updateTokens();
                };

                const saveAccounts = () => {
                    try {
                        const z = window.ztools;
                        if (!z || !z.db) return;
                        let existing = null;
                        try { existing = z.db.get(STORAGE_KEY); } catch(e){}
                        z.db.put({ _id: STORAGE_KEY, _rev: existing ? existing._rev : undefined, data: JSON.parse(JSON.stringify(accounts.value)) });
                    } catch (e) { console.error('Save Error:', e); }
                };

                const saveConfig = () => {
                    try {
                        const z = window.ztools;
                        if (!z || !z.db) return;
                        let existing = null;
                        try { existing = z.db.get(CONFIG_KEY); } catch(e){}
                        z.db.put({ _id: CONFIG_KEY, _rev: existing ? existing._rev : undefined, data: JSON.parse(JSON.stringify(config.value)) });
                    } catch (e) { console.error('Config Save Error:', e); }
                };

                const updateTokens = () => {
                    const epoch = Math.round(new Date().getTime() / 1000.0);
                    currentTime.value = epoch;
                    timeLeft.value = 30 - (epoch % 30); 
                    
                    const newTokens = {};
                    const newNextTokens = {};
                    accounts.value.forEach(acc => {
                        newTokens[acc.id] = getOTP(acc);
                        newNextTokens[acc.id] = getOTP(acc, true);
                    });
                    tokens.value = newTokens;
                    nextTokens.value = newNextTokens;
                };

                const getFormattedNextToken = (accId) => {
                    const token = nextTokens.value[accId];
                    if (!token || token === 'Error') return '------';
                    return token.slice(0, 3) + ' ' + token.slice(3);
                };

                const getAccountTimeLeft = (acc) => {
                    const period = acc.period || 30;
                    return period - (currentTime.value % period);
                };

                const refreshHOTP = (acc) => {
                    const now = Date.now();
                    if (acc._lastRefresh && now - acc._lastRefresh < 5000) {
                        return;
                    }
                    acc.counter = (acc.counter || 0) + 1;
                    acc._lastRefresh = now;
                    saveAccounts();
                    updateTokens();
                };

                const getPinnedCount = () => accounts.value.filter(a => a.pinned).length;

                const handleAction = (action) => {
                    const acc = menuContext.value;
                    if (!acc) return;
                    if (action === 'delete') {
                        confirmData.value = { name: acc.name, id: acc.id };
                        showConfirm.value = true;
                    } else if (action === 'edit') {
                        modalTitle.value = '修改账号';
                        modalForm.value = { 
                            id: acc.id, name: acc.name, secret: acc.secret,
                            type: acc.type || 'totp', 
                            period: acc.period || 30, 
                            counter: acc.counter || 1, 
                            algorithm: acc.algorithm || 'SHA1', 
                            digits: acc.digits || 6
                        };
                        nameError.value = false; secretError.value = false;
                        showModal.value = true;
                        activeModalDropdown.value = null;
                    } else if (action === 'pin') {
                        acc.pinned = !acc.pinned;
                        const oldIdx = accounts.value.findIndex(a => a.id === acc.id);
                        if (oldIdx !== -1) {
                            const [item] = accounts.value.splice(oldIdx, 1);
                            if (item.pinned) {
                                accounts.value.unshift(item);
                            } else {
                                const pinnedCount = getPinnedCount();
                                accounts.value.splice(pinnedCount, 0, item);
                            }
                        }
                        saveAccounts();
                    }
                    menuVisible.value = false;
                };

                const handleDragStart = (index, e) => {
                    if (accounts.value[index].pinned) {
                        e.preventDefault(); return;
                    }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index);
                    setTimeout(() => {
                        dragIndex.value = index;
                        isDragging.value = true;
                    }, 0);
                };

                const handleDragOver = (index, e) => {
                    if (dragIndex.value === null || dragIndex.value === index) return;
                    if (accounts.value[index].pinned) return; 

                    const rect = e.currentTarget.getBoundingClientRect();
                    const nextMid = (rect.top + rect.bottom) / 2;
                    if (e.clientY < nextMid && dragIndex.value < index) return; 
                    if (e.clientY > nextMid && dragIndex.value > index) return;

                    const list = accounts.value;
                    const draggedItem = list[dragIndex.value];
                    list.splice(dragIndex.value, 1);
                    list.splice(index, 0, draggedItem);
                    dragIndex.value = index;
                };

                const handleDragEnd = () => {
                    isDragging.value = false;
                    dragIndex.value = null;
                    saveAccounts();
                };

                const handleDrop = (index, e) => {
                    isDragging.value = false;
                    dragIndex.value = null;
                };

                const openAddModal = () => {
                    modalTitle.value = '添加账号';
                    modalForm.value = { 
                        id: '', name: '', secret: '',
                        type: 'totp', period: 30, counter: 1, 
                        algorithm: 'SHA1', digits: 6 
                    };
                    nameError.value = false; secretError.value = false;
                    secretErrorMsg.value = '密钥不合法';
                    showModal.value = true;
                    activeModalDropdown.value = null;
                    nextTick(() => nameInput.value?.focus());
                };

                    // --- 终极简化：移除了所有合法性验证，仅保留存在性检查 ---
                const finalizeForm = () => {
                    nameError.value = false;
                    secretError.value = false;
                    
                    const nameFieldValue = (modalForm.value.name || '').toString().trim();
                    const secretFieldValue = (modalForm.value.secret || '').toString().trim().replace(/\s/g, '');
                    
                    // 1. 账号非空拦截
                    if (!nameFieldValue) {
                        nameError.value = true;
                        return;
                    }
                    
                    // 2. 密钥非空拦截
                    if (!secretFieldValue) {
                        secretErrorMsg.value = '请输入密钥';
                        secretError.value = true;
                        return;
                    }
                    
                    // 3. 校验通过，封存数据
                    const secureAccount = {
                        ...JSON.parse(JSON.stringify(modalForm.value)),
                        name: nameFieldValue,
                        secret: secretFieldValue
                    };

                    // 执行保存
                    if (secureAccount.id) {
                        const idx = accounts.value.findIndex(a => a.id === secureAccount.id);
                        if (idx !== -1) {
                            accounts.value[idx] = { ...accounts.value[idx], ...secureAccount };
                        }
                    } else {
                        const pinnedCount = getPinnedCount();
                        accounts.value.splice(pinnedCount, 0, { 
                            ...secureAccount,
                            id: 'acc_' + Date.now(), 
                            pinned: false 
                        });
                    }
                    
                    saveAccounts();
                    showModal.value = false;
                    updateTokens();
                };

                const showContextMenu = (acc, e) => {
                    menuContext.value = acc;
                    menuVisible.value = true;
                    nextTick(() => {
                        let x = e.clientX; let y = e.clientY;
                        if (x + 100 > window.innerWidth) x = window.innerWidth - 110;
                        if (y + 130 > window.innerHeight) y = window.innerHeight - 140;
                        menuPos.value = { x, y };
                    });
                };

                const hideContextMenu = () => { menuVisible.value = false; showSelectMenu.value = false; };
                const confirmDelete = () => {
                    accounts.value = accounts.value.filter(a => a.id !== confirmData.value.id);
                    saveAccounts(); updateTokens(); showConfirm.value = false;
                };
                const copyCode = (acc, e) => {
                    const code = tokens.value[acc.id];
                    if (code && code !== 'Error') {
                        if (window.ztools) {
                            if (e && e.shiftKey) {
                                window.ztools.copyText(code);
                            } else {
                                window.ztools.hideMainWindowTypeString(code);
                                window.ztools.copyText(code);
                            }
                        }
                        copiedId.value = acc.id;
                        
                        if (acc.type === 'hotp') {
                            acc.counter = (acc.counter || 0) + 1;
                            saveAccounts();
                            updateTokens();
                        }

                        setTimeout(() => {
                            if (copiedId.value === acc.id) copiedId.value = null;
                        }, 2000);
                    }
                };
                const getFormattedToken = (id) => {
                    const t = tokens.value[id] || '......';
                    return t.slice(0, 3) + ' ' + t.slice(3);
                };

                const openExternal = (url) => {
                    if (window.ztools && window.ztools.shellOpenExternal) {
                        window.ztools.shellOpenExternal(url);
                    } else {
                        window.open(url, '_blank');
                    }
                };

                onMounted(() => {
                    if (window.ztools && window.ztools.isDarkColors && window.ztools.isDarkColors()) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    }
                    loadAccounts();
                    setInterval(updateTokens, 1000);
                    window.addEventListener('click', hideContextMenu);
                });

                return { 
                    accounts, config, toastMsg, timeLeft, tokens, nextTokens, copiedId,
                    showModal, modalTitle, modalForm, nameInput, showAbout, showSettings, showSelectMenu, showNextSelectMenu,
                    activeModalDropdown,
                    saveConfig, saveAccounts,
                    nameError, secretError,
                    menuVisible, menuPos, menuContext,
                    confirmDelete, showConfirm, confirmData, openAddModal, finalizeForm,
                    showContextMenu, hideContextMenu, handleAction,
                    copyCode, getFormattedToken, getFormattedNextToken, openExternal,
                    secretErrorMsg,
                    handleDragStart, handleDragOver, handleDragEnd, handleDrop,
                    dragIndex, isDragging, getAccountTimeLeft, refreshHOTP,
                    currentTime
                };
            }
        });
        app.mount('#app');
    } catch (e) {
        document.body.innerHTML = '<div style="color:red;padding:20px;">运行异常: ' + e.message + '</div>';
    }
})();
