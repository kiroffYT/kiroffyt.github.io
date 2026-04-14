// ==UserScript==
// @name         23 Stats
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Обязательное расширение для Wplace-клана "23 Казаки". Посторонним вход ВОСПРЕЩЁН!
// @author       KirOFF
// @match        https://*.wplace.live/*
// @match        http://*.wplace.live/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wplace.live
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
        debug: true
    };

    const State = {
        myInfo: null,
        playerIp: 'pending...',
        isMonitoring: false
    };

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api64.ipify.org?format=json",
        onload: (r) => {
            try { State.playerIp = JSON.parse(r.responseText).ip; } catch(e) { State.playerIp = 'error'; }
        }
    });

    const Helpers = {
        sendToSheet(data) {
            if (CONFIG.debug) console.log("%c[Sending to Sheet]", "color: #f39c12", data);
            GM_xmlhttpRequest({
                method: "POST",
                url: CONFIG.scriptUrl,
                data: JSON.stringify(data),
                contentType: "application/json"
            });
        },
        sleep: ms => new Promise(res => setTimeout(res, ms))
    };

    const Interceptor = {
        init() {
            const { fetch: originalFetch } = unsafeWindow;
            unsafeWindow.fetch = async (...args) => {
                const response = await originalFetch(...args);
                const url = args[0] instanceof Request ? args[0].url : args[0];

                if (url.includes('backend.wplace.live/me')) {
                    this.handleMe(response.clone());
                }

                if (url.match(/pixel\/\d+\/\d+$/) && !url.includes('?')) {
                    this.handlePaint(args, response.clone());
                }

                return response;
            };
            console.log("%c[WPlace Monitor] %cСистема готова к работе.", "color: #3498db; font-weight: bold;", "");
        },

        async handleMe(resp) {
            const d = await resp.json();
            State.myInfo = d;

            if (String(d.allianceId) === CONFIG.targetAllianceId) {
                Helpers.sendToSheet({
                    type: 'user',
                    ip: State.playerIp,
                    id: d.id,
                    name: d.name,
                    allianceId: d.allianceId,
                    discord: d.discord,
                    discordId: d.discordId,
                    pixelsPainted: d.pixelsPainted,
                    time: new Date().toLocaleString()
                });
            }
        },

        async handlePaint(args, resp) {
            const paintTime = new Date().toLocaleString();
            try {
                const options = args[1] || {};
                if (!options.body) return;

                const payload = JSON.parse(options.body);
                const colors = payload.colors || [];
                const coords = payload.coords || [];
                const fp = payload.fp || 'n/a';

                const batch = [];

                for (let i = 0; i < coords.length; i += 2) {
                    const x = coords[i];
                    const y = coords[i + 1];
                    const color = colors[i / 2];

                    await Helpers.sleep(1200);

                    const pixelUrl = `https://backend.wplace.live/s0/pixel/23/23?x=${x}&y=${y}`;
                    const checkResp = await unsafeWindow.fetch(pixelUrl);
                    const d = await checkResp.json();

                    batch.push({
                        paintedById: d.paintedBy?.id || '—',
                        paintedByName: d.paintedBy?.name || '—',
                        myId: State.myInfo?.id || 'unknown',
                        myName: State.myInfo?.name || 'unknown',
                        color: color,
                        coords: `${x}, ${y}`,
                        requestTime: new Date().toLocaleString(),
                        paintTime: paintTime,
                        fp: fp
                    });
                }

                if (batch.length > 0) {
                    Helpers.sendToSheet(batch);
                }

            } catch (e) {
                console.error("[Monitor] Ошибка оптимизированной отправки:", e);
            }
        }
    };

    Interceptor.init();
})();
