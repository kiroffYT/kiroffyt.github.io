// ==UserScript==
// @name         23 Stats [STABLE v1.5]
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Стабильный мониторинг для "23 Казаки" с защитой от пустых данных.
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

    // Твой зашифрованный URL таблицы
    const _0x4a21 = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3VkcybVA3dUpjS1lXeDRNN195d0U1NVBKVVB1UEtLc2VGWERHNEh2V2pQSkNob0RsbVFxY0hHblZ0OGI5bnk2SmwvZXhlYw==";
    const SCRIPT_URL = atob(_0x4a21);

    const State = {
        myInfo: null,
        playerIp: '0.0.0.0'
    };

    // 1. Однократное получение IP адреса
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api64.ipify.org?format=json",
        onload: (r) => {
            try {
                const data = JSON.parse(r.responseText);
                State.playerIp = data.ip;
            } catch(e) {
                console.error("[23 Stats] Не удалось получить IP");
            }
        }
    });

    // 2. Функция отправки данных в Google Sheets
    const sendToSheet = (payload) => {
        console.log("[23 Stats] Отправка данных в штаб...", payload);
        GM_xmlhttpRequest({
            method: "POST",
            url: SCRIPT_URL,
            data: JSON.stringify(payload),
            contentType: "application/json",
            onload: (r) => {
                if (r.status === 200) {
                    console.log("%c[23 Stats] Данные успешно приняты таблицей.", "color: #2ecc71;");
                } else {
                    console.warn("[23 Stats] Таблица ответила статусом:", r.status);
                }
            },
            onerror: (e) => console.error("[23 Stats] Ошибка связи с таблицей:", e)
        });
    };

    // 3. Основной механизм перехвата трафика
    const patchFetch = () => {
        const originalFetch = unsafeWindow.fetch;
        
        unsafeWindow.fetch = async function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : "");
            
            // ПЕРЕХВАТ: Данные пользователя
            if (url.includes('/me')) {
                return originalFetch.apply(this, args).then(async (resp) => {
                    const cloned = resp.clone();
                    try {
                        const data = await cloned.json();
                        // Важно: сохраняем только если данные не пустые
                        if (data && data.id && data.name) {
                            State.myInfo = data;
                            console.log("%c[23 Stats] Игрок опознан: " + data.name, "color: #3498db; font-weight: bold;");
                        }
                    } catch (e) {}
                    return resp;
                });
            }

            // ПЕРЕХВАТ: Постановка пикселя
            if (url.includes('/pixel/') && args[1]?.method === 'POST') {
                try {
                    const body = JSON.parse(args[1].body);
                    // Проверяем, что у нас есть данные игрока и что в запросе есть координаты
                    if (State.myInfo && State.myInfo.id && body.coords) {
                        for (let i = 0; i < body.coords.length; i += 2) {
                            const x = body.coords[i];
                            const y = body.coords[i+1];
                            const color = body.colors ? body.colors[i / 2] : "unknown";

                            sendToSheet({
                                paintedById: State.myInfo.id,
                                paintedByName: State.myInfo.name,
                                myId: State.myInfo.id,
                                myName: State.myInfo.name,
                                color: color,
                                coords: `${x}, ${y}`,
                                requestTime: new Date().toLocaleString("ru-RU"),
                                paintTime: new Date().toLocaleString("ru-RU"),
                                ip: State.playerIp
                            });
                        }
                    } else if (!State.myInfo) {
                        console.warn("[23 Stats] Данные игрока не найдены. Попробуй обновить страницу.");
                    }
                } catch (e) {
                    console.error("[23 Stats] Ошибка анализа пакета рисования:", e);
                }
            }

            return originalFetch.apply(this, args);
        };
    };

    // Запуск монитора с задержкой для инициализации окружения сайта
    setTimeout(() => {
        patchFetch();
        console.log("%c[23 Stats] Система мониторинга активна.", "color: #ff4444; font-weight: bold;");
    }, 1000);
})();
