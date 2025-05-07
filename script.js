// Добавляем стили для предотвращения мигания черного экрана
document.documentElement.style.backgroundColor = '#000000';
document.documentElement.style.visibility = 'visible';
document.documentElement.style.transition = 'none';

document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем основные переменные и элементы
    
    const bubblesContainer = document.getElementById('bubbles-container');
    const container = document.getElementById('container');
    const resetButton = document.getElementById('reset-button');
    const trashButton = document.getElementById('trash-button');
    const aiButton = document.getElementById('ai-button');
    const shapeButton = document.getElementById('shape-button');
    
    // Инициализация анимаций для кнопки сброса
    const resetIcon = resetButton.querySelector('.reset-icon');
    const circularArrow = resetIcon.querySelector('.circular-arrow');
    
    // Сбрасываем стили анимации при загрузке страницы
    circularArrow.style.animation = 'none';
    circularArrow.offsetHeight; // Вызываем reflow для сброса анимации
    circularArrow.style.animation = '';
    
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Инициализация приложения Bubbles завершена
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // Проверка мобильного устройства завершена
    
    let bubbles = [];
    
    // Initialize zoom variables
    let scale = 1;
    let zoomPoint = { x: 0, y: 0 };
    let offset = { x: 0, y: 0 };
    let isPanning = false;
    let lastPanPoint = { x: 0, y: 0 };
    let hasMoved = false; // Track if mouse has moved during mousedown
    let mouseButton = 0; // Track which mouse button is pressed
    let isRightMouseDown = false; // Track if right mouse button is down
    let rightMouseStartTarget = null; // Track where the right mouse button was pressed
    let isShiftPressed = false; // Track if Shift key is pressed
    let selectedBubbles = []; // Array to store multiple selected bubbles
    let currentDraggedBubble = null; // Текущий перетаскиваемый пузырек
    let isOverTrash = false; // Глобальная переменная для отслеживания нахождения над мусорным ведром
    let connections = []; // Массив для хранения соединений между кругами
    let startBubble = null; // Начальный круг для создания соединения
    let tempLine = null; // Временная линия при создании соединения
    
    // Global variables for tracking state
    let selectedBubble = null;
    let selectedConnection = null;
    let isDragging = false;
    let startPanX, startPanY;
    let lastPanX = 0, lastPanY = 0;
    let isImageEditMode = false; // Global variable for image edit mode
    let activeEditingBubble = null;
    // Global variable for shape mode (circle or square)
    let shapeMode = localStorage.getItem('shapeMode') || 'circle';
    
    // Add random color to footer links on hover
    const footerLinks = document.querySelectorAll('.page-footer a');
    footerLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            const randomColor = getRandomColor();
            link.style.setProperty('--random-color', randomColor);
        });
    });
    
    // Add random color to reset button on hover
    resetButton.addEventListener('mouseenter', () => {
        const randomColor = getRandomColor();
        resetButton.style.setProperty('--random-color', randomColor);
    });
    
    // Add mouse wheel zoom functionality
    container.addEventListener('wheel', handleZoom);
    
    // Add panning functionality
    container.addEventListener('mousedown', startPanning);
    document.addEventListener('mousemove', movePanning);
    document.addEventListener('mouseup', endPanning);
    
    // Add click handler to exit image edit mode when clicking on empty space
    container.addEventListener('click', (e) => {
        // Only handle clicks on the container or bubbles container, not on bubbles or other elements
        if ((e.target === container || e.target === bubblesContainer) && 
            !e.target.closest('.bubble') && 
            !e.target.closest('.page-footer')) {
            
            // If we have a bubble in image edit mode, exit that mode
            if (isImageEditMode && selectedBubble) {
                isImageEditMode = false;
                toggleImageEditMode(selectedBubble, false);
                
                // Also deselect the bubble
                if (selectedBubble) {
                    selectedBubble.classList.remove('selected');
                    // Restore original color
                    const originalColor = selectedBubble.dataset.originalColor;
                    selectedBubble.style.borderColor = originalColor;
                    selectedBubble.style.boxShadow = `0 0 15px ${originalColor}`;
                    selectedBubble = null;
                }
                
                // Clear selected bubbles array
                selectedBubbles = [];
            }
        }
    });
    
    initializeBubbles();
    
    resetButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the container click event
        resetAllBubbles();
    });
    
    // Remove the click event listener and use mouseup instead
    // container.addEventListener('click', (e) => {
    //     // Only create bubbles if we're not panning
    //     if (!isPanning && 
    //         (e.target === container || e.target === bubblesContainer) && 
    //         !e.target.closest('.page-footer')) {
            
    //         // Calculate position based on current zoom level
    //         const rect = container.getBoundingClientRect();
    //         const mouseX = e.clientX - rect.left;
    //         const mouseY = e.clientY - rect.top;
            
    //         // Convert screen coordinates to zoomed space coordinates
    //         const zoomedX = (mouseX - offset.x) / scale;
    //         const zoomedY = (mouseY - offset.y) / scale;
            
    //         // Create bubble at the zoomed coordinates
    //         const newBubble = createBubble(zoomedX - 75, zoomedY - 75, true);
            
    //         saveBubblesState();
    //     }
    // });
    
    document.addEventListener('touchmove', (e) => {
        if (e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }, { passive: false });
    
    if (isMobile) {
        document.addEventListener('touchend', handleTouchEvents);
    }
    
    let lastTap = 0;
    let touchStartTime = 0;
    let touchHoldTimer = null;
    
    function handleTouchEvents(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        const touchElement = document.elementFromPoint(
            e.changedTouches[0].clientX,
            e.changedTouches[0].clientY
        );
        
        if (tapLength < 500 && tapLength > 0) {
            if (touchElement.closest('.bubble')) {
                const bubble = touchElement.closest('.bubble');
                const textArea = bubble.querySelector('.bubble-text');
                
                if (textArea) {
                    bubble.classList.add('editing');
                    textArea.style.display = 'block';
                    textArea.focus();
                    
                    if (textArea.value) {
                        const length = textArea.value.length;
                        textArea.setSelectionRange(length, length);
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
        
        lastTap = currentTime;
    }
    
    // Отслеживаем нажатие правой кнопки мыши на всем документе
    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            isRightMouseDown = true;
            rightMouseStartTarget = e.target;
        }
    });
    
    // Отслеживаем отпускание правой кнопки мыши на всем документе
    document.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isRightMouseDown = false;
            rightMouseStartTarget = null;
        }
    });
    
    // Инициализация режима формы
    // Флаг для блокировки автообновления кнопки во время анимации
    let isShapeButtonChanging = false;
    
    // Инициализируем режим формы
    if (shapeMode === 'square') {
        shapeButton.classList.add('square-mode');
    } else {
        shapeButton.classList.add('circle-mode');
        shapeMode = 'circle'; // На случай, если в localStorage было некорректное значение
    }
    
    function initializeBubbles() {
        // Проверяем, используется ли новый механизм сохранения состояния
        const savedMindMapState = localStorage.getItem('mindmap_state');
        
        // Если есть новое состояние, используем его
        if (savedMindMapState) {
            // Не делаем ничего, так как загрузка будет выполнена через loadAppState
            return;
        }
        
        // Иначе используем старый механизм сохранения
        bubblesContainer.innerHTML = '';
        bubbles = [];
        connections = []; // Очищаем соединения
        
        const savedData = localStorage.getItem('bubblesData');
        const savedConnections = localStorage.getItem('connectionsData');
        
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    // Загружаем пузырьки из сохраненных данных
                    parsedData.forEach(bubbleData => {
                        createBubble(
                            bubbleData.x,
                            bubbleData.y,
                            false, // Без анимации при загрузке
                            bubbleData.text,
                            bubbleData.id,
                            bubbleData.size || 150,
                            bubbleData.color,
                            false, // Не делаем выбранным
                            bubbleData.shape, // Используем сохраненную форму
                            bubbleData.imageData // Загружаем данные изображения, если они есть
                        );
                    });
                    
                    // Переносим данные в новый формат хранения
                    setTimeout(() => {
                        if (typeof window.saveAppState === 'function') {
                            window.saveAppState();
                            // Удаляем старые данные после успешного сохранения
                            localStorage.removeItem('bubblesData');
                            localStorage.removeItem('connectionsData');
                        }
                    }, 500);
                } else {
                    // Просто инициализируем пустой массив, но не сохраняем
                    bubbles = [];
                }
            } catch (error) {
                // Ошибка при загрузке данных
                console.error('Ошибка при загрузке данных пузырьков:', error);
            }
        } else {
            // Если данных нет, просто инициализируем пустой массив
            bubbles = [];
        }
        
        // Загружаем соединения после загрузки пузырьков
        if (savedConnections) {
            try {
                const parsedConnections = JSON.parse(savedConnections);
                if (Array.isArray(parsedConnections) && parsedConnections.length > 0) {
                    loadSavedConnections(parsedConnections);
                }
            } catch (error) {
                // Ошибка при загрузке соединений
                console.error('Ошибка при загрузке соединений:', error);
            }
        }
    }
    
    function loadSavedConnections(data) {
        connections = [];
        
        data.forEach(conn => {
            const bubble1 = document.querySelector(`.bubble[data-id="${conn.bubble1Id}"]`);
            const bubble2 = document.querySelector(`.bubble[data-id="${conn.bubble2Id}"]`);
            
            if (bubble1 && bubble2) {
                createConnection(bubble1, bubble2);
            }
        });
    }
    
    function resetAllBubbles() {
        // Add popping animation to all bubbles before clearing
        const allBubbles = document.querySelectorAll('.bubble');
        
        if (allBubbles.length > 0) {
            // Add popping animation to all connections at the same time as the bubbles
            connections.forEach(conn => {
                if (conn.line) {
                    conn.line.classList.add('popping');
                }
            });
            
            // Add popping class to all bubbles
            allBubbles.forEach(bubble => {
                // Disable text area
                const textArea = bubble.querySelector('.bubble-text');
                if (textArea) {
                    textArea.disabled = true;
                    textArea.style.pointerEvents = 'none';
                    textArea.style.display = 'none';
                }
                
                bubble.classList.add('popping');
                bubble.style.pointerEvents = 'none';
            });
            
            // Create an animation function to update all connections during the bubble animations
            let animationFrame;
            const updateDuringAnimation = () => {
                // Update all connections
                updateAllConnectionLines();
                
                // Continue the animation until the bubbles are removed
                animationFrame = requestAnimationFrame(updateDuringAnimation);
            };
            
            // Start the animation updates
            animationFrame = requestAnimationFrame(updateDuringAnimation);
            
            // Clear after animation completes
            setTimeout(() => {
                // Stop updating the connections
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                bubblesContainer.innerHTML = '';
                bubbles = [];
                connections = [];
                
                // Reset zoom
                scale = 1;
                offset = { x: 0, y: 0 };
                bubblesContainer.style.transform = '';
                
                // Save empty state
                saveBubblesState();
                saveConnectionsState();
            }, 400); // Duration of the pop animation
        } else {
            // If no bubbles, just clear everything
            bubblesContainer.innerHTML = '';
            bubbles = [];
            connections = [];
            
            // Reset zoom
            scale = 1;
            offset = { x: 0, y: 0 };
            bubblesContainer.style.transform = '';
            
            // Save empty state
            saveBubblesState();
            saveConnectionsState();
        }
    }
    
    // Function to compress an image and return a promise with the compressed data URL
    function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                // Create a canvas to draw the compressed image
                const canvas = document.createElement('canvas');
                
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw the image on the canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get the compressed data URL
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image for compression'));
            };
            
            img.src = dataUrl;
        });
    }
    
    // Function to save bubbles state with compressed images
    async function saveBubblesState() {
        try {
            // Create a copy of bubbles with compressed images
            const bubblesToSave = [];
            
            for (const bubble of bubbles) {
                const bubbleCopy = {...bubble};
                
                // Compress image if present
                if (bubbleCopy.imageData && bubbleCopy.imageData.src) {
                    try {
                        bubbleCopy.imageData.src = await compressImage(bubbleCopy.imageData.src);
                    } catch (compressionError) {
                        // Failed to compress image, using original
                    }
                }
                
                bubblesToSave.push(bubbleCopy);
            }
            
            // Try to save with compressed images
            localStorage.setItem('bubblesData', JSON.stringify(bubblesToSave));
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                // Storage quota exceeded even with compressed images. Saving without images.
                
                // Create a copy without any image data
                const bubblesWithoutImages = bubbles.map(bubble => {
                    const bubbleCopy = {...bubble};
                    if (bubbleCopy.imageData) {
                        // Just keep a flag that there was an image
                        bubbleCopy.imageData = { hasImage: true };
                    }
                    return bubbleCopy;
                });
                
                try {
                    localStorage.setItem('bubblesData', JSON.stringify(bubblesWithoutImages));
                } catch (innerError) {
                    // Failed to save bubble data even without images
                }
            } else {
                // Error saving bubble data
            }
        }
    }
    
    function saveConnectionsState() {
        const connectionsData = connections.map(conn => ({
            bubble1Id: conn.bubble1.dataset.id,
            bubble2Id: conn.bubble2.dataset.id
        }));
        localStorage.setItem('connectionsData', JSON.stringify(connectionsData));
    }
    
    // Функция для проверки наложения кругов и корректировки позиции нового круга
    function findNonOverlappingPosition(x, y, size) {
        const allBubbles = document.querySelectorAll('.bubble');
        if (allBubbles.length === 0) return { x, y }; // Если нет других кругов, возвращаем исходную позицию
        
        const radius = size / 2;
        const minDistance = radius * 2 + 20; // Минимальное расстояние между центрами кругов (диаметр + отступ)
        let newX = x;
        let newY = y;
        
        // Проверяем, есть ли наложение с другими кругами
        let hasOverlap = true;
        let attempts = 0;
        const maxAttempts = 20; // Максимальное количество попыток найти свободное место
        
        // Спиральный алгоритм поиска свободного места
        let angle = 0;
        let distance = minDistance;
        
        while (hasOverlap && attempts < maxAttempts) {
            hasOverlap = false;
            
            // Проверяем наложение на все существующие круги
            for (const existingBubble of allBubbles) {
                const existingX = parseFloat(existingBubble.style.left) + parseFloat(existingBubble.style.width) / 2;
                const existingY = parseFloat(existingBubble.style.top) + parseFloat(existingBubble.style.height) / 2;
                
                const dx = newX + radius - existingX;
                const dy = newY + radius - existingY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const existingRadius = parseFloat(existingBubble.style.width) / 2;
                
                // Если круги перекрываются
                if (distance < (radius + existingRadius + 20)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            // Если нашли наложение, пробуем новую позицию
            if (hasOverlap) {
                // Увеличиваем угол для спирального поиска
                angle += Math.PI / 4;
                // Увеличиваем расстояние для спирали
                distance = minDistance * (1 + attempts / 5);
                
                // Вычисляем новую позицию по спирали
                newX = x + Math.cos(angle) * distance - radius;
                newY = y + Math.sin(angle) * distance - radius;
                
                attempts++;
            }
        }
        
        return { x: newX, y: newY };
    }
    
    function createBubble(x, y, withAnimation = false, text = '', id = null, size = 150, color = null, makeSelected = true, shape = null, imageData = null) {
        // Находим позицию без наложений
        const position = findNonOverlappingPosition(x, y, size);
        x = position.x;
        y = position.y;
        
        const bubbleId = id || 'bubble_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.dataset.id = bubbleId;
        
        // Store the original size and position in the bubble's dataset
        bubble.dataset.originalSize = size.toString();
        
        // Устанавливаем форму элемента (круг или квадрат)
        const elementShape = shape || shapeMode; // Используем переданную форму или текущий режим
        if (elementShape === 'square') {
            bubble.classList.add('square');
        }
        
        // Set the bubble size
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // Generate random color for bubble outline or use saved color
        const randomColor = color || getRandomColor();
        bubble.style.borderColor = randomColor;
        bubble.style.boxShadow = `0 0 15px ${randomColor}`;
        
        // Сохраняем оригинальный цвет пузырька в атрибуте
        bubble.dataset.originalColor = randomColor;
        
        if (withAnimation) {
            bubble.classList.add('appearing');
            
            // Сохраняем время начала анимации для корректного расчета прогресса
            bubble.dataset.appearingStartTime = Date.now();
            
            // Create sparkles effect
            createSparkles(x + size/2, y + size/2, randomColor, size);
            
            // Создаем функцию для анимации линий при создании круга
            let animationFrame;
            const updateDuringCreationAnimation = () => {
                // Находим все соединения, связанные с этим пузырьком
                const relatedConnections = connections.filter(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
                
                // Обновляем положение линий
                relatedConnections.forEach(conn => {
                    updateConnectionLine(conn);
                });
                
                // Продолжаем анимацию, пока она активна
                if (bubble.classList.contains('appearing')) {
                    animationFrame = requestAnimationFrame(updateDuringCreationAnimation);
                } else {
                    // Останавливаем анимацию, когда класс appearing удален
                    cancelAnimationFrame(animationFrame);
                }
            };
            
            // Запускаем анимацию
            animationFrame = requestAnimationFrame(updateDuringCreationAnimation);
            
            setTimeout(() => {
                bubble.classList.remove('appearing');
            }, 500);
        }
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'bubble-image-container';
        bubble.appendChild(imageContainer);
        
        // Create textarea for text
        const textArea = document.createElement('textarea');
        textArea.className = 'bubble-text';
        textArea.placeholder = '';
        textArea.value = text || '';
        textArea.spellcheck = false;
        bubble.appendChild(textArea);
        
        // Create paperclip icon for image upload
        const paperclipIcon = document.createElement('div');
        paperclipIcon.className = 'paperclip-icon';
        paperclipIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
        `;
        bubble.appendChild(paperclipIcon);
        
        // Create image remove button
        const imageRemoveButton = document.createElement('div');
        imageRemoveButton.className = 'image-remove-button';
        bubble.appendChild(imageRemoveButton);
        
        // Create hidden file input for image upload
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.className = 'image-upload-input';
        imageInput.id = `image-upload-${bubbleId}`;
        bubble.appendChild(imageInput);
        
        // If we have image data, set it up
        if (imageData && imageData.src) {
            setImageToBubble(bubble, imageData);
            
            // Hide the text area and paperclip when bubble has an image
            textArea.style.display = 'none';
            if (paperclipIcon) {
                paperclipIcon.style.display = 'none';
            }
        }
        
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        
        bubblesContainer.appendChild(bubble);
        
        setupBubbleEvents(bubble, textArea, bubbleId, randomColor, imageInput, paperclipIcon);
        
        const bubbleData = {
            id: bubbleId,
            x: x,
            y: y,
            text: text || '',
            size: size,
            color: randomColor, // Сохраняем цвет пузырька
            shape: elementShape, // Сохраняем форму элемента
            imageData: imageData // Сохраняем данные изображения, если они есть
        };
        
        bubbles.push(bubbleData);
        
        if (text) {
            updateBubbleSize(bubble, textArea, text);
            
            // Hide paperclip if text is present
            if (paperclipIcon) {
                paperclipIcon.style.display = 'none';
            }
        }
        
        // Если передан параметр makeSelected, делаем новый пузырек выбранным
        if (makeSelected) {
            // Снимаем выделение с предыдущего выбранного пузырька
            if (selectedBubble) {
                selectedBubble.classList.remove('selected');
                // Восстанавливаем оригинальный цвет предыдущего выбранного пузырька
                const originalColor = selectedBubble.dataset.originalColor;
                selectedBubble.style.borderColor = originalColor;
                selectedBubble.style.boxShadow = `0 0 15px ${originalColor}`;
            }
            selectedBubble = bubble;
            bubble.classList.add('selected');
            // Используем оригинальный цвет пузырька для выделения
            const originalColor = bubble.dataset.originalColor;
            bubble.style.borderColor = originalColor;
            // Создаем более яркую версию того же цвета для эффекта свечения
            bubble.style.boxShadow = `0 0 30px ${originalColor}, 0 0 50px ${originalColor}`;
            
            // Обновляем кнопку формы в зависимости от формы выбранного пузырька
            updateShapeButtonBasedOnSelectedBubble(bubble);
        }
        
        return bubble;
    }
    
    // Глобальный флаг для блокировки всех взаимодействий с пузырьками во время удаления
    let isGlobalDeleting = false;

    // Function to set image to bubble
    function setImageToBubble(bubble, imageData) {
        // Add has-image class to bubble
        bubble.classList.add('has-image');
        
        // Get the image container
        const imageContainer = bubble.querySelector('.bubble-image-container');
        if (!imageContainer) return;
        
        // Clear any existing image
        imageContainer.innerHTML = '';
        
        // Create image element
        const img = document.createElement('img');
        img.className = 'bubble-image';
        img.src = imageData.src;
        
        // Set image position and dimensions
        const bubbleWidth = parseFloat(bubble.style.width);
        const bubbleHeight = parseFloat(bubble.style.height);
        
        // Calculate dimensions to maintain aspect ratio
        const imgWidth = imageData.width;
        const imgHeight = imageData.height;
        
        // Determine which dimension to fit to the bubble
        let newWidth, newHeight, left, top;
        
        if (imgWidth / imgHeight > bubbleWidth / bubbleHeight) {
            // Image is wider than bubble (relative to height)
            newHeight = bubbleHeight;
            newWidth = (imgWidth / imgHeight) * newHeight;
            left = imageData.left !== undefined ? imageData.left : (bubbleWidth - newWidth) / 2;
            top = 0;
        } else {
            // Image is taller than bubble (relative to width)
            newWidth = bubbleWidth;
            newHeight = (imgHeight / imgWidth) * newWidth;
            left = 0;
            top = imageData.top !== undefined ? imageData.top : (bubbleHeight - newHeight) / 2;
        }
        
        // Apply styles
        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
        img.style.left = `${left}px`;
        img.style.top = `${top}px`;
        
        // Store original dimensions and position
        img.dataset.originalWidth = imgWidth;
        img.dataset.originalHeight = imgHeight;
        
        // Add image to container
        imageContainer.appendChild(img);
        
        // Get the bubble ID
        const bubbleId = bubble.dataset.id;
        
        // Update bubble data
        const bubbleData = bubbles.find(b => b.id === bubbleId);
        if (bubbleData) {
            bubbleData.imageData = {
                src: imageData.src,
                width: imgWidth,
                height: imgHeight,
                left: left,
                top: top
            };
            saveBubblesState();
        }
    }
    
    // Function to remove image from bubble
    function removeImageFromBubble(bubble, bubbleId) {
        // Remove has-image class
        bubble.classList.remove('has-image');
        
        // Clear image container
        const imageContainer = bubble.querySelector('.bubble-image-container');
        if (imageContainer) {
            imageContainer.innerHTML = '';
        }
        
        // Exit image edit mode if active
        if (bubble.classList.contains('image-edit-mode')) {
            bubble.classList.remove('image-edit-mode');
        }
        
        // Show the paperclip icon again
        const paperclipIcon = bubble.querySelector('.paperclip-icon');
        if (paperclipIcon) {
            paperclipIcon.style.display = 'flex';
        }
        
        // Show the text area again
        const textArea = bubble.querySelector('.bubble-text');
        if (textArea) {
            textArea.style.display = 'flex';
        }
        
        // Update bubble data
        const bubbleData = bubbles.find(b => b.id === bubbleId);
        if (bubbleData) {
            bubbleData.imageData = null;
            saveBubblesState();
        }
    }
    
    // Function to handle image upload
    function handleImageUpload(file, bubble) {
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Get the bubble ID
                const bubbleId = bubble.dataset.id;
                
                // Clear any existing text
                const textArea = bubble.querySelector('.bubble-text');
                if (textArea) {
                    textArea.value = '';
                    textArea.style.display = 'none';
                    
                    // Update bubble data to clear text
                    const bubbleData = bubbles.find(b => b.id === bubbleId);
                    if (bubbleData) {
                        bubbleData.text = '';
                    }
                }
                
                // Hide paperclip
                const paperclip = bubble.querySelector('.paperclip-icon');
                if (paperclip) {
                    paperclip.style.display = 'none';
                }
                
                setImageToBubble(bubble, {
                    src: e.target.result,
                    width: img.width,
                    height: img.height,
                    left: 0,
                    top: 0
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // Function to toggle image edit mode
    function toggleImageEditMode(bubble, enable) {
        if (enable) {
            bubble.classList.add('image-edit-mode');
            bubble.style.cursor = 'move';
            const img = bubble.querySelector('.bubble-image');
            if (img) {
                img.style.pointerEvents = 'auto';
            }
        } else {
            bubble.classList.remove('image-edit-mode');
            bubble.style.cursor = 'default';
            const img = bubble.querySelector('.bubble-image');
            if (img) {
                img.style.pointerEvents = 'none';
            }
        }
    }
    
    function setupBubbleEvents(bubble, textArea, bubbleId, bubbleColor, imageInput, paperclipIcon) {
        // Get the image remove button
        const imageRemoveButton = bubble.querySelector('.image-remove-button');
        
        // Add event listener for image remove button
        if (imageRemoveButton) {
            imageRemoveButton.addEventListener('click', (e) => {
                e.stopPropagation();
                removeImageFromBubble(bubble, bubbleId);
            });
        }
        let isMoving = false;
        let isEditing = false;
        let imageMoving = false;
        
        // Add event listener for paperclip icon
        paperclipIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Check if bubble already has text content
            if (textArea.value.trim()) {
                // Don't allow image upload if there's text
                alert('Cannot add an image to a bubble with text. Please clear the text first.');
                return;
            }
            
            // Trigger file input click
            imageInput.click();
        });
        
        // Add event listener for image upload
        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0], bubble);
            }
        });
        
        bubble.addEventListener('mousedown', (e) => {
            // Если идет процесс удаления, игнорируем все клики на пузырьки
            if (isGlobalDeleting) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            if (e.button === 0) { // Левая кнопка мыши
                // Check if we're in image edit mode and the bubble is selected
                if (isImageEditMode && bubble.classList.contains('has-image') && bubble === selectedBubble) {
                    // We're moving the image within the bubble
                    const img = bubble.querySelector('.bubble-image');
                    if (!img) return;
                    
                    imageMoving = true;
                    
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const imgLeft = parseFloat(img.style.left);
                    const imgTop = parseFloat(img.style.top);
                    const imgWidth = parseFloat(img.style.width);
                    const imgHeight = parseFloat(img.style.height);
                    const bubbleWidth = parseFloat(bubble.style.width);
                    const bubbleHeight = parseFloat(bubble.style.height);
                    
                    // Determine which dimension to fit to the bubble
                    const isWidthConstrained = imgWidth > bubbleWidth;
                    const isHeightConstrained = imgHeight > bubbleHeight;
                    
                    const mouseMoveHandler = (moveEvent) => {
                        if (imageMoving) {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaY = moveEvent.clientY - startY;
                            
                            // Apply movement constraints based on which dimension is constrained
                            let newLeft = imgLeft;
                            let newTop = imgTop;
                            
                            if (isWidthConstrained && !isHeightConstrained) {
                                // Only allow horizontal movement
                                newLeft = imgLeft + deltaX / scale;
                                
                                // Constrain horizontal movement
                                if (newLeft > 0) newLeft = 0;
                                if (newLeft < bubbleWidth - imgWidth) newLeft = bubbleWidth - imgWidth;
                            } else if (!isWidthConstrained && isHeightConstrained) {
                                // Only allow vertical movement
                                newTop = imgTop + deltaY / scale;
                                
                                // Constrain vertical movement
                                if (newTop > 0) newTop = 0;
                                if (newTop < bubbleHeight - imgHeight) newTop = bubbleHeight - imgHeight;
                            }
                            
                            // Apply the new position
                            img.style.left = `${newLeft}px`;
                            img.style.top = `${newTop}px`;
                            
                            // Update bubble data
                            const bubbleData = bubbles.find(b => b.id === bubbleId);
                            if (bubbleData && bubbleData.imageData) {
                                bubbleData.imageData.left = newLeft;
                                bubbleData.imageData.top = newTop;
                            }
                        }
                    };
                    
                    const mouseUpHandler = () => {
                        document.removeEventListener('mousemove', mouseMoveHandler);
                        document.removeEventListener('mouseup', mouseUpHandler);
                        imageMoving = false;
                        saveBubblesState();
                    };
                    
                    document.addEventListener('mousemove', mouseMoveHandler);
                    document.addEventListener('mouseup', mouseUpHandler);
                    
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                // Устанавливаем текущий перетаскиваемый пузырек
                currentDraggedBubble = bubble;
                
                const startX = e.clientX;
                const startY = e.clientY;
                const bubbleX = parseFloat(bubble.style.left);
                const bubbleY = parseFloat(bubble.style.top);
                
                let moved = false;
                let lastMouseX = startX;
                let lastMouseY = startY;
                
                const mouseMoveHandler = (moveEvent) => {
                    if (Math.abs(moveEvent.clientX - startX) > 5 || Math.abs(moveEvent.clientY - startY) > 5) {
                        moved = true;
                        isMoving = true;
                        
                        bubble.classList.add('dragging');
                        
                        // Calculate the movement delta based on the last mouse position
                        const deltaX = moveEvent.clientX - lastMouseX;
                        const deltaY = moveEvent.clientY - lastMouseY;
                        
                        // Update last mouse position
                        lastMouseX = moveEvent.clientX;
                        lastMouseY = moveEvent.clientY;
                        
                        // Convert the delta to the zoomed space
                        const zoomedDeltaX = deltaX / scale;
                        const zoomedDeltaY = deltaY / scale;
                        
                        // Apply the zoomed delta to the bubble position
                        // No need for magnetic slowdown here, we'll use the visual effect instead
                        const newX = parseFloat(bubble.style.left) + zoomedDeltaX;
                        const newY = parseFloat(bubble.style.top) + zoomedDeltaY;
                        
                        bubble.style.left = `${newX}px`;
                        bubble.style.top = `${newY}px`;
                        
                        updateBubblePosition(bubbleId, newX, newY);
                        
                        // Update all connections related to this bubble
                        updateConnectionsForBubble(bubble);
                        
                        // Проверяем, находится ли пузырек над мусорным ведром
                        checkTrashCollision(moveEvent.clientX, moveEvent.clientY, bubble);
                    }
                };
                
                const mouseUpHandler = () => {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                    
                    if (isMoving) {
                        isMoving = false;
                        bubble.classList.remove('dragging');
                        bubble.classList.remove('shrinking');
                        
                        // Если пузырек был отпущен над мусорным ведром, удаляем его
                        if (isOverTrash) {
                            // Удаляем пузырек
                            popBubble();
                            
                            // Reset trash button to blue
                            trashButton.classList.remove('active');
                            trashButton.style.borderColor = 'rgba(80, 150, 255, 0.8)';
                            trashButton.style.boxShadow = '0 0 15px rgba(80, 150, 255, 0.5)';
                            
                            // Reset SVG icon color
                            const svgElement = trashButton.querySelector('svg');
                            if (svgElement) {
                                svgElement.style.stroke = 'rgba(80, 150, 255, 0.8)';
                            }
                            
                            isOverTrash = false;
                        } else {
                            saveBubblesState();
                        }
                        
                        // Сбрасываем текущий перетаскиваемый пузырек
                        currentDraggedBubble = null;
                    } else if (!moved && !isEditing) {
                        // Если пузырек уже выбран, переходим в режим редактирования
                        if (selectedBubble === bubble) {
                            // Check if the bubble has an image
                            if (bubble.classList.contains('has-image')) {
                                // Enter image edit mode
                                isImageEditMode = true;
                                toggleImageEditMode(bubble, true);
                                return;
                            }
                            
                            // Если есть активный пузырек в режиме редактирования, выходим из него
                            if (activeEditingBubble) {
                                const activeTextArea = activeEditingBubble.querySelector('.bubble-text');
                                if (activeTextArea) {
                                    activeEditingBubble.classList.remove('editing');
                                    activeTextArea.blur();
                                }
                                // Если текущий пузырек не тот, который был в режиме редактирования,
                                // то сбрасываем activeEditingBubble
                                if (activeEditingBubble !== bubble) {
                                    activeEditingBubble = null;
                                }
                            }
                            
                            isEditing = true;
                            activeEditingBubble = bubble;
                            bubble.classList.add('editing');
                            textArea.style.display = 'block';
                            textArea.focus();
                            
                            // Установка курсора в конец текста
                            if (textArea.value) {
                                // Устанавливаем курсор в конец текста
                                const endPosition = textArea.value.length;
                                textArea.setSelectionRange(endPosition, endPosition);
                                
                                // Дополнительно прокручиваем текстовую область, чтобы курсор был виден
                                setTimeout(() => {
                                    textArea.scrollTop = textArea.scrollHeight;
                                }, 0);
                            } else {
                                // Если текста нет, просто фокусируемся на текстовой области
                                textArea.focus();
                            }
                        } else {
                            // Если пузырек не выбран, выбираем его
                            
                            // Если есть активный пузырек в режиме редактирования, выходим из него
                            if (activeEditingBubble) {
                                const activeTextArea = activeEditingBubble.querySelector('.bubble-text');
                                if (activeTextArea) {
                                    activeEditingBubble.classList.remove('editing');
                                    activeTextArea.blur();
                                }
                                activeEditingBubble = null;
                            }
                            
                            // Если нажата клавиша Shift, добавляем пузырек к выбранным или удаляем из выбранных
                            if (isShiftPressed) {
                                // Проверяем, выбран ли уже этот пузырек
                                const bubbleIndex = selectedBubbles.findIndex(b => b === bubble);
                                
                                if (bubbleIndex === -1) {
                                    // Добавляем пузырек к выбранным
                                    selectedBubbles.push(bubble);
                                    bubble.classList.add('selected');
                                    // Используем оригинальный цвет пузырька для выделения
                                    const originalColor = bubble.dataset.originalColor;
                                    bubble.style.borderColor = originalColor;
                                    // Создаем более яркую версию того же цвета для эффекта свечения
                                    bubble.style.boxShadow = `0 0 30px ${originalColor}, 0 0 50px ${originalColor}`;
                                } else {
                                    // Удаляем пузырек из выбранных
                                    selectedBubbles.splice(bubbleIndex, 1);
                                    bubble.classList.remove('selected');
                                    // Восстанавливаем оригинальный цвет
                                    const originalColor = bubble.dataset.originalColor;
                                    bubble.style.borderColor = originalColor;
                                    bubble.style.boxShadow = `0 0 15px ${originalColor}`;
                                }
                                
                                // Если есть хотя бы один выбранный пузырек, устанавливаем его как текущий выбранный
                                if (selectedBubbles.length > 0) {
                                    selectedBubble = selectedBubbles[selectedBubbles.length - 1];
                                    // Обновляем кнопку формы в зависимости от формы последнего выбранного пузырька
                                    updateShapeButtonBasedOnSelectedBubble(selectedBubble);
                                } else {
                                    selectedBubble = null;
                                }
                            } else {
                                // Стандартное поведение при клике без Shift - выбираем только один пузырек
                                
                                // Снимаем выделение со всех ранее выбранных пузырьков
                                selectedBubbles.forEach(b => {
                                    if (b !== bubble) {
                                        b.classList.remove('selected');
                                        const originalColor = b.dataset.originalColor;
                                        b.style.borderColor = originalColor;
                                        b.style.boxShadow = `0 0 15px ${originalColor}`;
                                    }
                                });
                                
                                // Очищаем массив выбранных пузырьков и добавляем только текущий
                                selectedBubbles = [bubble];
                                
                                // Выбираем текущий пузырек
                                selectedBubble = bubble;
                                bubble.classList.add('selected');
                                // Используем оригинальный цвет пузырька для выделения
                                const originalColor = bubble.dataset.originalColor;
                                bubble.style.borderColor = originalColor;
                                // Создаем более яркую версию того же цвета для эффекта свечения
                                bubble.style.boxShadow = `0 0 30px ${originalColor}, 0 0 50px ${originalColor}`;
                                
                                // Обновляем кнопку формы в зависимости от формы выбранного пузырька
                                updateShapeButtonBasedOnSelectedBubble(bubble);
                            }
                        }
                    }
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                
                e.preventDefault();
                e.stopPropagation();
            } else if (e.button === 2) { // Правая кнопка мыши
                e.preventDefault();
                e.stopPropagation();
                
                // Начинаем создание соединения
                startBubble = bubble;
                
                // Создаем временную линию
                tempLine = document.createElement('div');
                tempLine.className = 'connection-line';
                bubblesContainer.appendChild(tempLine);
                
                // Получаем цвет обводки начального пузырька
                const startColor = bubble.style.borderColor;
                
                // Обработчик движения мыши для отрисовки временной линии
                const mouseMoveHandler = (moveEvent) => {
                    if (startBubble) {
                        // Get container's bounding rect
                        const containerRect = bubblesContainer.getBoundingClientRect();
                        
                        // Calculate mouse position relative to the container in the unscaled coordinate system
                        const mouseX = (moveEvent.clientX - containerRect.left) / scale;
                        const mouseY = (moveEvent.clientY - containerRect.top) / scale;
                        
                        // Get start bubble's position from its style (in container's coordinate system)
                        const bubbleLeft = parseFloat(startBubble.style.left);
                        const bubbleTop = parseFloat(startBubble.style.top);
                        const bubbleWidth = parseFloat(startBubble.style.width);
                        const bubbleHeight = parseFloat(startBubble.style.height);
                        
                        // Calculate center of the start bubble
                        const startCenterX = bubbleLeft + bubbleWidth / 2;
                        const startCenterY = bubbleTop + bubbleHeight / 2;
                        
                        // Calculate radius
                        const radius = bubbleWidth / 2;
                        
                        // Calculate direction vector
                        const dx = mouseX - startCenterX;
                        const dy = mouseY - startCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            // Normalize direction vector
                            const nx = dx / distance;
                            const ny = dy / distance;
                            
                            // Calculate point on the edge of the bubble
                            const edgeX = startCenterX + nx * radius;
                            const edgeY = startCenterY + ny * radius;
                            
                            // Get bubble color
                            const startColor = startBubble.style.borderColor;
                            
                            // Draw the temporary line
                            if (tempLine) {
                                // Position the line in the same coordinate system as the bubbles
                                tempLine.style.position = 'absolute';
                                tempLine.style.zIndex = '5';
                                tempLine.style.pointerEvents = 'none';
                                
                                // Draw the line from the edge of the bubble to the mouse position
                                drawLine(tempLine, edgeX, edgeY, mouseX, mouseY, startColor, 'rgba(255, 255, 255, 0.5)');
                            }
                        }
                    }
                };
                
                // Обработчик отпускания мыши
                const mouseUpHandler = (upEvent) => {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                    
                    // Get container's bounding rect
                    const containerRect = bubblesContainer.getBoundingClientRect();
                    
                    // Проверяем, отпущена ли мышь над другим пузырьком
                    const targetElement = document.elementFromPoint(
                        upEvent.clientX,
                        upEvent.clientY
                    );
                    const targetBubble = targetElement ? targetElement.closest('.bubble') : null;
                    
                    if (targetBubble && targetBubble !== startBubble) {
                        // Проверяем, существует ли уже соединение между этими пузырьками
                        const existingConnection = connections.find(conn => 
                            (conn.bubble1 === startBubble && conn.bubble2 === targetBubble) || 
                            (conn.bubble1 === targetBubble && conn.bubble2 === startBubble)
                        );
                        
                        if (existingConnection) {
                            // Если соединение существует, удаляем его
                            removeConnection(existingConnection);
                        } else {
                            // Если соединения нет, создаем новое
                            createConnection(startBubble, targetBubble);
                        }
                    }
                    
                    // Удаляем временную линию
                    if (tempLine && tempLine.parentNode) {
                        tempLine.parentNode.removeChild(tempLine);
                    }
                    tempLine = null;
                    startBubble = null;
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            }
        });
        
        // Удаляем обработчики контекстного меню для редактирования текста
        bubble.removeEventListener('contextmenu', popBubble);
        textArea.removeEventListener('contextmenu', popBubble);
        
        // Предотвращаем стандартное контекстное меню
        bubble.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        textArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        textArea.addEventListener('input', () => {
            // Check if bubble has an image - if so, prevent text input
            if (bubble.classList.contains('has-image')) {
                textArea.value = '';
                alert('Cannot add text to a bubble with an image. Please remove the image first.');
                return;
            }
            
            // Hide paperclip if text is entered
            const paperclip = bubble.querySelector('.paperclip-icon');
            if (textArea.value.trim() && paperclip) {
                paperclip.style.display = 'none';
            } else if (paperclip) {
                paperclip.style.display = 'flex';
            }
            
            // Вызываем новую функцию адаптивного размера текста
            adaptTextToFitBubble(bubble, textArea);
            
            updateBubbleText(bubbleId, textArea.value);
            
            saveBubblesState();
        });
        
        textArea.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        textArea.addEventListener('blur', () => {
            if (isEditing) {
                isEditing = false;
                bubble.classList.remove('editing');
                activeEditingBubble = null;
                
                saveBubblesState();
            }
        });
        
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                isEditing = false;
                bubble.classList.remove('editing');
                textArea.blur();
                e.preventDefault();
                saveBubblesState();
            }
            
            if (e.key === 'Enter' && !e.shiftKey) {
                isEditing = false;
                bubble.classList.remove('editing');
                textArea.blur();
                e.preventDefault();
                saveBubblesState();
                
                // Снимаем выделение с пузырька при нажатии Enter
                if (selectedBubble === bubble) {
                    // Удаляем класс выделения
                    bubble.classList.remove('selected');
                    
                    // Восстанавливаем оригинальный цвет пузырька
                    const originalColor = bubble.dataset.originalColor;
                    if (originalColor) {
                        bubble.style.borderColor = originalColor;
                        bubble.style.boxShadow = `0 0 15px ${originalColor}`;
                    }
                    
                    // Удаляем из массива выделенных пузырьков
                    const index = selectedBubbles.indexOf(bubble);
                    if (index !== -1) {
                        selectedBubbles.splice(index, 1);
                    }
                    
                    // Сбрасываем выделенный пузырек
                    selectedBubble = null;
                }
            }
        });
    }
    
    function popBubble(callback) {
        if (currentDraggedBubble) {
            isEditing = false;
            
            // Запоминаем ID удаляемого пузырька для немедленного удаления из массива данных
            const bubbleIdToRemove = currentDraggedBubble.dataset.id;
            
            // Немедленно удаляем пузырек из массива данных
            removeBubble(bubbleIdToRemove);
            
            // Find all connections related to this bubble
            const relatedConnections = connections.filter(conn => 
                conn.bubble1 === currentDraggedBubble || conn.bubble2 === currentDraggedBubble
            );
            
            // Удаляем связи из массива данных
            connections = connections.filter(conn => {
                return !(conn.bubble1 === currentDraggedBubble || conn.bubble2 === currentDraggedBubble);
            });
            
            // Add popping animation to all related connections
            relatedConnections.forEach(conn => {
                if (conn.line) {
                    conn.line.classList.add('popping');
                }
            });
            
            // Немедленно сохраняем изменения в localStorage
            saveBubblesState();
            saveConnectionsState();
            
            const textArea = currentDraggedBubble.querySelector('.bubble-text');
            textArea.disabled = true;
            textArea.style.pointerEvents = 'none';
            textArea.style.display = 'none';
            
            currentDraggedBubble.classList.remove('editing');
            currentDraggedBubble.style.pointerEvents = 'none';
            
            // Add popping animation to connections at the same time as the bubble
            relatedConnections.forEach(conn => {
                if (conn.line) {
                    conn.line.classList.add('popping');
                }
            });
            
            // Add popping class to the bubble and track start time
            currentDraggedBubble.classList.add('popping');
            currentDraggedBubble.dataset.poppingStartTime = Date.now();
            
            // Create an animation function to update the connection lines during the bubble animation
            let animationFrame;
            const updateDuringAnimation = () => {
                // Update all connections related to this bubble
                relatedConnections.forEach(conn => {
                    updateConnectionLine(conn);
                });
                
                // Continue the animation until the bubble is removed
                animationFrame = requestAnimationFrame(updateDuringAnimation);
            };
            
            // Start the animation updates
            animationFrame = requestAnimationFrame(updateDuringAnimation);
            
            // Remove DOM-элементы после завершения анимации
            setTimeout(() => {
                // Stop updating the connections
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                // Remove connections DOM elements
                relatedConnections.forEach(conn => {
                    if (conn.line && conn.line.parentNode) {
                        conn.line.parentNode.removeChild(conn.line);
                    }
                });
                
                // Remove the bubble from DOM
                if (currentDraggedBubble.parentNode) {
                    currentDraggedBubble.remove();
                }
                
                // Вызываем callback, если он есть
                if (typeof callback === 'function') {
                    callback();
                }
            }, 400); // Duration of the pop animation
        }
    }
    
    // Новая функция для адаптивного размера текста в пузырьках
    function adaptTextToFitBubble(bubble, textArea) {
        // Получаем оригинальный размер пузырька
        const originalSize = parseFloat(bubble.dataset.originalSize);
        const bubbleSize = originalSize;
        
        // Устанавливаем размер пузырька
        bubble.style.width = `${bubbleSize}px`;
        bubble.style.height = `${bubbleSize}px`;
        
        // Устанавливаем размер текстовой области
        const textAreaSize = Math.floor(bubbleSize * 0.8); // Увеличиваем размер текстовой области
        textArea.style.width = textAreaSize + 'px';
        textArea.style.height = textAreaSize + 'px';
        
        // Получаем текст
        const text = textArea.value;
        
        // Базовый размер шрифта
        const baseFontSize = Math.floor(bubbleSize * 0.14);
        let fontSize = baseFontSize;
        
        // Создаем временный элемент для измерения размера текста
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        testElement.style.whiteSpace = 'nowrap';
        testElement.style.fontFamily = window.getComputedStyle(textArea).fontFamily;
        testElement.style.fontWeight = 'bold'; // Добавляем жирный шрифт для точного измерения
        testElement.style.padding = '0';
        document.body.appendChild(testElement);
        
        // Находим самое длинное слово в тексте
        const words = text.split(/\s+/);
        let longestWord = '';
        let totalLength = 0;
        
        for (const word of words) {
            if (word.length > longestWord.length) {
                longestWord = word;
            }
            totalLength += word.length;
        }
        
        // Также проверяем весь текст целиком, если он короткий
        if (text.length < 15 && words.length <= 2) {
            longestWord = text;
        }
        
        // Если есть слова, подбираем размер шрифта, чтобы вместить самое длинное слово
        if (longestWord) {
            // Начинаем с базового размера и уменьшаем, если не помещается
            testElement.style.fontSize = fontSize + 'px';
            testElement.textContent = longestWord;
            
            // Если длина слова больше чем доступная ширина, уменьшаем шрифт
            while (testElement.offsetWidth > textAreaSize * 0.85 && fontSize > 9) {
                fontSize--;
                testElement.style.fontSize = fontSize + 'px';
            }
            
            // Дополнительные корректировки в зависимости от общей длины текста
            const contentLength = text.length;
            
            // Более агрессивное уменьшение шрифта для длинных текстов
            if (contentLength > 15) {
                fontSize = Math.min(fontSize, baseFontSize * 0.8);
            }
            if (contentLength > 25) {
                fontSize = Math.min(fontSize, baseFontSize * 0.7);
            }
            if (contentLength > 40) {
                fontSize = Math.min(fontSize, baseFontSize * 0.6);
            }
            if (contentLength > 60) {
                fontSize = Math.min(fontSize, baseFontSize * 0.5);
            }
            if (contentLength > 100) {
                fontSize = Math.min(fontSize, baseFontSize * 0.4);
            }
            
            // Дополнительная проверка для длинных слов
            if (longestWord.length > 10) {
                fontSize = Math.min(fontSize, baseFontSize * 0.7);
            }
            if (longestWord.length > 15) {
                fontSize = Math.min(fontSize, baseFontSize * 0.6);
            }
        }
        
        // Минимальный размер шрифта
        fontSize = Math.max(fontSize, 9);
        
        // Удаляем тестовый элемент
        document.body.removeChild(testElement);
        
        // Применяем стили к текстовой области
        textArea.style.fontSize = `${fontSize}px`;
        textArea.style.lineHeight = '1.2';
        textArea.style.whiteSpace = 'normal';
        textArea.style.wordWrap = 'break-word';
        textArea.style.overflow = 'hidden';
        textArea.style.textAlign = 'center';
        
        // Вертикальное выравнивание с помощью padding
        const textHeight = textArea.scrollHeight;
        const containerHeight = parseFloat(textArea.style.height);
        
        // Сначала устанавливаем базовый padding
        const basePadding = 5;
        textArea.style.padding = `${basePadding}px`;
        
        if (textHeight < containerHeight) {
            // Если текст меньше контейнера, добавляем отступ сверху
            const paddingTop = Math.max(basePadding, (containerHeight - textHeight) / 2);
            textArea.style.paddingTop = `${paddingTop}px`;
        }
        
        // Увеличиваем класс для большого количества текста
        if (text.length > 40) {
            bubble.classList.add('large-content');
        } else {
            bubble.classList.remove('large-content');
        }
    }
    
    // Сохраняем старую функцию для обратной совместимости
    function updateBubbleSize(bubble, textArea, text) {
        // Вызываем новую функцию
        adaptTextToFitBubble(bubble, textArea);
    }
    
    function updateBubblePosition(id, x, y) {
        const bubble = bubbles.find(b => b.id === id);
        if (bubble) {
            bubble.x = x;
            bubble.y = y;
        }
    }
    
    function updateBubbleText(id, text) {
        const bubble = bubbles.find(b => b.id === id);
        if (bubble) {
            bubble.text = text;
        }
    }
    
    function removeBubble(id) {
        const index = bubbles.findIndex(bubble => bubble.id === id);
        if (index !== -1) {
            bubbles.splice(index, 1);
        }
    }
    
    // Function to generate random color
    function getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsla(${hue}, 70%, 60%, 0.7)`;
    }
    
    // Create sparkles effect
    function createSparkles(x, y, color, size) {
        const sparkleCount = Math.floor(size / 10); // Number of sparkles based on bubble size
        const bubbleRadius = size / 2;
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            
            // Position sparkle at the edge of the bubble
            const angle = Math.random() * Math.PI * 2;
            const startX = x + Math.cos(angle) * bubbleRadius;
            const startY = y + Math.sin(angle) * bubbleRadius;
            
            sparkle.style.left = `${startX}px`;
            sparkle.style.top = `${startY}px`;
            
            // Set random direction and distance
            const distance = bubbleRadius * (0.5 + Math.random() * 1.5);
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const scale = 0.5 + Math.random() * 2;
            
            // Set sparkle color
            sparkle.style.backgroundColor = color;
            
            // Set animation variables
            sparkle.style.setProperty('--tx', `${tx}px`);
            sparkle.style.setProperty('--ty', `${ty}px`);
            sparkle.style.setProperty('--scale', scale);
            
            // Set animation
            sparkle.style.animation = `sparkle-animation ${0.3 + Math.random() * 0.7}s ease-out forwards`;
            
            // Add to container
            bubblesContainer.appendChild(sparkle);
            
            // Remove after animation
            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.parentNode.removeChild(sparkle);
                }
            }, 1000);
        }
    }
    
    // Handle zoom functionality
    function handleZoom(e) {
        e.preventDefault();
        
        // Get mouse position relative to the container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Store the point where we're zooming
        zoomPoint.x = mouseX;
        zoomPoint.y = mouseY;
        
        // Calculate zoom direction and new scale
        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = Math.max(0.5, Math.min(3, scale + delta));
        
        if (newScale !== scale) {
            // Calculate new offset to zoom into the mouse position
            const scaleChange = newScale - scale;
            offset.x -= (mouseX - offset.x) * (scaleChange / scale);
            offset.y -= (mouseY - offset.y) * (scaleChange / scale);
            
            // Update scale
            scale = newScale;
            
            // Apply transformation to bubbles container
            bubblesContainer.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
            
            // Update bubble positions in the data model
            updateBubblesAfterZoom();
            
            // Update all connection lines
            requestAnimationFrame(updateAllConnectionLines);
        }
    }
    
    // Update bubble positions after zoom
    function updateBubblesAfterZoom() {
        const bubblesElements = document.querySelectorAll('.bubble');
        bubblesElements.forEach(bubbleElement => {
            const id = bubbleElement.dataset.id;
            const bubbleData = bubbles.find(b => b.id === id);
            
            if (bubbleData) {
                // Get the visual position from the transformed element
                const rect = bubbleElement.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Update the data model with scaled positions
                bubbleData.visualX = rect.left - containerRect.left;
                bubbleData.visualY = rect.top - containerRect.top;
            }
        });
        
        // Update all connection lines after zoom
        updateAllConnectionLines();
    }
    
    // Start panning the canvas
    function startPanning(e) {
        // Если клик был на пузырьке, не начинаем перетаскивание холста
        if (e.target.closest('.bubble') || e.target.closest('.page-footer') || e.target.closest('.tool-button')) {
            return;
        }
        
        if (e.button === 0) { // Только левая кнопка мыши
            isPanning = true;
            hasMoved = false;
            mouseButton = e.button;
            
            // Запоминаем начальную точку
            lastPanPoint = {
                x: e.clientX,
                y: e.clientY
            };
            
            e.preventDefault();
        } else if (e.button === 2) { // Правая кнопка мыши
            mouseButton = e.button;
            e.preventDefault();
        }
    }
    
    // Move the canvas while panning
    function movePanning(e) {
        if (isPanning && mouseButton === 0) { // Только левая кнопка мыши
            // Calculate how much the mouse has moved
            const deltaX = e.clientX - lastPanPoint.x;
            const deltaY = e.clientY - lastPanPoint.y;
            
            // Check if we've moved enough to consider it a drag rather than a click
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
            }
            
            // Update the last pan point
            lastPanPoint.x = e.clientX;
            lastPanPoint.y = e.clientY;
            
            // Update the offset
            offset.x += deltaX;
            offset.y += deltaY;
            
            // Apply the transformation
            bubblesContainer.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
            
            // Update all connection lines after panning
            requestAnimationFrame(updateAllConnectionLines);
            
            // Prevent default behavior
            e.preventDefault();
        }
    }
    
    // End panning
    function endPanning(e) {
        // Если было перетаскивание правой кнопкой, завершаем его
        if (isRightMouseDown && mouseButton === 2) {
            isRightMouseDown = false;
            mouseButton = -1;
            return;
        }
        
        if (isPanning && mouseButton === 0) { // Только левая кнопка мыши
            isPanning = false;
            
            // Если клик был на пустом месте, снимаем выделение с выбранного пузырька
            // и выходим из режима редактирования
            if ((e.target === container || e.target === bubblesContainer) && 
                !e.target.closest('.bubble') && 
                !e.target.closest('.page-footer') &&
                !e.target.closest('.tool-button')) {
                
                // Если есть активный пузырек в режиме редактирования, выходим из режима редактирования
                if (activeEditingBubble) {
                    const activeTextArea = activeEditingBubble.querySelector('.bubble-text');
                    if (activeTextArea) {
                        activeEditingBubble.classList.remove('editing');
                        activeTextArea.blur();
                    }
                    activeEditingBubble = null;
                }
                
                // Если есть выбранные пузырьки, снимаем выделение со всех
                if (selectedBubbles.length > 0) {
                    // Снимаем выделение со всех пузырьков в массиве
                    selectedBubbles.forEach(bubble => {
                        bubble.classList.remove('selected');
                        // Восстанавливаем оригинальный цвет
                        const originalColor = bubble.dataset.originalColor;
                        bubble.style.borderColor = originalColor;
                        bubble.style.boxShadow = `0 0 15px ${originalColor}`;
                    });
                    
                    // Очищаем массив выбранных пузырьков
                    selectedBubbles = [];
                    
                    // Сбрасываем текущий выбранный пузырек
                    selectedBubble = null;
                    
                    // Выходим из функции, чтобы не создавать новый круг при первом клике
                    mouseButton = -1;
                    return;
                }
                
                // Если есть выбранный пузырек, снимаем выделение
                if (selectedBubble) {
                    selectedBubble.classList.remove('selected');
                    // Восстанавливаем оригинальный цвет
                    const originalColor = selectedBubble.dataset.originalColor;
                    selectedBubble.style.borderColor = originalColor;
                    selectedBubble.style.boxShadow = `0 0 15px ${originalColor}`;
                    selectedBubble = null;
                    
                    // Выходим из функции, чтобы не создавать новый круг при первом клике
                    mouseButton = -1;
                    return;
                }
                
                // Если нет выбранного пузырька и нет активного в режиме редактирования,
                // то создаем новый пузырек
                if (!hasMoved) {
                    // Calculate position based on current zoom level
                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    
                    // Convert screen coordinates to zoomed space coordinates
                    const zoomedX = (mouseX - offset.x) / scale;
                    const zoomedY = (mouseY - offset.y) / scale;
                    
                    // Calculate bubble size based on current zoom level
                    // When zoomed in (scale > 1), create smaller bubbles
                    // When zoomed out (scale < 1), create larger bubbles
                    const baseBubbleSize = 150;
                    const scaledBubbleSize = baseBubbleSize / scale;
                    const halfScaledSize = scaledBubbleSize / 2;
                    
                    // Create bubble at the zoomed coordinates with size dependent on zoom level
                    const newBubble = createBubble(zoomedX - halfScaledSize, zoomedY - halfScaledSize, true, '', null, scaledBubbleSize, null, false);
                    
                    saveBubblesState();
                }
            } else {
                // Если клик был не на пустом месте, просто выходим
                mouseButton = -1;
                return;
            }
            
            // Сбрасываем флаг кнопки мыши
            mouseButton = -1;
        }
    }
    
    // Функция для проверки столкновения пузырька с мусорным ведром
    function checkTrashCollision(mouseX, mouseY, bubble) {
        // Удаляем логику перемещения круга к мусорке
        // Теперь удаление только через клик на кнопку мусорки
        return false;
    }
    
    // Инициализируем цвет SVG иконки мусорного ведра
    const svgElement = trashButton.querySelector('svg');
    if (svgElement) {
        svgElement.style.stroke = 'rgba(80, 150, 255, 0.8)';
    }
    
    // Функция для создания соединения между двумя пузырьками
    function createConnection(bubble1, bubble2) {
        // Check if bubbles are valid
        if (!bubble1 || !bubble2 || bubble1 === bubble2) return null;
        
        // Создаем элемент линии
        const line = document.createElement('div');
        line.className = 'connection-line';
        line.dataset.bubble1Id = bubble1.dataset.id;
        line.dataset.bubble2Id = bubble2.dataset.id;
        
        // Important: Add the line to the same container as the bubbles
        bubblesContainer.appendChild(line);
        
        // Создаем объект соединения
        const connection = {
            bubble1: bubble1,
            bubble2: bubble2,
            line: line
        };
        
        // Добавляем соединение в массив
        connections.push(connection);
        
        // Обновляем положение линии
        updateConnectionLine(connection);
        
        // Сохраняем состояние соединений
        saveConnectionsState();
        
        // Используем новый механизм сохранения, если он доступен
        if (typeof window.saveAppState === 'function') {
            window.saveAppState();
        }
        
        return connection;
    }
    
    // Функция для обновления положения линии соединения
    function updateConnectionLine(connection) {
        // Проверяем, что соединение существует
        if (!connection || !connection.line || !connection.bubble1 || !connection.bubble2) return;
        
        // Проверяем, что линия находится в DOM
        if (!connection.line.parentNode) {
            // Если линия не в DOM, добавляем ее в контейнер
            bubblesContainer.appendChild(connection.line);
        }
        
        // Get positions in the local coordinate system of the bubbles container
        const bubble1 = connection.bubble1;
        const bubble2 = connection.bubble2;
        
        // Get bubble positions and sizes from their style properties
        // These are in the same coordinate system as the container
        const x1 = parseFloat(bubble1.style.left) + parseFloat(bubble1.style.width) / 2;
        const y1 = parseFloat(bubble1.style.top) + parseFloat(bubble1.style.height) / 2;
        const x2 = parseFloat(bubble2.style.left) + parseFloat(bubble2.style.width) / 2;
        const y2 = parseFloat(bubble2.style.top) + parseFloat(bubble2.style.height) / 2;
        
        // Calculate radii - account for any transform scale during animation
        let r1 = parseFloat(bubble1.style.width) / 2;
        let r2 = parseFloat(bubble2.style.width) / 2;
        
        // Проверяем форму пузырьков
        const isSquare1 = bubble1.classList.contains('square');
        const isSquare2 = bubble2.classList.contains('square');
        
        // Проверяем анимацию появления или удаления пузырька
        const isAppearing1 = bubble1.classList.contains('appearing');
        const isAppearing2 = bubble2.classList.contains('appearing');
        const isPopping1 = bubble1.classList.contains('popping');
        const isPopping2 = bubble2.classList.contains('popping');
        
        // Если пузырек анимируется, корректируем радиус
        if (isAppearing1 || isAppearing2 || isPopping1 || isPopping2) {
            // Получаем вычисленные стили для проверки трансформаций
            const style1 = window.getComputedStyle(bubble1);
            const style2 = window.getComputedStyle(bubble2);
            
            // Извлекаем масштаб из матрицы трансформации, если она есть
            if (style1.transform !== 'none') {
                try {
                    const matrix = new DOMMatrix(style1.transform);
                    const scaleX = matrix.a;
                    r1 *= scaleX; // Корректируем радиус в зависимости от текущего масштаба
                } catch (e) {
                    // Error parsing transform matrix
                }
            } else if (isAppearing1) {
                // Если нет трансформации, но пузырек появляется, оцениваем масштаб по времени анимации
                // Получаем время, прошедшее с начала анимации
                const appearingStartTime = parseFloat(bubble1.dataset.appearingStartTime || Date.now());
                const elapsedTime = Date.now() - appearingStartTime;
                const animationDuration = 500; // Длительность анимации в мс
                
                // Рассчитываем прогресс анимации (0 - начало, 1 - конец)
                const progress = Math.min(elapsedTime / animationDuration, 1);
                
                // Корректируем радиус в зависимости от прогресса анимации
                const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Функция сглаживания ease-out
                r1 = r1 * (0.2 + 0.8 * easeOutProgress); // Начинаем с 20% размера и увеличиваемся до 100%
            } else if (isPopping1) {
                // Если пузырек удаляется, рассчитываем размер на основе анимации bubble-pop
                // Получаем время, прошедшее с начала анимации
                const poppingStartTime = parseFloat(bubble1.dataset.poppingStartTime || Date.now());
                const elapsedTime = Date.now() - poppingStartTime;
                const animationDuration = 400; // Длительность анимации в мс (совпадает с bubble-pop)
                
                // Рассчитываем прогресс анимации (0 - начало, 1 - конец)
                const progress = Math.min(elapsedTime / animationDuration, 1);
                
                // Анимация bubble-pop: 0% - обычный размер, 50% - увеличенный до 120%, 100% - сжатый до 0
                let scaleMultiplier;
                if (progress < 0.5) {
                    // На первой половине анимации - увеличиваемся до 120%
                    scaleMultiplier = 1 + (progress * 2) * 0.2; // От 1.0 до 1.2
                } else {
                    // На второй половине - уменьшаемся до 0
                    scaleMultiplier = 1.2 * (1 - ((progress - 0.5) * 2)); // От 1.2 до 0
                }
                r1 *= scaleMultiplier;
            }
            
            if (style2.transform !== 'none') {
                try {
                    const matrix = new DOMMatrix(style2.transform);
                    const scaleX = matrix.a;
                    r2 *= scaleX; // Корректируем радиус в зависимости от текущего масштаба
                } catch (e) {
                    // Error parsing transform matrix
                }
            } else if (isAppearing2) {
                // Если нет трансформации, но пузырек появляется, оцениваем масштаб по времени анимации
                const appearingStartTime = parseFloat(bubble2.dataset.appearingStartTime || Date.now());
                const elapsedTime = Date.now() - appearingStartTime;
                const animationDuration = 500; // Длительность анимации в мс
                
                // Рассчитываем прогресс анимации (0 - начало, 1 - конец)
                const progress = Math.min(elapsedTime / animationDuration, 1);
                
                // Корректируем радиус в зависимости от прогресса анимации
                const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Функция сглаживания ease-out
                r2 = r2 * (0.2 + 0.8 * easeOutProgress); // Начинаем с 20% размера и увеличиваемся до 100%
            } else if (isPopping2) {
                // Если пузырек удаляется, рассчитываем размер на основе анимации bubble-pop
                // Получаем время, прошедшее с начала анимации
                const poppingStartTime = parseFloat(bubble2.dataset.poppingStartTime || Date.now());
                const elapsedTime = Date.now() - poppingStartTime;
                const animationDuration = 400; // Длительность анимации в мс (совпадает с bubble-pop)
                
                // Рассчитываем прогресс анимации (0 - начало, 1 - конец)
                const progress = Math.min(elapsedTime / animationDuration, 1);
                
                // Анимация bubble-pop: 0% - обычный размер, 50% - увеличенный до 120%, 100% - сжатый до 0
                let scaleMultiplier;
                if (progress < 0.5) {
                    // На первой половине анимации - увеличиваемся до 120%
                    scaleMultiplier = 1 + (progress * 2) * 0.2; // От 1.0 до 1.2
                } else {
                    // На второй половине - уменьшаемся до 0
                    scaleMultiplier = 1.2 * (1 - ((progress - 0.5) * 2)); // От 1.2 до 0
                }
                r2 *= scaleMultiplier;
            }
        }
        
        // Calculate vector between centers
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Prevent division by zero
        if (distance < 1) return;
        
        // Рассчитываем угол соединения в радианах
        const angle = Math.atan2(dy, dx);
        const oppositeAngle = Math.atan2(-dy, -dx);
        
        // Определяем, находится ли точка выхода в верхней или нижней половине первого круга
        const isTopHalf1 = Math.sin(angle) < 0; // true для верхней части, false для нижней
        
        // Определяем, находится ли точка входа в верхней или нижней половине второго круга
        const isTopHalf2 = Math.sin(oppositeAngle) < 0; // true для верхней части, false для нижней
        
        // Точные корректировки для разных частей круга
        const topOffset = 1.0;     // Для верхней части - добавляем 1px наружу
        const bottomOffset = -1.0;  // Для нижней части - отступаем 1px внутрь
        
        // Выбираем корректировку для каждого круга независимо
        const offset1 = isTopHalf1 ? topOffset : bottomOffset;
        const offset2 = isTopHalf2 ? topOffset : bottomOffset;
        
        // Рассчитываем радиусы с учетом корректировки
        const r1Adjusted = r1 + offset1;
        const r2Adjusted = r2 + offset2;
        
        // Рассчитываем точки соединения с учетом корректировки
        let point1X, point1Y, point2X, point2Y;
        
        // Определяем точки соединения в зависимости от формы элементов
        if (isSquare1) {
            // Для квадрата находим точку на ближайшей стороне
            const squarePoints = findIntersectionWithSquare(x1, y1, x2, y2, r1);
            point1X = squarePoints.x;
            point1Y = squarePoints.y;
        } else {
            // Для круга используем стандартный расчет
            point1X = x1 + Math.cos(angle) * r1Adjusted;
            point1Y = y1 + Math.sin(angle) * r1Adjusted;
        }
        
        if (isSquare2) {
            // Для квадрата находим точку на ближайшей стороне
            const squarePoints = findIntersectionWithSquare(x2, y2, x1, y1, r2);
            point2X = squarePoints.x;
            point2Y = squarePoints.y;
        } else {
            // Для круга используем стандартный расчет
            point2X = x2 - Math.cos(angle) * r2Adjusted;
            point2Y = y2 - Math.sin(angle) * r2Adjusted;
        }
        
        // Get bubble colors
        const color1 = bubble1.style.borderColor;
        const color2 = bubble2.style.borderColor;
        
        // Draw the line
        drawLine(connection.line, point1X, point1Y, point2X, point2Y, color1, color2);
    }
    
    // Функция для рисования линии с градиентом
    function drawLine(lineElement, x1, y1, x2, y2, color1, color2) {
        // Проверяем, что элемент линии существует
        if (!lineElement) return;
        
        // Проверяем, что координаты являются числами
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;
        
        // Calculate length and angle
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Prevent drawing zero-length lines
        if (length < 1) return;
        
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Set line styles - using absolute position within the bubbles container
        lineElement.style.width = `${length}px`;
        lineElement.style.height = '2px';
        lineElement.style.position = 'absolute';
        lineElement.style.transformOrigin = '0 50%';
        lineElement.style.left = `${x1}px`;
        lineElement.style.top = `${y1}px`;
        lineElement.style.transform = `rotate(${angle}deg)`;
        lineElement.style.background = `linear-gradient(to right, ${color1}, ${color2})`;
        lineElement.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
        lineElement.style.zIndex = '5'; // Ensure lines are below bubbles
        lineElement.style.pointerEvents = 'none'; // Make sure lines don't interfere with mouse events
        lineElement.style.opacity = '1'; // Убедимся, что линия видима
    }
    
    // Update all connection lines
    function updateAllConnectionLines() {
        connections.forEach(connection => {
            updateConnectionLine(connection);
        });
    }
    
    // Add event listener to update all connections when zoom changes
    bubblesContainer.addEventListener('transitionend', () => {
        updateAllConnectionLines();
    });
    
    // Добавляем обработчик события загрузки страницы для обновления соединений
    window.addEventListener('load', () => {
        // Проверяем, что соединения существуют и видимы
        connections.forEach(conn => {
            // Проверяем, что линия существует и находится в DOM
            if (conn && conn.line && !conn.line.parentNode) {
                bubblesContainer.appendChild(conn.line);
            }
        });
        
        // Только одно обновление сразу после загрузки
        updateAllConnectionLines();
        // Connection update after window load
        
        // Только одно дополнительное обновление с небольшой задержкой
        setTimeout(() => {
            // Проверяем еще раз, что все линии в DOM
            connections.forEach(conn => {
                if (conn && conn.line && !conn.line.parentNode) {
                    bubblesContainer.appendChild(conn.line);
                }
            });
            
            updateAllConnectionLines();
        }, 500);
        
        // Дополнительная проверка через 2 секунды
        setTimeout(() => {
            // Проверка на наличие соединений в данных, но отсутствие их в DOM
            const savedConnections = localStorage.getItem('connectionsData');
            const appState = localStorage.getItem('mindmap_state');
            
            // Если есть сохраненные соединения, но они не отображаются
            if ((savedConnections || (appState && JSON.parse(appState).connections)) && 
                (connections.length === 0 || document.querySelectorAll('.connection-line').length === 0)) {
                // Connections missing in DOM but present in storage, recreating...
                
                // Пробуем загрузить соединения из localStorage
                if (savedConnections) {
                    try {
                        const parsedConnections = JSON.parse(savedConnections);
                        if (Array.isArray(parsedConnections) && parsedConnections.length > 0) {
                            loadSavedConnections(parsedConnections);
                        }
                    } catch (error) {
                        console.error('Error loading connections from localStorage:', error);
                    }
                }
                
                // Также пробуем загрузить из нового формата хранения
                if (appState && connections.length === 0) {
                    try {
                        const state = JSON.parse(appState);
                        if (state.connections && Array.isArray(state.connections) && state.connections.length > 0) {
                            // Очищаем существующие соединения
                            window.connections.forEach(conn => {
                                if (conn.line && conn.line.parentNode) {
                                    conn.line.parentNode.removeChild(conn.line);
                                }
                            });
                            window.connections = [];
                            
                            // Создаем соединения из сохраненных данных
                            state.connections.forEach(connData => {
                                const bubble1 = document.querySelector(`.bubble[data-id="${connData.bubble1Id}"]`);
                                const bubble2 = document.querySelector(`.bubble[data-id="${connData.bubble2Id}"]`);
                                if (bubble1 && bubble2) {
                                    window.createConnection(bubble1, bubble2);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Error loading connections from app state:', error);
                    }
                }
                
                // Финальное обновление всех соединений
                updateAllConnectionLines();
            }
        }, 2000);
    });
    
    // Функция для удаления соединения
    function removeConnection(connection) {
        // Добавляем анимацию исчезновения линии с использованием класса popping
        if (connection.line && connection.line.parentNode) {
            // Добавляем класс для анимации исчезновения
            connection.line.classList.add('popping');
            
            // Удаляем линию из DOM после завершения анимации
            setTimeout(() => {
                if (connection.line && connection.line.parentNode) {
                    connection.line.parentNode.removeChild(connection.line);
                }
            }, 400); // Время анимации - 400мс (как в CSS)
        }
        
        // Удаляем соединение из массива
        const index = connections.indexOf(connection);
        if (index !== -1) {
            connections.splice(index, 1);
        }
        
        // Сохраняем состояние соединений
        saveConnectionsState();
        
        // Используем новый механизм сохранения, если он доступен
        if (typeof window.saveAppState === 'function') {
            window.saveAppState();
        }
    }
    
    // Функция для обновления всех соединений, связанных с пузырьком
    function updateConnectionsForBubble(bubble) {
        connections.forEach(connection => {
            if (connection.bubble1 === bubble || connection.bubble2 === bubble) {
                updateConnectionLine(connection);
            }
        });
    }
    
    // Добавляем обработчик клика на кнопку мусорки
    trashButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события
        
        // Если уже идет процесс удаления, игнорируем клик
        if (isGlobalDeleting) return;
        
        // Если есть выбранные пузырьки (через shift), удаляем их все
        if (selectedBubbles.length > 1) {
            // Устанавливаем глобальный флаг блокировки взаимодействий
            isGlobalDeleting = true;
            
            // Создаем копию массива выбранных пузырьков
            const bubblesToDelete = [...selectedBubbles];
            
            // Находим все связанные соединения
            const relatedConnections = connections.filter(conn => 
                bubblesToDelete.includes(conn.bubble1) || bubblesToDelete.includes(conn.bubble2));
            
            // Добавляем анимацию ко всем выбранным пузырькам
            bubblesToDelete.forEach(bubble => {
                bubble.classList.add('popping');
            });
            
            // Добавляем класс анимации ко всем соединениям
            relatedConnections.forEach(conn => {
                if (conn.line) {
                    conn.line.classList.add('popping');
                }
            });
            
            // Создаем анимацию для обновления линий соединений во время анимации
            let animationFrame;
            
            // Функция для обновления во время анимации
            function updateDuringAnimation() {
                // Обновляем все соединения для плавной анимации
                connections.forEach(connection => {
                    updateConnectionLine(connection);
                });
                
                // Продолжаем анимацию
                animationFrame = requestAnimationFrame(updateDuringAnimation);
            }
            
            // Запускаем анимацию обновления
            animationFrame = requestAnimationFrame(updateDuringAnimation);
            
            // Удаляем пузырьки после завершения анимации
            setTimeout(() => {
                // Останавливаем обновление соединений
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                // Сначала собираем все элементы, которые нужно удалить
                const linesToRemove = [];
                const connectionIndicesToRemove = [];
                const bubbleIdsToRemove = [];
                const bubblesToRemoveFromDOM = [];
                
                // Собираем все соединения для удаления
                relatedConnections.forEach(conn => {
                    if (conn.line && conn.line.parentNode) {
                        linesToRemove.push(conn.line);
                    }
                    connectionIndicesToRemove.push(connections.indexOf(conn));
                });
                
                // Собираем все пузырьки для удаления
                bubblesToDelete.forEach(bubble => {
                    if (bubble.parentNode) {
                        bubblesToRemoveFromDOM.push(bubble);
                    }
                    if (bubble.dataset.id) {
                        bubbleIdsToRemove.push(bubble.dataset.id);
                    }
                });
                
                // Удаляем все линии из DOM одновременно
                linesToRemove.forEach(line => line.parentNode.removeChild(line));
                
                // Удаляем все соединения из массива одновременно
                // Сортируем индексы в обратном порядке, чтобы удаление не влияло на последующие индексы
                connectionIndicesToRemove.sort((a, b) => b - a).forEach(index => {
                    if (index !== -1) {
                        connections.splice(index, 1);
                    }
                });
                
                // Удаляем все пузырьки из DOM одновременно
                bubblesToRemoveFromDOM.forEach(bubble => bubble.parentNode.removeChild(bubble));
                
                // Удаляем все пузырьки из данных одновременно
                bubbleIdsToRemove.forEach(id => removeBubble(id));
                
                // Очищаем массив выбранных пузырьков
                selectedBubbles = [];
                selectedBubble = null;
                
                // Сохраняем состояние
                saveBubblesState();
                saveConnectionsState();
                
                // Снимаем блокировку
                isGlobalDeleting = false;
            }, 400); // Длительность анимации
            
            return;
        }
        // Если есть только один выбранный пузырек, удаляем его
        else if (selectedBubble) {
            // Устанавливаем глобальный флаг блокировки взаимодействий
            isGlobalDeleting = true;
            
            // Добавляем анимацию удаления к выбранному пузырьку
            selectedBubble.classList.add('popping');
            
            // Находим все связанные соединения
            const relatedConnections = connections.filter(conn => 
                conn.bubble1 === selectedBubble || conn.bubble2 === selectedBubble);
            
            // Добавляем класс анимации ко всем соединениям
            relatedConnections.forEach(conn => {
                if (conn.line) {
                    conn.line.classList.add('popping');
                }
            });
            
            // Создаем анимацию для обновления линий соединений во время анимации
            let animationFrame;
            
            // Функция для обновления во время анимации
            function updateDuringAnimation() {
                // Обновляем все соединения для плавной анимации
                connections.forEach(connection => {
                    updateConnectionLine(connection);
                });
                
                // Продолжаем анимацию
                animationFrame = requestAnimationFrame(updateDuringAnimation);
            };
            
            // Запускаем анимацию обновления
            animationFrame = requestAnimationFrame(updateDuringAnimation);
            
            // Удаляем пузырек после завершения анимации
            setTimeout(() => {
                // Останавливаем обновление соединений
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                const bubbleId = selectedBubble.dataset.id;
                
                // Удаляем все связанные соединения
                relatedConnections.forEach(conn => {
                    if (conn.line && conn.line.parentNode) {
                        conn.line.parentNode.removeChild(conn.line);
                    }
                    
                    // Удаляем соединение из массива
                    const connIndex = connections.indexOf(conn);
                    if (connIndex !== -1) {
                        connections.splice(connIndex, 1);
                    }
                });
                
                // Удаляем пузырек из DOM
                if (selectedBubble.parentNode) {
                    selectedBubble.parentNode.removeChild(selectedBubble);
                }
                
                // Удаляем пузырек из массива данных
                removeBubble(bubbleId);
                
                // Удаляем пузырек из массива выбранных
                const selectedIndex = selectedBubbles.indexOf(selectedBubble);
                if (selectedIndex !== -1) {
                    selectedBubbles.splice(selectedIndex, 1);
                }
                
                // Сбрасываем выбранный пузырек
                selectedBubble = null;
                
                // Сохраняем состояние
                saveBubblesState();
                saveConnectionsState();
                
                // Снимаем блокировку
                isGlobalDeleting = false;
            }, 400); // Длительность анимации
            
            return;
        }
        
        // Если нет выбранных пузырьков, то удаляем пустые пузырьки
        
        // Сначала проверяем наличие пустых несвязанных пузырьков
        if (deleteEmptyBubbles(false)) {
            // Если нашли и удалили пустые несвязанные пузырьки, выходим
            return;
        }
        
        // Если нет пустых несвязанных пузырьков, проверяем наличие пустых связанных
        if (deleteEmptyBubbles(true)) {
            // Если нашли и удалили пустые связанные пузырьки, выходим
            return;
        }
        
        // Если нет ни выбранных, ни пустых пузырьков, ничего не делаем
    });
    
    // Функция для удаления пустых пузырьков (связанных или несвязанных)
    // Параметр connected: true - искать связанные, false - искать несвязанные
    // Возвращает true, если были найдены и удалены пузырьки, иначе false
    function deleteEmptyBubbles(connected) {
        // Если уже идет процесс удаления, выходим
        if (isGlobalDeleting) return false;
        
        // Создаем массивы для всех пузырьков и их состояния
        const allBubbles = [];
        const emptyBubbles = [];
        const nonEmptyBubbles = [];
        
        // Собираем информацию о всех пузырьках
        document.querySelectorAll('.bubble').forEach(bubble => {
            const textArea = bubble.querySelector('.bubble-text');
            const hasImage = bubble.classList.contains('has-image');
            const isEmpty = !textArea.value.trim() && !hasImage;
            
            // Добавляем пузырек в соответствующий массив
            allBubbles.push(bubble);
            if (isEmpty) {
                emptyBubbles.push(bubble);
            } else {
                nonEmptyBubbles.push(bubble);
            }
        });
        
        // Если нет пустых пузырьков, выходим
        if (emptyBubbles.length === 0) {
            isGlobalDeleting = false;
            return false;
        }
        
        // Пузырьки, которые будем удалять
        const bubblesToDelete = [];
        
        if (!connected) {
            // Для несвязанных пузырьков - просто находим все пустые без связей
            emptyBubbles.forEach(bubble => {
                const hasConnections = connections.some(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
                
                if (!hasConnections) {
                    bubblesToDelete.push(bubble);
                }
            });
        } else {
            // Для связанных пузырьков - находим кластеры пустых пузырьков
            
            // Создаем массив пустых связанных пузырьков
            const connectedEmptyBubbles = emptyBubbles.filter(bubble => {
                return connections.some(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
            });
            
            // Функция для проверки, связан ли пузырек с непустым пузырьком
            const isConnectedToNonEmpty = (bubble, checkedBubbles = []) => {
                // Если мы уже проверяли этот пузырек, пропускаем
                if (checkedBubbles.includes(bubble)) {
                    return false;
                }
                
                // Добавляем пузырек в проверенные
                checkedBubbles.push(bubble);
                
                // Находим все связи этого пузырька
                const relatedConnections = connections.filter(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
                
                // Проверяем каждое соединение
                for (const conn of relatedConnections) {
                    // Находим связанный пузырек
                    const connectedBubble = (conn.bubble1 === bubble) ? conn.bubble2 : conn.bubble1;
                    
                    // Если связанный пузырек не пустой, возвращаем true
                    if (nonEmptyBubbles.includes(connectedBubble)) {
                        return true;
                    }
                    
                    // Рекурсивно проверяем связанный пузырек
                    if (isConnectedToNonEmpty(connectedBubble, checkedBubbles)) {
                        return true;
                    }
                }
                
                // Если не нашли связи с непустым пузырьком
                return false;
            };
            
            // Проверяем каждый пустой связанный пузырек
            connectedEmptyBubbles.forEach(bubble => {
                // Если пузырек не связан с непустым пузырьком, добавляем его на удаление
                if (!isConnectedToNonEmpty(bubble)) {
                    bubblesToDelete.push(bubble);
                }
            });
        }
        
        // Если нет пузырьков для удаления, снимаем блокировку и выходим
        if (bubblesToDelete.length === 0) {
            isGlobalDeleting = false;
            return false;
        }
        
        // Устанавливаем глобальный флаг блокировки взаимодействий
        isGlobalDeleting = true;
        
        // Добавляем анимацию удаления ко всем пузырькам одновременно
        bubblesToDelete.forEach(bubble => {
            bubble.classList.add('popping');
            
            // Если удаляем связанные пузырьки, добавляем анимацию к соединениям
            if (connected) {
                const relatedConnections = connections.filter(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
                
                relatedConnections.forEach(conn => {
                    if (conn.line) {
                        conn.line.classList.add('popping');
                    }
                });
            }
        });
        
        // Создаем анимацию для обновления линий соединений во время анимации
        let animationFrame;
        const updateDuringAnimation = () => {
            // Обновляем все соединения
            updateAllConnectionLines();
            
            // Продолжаем анимацию до удаления пузырьков
            animationFrame = requestAnimationFrame(updateDuringAnimation);
        };
        
        // Запускаем анимацию обновления
        animationFrame = requestAnimationFrame(updateDuringAnimation);
        
        // Удаляем все пузырьки после завершения анимации
        setTimeout(() => {
            // Останавливаем обновление соединений
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            // Сначала собираем все элементы, которые нужно удалить
            const linesToRemove = [];
            const connectionIndicesToRemove = [];
            const bubbleIdsToRemove = [];
            const bubblesToRemoveFromDOM = [];
            
            // Собираем все соединения для удаления
            bubblesToDelete.forEach(bubble => {
                const relatedConnections = connections.filter(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble);
                
                relatedConnections.forEach(conn => {
                    if (conn.line && conn.line.parentNode) {
                        linesToRemove.push(conn.line);
                    }
                    connectionIndicesToRemove.push(connections.indexOf(conn));
                });
            });
            
            // Собираем все пузырьки для удаления
            bubblesToDelete.forEach(bubble => {
                if (bubble.parentNode) {
                    bubblesToRemoveFromDOM.push(bubble);
                }
                if (bubble.dataset.id) {
                    bubbleIdsToRemove.push(bubble.dataset.id);
                }
            });
            
            // Удаляем все линии из DOM одновременно
            linesToRemove.forEach(line => line.parentNode.removeChild(line));
            
            // Удаляем все соединения из массива одновременно
            // Сортируем индексы в обратном порядке, чтобы удаление не влияло на последующие индексы
            connectionIndicesToRemove.sort((a, b) => b - a).forEach(index => {
                if (index !== -1) {
                    connections.splice(index, 1);
                }
            });
            
            // Удаляем все пузырьки из DOM одновременно
            bubblesToRemoveFromDOM.forEach(bubble => bubble.parentNode.removeChild(bubble));
            
            // Удаляем все пузырьки из данных одновременно
            bubbleIdsToRemove.forEach(id => removeBubble(id));
            
            // Очищаем массив выбранных пузырьков
            selectedBubbles = [];
            
            // Сохраняем состояние
            saveBubblesState();
            saveConnectionsState();
            
            // Снимаем блокировку
            isGlobalDeleting = false;
        }, 400); // Длительность анимации
        
        return true;
    }
    
    // Добавляем переменные для отмены сброса
    let resetCountdownTimer = null;
    let resetCountdownValue = 15;
    let savedBubblesState = null;
    let savedConnectionsState = null;
    let isResetCountdownActive = false;
    
    // Функция для сохранения состояния перед сбросом
    function saveStateBeforeReset() {
        // Сохраняем текущее состояние пузырьков
        savedBubblesState = bubbles.map(bubble => {
            // Находим DOM-элемент пузырька
            const bubbleElement = document.querySelector(`.bubble[data-id="${bubble.id}"]`);
            
            // Если элемент найден, берем актуальные данные из него
            if (bubbleElement) {
                const textArea = bubbleElement.querySelector('.bubble-text');
                const isSquare = bubbleElement.classList.contains('square');
                const hasImage = bubbleElement.classList.contains('has-image');
                
                // Базовые данные пузырька
                const bubbleData = {
                    id: bubble.id,
                    x: parseFloat(bubbleElement.style.left),
                    y: parseFloat(bubbleElement.style.top),
                    text: textArea ? textArea.value : '',
                    color: bubbleElement.dataset.originalColor || bubble.color,
                    size: parseFloat(bubbleElement.style.width),
                    shape: isSquare ? 'square' : 'circle'
                };
                
                // Если у пузырька есть изображение, сохраняем его данные
                if (hasImage && bubble.imageData) {
                    bubbleData.imageData = bubble.imageData;
                }
                
                return bubbleData;
            }
            
            // Если элемент не найден, возвращаем данные из массива
            return bubble;
        });
        
        // Сохраняем текущее состояние соединений
        savedConnectionsState = connections.map(conn => ({
            bubble1Id: conn.bubble1.dataset.id,
            bubble2Id: conn.bubble2.dataset.id
        }));
    }
    
    // Функция для восстановления состояния после отмены сброса
    function restoreStateAfterUndo() {
        if (!savedBubblesState || !savedConnectionsState) return;
        
        // Очищаем текущее состояние
        bubblesContainer.innerHTML = '';
        bubbles = [];
        connections = [];
        
        // Создаем пузырьки из сохраненных данных
        savedBubblesState.forEach(bubbleData => {
            // Создаем пузырек
            const bubble = createBubble(
                bubbleData.x,
                bubbleData.y,
                true, // с анимацией
                bubbleData.text,
                bubbleData.id,
                bubbleData.size,
                bubbleData.color,
                false, // не выбирать автоматически
                bubbleData.shape
            );
            
            // Если у пузырька было изображение, восстанавливаем его
            if (bubbleData.imageData && bubble) {
                // Добавляем изображение в пузырек
                setTimeout(() => {
                    setImageToBubble(bubble, bubbleData.imageData);
                }, 100); // Небольшая задержка, чтобы пузырек успел создаться
            }
        });
        
        // Создаем карту соответствия ID и DOM-элементов
        const bubbleElements = {};
        
        // Ждем, пока все пузырьки будут созданы
        setTimeout(() => {
            // Собираем все созданные пузырьки
            document.querySelectorAll('.bubble').forEach(element => {
                const id = element.getAttribute('data-id');
                if (id) {
                    bubbleElements[id] = element;
                }
            });
            
            // Создаем массив соединений для последовательного создания
            const connectionsToCreate = [];
            
            // Собираем все соединения, которые нужно создать
            savedConnectionsState.forEach(connData => {
                const bubble1 = bubbleElements[connData.bubble1Id];
                const bubble2 = bubbleElements[connData.bubble2Id];
                
                if (bubble1 && bubble2) {
                    connectionsToCreate.push({ bubble1, bubble2 });
                }
            });
            
            // Функция для последовательного создания соединений
            function createNextConnection(index) {
                if (index >= connectionsToCreate.length) {
                    // Все соединения созданы, обновляем их и сохраняем состояние
                    updateAllConnectionLines();
                    
                    // Сохраняем восстановленное состояние
                    saveBubblesState();
                    saveConnectionsState();
                    return;
                }
                
                const { bubble1, bubble2 } = connectionsToCreate[index];
                
                // Создаем соединение
                const connection = createConnection(bubble1, bubble2);
                
                // Добавляем анимацию появления линии
                if (connection && connection.line) {
                    // Сначала делаем линию прозрачной
                    connection.line.style.opacity = '0';
                    connection.line.style.transition = 'opacity 0.5s ease';
                    
                    // Плавно показываем линию
                    setTimeout(() => {
                        connection.line.style.opacity = '1';
                        updateConnectionLine(connection);
                        
                        // Переходим к следующему соединению
                        setTimeout(() => {
                            createNextConnection(index + 1);
                        }, 50);
                    }, 50);
                } else {
                    // Если соединение не создано, переходим к следующему
                    createNextConnection(index + 1);
                }
            }
            
            // Начинаем создание соединений
            if (connectionsToCreate.length > 0) {
                createNextConnection(0);
            } else {
                // Если нет соединений для создания, сразу сохраняем состояние
                saveBubblesState();
            }
            
        }, 500); // Даем время на создание пузырьков
    }
    
    // Функция для запуска обратного отсчета
    function startResetCountdown() {
        // Получаем элемент отображения обратного отсчета
        const countdownDisplay = document.getElementById('reset-countdown');
        if (!countdownDisplay) return; // Прерываем выполнение, если элемент не найден
        
        // Сбрасываем значение таймера
        resetCountdownValue = 15;
        countdownDisplay.textContent = resetCountdownValue;
        
        // Добавляем класс для отображения таймера
        resetButton.classList.add('countdown-active');
        isResetCountdownActive = true;
        
        // Запускаем таймер с точным интервалом в 1 секунду
        let lastTime = Date.now();
        resetCountdownTimer = setInterval(() => {
            const currentTime = new Date().getTime();
            // Проверяем, прошла ли секунда
            if (currentTime - lastTime >= 1000) {
                resetCountdownValue--;
                // Получаем элемент отображения обратного отсчета при каждом обновлении
                const countdownDisplay = document.getElementById('reset-countdown');
                if (countdownDisplay) {
                    countdownDisplay.textContent = resetCountdownValue;
                }
                lastTime = currentTime;
                
                if (resetCountdownValue <= 0) {
                    // Время вышло, останавливаем таймер
                    clearInterval(resetCountdownTimer);
                    resetButton.classList.remove('countdown-active');
                    isResetCountdownActive = false;
                    savedBubblesState = null;
                    savedConnectionsState = null;
                }
            }
        }, 100); // Проверяем чаще, но обновляем только раз в секунду
    }
    
    // Функция для остановки обратного отсчета
    function stopResetCountdown() {
        if (resetCountdownTimer) {
            clearInterval(resetCountdownTimer);
            resetCountdownTimer = null;
        }
        
        // Сбрасываем стили для иконки
        const resetIcon = resetButton.querySelector('.reset-icon');
        if (!resetIcon) return; // Прерываем выполнение, если элемент не найден
        
        const resetArrow = resetIcon.querySelector('.circular-arrow');
        if (!resetArrow) return; // Прерываем выполнение, если элемент не найден
        
        // Сбрасываем стили для стрелки
        resetArrow.style.animation = 'none';
        resetArrow.classList.remove('rotating');
        
        // Даем время на сброс стилей и только потом убираем класс
        setTimeout(() => {
            resetButton.classList.remove('countdown-active');
            isResetCountdownActive = false;
            
            // Полный сброс стилей анимации для восстановления ховер-эффекта
            setTimeout(() => {
                resetArrow.style.animation = '';
                resetArrow.offsetHeight; // Вызываем reflow для сброса анимации
            }, 100);
        }, 50);
    }
    
    // Обновляем обработчик клика на кнопку сброса
    resetButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the container click event
        
        // Получаем ссылку на иконку и стрелку
        const resetIcon = resetButton.querySelector('.reset-icon');
        const circularArrow = resetIcon.querySelector('.circular-arrow');
        
        // Функция для запуска анимации вращения
        function startRotationAnimation(element) {
            return new Promise(resolve => {
                // Полностью сбрасываем анимацию
                element.style.animation = 'none';
                element.offsetHeight; // Вызываем reflow для сброса анимации
                element.classList.remove('rotating');
                
                // Запускаем анимацию в следующем фрейме
                requestAnimationFrame(() => {
                    element.style.animation = '';
                    element.classList.add('rotating');
                });
                
                // Удаляем класс вращения после завершения анимации
                setTimeout(() => {
                    element.classList.remove('rotating');
                    
                    // Полный сброс стилей анимации для восстановления ховер-эффекта
                    setTimeout(() => {
                        element.style.animation = '';
                        element.offsetHeight; // Вызываем reflow для сброса анимации
                        
                        // Решаем промис после завершения всех анимаций
                        resolve();
                    }, 50);
                }, 1600);
            });
        }
        
        // Если таймер активен - это отмена (восстановление)
        if (isResetCountdownActive) {
            // Останавливаем таймер сразу
            stopResetCountdown();
            
            // Запускаем анимацию вращения и восстанавливаем состояние после завершения анимации
            startRotationAnimation(circularArrow).then(() => {
                restoreStateAfterUndo();
            });
            return;
        }
        
        // Сохраняем текущее состояние перед сбросом
        saveStateBeforeReset();
        
        // Сбрасываем все пузырьки сразу
        resetAllBubbles();
        
        // Запускаем анимацию вращения и ждем ее завершения
        startRotationAnimation(circularArrow).then(() => {
            // Запускаем таймер только после завершения анимации
            startResetCountdown();
        });
    });
    
    // Обработчик наведения на кнопку сброса
    resetButton.addEventListener('mouseenter', () => {
        // Ничего не делаем, CSS сам обработает смену иконки
    });
    
    // Обработчик ухода курсора с кнопки сброса
    resetButton.addEventListener('mouseleave', () => {
        // Ничего не делаем, CSS сам обработает смену иконки
    });
    
    // Получаем кнопку очистки текста
    const clearTextButton = document.getElementById('clear-text-button');
    
    // Добавляем обработчик клика на кнопку очистки текста
    clearTextButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события
        
        // Удаляем все существующие классы анимации
        clearTextButton.classList.remove('error-flash');
        clearTextButton.classList.remove('success-flash');
        
        // Проверяем, есть ли выбранный пузырек
        if (!selectedBubble && selectedBubbles.length === 0) {
            // Нет выбранных пузырьков - показываем анимацию ошибки
            clearTextButton.classList.add('error-flash');
            setTimeout(() => {
                clearTextButton.classList.remove('error-flash');
            }, 1000);
            return;
        }
        
        let textCleared = false;
        
        if (selectedBubble) {
            // Находим текстовое поле выбранного пузырька
            const textArea = selectedBubble.querySelector('.bubble-text');
            if (textArea) {
                // Проверяем, есть ли текст для очистки
                if (!textArea.value.trim()) {
                    // Нет текста для очистки - показываем анимацию ошибки
                    clearTextButton.classList.add('error-flash');
                    setTimeout(() => {
                        clearTextButton.classList.remove('error-flash');
                    }, 1000);
                    return;
                }
                
                // Создаем эффект анимации очистки
                selectedBubble.classList.add('editing');
                
                // Очищаем текст
                textArea.value = '';
                
                // Обновляем размер текста в пузырьке
                adaptTextToFitBubble(selectedBubble, textArea);
                
                // Обновляем данные пузырька
                updateBubbleText(selectedBubble.dataset.id, '');
                
                // Сохраняем состояние
                saveBubblesState();
                
                // Снимаем эффект анимации через небольшое время
                setTimeout(() => {
                    selectedBubble.classList.remove('editing');
                }, 500);
                
                textCleared = true;
            }
        } else if (selectedBubbles.length > 0) {
            // Проверяем, есть ли текст для очистки в выбранных пузырьках
            const hasText = selectedBubbles.some(bubble => {
                const textArea = bubble.querySelector('.bubble-text');
                return textArea && textArea.value.trim();
            });
            
            if (!hasText) {
                // Нет текста для очистки - показываем анимацию ошибки
                clearTextButton.classList.add('error-flash');
                setTimeout(() => {
                    clearTextButton.classList.remove('error-flash');
                }, 1000);
                return;
            }
            
            // Если выбрано несколько пузырьков, очищаем текст в каждом из них
            selectedBubbles.forEach(bubble => {
                const textArea = bubble.querySelector('.bubble-text');
                if (textArea) {
                    // Добавляем анимацию
                    bubble.classList.add('editing');
                    
                    // Очищаем текст
                    textArea.value = '';
                    
                    // Обновляем размер текста
                    adaptTextToFitBubble(bubble, textArea);
                    
                    // Обновляем данные пузырька
                    updateBubbleText(bubble.dataset.id, '');
                    
                    // Снимаем эффект анимации через небольшое время
                    setTimeout(() => {
                        bubble.classList.remove('editing');
                    }, 500);
                }
            });
            
            // Сохраняем состояние
            saveBubblesState();
            
            textCleared = true;
        }
        
        // Если текст был успешно очищен, показываем анимацию успеха
        if (textCleared) {
            clearTextButton.classList.add('success-flash');
            setTimeout(() => {
                clearTextButton.classList.remove('success-flash');
            }, 1000);
        }
    });
    
    // Функция для определения точки пересечения луча с квадратом
    function findIntersectionWithSquare(squareX, squareY, targetX, targetY, halfSize) {
        // Вычисляем вектор направления от центра квадрата к цели
        const dx = targetX - squareX;
        const dy = targetY - squareY;
        
        // Определяем, через какую сторону квадрата пройдет луч
        // Рассчитываем параметры t для пересечения с каждой стороной
        let tx, ty;
        
        // Проверяем пересечение с правой стороной (x = squareX + halfSize)
        if (dx > 0) tx = (squareX + halfSize - squareX) / dx;
        // Проверяем пересечение с левой стороной (x = squareX - halfSize)
        else if (dx < 0) tx = (squareX - halfSize - squareX) / dx;
        // Если dx = 0, луч параллелен вертикальным сторонам
        else tx = Infinity;
        
        // Проверяем пересечение с нижней стороной (y = squareY + halfSize)
        if (dy > 0) ty = (squareY + halfSize - squareY) / dy;
        // Проверяем пересечение с верхней стороной (y = squareY - halfSize)
        else if (dy < 0) ty = (squareY - halfSize - squareY) / dy;
        // Если dy = 0, луч параллелен горизонтальным сторонам
        else ty = Infinity;
        
        // Выбираем наименьший положительный параметр t
        // Это будет ближайшая точка пересечения луча с квадратом
        const t = Math.min(Math.abs(tx), Math.abs(ty));
        
        // Вычисляем координаты точки пересечения
        return {
            x: squareX + dx * t,
            y: squareY + dy * t
        };
    }
    
    // Добавляем обработчик для кнопки переключения формы
    shapeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the container click event
        
        // Устанавливаем флаг блокировки автообновления
        isShapeButtonChanging = true;
        
        // Если есть выбранные пузырьки, меняем форму каждого пузырька на противоположную
        if (selectedBubbles.length > 0) {
            // Применяем изменения ко всем выбранным пузырькам
            selectedBubbles.forEach(bubble => {
                // Переключаем форму пузырька на противоположную
                if (bubble.classList.contains('square')) {
                    bubble.classList.remove('square');
                } else {
                    bubble.classList.add('square');
                }
                
                // Обновляем соединения для этого элемента
                updateConnectionsForBubble(bubble);
                
                // Обновляем данные элемента
                const bubbleId = bubble.dataset.id;
                const bubbleData = bubbles.find(b => b.id === bubbleId);
                if (bubbleData) {
                    bubbleData.shape = bubble.classList.contains('square') ? 'square' : 'circle';
                }
            });
            
            // Сохраняем состояние после изменения всех пузырьков
            saveBubblesState();
        }
        
        // Добавляем класс для анимации перехода (видеомонтаж-склейка)
        shapeButton.classList.add('changing');
        
        // Получаем элемент для анимации
        const shapeToggle = shapeButton.querySelector('.shape-toggle');
        
        // Добавляем класс для анимации
        shapeToggle.classList.add('animating');
        
        // Переключаем режим формы после завершения анимации
        setTimeout(() => {
            if (shapeMode === 'circle') {
                shapeMode = 'square';
                shapeButton.classList.remove('circle-mode');
                shapeButton.classList.add('square-mode');
            } else {
                shapeMode = 'circle';
                shapeButton.classList.remove('square-mode');
                shapeButton.classList.add('circle-mode');
            }
            
            // Удаляем класс анимации после ее завершения
            shapeToggle.classList.remove('animating');
            
            // Удаляем класс анимации
            shapeButton.classList.remove('changing');
            
            // Снимаем блокировку автообновления
            isShapeButtonChanging = false;
            
            // Сохраняем режим формы в localStorage
            localStorage.setItem('shapeMode', shapeMode);
        }, 400); // Время анимации (0.4s)
    });
    
    // Функция для переключения формы элемента
    function toggleElementShape(element) {
        if (element.classList.contains('square')) {
            element.classList.remove('square');
        } else {
            element.classList.add('square');
        }
        
        // Обновляем кнопку формы если это текущий выбранный элемент
        if (element === selectedBubble) {
            updateShapeButtonBasedOnSelectedBubble(element);
        }
    }

    // Функция для обновления кнопки формы в зависимости от выбранного пузырька
    function updateShapeButtonBasedOnSelectedBubble(bubble) {
        // Если идет анимация кнопки, не обновляем её
        if (isShapeButtonChanging) {
            // Button animation in progress, skipping update
            return;
        }
        
        if (!bubble) return;
        
        // Проверяем форму пузырька
        const isSquare = bubble.classList.contains('square');
        
        // Updating shape button based on bubble shape
        
        // Отображаем противоположную форму в кнопке (если пузырек квадратный - кнопка в режиме круга и наоборот)
        if (isSquare) {
            // Если пузырек квадратный, кнопка должна быть в режиме круга
            shapeButton.classList.remove('square-mode');
            shapeButton.classList.add('circle-mode');
            shapeMode = 'circle';
        } else {
            // Если пузырек круглый, кнопка должна быть в режиме квадрата
            shapeButton.classList.remove('circle-mode');
            shapeButton.classList.add('square-mode');
            shapeMode = 'square';
        }
        
        // Сохраняем режим в localStorage
        localStorage.setItem('shapeMode', shapeMode);
    }
    
    // Function to trigger AI generation
    async function triggerAI() {
        // Add active class to show animation
        aiButton.classList.add('active');
        
        try {
            // Check if we have selected bubbles
            if (selectedBubbles.length > 0) {
                // Check if any of the selected bubbles have images
                const bubblesWithoutImages = selectedBubbles.filter(bubble => !bubble.classList.contains('has-image'));
                
                // Only proceed if there are bubbles without images
                if (bubblesWithoutImages.length > 0) {
                    // Use the new function to generate content for bubbles without images
                    await window.AI.generateForMultipleBubbles(bubblesWithoutImages);
                }
                // If all selected bubbles have images, do nothing silently
            } else {
                // Default behavior when no bubbles are selected
                await window.AI.generate();
            }
        } catch (error) {
            // Error generating AI content
        } finally {
            // Remove active class after generation completes
            setTimeout(() => {
                aiButton.classList.remove('active');
            }, 1000);
        }
    }
    
    // Add event handler for AI button
    aiButton.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent the container click event
        triggerAI();
    });
    
    // Add event handler for Mindmap generation button
    const mindmapGenButton = document.getElementById('mindmap-gen-button');
    if (mindmapGenButton) {
        // Track mouse hover state for the button
        let isHoveringMindmapButton = false;
        
        // Add mouse enter/leave listeners to track hover state
        mindmapGenButton.addEventListener('mouseenter', () => {
            isHoveringMindmapButton = true;
        });
        
        mindmapGenButton.addEventListener('mouseleave', () => {
            isHoveringMindmapButton = false;
        });
        
        mindmapGenButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent the container click event
            
            // Remove any existing classes to start fresh
            mindmapGenButton.classList.remove('error-flash');
            mindmapGenButton.classList.remove('active');
            mindmapGenButton.classList.remove('hover-active');
            
            try {
                // First check if a bubble is selected
                if (!selectedBubbles || selectedBubbles.length === 0) {
                    // No bubble selected for mindmap generation - show error flash
                    // Add a class to maintain hover state during error
                    mindmapGenButton.classList.add('hover-maintain');
                    mindmapGenButton.classList.add('error-flash');
                    setTimeout(() => {
                        mindmapGenButton.classList.remove('error-flash');
                        mindmapGenButton.classList.remove('hover-maintain');
                    }, 1000);
                    return;
                }
                
                // Check if selected bubble has an image - skip AI generation silently
                const hasImageBubble = selectedBubbles.some(bubble => {
                    return bubble.querySelector('.bubble-image') !== null;
                });
                
                if (hasImageBubble) {
                    // Bubble with image - show error flash
                    // Add a class to maintain hover state during error
                    mindmapGenButton.classList.add('hover-maintain');
                    mindmapGenButton.classList.add('error-flash');
                    setTimeout(() => {
                        mindmapGenButton.classList.remove('error-flash');
                        mindmapGenButton.classList.remove('hover-maintain');
                    }, 1000);
                    return;
                }
                
                // Check if selected bubbles have text
                const hasText = selectedBubbles.some(bubble => {
                    const textArea = bubble.querySelector('.bubble-text');
                    return textArea && textArea.value.trim();
                });
                
                if (!hasText) {
                    // No text in selected bubbles - show error flash
                    // Add a class to maintain hover state during error
                    mindmapGenButton.classList.add('hover-maintain');
                    mindmapGenButton.classList.add('error-flash');
                    setTimeout(() => {
                        mindmapGenButton.classList.remove('error-flash');
                        mindmapGenButton.classList.remove('hover-maintain');
                    }, 1000);
                    return;
                }
                
                // Add active class to show processing state with pulsing animation
                mindmapGenButton.classList.add('active');
                
                // If cursor is inside the button, add the hover-active class for special animation
                if (isHoveringMindmapButton) {
                    mindmapGenButton.classList.add('hover-active');
                }
                
                // Generate mindmap using the AI function
                await window.AI.generateMindmap();
                
                // Keep the success animation (pulsing) for 2 seconds after completion
                setTimeout(() => {
                    mindmapGenButton.classList.remove('active');
                    mindmapGenButton.classList.remove('hover-active');
                }, 2000);
                
            } catch (error) {
                // Error generating mindmap - show error flash
                mindmapGenButton.classList.remove('active');
                // Add a class to maintain hover state during error
                mindmapGenButton.classList.add('hover-maintain');
                mindmapGenButton.classList.add('error-flash');
                setTimeout(() => {
                    mindmapGenButton.classList.remove('error-flash');
                    mindmapGenButton.classList.remove('hover-maintain');
                }, 1000);
            }
        });
    }
    
    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        // Check if spacebar is pressed and not typing in a textarea
        if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault(); // Prevent scrolling
            triggerAI();
        }
        
        // Track Shift key press for multi-select
        if (e.key === 'Shift') {
            isShiftPressed = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Track Shift key release
        if (e.key === 'Shift') {
            isShiftPressed = false;
        }
    });
    
    // Делаем глобальные переменные доступными для модуля сохранения
    window.bubbles = bubbles;
    window.connections = connections;
    window.bubblesContainer = bubblesContainer;
    window.scale = scale;
    window.offset = offset;
    window.shapeMode = shapeMode;
    
    // Expose functions needed for AI integration
    window.createBubble = createBubble;
    window.updateBubbleSize = updateBubbleSize;
    window.updateBubbleText = updateBubbleText;
    window.createConnection = createConnection;
    window.adaptTextToFitBubble = adaptTextToFitBubble; // Добавляем функцию для ИИ
    
    // Инициализация системы сохранения
    // Загружаем сохраненное состояние после того, как все переменные определены
    // Увеличиваем задержку для надежной загрузки
    setTimeout(() => {
        if (window.loadAppState) {
            try {
                const success = window.loadAppState();
                if (success) {
                    // Состояние успешно загружено
                    
                    // Проверяем, что пузырьки действительно загружены
                    if (bubbles.length > 0 && document.querySelectorAll('.bubble').length === 0) {
                        // Пузырьки не отображаются, повторная инициализация...
                        // Повторная инициализация с задержкой
                        setTimeout(() => {
                            initializeBubbles();
                            // Обновляем все соединения
                            updateAllConnectionLines();
                        }, 200);
                    }
                }
            } catch (error) {
                // Error loading state
            }
            
            // Запускаем автосохранение
            window.startAutoSave();
        }
    }, 1000);
}); 