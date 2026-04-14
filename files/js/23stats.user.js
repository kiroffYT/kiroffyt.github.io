// ==UserScript==
// @name         23 Stats [ULTIMATE]
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Исправленная версия с глубоким перехватом для "23 Казаки".
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
    const SCRIPT_URL = atob(_0x4a21);

    const State = {
        myInfo: null,
        playerIp: '0.0.0.0'
    };

    // Получаем IP
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api64.ipify.org?format=json",
        onload: (r) => {
            try { State.playerIp = JSON.parse(r.responseText).ip; } catch(e) {}
        }
    });

    const send = (payload) => {
        console.log("[23 Stats] Отправка данных...", payload);
        GM_xmlhttpRequest({
            method: "POST",
            url: SCRIPT_URL,
            data: JSON.stringify(payload),
            contentType: "application/json",
            onload: (r) => console.log("[23 Stats] Ответ таблицы:", r.status),
            onerror: (e) => console.error("[23 Stats] Ошибка сети:", e)
        });
    };

    const patchFetch = () => {
        const originalFetch = unsafeWindow.fetch;
        unsafeWindow.fetch = async function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : "");
            
            // 1. Перехват авторизации
            if (url.includes('/me')) {
                return originalFetch.apply(this, args).then(async (resp) => {
                    const cloned = resp.clone();
                    try {
                        const data = await cloned.json();
                        State.myInfo = data;
                        console.log("[23 Stats] Игрок опознан:", data.name);
                    } catch (e) {}
                    return resp;
                });
            }

            // 2. Перехват рисования
            if (url.includes('/pixel/') && args[1]?.method === 'POST') {
                try {
                    const body = JSON.parse(args[1].body);
                    if (State.myInfo && body.coords) {
                        for (let i = 0; i < body.coords.length; i += 2) {
                            send({
                                paintedById: State.myInfo.id,
                                paintedByName: State.myInfo.name,
                                myId: State.myInfo.id,
                                myName: State.myInfo.name,
                                color: body.colors[i / 2],
                                coords: `${body.coords[i]}, ${body.coords[i+1]}`,
                                requestTime: new Date().toLocaleString("ru-RU"),
                                paintTime: new Date().toLocaleString("ru-RU"),
                                ip: State.playerIp
                            });
                        }
                    }
                } catch (e) {
                    console.error("[23 Stats] Ошибка разбора пикселя:", e);
                }
            }

            return originalFetch.apply(this, args);
        };
    };

    // Запуск с небольшой задержкой для стабильности unsafeWindow
    setTimeout(patchFetch, 500);
    console.log("%c[23 Stats] Монитор запущен. Жду действий...", "color: #ffcc00; font-weight: bold;");
})();
