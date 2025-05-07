// Функции для сохранения и загрузки состояния приложения

// Функция для сжатия изображения и возврата промиса со сжатым data URL
async function compressImageForStorage(dataUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        try {
            // Создаем изображение для загрузки данных
            const img = new Image();
            img.onload = function() {
                // Вычисляем новые размеры, сохраняя пропорции
                let width = img.width;
                let height = img.height;
                
                // Если ширина больше максимальной, уменьшаем размеры
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                
                // Создаем канвас для рисования сжатого изображения
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                // Рисуем изображение на канвасе
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Получаем сжатый data URL
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Возвращаем результат
                resolve(compressedDataUrl);
            };
            
            img.onerror = function() {
                // В случае ошибки возвращаем оригинальный URL
                resolve(dataUrl);
            };
            
            // Загружаем изображение
            img.src = dataUrl;
        } catch (error) {
            // В случае ошибки возвращаем оригинальный URL
            resolve(dataUrl);
        }
    });
}

// Создаем объект для управления состоянием
const MindMapState = {
    // Ключи для localStorage
    STORAGE_KEY: 'mindmap_state',
    AUTO_SAVE_INTERVAL: 1000, // Интервал автосохранения в миллисекундах
    autoSaveTimer: null,
    lastSavedState: null,
    isInitialized: false,
    
    // Функция инициализации
    init: function() {
        if (this.isInitialized) return true;
        
        // Проверяем, что все необходимые переменные доступны
        if (typeof window.bubbles === 'undefined' || typeof window.connections === 'undefined' || 
            typeof window.bubblesContainer === 'undefined' || typeof window.scale === 'undefined' || 
            typeof window.offset === 'undefined' || typeof window.createBubble === 'undefined' || 
            typeof window.createConnection === 'undefined') {
            // Тихо выходим без предупреждений в консоли
            return false;
        }
        
        this.isInitialized = true;
        // Модуль управления состоянием инициализирован
        return true;
    },
    
    // Функция для сохранения всего состояния приложения
    saveAppState: async function() {
        // Пытаемся инициализировать, но если не получается - тихо выходим
        if (!this.init()) return false;
        
        try {
            // Получаем текущее состояние пузырьков
            const allBubbleElements = document.querySelectorAll('.bubble');
            const bubblesStatePromises = Array.from(allBubbleElements).map(async bubbleElement => {
                // Находим DOM-элемент пузырька
                const textArea = bubbleElement.querySelector('.bubble-text');
                // Проверяем, есть ли изображение в пузырьке
                const hasImage = bubbleElement.classList.contains('has-image');
                let imageData = null;
                
                if (hasImage) {
                    const img = bubbleElement.querySelector('.bubble-image');
                    if (img) {
                        // Сжимаем изображение перед сохранением
                        let compressedSrc = img.src;
                        try {
                            compressedSrc = await compressImageForStorage(img.src);
                        } catch (compressionError) {
                            // Если сжатие не удалось, используем оригинальный источник
                        }
                        
                        imageData = {
                            src: compressedSrc,
                            width: parseFloat(img.dataset.originalWidth),
                            height: parseFloat(img.dataset.originalHeight),
                            left: parseFloat(img.style.left),
                            top: parseFloat(img.style.top)
                        };
                    }
                }
                
                return {
                    id: bubbleElement.dataset.id,
                    x: parseFloat(bubbleElement.style.left),
                    y: parseFloat(bubbleElement.style.top),
                    text: textArea ? textArea.value : '',
                    color: bubbleElement.dataset.originalColor || '',
                    size: parseFloat(bubbleElement.style.width),
                    shape: bubbleElement.classList.contains('square') ? 'square' : 'circle',
                    imageData: imageData
                };
            });
            
            // Ждем завершения всех промисов сжатия изображений
            const bubblesState = await Promise.all(bubblesStatePromises);
            
            // Получаем текущее состояние соединений
            const connectionsState = window.connections
                .filter(conn => conn && conn.bubble1 && conn.bubble2 && conn.bubble1.dataset && conn.bubble2.dataset) // Фильтруем невалидные соединения
                .map(conn => ({
                    bubble1Id: conn.bubble1.dataset.id,
                    bubble2Id: conn.bubble2.dataset.id
                }));
            
            // Получаем текущее состояние viewport
            const viewportState = {
                scale: window.scale,
                offset: window.offset
            };
            
            // Формируем полное состояние приложения
            const appState = {
                bubbles: bubblesState,
                connections: connectionsState,
                viewport: viewportState,
                timestamp: Date.now()
            };
            
            // Сериализуем и сохраняем состояние
            const stateJSON = JSON.stringify(appState);
            
            // Проверяем, изменилось ли состояние с последнего сохранения
            if (stateJSON !== this.lastSavedState) {
                try {
                    // Пытаемся сохранить с изображениями
                    localStorage.setItem(this.STORAGE_KEY, stateJSON);
                    this.lastSavedState = stateJSON;
                } catch (storageError) {
                    // Если превышена квота localStorage, пробуем сохранить без изображений
                    if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
                        // Создаем копию без изображений
                        const bubblesWithoutImages = bubblesState.map(bubble => {
                            const bubbleCopy = {...bubble};
                            if (bubbleCopy.imageData) {
                                // Сохраняем только флаг, что было изображение
                                bubbleCopy.imageData = { hasImage: true };
                            }
                            return bubbleCopy;
                        });
                        
                        // Создаем новое состояние без изображений
                        const appStateWithoutImages = {
                            ...appState,
                            bubbles: bubblesWithoutImages,
                            imagesRemoved: true // Добавляем флаг, что изображения были удалены
                        };
                        
                        try {
                            // Пытаемся сохранить без изображений
                            const stateWithoutImagesJSON = JSON.stringify(appStateWithoutImages);
                            localStorage.setItem(this.STORAGE_KEY, stateWithoutImagesJSON);
                            this.lastSavedState = stateWithoutImagesJSON;
                            
                            // Выводим предупреждение в консоль
                            console.warn('Превышен лимит хранилища. Изображения были удалены из сохраненного состояния.');
                        } catch (finalError) {
                            // Если даже без изображений не получается сохранить
                            console.error('Не удалось сохранить состояние даже без изображений:', finalError);
                        }
                    } else {
                        // Другая ошибка при сохранении
                        console.error('Ошибка при сохранении состояния:', storageError);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка при подготовке состояния для сохранения:', error);
            return false;
        }
    },
    
    // Функция для загрузки всего состояния приложения
    loadAppState: function() {
        if (!this.init()) return false;
        
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) {
                // Сохраненное состояние не найдено
                return false;
            }
            
            const appState = JSON.parse(savedState);
            this.lastSavedState = savedState; // Запоминаем загруженное состояние
            
            // Загружаем пузырьки
            if (appState.bubbles && Array.isArray(appState.bubbles)) {
                // Очищаем существующие пузырьки
                while (window.bubblesContainer.firstChild) {
                    window.bubblesContainer.removeChild(window.bubblesContainer.firstChild);
                }
                window.bubbles = [];
                
                // Создаем пузырьки из сохраненных данных
                appState.bubbles.forEach(bubbleData => {
                    const shape = bubbleData.shape || 'circle';
                    
                    window.createBubble(
                        bubbleData.x,
                        bubbleData.y,
                        false, // без анимации
                        bubbleData.text,
                        bubbleData.id,
                        bubbleData.size,
                        bubbleData.color,
                        false, // не выбирать автоматически
                        shape,
                        bubbleData.imageData
                    );
                });
            }
            
            // Загружаем соединения
            if (appState.connections && Array.isArray(appState.connections)) {
                // Очищаем существующие соединения
                window.connections.forEach(conn => {
                    if (conn.line && conn.line.parentNode) {
                        conn.line.parentNode.removeChild(conn.line);
                    }
                });
                window.connections = [];
                
                // Создаем соединения из сохраненных данных
                let createdConnections = 0;
                appState.connections.forEach(connData => {
                    const bubble1 = document.querySelector(`.bubble[data-id="${connData.bubble1Id}"]`);
                    const bubble2 = document.querySelector(`.bubble[data-id="${connData.bubble2Id}"]`);
                    if (bubble1 && bubble2) {
                        window.createConnection(bubble1, bubble2);
                        createdConnections++;
                    }
                });
                
                // Проверяем, что все соединения видимы и в DOM
                window.connections.forEach(conn => {
                    if (conn && conn.line && !conn.line.parentNode) {
                        window.bubblesContainer.appendChild(conn.line);
                    }
                });
                
                // Только одно обновление сразу после загрузки
                if (typeof window.updateAllConnectionLines === 'function') {
                    window.updateAllConnectionLines();
                }
                
                // Только одно дополнительное обновление с небольшой задержкой
                setTimeout(() => {
                    if (typeof window.updateAllConnectionLines === 'function') {
                        window.updateAllConnectionLines();
                    }
                }, 300);
                
                // Сохраняем информацию о количестве созданных соединений
                if (createdConnections > 0) {
                    // Created connections during app state load
                } else {
                    // No connections were created during app state load
                }
            }
            
            // Загружаем состояние viewport
            if (appState.viewport) {
                window.scale = appState.viewport.scale || 1;
                window.offset = appState.viewport.offset || { x: 0, y: 0 };
                
                // Применяем трансформацию
                window.bubblesContainer.style.transform = `translate(${window.offset.x}px, ${window.offset.y}px) scale(${window.scale})`;
            }
            
            return true;
        } catch (error) {
            // Ошибка при загрузке состояния
            return false;
        }
    },
    
    // Функция для очистки всего состояния приложения
    clearAppState: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        // Состояние приложения очищено
    },
    
    // Функция для запуска автосохранения
    startAutoSave: function() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        const self = this;
        this.autoSaveTimer = setInterval(function() {
            self.saveAppState();
        }, this.AUTO_SAVE_INTERVAL);
        
        // Также сохраняем состояние при закрытии страницы
        const saveBeforeUnload = function() {
            self.saveAppState();
        };
        window.addEventListener('beforeunload', saveBeforeUnload);
    },
    
    // Функция для остановки автосохранения
    stopAutoSave: function() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            // Автосохранение остановлено
        }
    }
};

// Экспортируем функции для использования в основном скрипте
window.saveAppState = function() { return MindMapState.saveAppState(); };
window.loadAppState = function() { return MindMapState.loadAppState(); };
window.clearAppState = function() { return MindMapState.clearAppState(); };
window.startAutoSave = function() { return MindMapState.startAutoSave(); };
window.stopAutoSave = function() { return MindMapState.stopAutoSave(); };

// Функции для обратной совместимости
window.saveBubblesState = window.saveAppState;
window.saveConnectionsState = window.saveAppState;
window.saveViewportState = window.saveAppState;
