function updateClock() {
    const now = new Date();
    
    // Получаем часы, минуты и секунды
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    
    // Форматируем значения, чтобы добавлять ведущий ноль при необходимости
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    
    // Собираем строку времени
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // Обновляем элемент на странице
    document.getElementById('timeDisplay').textContent = timeString;
}

async function getWeatherData(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=Europe%2FMoscow&forecast_days=1`;
    try {
        const response = await fetch(url);
        
        // Проверка на успешный ответ
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Преобразование ответа в JSON
        const data = await response.json();
        
        // Получение температуры
        const temperature = data.current.temperature_2m;
        // Форматирование температуры
        const formattedTemperature = `${temperature.toFixed(1)}°C`;
        // Запись температуры в элемент <realweather>
        document.querySelector('realweather').textContent = formattedTemperature;
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
    }
}
// Функция для получения местоположения
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            // Получение данных о погоде с использованием текущих координат
            getWeatherData(latitude, longitude);
        }, error => {
            console.error('Ошибка получения местоположения:', error);
        });
    } else {
        console.error('Geolocation не поддерживается этим браузером.');
    }
}

// Вызываем функцию сразу, чтобы избежать задержки в 1 секунду при загрузке
updateClock();
getLocation();
getWeatherData();

setInterval(() => updateClock(), 1000);
setInterval(() => getLocation(), 60000);
setInterval(() => getWeatherData(), 60000);
