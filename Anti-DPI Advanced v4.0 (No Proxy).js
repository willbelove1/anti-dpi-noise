// ==UserScript==
// @name         Anti-DPI Advanced v4.0 (No Proxy)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Gây nhiễu DPI bằng headers giả, request ngẫu nhiên, Service Worker, CDN và UI cấu hình nâng cao. Cải tiến với modal cài đặt và quản lý danh sách trắng.
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ========== ⚙️ UI Cấu hình ==========
    const configDefaults = {
        requestCount: 5,
        interval: 60000,
        cdnUrl: 'https://cdn.jsdelivr.net/gh/willbelove1/anti-dpi-noise@main/noise-domains.json',
        enableSW: true,
        allowedDomains: ['example.com', 'test.com', 'dummy.net', 'noise.org']
    };

    // Đọc cấu hình từ bộ nhớ
    const config = {
        requestCount: GM_getValue('requestCount', configDefaults.requestCount),
        interval: GM_getValue('interval', configDefaults.interval),
        cdnUrl: GM_getValue('cdnUrl', configDefaults.cdnUrl),
        enableSW: GM_getValue('enableSW', configDefaults.enableSW),
        allowedDomains: GM_getValue('allowedDomains', configDefaults.allowedDomains)
    };

    // Modal UI cho cài đặt
    function createSettingsModal() {
        // Tạo container modal
        const modal = document.createElement('div');
        modal.style = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 10000; width: 500px; max-height: 80vh; overflow-y: auto;
        `;
        modal.innerHTML = `
            <h2 style="margin-top: 0;">⚙️ Cấu hình Anti-DPI</h2>
            <label>Số request gây nhiễu mỗi lần:</label><br>
            <input id="requestCount" type="number" value="${config.requestCount}" min="1" style="width: 100%; margin-bottom: 10px;"><br>
            <label>Khoảng cách giữa các đợt (ms):</label><br>
            <input id="interval" type="number" value="${config.interval}" min="1000" style="width: 100%; margin-bottom: 10px;"><br>
            <label>URL CDN chứa danh sách domain:</label><br>
            <input id="cdnUrl" type="text" value="${config.cdnUrl}" style="width: 100%; margin-bottom: 10px;"><br>
            <label><input id="enableSW" type="checkbox" ${config.enableSW ? 'checked' : ''}> Kích hoạt Service Worker</label><br>
            <h3>Danh sách trắng (Allowed Domains)</h3>
            <div id="allowedDomainsList" style="margin-bottom: 10px;"></div>
            <input id="newDomain" type="text" placeholder="Thêm tên miền mới (e.g., reddit.com)" style="width: 70%; margin-right: 5px;">
            <button id="addDomain">Thêm</button><br>
            <button id="saveSettings" style="margin-top: 10px; padding: 8px 16px;">Lưu</button>
            <button id="cancelSettings" style="margin-top: 10px; padding: 8px 16px; margin-left: 10px;">Hủy</button>
        `;
        document.body.appendChild(modal);

        // Tạo overlay
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999;
        `;
        document.body.appendChild(overlay);

        // Hiển thị danh sách trắng
        function updateDomainsList() {
            const list = document.getElementById('allowedDomainsList');
            list.innerHTML = '';
            config.allowedDomains.forEach((domain, index) => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <span>${domain}</span>
                    <button onclick="this.parentElement.remove(); config.allowedDomains.splice(${index}, 1);">Xóa</button>
                `;
                list.appendChild(div);
            });
        }
        updateDomainsList();

        // Xử lý sự kiện thêm domain
        document.getElementById('addDomain').addEventListener('click', () => {
            const newDomain = document.getElementById('newDomain').value.trim();
            if (newDomain && !config.allowedDomains.includes(newDomain)) {
                config.allowedDomains.push(newDomain);
                document.getElementById('newDomain').value = '';
                updateDomainsList();
            }
        });

        // Xử lý sự kiện lưu
        document.getElementById('saveSettings').addEventListener('click', () => {
            const requestCount = parseInt(document.getElementById('requestCount').value);
            const interval = parseInt(document.getElementById('interval').value);
            const cdnUrl = document.getElementById('cdnUrl').value.trim();
            const enableSW = document.getElementById('enableSW').checked;

            // Kiểm tra đầu vào
            if (isNaN(requestCount) || requestCount < 1) {
                alert('Số request phải là số dương!');
                return;
            }
            if (isNaN(interval) || interval < 1000) {
                alert('Khoảng cách phải lớn hơn 1000ms!');
                return;
            }
            if (!cdnUrl.match(/^https?:\/\/.+/)) {
                alert('URL CDN không hợp lệ!');
                return;
            }

            // Lưu cấu hình
            config.requestCount = requestCount;
            config.interval = interval;
            config.cdnUrl = cdnUrl;
            config.enableSW = enableSW;
            GM_setValue('requestCount', requestCount);
            GM_setValue('interval', interval);
            GM_setValue('cdnUrl', cdnUrl);
            GM_setValue('enableSW', enableSW);
            GM_setValue('allowedDomains', config.allowedDomains);

            alert('✅ Đã lưu cấu hình. Reload trang để áp dụng.');
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        // Xử lý sự kiện hủy
        document.getElementById('cancelSettings').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });
    }

    // Menu chỉnh cấu hình
    GM_registerMenuCommand("⚙️ Cấu hình Anti-DPI", createSettingsModal);

    // ========== 📦 Cấu trúc dữ liệu ==========
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
    ];

    const customHeaders = {
        'Accept': [
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'application/json, text/plain, */*'
        ],
        'Accept-Language': [
            'en-US,en;q=0.5',
            'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        ],
        'Referer': [
            'https://www.google.com',
            'https://www.bing.com',
            ''
        ],
        'Origin': [
            'https://example.com',
            'https://test.com',
            ''
        ],
        'Cache-Control': [
            'no-cache',
            'max-age=0'
        ],
        'Connection': [
            'keep-alive',
            'close'
        ]
    };

    const methods = ['GET', 'POST', 'HEAD', 'OPTIONS'];
    let noiseDomains = [
        'https://reddit.com',
        'https://wikipedia.org',
        'https://news.ycombinator.com',
        'https://archive.org'
    ]; // Fallback domains

    // ========== 🌐 Tải danh sách domain từ CDN ==========
    function fetchNoiseDomainsFromCDN() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: config.cdnUrl + '?_=' + Date.now(),
            onload: res => {
                try {
                    const data = JSON.parse(res.responseText);
                    noiseDomains = data.domains || noiseDomains;
                    console.log('[Anti-DPI] Noise domains loaded:', noiseDomains);
                } catch (e) {
                    console.warn('❌ Lỗi phân tích JSON noiseDomains, sử dụng fallback:', e);
                }
            },
            onerror: err => {
                console.warn('❌ Không thể tải CDN, sử dụng fallback domains:', err);
            }
        });
    }

    // ========== 🧠 Utilities ==========
    function getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateHeaders() {
        const domain = getRandomItem(noiseDomains).replace('https://', '');
        return {
            'User-Agent': getRandomItem(userAgents),
            'Accept': getRandomItem(customHeaders.Accept),
            'Accept-Language': getRandomItem(customHeaders['Accept-Language']),
            'Referer': getRandomItem(customHeaders.Referer),
            'Origin': getRandomItem(customHeaders.Origin),
            'Cache-Control': getRandomItem(customHeaders['Cache-Control']),
            'Connection': getRandomItem(customHeaders.Connection),
            'X-Custom-Header': 'Noise-' + Math.random().toString(36).substring(2),
            'Host ': domain // Thêm khoảng trắng để mô phỏng GoodbyeDPI
        };
    }

    function sendFakeRequest(method, url) {
        GM_xmlhttpRequest({
            method,
            url: config.enableSW ? redirectViaSW(url) : url,
            headers: generateHeaders(),
            data: method === 'POST' ? JSON.stringify({ junk: Math.random() }) : null,
            onload: res => console.log(`[${method}] ${url} =>`, res.status),
            onerror: err => console.error(`[${method}] Error:`, err)
        });
    }

    function redirectViaSW(url) {
        return url + (url.includes('?') ? '&' : '?') + 'antiDPI=' + Math.random().toString(36).substring(7);
    }

    // ========== 🕵️‍♂️ Kiểm tra DPI ==========
    function testDPI(url = 'https://reddit.com') {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: generateHeaders(),
            onload: res => {
                if (res.status === 403 || res.status === 503) {
                    console.warn('[Anti-DPI] Có thể bị DPI chặn:', url);
                } else {
                    console.log('[Anti-DPI] Không phát hiện DPI:', url);
                }
            },
            onerror: err => console.error('[Anti-DPI] Lỗi kiểm tra DPI:', err)
        });
    }

    // ========== 🖼️ Gây nhiễu DOM ==========
    function insertHiddenIframes() {
        if (!noiseDomains.length) return;
        const maxElements = 3; // Giới hạn số iframe/img
        noiseDomains.slice(0, maxElements).forEach(domain => {
            const iframe = document.createElement('iframe');
            iframe.src = redirectViaSW(domain);
            iframe.style = 'display:none;width:0;height:0;';
            document.body.appendChild(iframe);

            const img = document.createElement('img');
            img.src = redirectViaSW(domain + '?img=' + Math.random());
            img.style = 'width:1px;height:1px;position:absolute;left:-9999px;';
            document.body.appendChild(iframe);
        });
    }

    // ========== 📡 Gửi yêu cầu giả ==========
    function scheduleNoise() {
        const maxRequestsPerSecond = 1; // Giới hạn tần suất
        let sentRequests = 0;
        for (let i = 0; i < config.requestCount && sentRequests < maxRequestsPerSecond; i++) {
            const method = getRandomItem(methods);
            const url = getRandomItem(noiseDomains);
            if (url) {
                sendFakeRequest(method, url);
                sentRequests++;
            }
        }
    }

    // ========== 🚀 Main ==========
    window.addEventListener('load', () => {
        // Kiểm tra danh sách trắng
        if (!config.allowedDomains.some(domain => location.hostname.includes(domain))) {
            console.log('[Anti-DPI] Trang không nằm trong danh sách cho phép:', location.hostname);
            return;
        }

        // Kiểm tra HTTPS
        if (location.protocol !== 'https:') {
            console.warn('⚠️ HTTPS không được sử dụng.');
            return;
        }

        // Kiểm tra Service Worker
        if (config.enableSW && !('serviceWorker' in navigator)) {
            console.warn('[Anti-DPI] Service Worker không được hỗ trợ.');
            config.enableSW = false;
            GM_setValue('enableSW', false);
        }

        // Đăng ký Service Worker
        if (config.enableSW && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('https://cdn.jsdelivr.net/gh/willbelove1/anti-dpi-noise@main/anti-dpi-sw.js').then(reg => {
                console.log('[Anti-DPI] Service Worker registered:', reg);
            }).catch(err => {
                console.warn('[Anti-DPI] Service Worker registration failed:', err);
                config.enableSW = false;
                GM_setValue('enableSW', false);
            });
        }

        // Khởi động
        fetchNoiseDomainsFromCDN();
        setTimeout(() => {
            testDPI();
            insertHiddenIframes();
            scheduleNoise();
            setInterval(scheduleNoise, config.interval);
        }, 3000);
    });
})();