// ==UserScript==
// @name         23 Stats
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Оптимизированная и надежная статистика для "23 Казаки".
// @author       KirOFF
// @match        https://*.wplace.live/*
// @match        http://*.wplace.live/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      api64.ipify.org
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const _0x4a21 = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3VkcybVA3dUpjS1lXeDRNN195d0U1NVBKVVB1UEtLc2VGWERHNEh2V2pQSkNob0RsbVFxY0hHblZ0OGI5bnk2SmwvZXhlYw==";

    const CONFIG = {
        scriptUrl: atob(_0x4a21),
        targetAllianceId: "671209"
    };

    const State = {
        myInfo: null,
        playerIp: '0.0.0.0'
    };

    // IP получаем один раз
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api64.ipify.org?format=json",
        onload: (r) => {
            try { State.playerIp = JSON.parse(r.responseText).ip; } catch(e) {}
        }
    });

    const Helpers = {
        // Отправка строго одного объекта, как и раньше
        sendToSheet(data) {
            GM_xmlhttpRequest({
                method: "POST",
                url: CONFIG.scriptUrl,
                data: JSON.stringify(data),
                contentType: "application/json"
            });
        }
    };

    const Interceptor = {
        init() {
            const { fetch: originalFetch } = unsafeWindow;
            unsafeWindow.fetch = async (...args) => {
                const response = await originalFetch(...args);
                const url = typeof args[0] === 'string' ? args[0] : args[0].url;

                if (url.includes('/backend.wplace.live/me')) {
                    this.handleMe(response.clone());
                }

                if (url.includes('/pixel/') && args[1] && args[1].method === 'POST') {
                    this.handlePaint(args[1].body);
                }

                return response;
            };
        },

        async handleMe(resp) {
            try { State.myInfo = await resp.json(); } catch(e) {}
        },

        handlePaint(body) {
            if (!body || !State.myInfo) return;
            try {
                const payload = JSON.parse(body);
                const coords = payload.coords || [];
                const colors = payload.colors || [];

                for (let i = 0; i < coords.length; i += 2) {
                    const x = coords[i];
                    const y = coords[i+1];

                    // Отправляем данные сразу для каждого пикселя отдельно
                    // Это гарантирует совместимость с твоим Google-скриптом
                    Helpers.sendToSheet({
                        paintedById: State.myInfo.id,
                        paintedByName: State.myInfo.name,
                        myId: State.myInfo.id,
                        myName: State.myInfo.name,
                        color: colors[i/2],
                        coords: `${x}, ${y}`,
                        requestTime: new Date().toLocaleString("ru-RU"),
                        paintTime: new Date().toLocaleString("ru-RU"),
                        ip: State.playerIp
                    });
                }
            } catch(e) {}
        }
    };

    Interceptor.init();
    console.log("%c[23 Stats] %cРежим прямой передачи активен.", "color: #00ff00;", "color: #fff;");
})();
