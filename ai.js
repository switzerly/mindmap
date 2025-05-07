
const GEMINI_API_KEY = 'AIzaSyCMgsSxEZSrEJymwhqCFlCBJZBItMs-2cY';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';


let defaultPrompt = `Ты — креативный ассистент для генерации идей в майндмепе. Твоя задача — придумать одно короткое слово или фразу (до 3 слов), которая развивает или усиливает текущую мысль, добавляя новый смысл, идею, направление или шаг вперёд.
Подумай, как будто ты придумываешь следующий шаг в инновации, развитии продукта, бизнеса или творческого проекта.

Правила:

Выдавай только СЛОВО или КОРОТКУЮ ФРАЗУ — без кавычек, без пояснений, без форматирования.

Не повторяй идеи, которые уже есть в кластере.

Фраза должна быть КОРОТКОЙ, чтобы хорошо смотрелась в круге.

Если в контексте есть несколько смыслов — выбери тот, который интереснее развить дальше.

Если контекста нет — предложи интересную, провокационную тему, которую захочется развернуть.

Примеры:

Контекст: "Стартап → MVP → ?"
Ответ: Обратная связь

Контекст: "Дизайн → Идея → ?"
Ответ: Визуализация

Контекст: "Контент → Видео → ?"
Ответ: Вовлечение

Контекст: "Продукт → Пользователь → ?"
Ответ: Удержание

Контекста нет:
Ответ: Будущее работы
`;


function setAIPrompt(prompt) {
    if (prompt && prompt.trim()) {
        defaultPrompt = prompt.trim();
    }
    return defaultPrompt;
}


function getAIPrompt() {
    return defaultPrompt;
}


const previousResponses = new Map();


function isDuplicate(response, context) {
    
    const previousForContext = previousResponses.get(context) || [];
    
    const exactMatch = previousForContext.includes(response);
    
    const similarMatch = previousForContext.some(prev => 
        prev.toLowerCase().trim() === response.toLowerCase().trim());
    
    return exactMatch || similarMatch;
}

function saveResponse(response, context) {
    const previousForContext = previousResponses.get(context) || [];
    
    previousForContext.push(response);
    
    if (previousForContext.length > 10) {
        previousForContext.shift(); 
    }
    
    
    previousResponses.set(context, previousForContext);
}


async function generateContent(context = '', avoidDuplicates = true, maxAttempts = 3) {
    try {
        const prompt = getAIPrompt();
        let fullPrompt = prompt;
        
        if (context && context.trim()) {
            fullPrompt += `\n\nКонтекст: "${context} → ?"`;
        }
        
        let attempts = 0;
        let generatedContent = '';
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 50
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && 
                data.candidates[0] && 
                data.candidates[0].content && 
                data.candidates[0].content.parts && 
                data.candidates[0].content.parts[0] && 
                data.candidates[0].content.parts[0].text) {
                
                generatedContent = data.candidates[0].content.parts[0].text.trim();
                
                if ((generatedContent.startsWith('"') && generatedContent.endsWith('"')) || 
                    (generatedContent.startsWith("'") && generatedContent.endsWith("'"))) {
                    generatedContent = generatedContent.substring(1, generatedContent.length - 1);
                }
                
                if (!avoidDuplicates || !isDuplicate(generatedContent, context)) {
                    saveResponse(generatedContent, context);
                    break;
                }
                
                if (attempts < maxAttempts) {
                    fullPrompt += "\n\nПожалуйста, предложи другую идею, не повторяя предыдущие.";
                    continue;
                }
            } else {
                if (attempts >= maxAttempts) {
                    return 'Error: Unexpected API response format';
                }
                continue;
            }
        }
        
        
        return generatedContent || 'Новая идея';
    } catch (error) {
        return 'Error generating content. Please try again.';
    }
}

function analyzeMapState() {
    const allBubbles = document.querySelectorAll('.bubble');
    const filledBubbles = Array.from(allBubbles).filter(bubble => {
        const textArea = bubble.querySelector('.bubble-text');
        return textArea && textArea.value && textArea.value.trim() !== '';
    });
    const emptyBubbles = Array.from(allBubbles).filter(bubble => {
        const textArea = bubble.querySelector('.bubble-text');
        return !textArea || !textArea.value || textArea.value.trim() === '';
    });
    
    const connections = window.connections || [];
    
    const connectedBubblePairs = [];
    
    const connectedFilledBubbles = [];
    
    const connectedEmptyBubbles = [];
    
    for (let i = 0; i < connections.length; i++) {
        const connection = connections[i];
        if (connection && connection.bubble1 && connection.bubble2) {
            const bubble1 = document.querySelector(`.bubble[data-id="${connection.bubble1}"]`);
            const bubble2 = document.querySelector(`.bubble[data-id="${connection.bubble2}"]`);
            
            if (bubble1 && bubble2) {
                const isBubble1Filled = filledBubbles.includes(bubble1);
                const isBubble2Filled = filledBubbles.includes(bubble2);
                
                if (isBubble1Filled && isBubble2Filled) {
                    connectedFilledBubbles.push(bubble1);
                    connectedFilledBubbles.push(bubble2);
                } else if (isBubble1Filled || isBubble2Filled) {
                    if (!isBubble1Filled) {
                        connectedEmptyBubbles.push(bubble1);
                    }
                    if (!isBubble2Filled) {
                        connectedEmptyBubbles.push(bubble2);
                    }
                }
                
                if (bubble1 && bubble2) {
                    connectedBubblePairs.push({
                        bubble1: bubble1,
                        bubble2: bubble2
                    });
                }
            }
        }
    }
    
    const selectedBubble = document.querySelector('.bubble.selected');
    
    let selectedBubbles = [];
    
    if (window.selectedBubbles && window.selectedBubbles.length > 0) {
        selectedBubbles = window.selectedBubbles;
    } 
    else if (selectedBubble) {
        selectedBubbles = [selectedBubble];
    }
    
    const clusters = findClusters(filledBubbles, connectedBubblePairs);
    
    let selectedBubbleCluster = [];
    if (selectedBubbles.length > 0) {
        const selectedBubbleId = selectedBubbles[0].dataset.id;
        
        for (let i = 0; i < clusters.length; i++) {
            const clusterIds = clusters[i].map(bubble => bubble.dataset.id);
            if (clusterIds.includes(selectedBubbleId)) {
                selectedBubbleCluster = clusters[i];
                break;
            }
        }
    }
    
    if (selectedBubbles.length > 0 && selectedBubbleCluster.length === 0) {
        const selectedBubbleObj = selectedBubbles[0];
        if (filledBubbles.includes(selectedBubbleObj)) {
            selectedBubbleCluster = [selectedBubbleObj];
        }
    }
    
    return {
        allBubbles,
        filledBubbles,
        emptyBubbles,
        connectedFilledBubbles,
        connectedEmptyBubbles,
        connectedBubblePairs,
        selectedBubbles,
        selectedBubble: selectedBubbles.length > 0 ? selectedBubbles[0] : null,
        clusters,
        selectedBubbleCluster
    };
}

function findClusters(bubbles, connections) {
    const bubbleMap = new Map();
    bubbles.forEach(bubble => {
        bubbleMap.set(bubble.dataset.id, { 
            bubble, 
            connections: [] 
        });
    });
    
    connections.forEach(conn => {
        const id1 = conn.bubble1.dataset.id;
        const id2 = conn.bubble2.dataset.id;
        
        if (bubbleMap.has(id1) && bubbleMap.has(id2)) {
            bubbleMap.get(id1).connections.push(id2);
            bubbleMap.get(id2).connections.push(id1);
        }
    });
    
    const visited = new Set();
    const clusters = [];
    
    bubbles.forEach(bubble => {
        const id = bubble.dataset.id;
        if (!visited.has(id) && bubbleMap.has(id)) {
            const cluster = [];
            dfs(id, cluster, visited, bubbleMap);
            if (cluster.length > 0) {
                clusters.push(cluster.map(id => bubbleMap.get(id).bubble));
            }
        }
    });
    
    return clusters;
}

function dfs(id, cluster, visited, bubbleMap) {
    if (visited.has(id) || !bubbleMap.has(id)) return;
    
    visited.add(id);
    cluster.push(id);
    
    const connections = bubbleMap.get(id).connections;
    connections.forEach(connId => {
        dfs(connId, cluster, visited, bubbleMap);
    });
}

function getConnectedBubbles(bubble, connections) {
    return connections
        .filter(conn => 
            conn.bubble1 === bubble || conn.bubble2 === bubble
        )
        .map(conn => conn.bubble1 === bubble ? conn.bubble2 : conn.bubble1);
}

function getParentBubbles(bubble, connections) {
    return getConnectedBubbles(bubble, connections);
}

function getChildBubbles(bubble, connections) {
    return getConnectedBubbles(bubble, connections);
}

function findNearestBubble(bubble, cluster) {
    if (!bubble || !cluster || cluster.length === 0) return null;
    
    const bubbleRect = bubble.getBoundingClientRect();
    const bubbleCenter = {
        x: bubbleRect.left + bubbleRect.width / 2,
        y: bubbleRect.top + bubbleRect.height / 2
    };
    
    let nearestBubble = null;
    let minDistance = Infinity;
    
    cluster.forEach(clusterBubble => {
        const clusterRect = clusterBubble.getBoundingClientRect();
        const clusterCenter = {
            x: clusterRect.left + clusterRect.width / 2,
            y: clusterRect.top + clusterRect.height / 2
        };
        
        const distance = Math.sqrt(
            Math.pow(bubbleCenter.x - clusterCenter.x, 2) + 
            Math.pow(bubbleCenter.y - clusterCenter.y, 2)
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestBubble = clusterBubble;
        }
    });
    
    return nearestBubble;
}

function getBubbleText(bubble) {
    if (!bubble) return '';
    const textArea = bubble.querySelector('.bubble-text');
    return textArea ? textArea.value.trim() : '';
}

function getRandomBubble(bubbles) {
    if (!bubbles || bubbles.length === 0) return null;
    return bubbles[Math.floor(Math.random() * bubbles.length)];
}

function getEdgeBubbles(bubbles, connections) {
    return bubbles.filter(bubble => {
        const connectedBubbles = getConnectedBubbles(bubble, connections);
        return connectedBubbles.length === 1;
    });
}

async function handleAIGeneration() {
    const state = analyzeMapState();
    let scenario = determineScenario(state);
    
    
    let generatedText = '';
    
    try {
        if (scenario.targetBubble && scenario.targetBubble.classList.contains('has-image')) {
            return;
        }
            
        generatedText = await generateContent(scenario.context);
            
        await applyGeneratedContent(generatedText, scenario, state);
            
        window.saveAppState();
    } catch (error) {
        alert('Error generating AI content. Please try again.');
    }
}

function formatContextForPrompt(parentNodes, currentNode, state) {
    let context = '';
    let clusterDescription = '';
    
    let clusterBubbles = [];
    
    if (currentNode) {
        const allConnections = window.connections || [];
        
        const addedBubbles = new Set();
        addedBubbles.add(currentNode);
        
        function addConnectedBubbles(bubble) {
            const connectedBubbles = allConnections
                .filter(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble
                )
                .map(conn => conn.bubble1 === bubble ? conn.bubble2 : conn.bubble1);
            
            connectedBubbles.forEach(connBubble => {
                if (!addedBubbles.has(connBubble)) {
                    addedBubbles.add(connBubble);
                    if (getBubbleText(connBubble).trim() !== '') {
                        clusterBubbles.push(connBubble);
                    }
                    addConnectedBubbles(connBubble);
                }
            });
        }
        
        addConnectedBubbles(currentNode);
        
        if (getBubbleText(currentNode).trim() !== '') {
            clusterBubbles.push(currentNode);
        }
    } else if (state && state.selectedBubbleCluster && state.selectedBubbleCluster.length > 0) {
        clusterBubbles = state.selectedBubbleCluster.filter(bubble => 
            getBubbleText(bubble).trim() !== '');
    }
    
    if (clusterBubbles.length > 0) {
        clusterDescription = ' в контексте: ';
        clusterBubbles.forEach((bubble, index) => {
            const text = getBubbleText(bubble);
            if (text) {
                if (index > 0) {
                    clusterDescription += ', ';
                }
                clusterDescription += `"${text}"`;
            }
        });
    }
    
    if (parentNodes && parentNodes.length > 0) {
        context = parentNodes.map(node => getBubbleText(node)).join(' → ');
        if (currentNode) {
            context += ' → ' + getBubbleText(currentNode);
        }
    } else if (currentNode) {
        context = getBubbleText(currentNode);
    }
    
    if (context.trim() === '') {
        if (clusterDescription) {
            return `Создание новой идеи${clusterDescription}`;
        }
        return '';
    }
    
    return context + clusterDescription;
}

function determineScenario(state) {
    const { 
        allBubbles, 
        filledBubbles, 
        emptyBubbles, 
        connectedBubblePairs, 
        selectedBubbles,
        clusters,
        selectedBubbleCluster 
    } = state;
    
    if (selectedBubbles.length > 0) {
        const isSelectedEmpty = emptyBubbles.includes(selectedBubbles[0]);
        
        const connectedFilledBubbles = selectedBubbleCluster
            ? selectedBubbleCluster.filter(bubble => 
                filledBubbles.includes(bubble) && bubble !== selectedBubbles[0] && getBubbleText(bubble).trim() !== '')
            : [];
            
        const directParents = connectedBubblePairs
            .filter(conn => 
                ((conn.bubble1 === selectedBubbles[0] && filledBubbles.includes(conn.bubble2) && getBubbleText(conn.bubble2).trim() !== '') || 
                (conn.bubble1 === bubble && filledBubbles.includes(conn.bubble2) && getBubbleText(conn.bubble2).trim() !== ''))
            )
            .map(conn => conn.bubble1 === selectedBubbles[0] ? conn.bubble2 : conn.bubble1);
        
        const parentNodes = directParents.length > 0 ? directParents : connectedFilledBubbles;
        

        let contextString = '';
        if (parentNodes.length > 0) {
            contextString = parentNodes.map(node => getBubbleText(node)).join(' → ');
        }
        

        if (isSelectedEmpty) {
            return {
                name: '5.1 - Selected bubble is empty',
                action: 'generateInSelected',
                targetBubble: selectedBubbles[0],
                context: contextString  
            };
        }
        

        if (getBubbleText(selectedBubbles[0]).trim()) {
            if (contextString) {
                contextString += ` → ${getBubbleText(selectedBubbles[0])}`;
            } else {
                contextString = getBubbleText(selectedBubbles[0]);
            }
        }
        
        return {
            name: '5.2 - Selected bubble has text',
            action: 'replaceInSelected',
            targetBubble: selectedBubbles[0],
            context: contextString
        };
    }
    
    if (allBubbles.length === 0) {
        return {
            name: '1.1 - No bubbles on screen',
            action: 'createNew',
            context: ''
        };
    } else if (filledBubbles.length === 0) {
        if (emptyBubbles.length === 1) {
            return {
                name: '1.2 - One empty bubble',
                action: 'generateInExisting',
                targetBubble: emptyBubbles[0],
                context: ''
            };
        } else {
            const connectedEmptyBubbles = emptyBubbles.filter(bubble => 
                connectedBubblePairs.some(conn => 
                    conn.bubble1 === bubble || conn.bubble2 === bubble
                )
            );
            
            if (connectedEmptyBubbles.length === 0) {
                return {
                    name: '1.3 - Multiple unconnected empty bubbles',
                    action: 'generateInRandom',
                    targetBubble: getRandomBubble(emptyBubbles),
                    context: ''
                };
            } else {
                const edgeEmptyBubbles = getEdgeBubbles(connectedEmptyBubbles, connectedBubblePairs);
                const targetBubble = edgeEmptyBubbles.length > 0 
                    ? getRandomBubble(edgeEmptyBubbles) 
                    : getRandomBubble(connectedEmptyBubbles);
                
                return {
                    name: '1.4 - Multiple connected empty bubbles',
                    action: 'generateInRandom',
                    targetBubble: targetBubble,
                    context: ''
                };
            }
        }
    }
    
    if (filledBubbles.length > 0 && emptyBubbles.length > 0) {
        const filledToEmptyConnections = connectedBubblePairs.filter(conn => 
            (filledBubbles.includes(conn.bubble1) && emptyBubbles.includes(conn.bubble2)) ||
            (filledBubbles.includes(conn.bubble2) && emptyBubbles.includes(conn.bubble1))
        );
        
        if (filledBubbles.length === 1 && emptyBubbles.length === 1) {
            const filledBubble = filledBubbles[0];
            const emptyBubble = emptyBubbles[0];
            
            if (filledToEmptyConnections.length > 0) {
                return {
                    name: '2.1 - One filled + one empty, connected',
                    action: 'generateInExisting',
                    targetBubble: emptyBubble,
                    context: formatContextForPrompt([filledBubble], null, state)
                };
            } else {
                return {
                    name: '2.2 - One filled + one empty, not connected',
                    action: 'generateInExisting',
                    targetBubble: emptyBubble,
                    context: ''
                };
            }
        }
        
        if (filledBubbles.length === 1 && emptyBubbles.length > 1) {
            const filledBubble = filledBubbles[0];
            const connectedEmptyBubbles = emptyBubbles.filter(bubble => 
                connectedBubblePairs.some(conn => 
                    (conn.bubble1 === filledBubble && conn.bubble2 === bubble) ||
                    (conn.bubble1 === bubble && conn.bubble2 === filledBubble)
                )
            );
            
            if (connectedEmptyBubbles.length > 0) {
                return {
                    name: '2.3 - One filled + multiple empty, empty are children',
                    action: 'generateInRandom',
                    targetBubble: getRandomBubble(connectedEmptyBubbles),
                    context: formatContextForPrompt([filledBubble], null, state)
                };
            }
        }
        
        if (emptyBubbles.length === 1 && filledBubbles.length > 1) {
            const emptyBubble = emptyBubbles[0];
            const connectedFilledBubbles = filledBubbles.filter(bubble => 
                connectedBubblePairs.some(conn => 
                    (conn.bubble1 === emptyBubble && conn.bubble2 === bubble) ||
                    (conn.bubble1 === bubble && conn.bubble2 === emptyBubble)
                )
            );
            
            if (connectedFilledBubbles.length > 0) {
                return {
                    name: '2.5 - One empty connected to multiple filled',
                    action: 'generateInExisting',
                    targetBubble: emptyBubble,
                    context: formatContextForPrompt(connectedFilledBubbles, null, state)
                };
            }
        }
        
        for (const emptyBubble of emptyBubbles) {
            const connectedFilledBubbles = filledBubbles.filter(bubble => 
                connectedBubblePairs.some(conn => 
                    (conn.bubble1 === emptyBubble && conn.bubble2 === bubble) ||
                    (conn.bubble1 === bubble && conn.bubble2 === emptyBubble)
                )
            );
            
            if (connectedFilledBubbles.length > 0) {
                return {
                    name: '2.x - Empty bubble connected to filled bubbles',
                    action: 'generateInExisting',
                    targetBubble: emptyBubble,
                    context: formatContextForPrompt(connectedFilledBubbles, null, state)
                };
            }
        }
        
        return {
            name: '2.x - Mixed bubbles without clear relationship',
            action: 'generateInRandom',
            targetBubble: getRandomBubble(emptyBubbles),
            context: ''
        };
    }
    
    if (filledBubbles.length > 0 && emptyBubbles.length === 0) {
        if (clusters.length === 0) {

            const randomBubble = getRandomBubble(filledBubbles);
            return {
                name: '3.1 - Multiple unconnected filled bubbles',
                action: 'createNewWithContext',
                context: formatContextForPrompt([], randomBubble, state)
            };
        } else if (clusters.length === 1) {
            const cluster = clusters[0];
            const randomBubble = getRandomBubble(cluster);
            
            const connectedBubbles = getConnectedBubbles(randomBubble, connectedBubblePairs)
                .filter(bubble => filledBubbles.includes(bubble));
            
            return {
                name: '3.3 - One cluster of filled bubbles',
                action: 'createNewConnectedToRandom',
                sourceBubble: randomBubble,
                context: formatContextForPrompt(connectedBubbles, randomBubble, state)
            };
        } else {
            const randomCluster = clusters[Math.floor(Math.random() * clusters.length)];
            const randomBubble = getRandomBubble(randomCluster);
            
            const connectedBubbles = getConnectedBubbles(randomBubble, connectedBubblePairs)
                .filter(bubble => filledBubbles.includes(bubble));
            
            return {
                name: '3.4 - Multiple clusters of filled bubbles',
                action: 'createNewConnectedToCluster',
                sourceCluster: randomCluster,
                context: formatContextForPrompt(connectedBubbles, randomBubble, state)
            };
        }
    }
    
    return {
        name: 'Default - Create new bubble',
        action: 'createNew',
        context: ''
    };
}

async function applyGeneratedContent(content, scenario, state) {
    const { action, targetBubble, sourceBubble, sourceCluster } = scenario;
    
    switch (action) {
        case 'createNew':
            const containerRect1 = document.getElementById('container').getBoundingClientRect();
            const centerX1 = (containerRect1.width / 2 - 75) / window.scale - window.offset.x / window.scale;
            const centerY1 = (containerRect1.height / 2 - 75) / window.scale - window.offset.y / window.scale;
            
            const newBubble = window.createBubble(centerX1, centerY1, true, content, null, 150, null, false);
            const textArea1 = newBubble.querySelector('.bubble-text');
            if (textArea1) window.adaptTextToFitBubble(newBubble, textArea1);
            break;
            
        case 'generateInExisting':
        case 'generateInRandom':
        case 'generateInSelected':
            if (targetBubble) {
                const textArea = targetBubble.querySelector('.bubble-text');
                if (textArea) {
                    textArea.value = content;
                    window.updateBubbleSize(targetBubble, textArea, content);
                    const bubbleId = targetBubble.dataset.id;
                    window.updateBubbleText(bubbleId, content);
                }
            }
            break;
            
        case 'replaceInSelected':
            if (targetBubble) {
                const textArea = targetBubble.querySelector('.bubble-text');
                if (textArea) {
                    textArea.value = content;
                    window.updateBubbleSize(targetBubble, textArea, content);
                    const bubbleId = targetBubble.dataset.id;
                    window.updateBubbleText(bubbleId, content);
                }
            }
            break;
            
        case 'createNewWithContext':
            const containerRect2 = document.getElementById('container').getBoundingClientRect();
            const centerX2 = (containerRect2.width / 2 - 75) / window.scale - window.offset.x / window.scale;
            const centerY2 = (containerRect2.height / 2 - 75) / window.scale - window.offset.y / window.scale;
            
            const newContextBubble = window.createBubble(centerX2, centerY2, true, content, null, 150, null, false);
            const textArea2 = newContextBubble.querySelector('.bubble-text');
            if (textArea2) window.adaptTextToFitBubble(newContextBubble, textArea2);
            break;
            
        case 'createNewConnectedToRandom':
            if (sourceBubble) {
                const sourceRect = sourceBubble.getBoundingClientRect();
                const containerRect = document.getElementById('container').getBoundingClientRect();
                
                const sourceX = parseFloat(sourceBubble.style.left);
                const sourceY = parseFloat(sourceBubble.style.top);
                const sourceWidth = parseFloat(sourceBubble.style.width);
                const sourceHeight = parseFloat(sourceBubble.style.height);
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 200; 
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;
                
                const newX = sourceX + offsetX;
                const newY = sourceY + offsetY;
                
                
                const newConnectedBubble = window.createBubble(newX, newY, true, content, null, 150, null, false);
                
                const textArea3 = newConnectedBubble.querySelector('.bubble-text');
                if (textArea3) window.adaptTextToFitBubble(newConnectedBubble, textArea3);
                
                
                window.createConnection(sourceBubble, newConnectedBubble);
            }
            break;
            
        case 'createNewConnectedToCluster':
            
            if (sourceCluster && sourceCluster.length > 0) {
                
                let clusterCenterX = 0;
                let clusterCenterY = 0;
                
                sourceCluster.forEach(bubble => {
                    clusterCenterX += parseFloat(bubble.style.left) + parseFloat(bubble.style.width) / 2;
                    clusterCenterY += parseFloat(bubble.style.top) + parseFloat(bubble.style.height) / 2;
                });
                
                clusterCenterX /= sourceCluster.length;
                clusterCenterY /= sourceCluster.length;
                
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 250; 
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;
                
                const newX = clusterCenterX + offsetX - 75; 
                const newY = clusterCenterY + offsetY - 75; 
                
                
                const newClusterBubble = window.createBubble(newX, newY, true, content, null, 150, null, false);
                
                const textArea4 = newClusterBubble.querySelector('.bubble-text');
                if (textArea4) window.adaptTextToFitBubble(newClusterBubble, textArea4);
                
                
                const randomSourceBubble = getRandomBubble(sourceCluster);
                if (randomSourceBubble) {
                    window.createConnection(randomSourceBubble, newClusterBubble);
                }
            }
            break;
            
        default:
            
    }
}


async function generateForMultipleBubbles(bubbles) {
    if (!bubbles || bubbles.length === 0) return;
    

    const eligibleBubbles = bubbles.filter(bubble => !bubble.classList.contains('has-image'));
    

    if (eligibleBubbles.length === 0) {

        return;
    }
    

    const state = analyzeMapState();
    const filledBubbles = state.filledBubbles;
    const connectedBubblePairs = state.connectedBubblePairs;
    
    try {

        const contentPromises = eligibleBubbles.map(bubble => {
            
            const connectedFilledBubbles = getConnectedBubbles(bubble, connectedBubblePairs)
                .filter(connectedBubble => 
                    filledBubbles.includes(connectedBubble) && 
                    getBubbleText(connectedBubble).trim() !== ''
                );
            
            
            let contextString = '';
            if (connectedFilledBubbles.length > 0) {
                contextString = connectedFilledBubbles.map(node => getBubbleText(node)).join(' → ');
            }
            
            
            
            
            return generateContent(contextString, true, 3);
        });
        
        const contents = await Promise.all(contentPromises);
        
        
        eligibleBubbles.forEach((bubble, index) => {
            const content = contents[index];
            if (content) {
                
                const textArea = bubble.querySelector('.bubble-text');
                if (textArea) {
                   
                    textArea.value = content;
                    
                    
                    const bubbleId = bubble.dataset.id;
                    window.updateBubbleText(bubbleId, content);
                    
       
                    window.adaptTextToFitBubble(bubble, textArea);
                }
            }
        });
        
  
        window.saveBubblesState();
    } catch (error) {
  
    }
}


const mindmapGeneratorPrompt = "Ты — генератор структурированных интеллект-карт. На основе заданной темы создай JSON-структуру интеллект-карты.\n\nФормат вывода:\n\nКорневое поле: topic — это основная тема.\n\nВетки: branches, каждая с полем title и массивом children.\n\nМаксимальная глубина: 6 уровней (узел может содержать подузлы, и так до 6 вложенных уровней).\n\nВывод строго в валидном JSON, без пояснений и форматирования.";


async function generateFullMindmap() {

    
    const state = analyzeMapState();
    const { selectedBubbles } = state;
    

    if (!selectedBubbles || selectedBubbles.length === 0) {

        return;
    }
    

    const rootBubble = selectedBubbles[0];

    

    if (rootBubble.classList.contains('has-image')) {
       
        return;
    }
    
    
    const topic = getBubbleText(rootBubble).trim();
    
    if (!topic) {
      
        return;
    }
    
    try {
        
        const mindmapGenButton = document.getElementById('mindmap-gen-button');
        if (mindmapGenButton) {
            mindmapGenButton.classList.add('active');
        }
        

        const prompt = `${mindmapGeneratorPrompt}\n\nТема: ${topic}`;
        
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            })
        });
        
        const data = await response.json();
        
        
        if (!data.candidates || data.candidates.length === 0) {
           
            if (mindmapGenButton) {
                mindmapGenButton.classList.remove('active');
            }
            return;
        }
        
  
        const content = data.candidates[0].content;
        if (!content || !content.parts || content.parts.length === 0) {
     
            if (mindmapGenButton) {
                mindmapGenButton.classList.remove('active');
            }
            return;
        }
        
   
        const generatedText = content.parts[0].text;

        
        try {
     
            let cleanJson = generatedText;
            
    
            if (cleanJson.startsWith('```')) {
       
                const firstLineBreak = cleanJson.indexOf('\n');
                if (firstLineBreak !== -1) {
         
                    const endMarkerIndex = cleanJson.lastIndexOf('```');
                    if (endMarkerIndex !== -1) {
      
                        cleanJson = cleanJson.substring(firstLineBreak + 1, endMarkerIndex).trim();
                    } else {
           
                        cleanJson = cleanJson.substring(firstLineBreak + 1).trim();
                    }
                }
            }
            
       
            const mindmapData = JSON.parse(cleanJson);
   
            
     
            createStructuredMindmap(rootBubble, mindmapData);
            
     
            window.saveBubblesState();
        } catch (parseError) {
    
        }
        
   
        if (mindmapGenButton) {
            mindmapGenButton.classList.remove('active');
        }
    } catch (error) {

        const mindmapGenButton = document.getElementById('mindmap-gen-button');
        if (mindmapGenButton) {
            mindmapGenButton.classList.remove('active');
        }
    }
}


function createStructuredMindmap(rootBubble, mindmapData) {
    // Проверяем наличие данных
    if (!mindmapData || !mindmapData.branches || mindmapData.branches.length === 0) {
        return;
    }
    
    // Очищаем существующие связанные пузырьки
    clearConnectedBubbles(rootBubble);
    
    // Получаем размеры и позицию корневого пузырька
    const rootRect = rootBubble.getBoundingClientRect();
    const rootX = rootRect.left + rootRect.width / 2;
    const rootY = rootRect.top + rootRect.height / 2;
    const rootWidth = rootRect.width;
    const rootHeight = rootRect.height;
    
    // Создаем объект для хранения пузырьков по уровням
    const levelBubbles = {};
    levelBubbles[1] = [];
    
    // Преобразуем данные в формат для D3.js
    const hierarchyData = {
        name: rootBubble.querySelector('.bubble-text').value || 'Root',
        children: mindmapData.branches.map(branch => convertBranchToHierarchy(branch))
    };
    
    // Создаем иерархию с помощью D3.js
    const root = d3.hierarchy(hierarchyData);
    
    // Определяем размеры дерева
    const containerWidth = window.innerWidth * 0.9;
    const containerHeight = window.innerHeight * 0.9;
    
    // Базовый размер пузырька
    const baseBubbleSize = 160;
    
    // Создаем дерево с помощью D3.js
    const treeLayout = d3.tree()
        .size([containerWidth, containerHeight * 0.8])
        .nodeSize([baseBubbleSize * 1.5, baseBubbleSize * 2.5])
        .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));
    
    // Применяем макет дерева к данным
    treeLayout(root);
    
    // Создаем пузырьки и связи на основе рассчитанных координат
    const allBubbles = [];
    
    // Создаем пузырьки для каждого узла (кроме корня)
    root.descendants().slice(1).forEach(node => {
        // Определяем уровень узла
        const level = node.depth;
        
        // Уменьшаем размер пузырька с увеличением глубины
        const bubbleSize = Math.max(baseBubbleSize - (level * 15), 75);
        
        // Рассчитываем координаты относительно корня
        const x = rootX - containerWidth/2 + node.x;
        const y = rootY + node.y; // Располагаем дерево вниз от корня
        
        // Создаем пузырек
        const bubble = window.createBubble(x, y, false, node.data.name, null, bubbleSize, null, false);
        bubble.style.opacity = "0";
        bubble.style.transform = "scale(0.1)";
        
        // Добавляем пузырек в список по уровням
        if (!levelBubbles[level]) {
            levelBubbles[level] = [];
        }
        levelBubbles[level].push(bubble);
        
        // Добавляем в общий список
        allBubbles.push({
            bubble: bubble,
            level: level,
            node: node
        });
        
        // Адаптируем текст
        const textArea = bubble.querySelector('.bubble-text');
        if (textArea) window.adaptTextToFitBubble(bubble, textArea);
        
        // Создаем связь с родительским пузырьком
        const parentBubble = node.parent === root ? rootBubble : allBubbles.find(b => b.node === node.parent)?.bubble;
        if (parentBubble) {
            window.createConnection(parentBubble, bubble);
        }
    });
    
    // Анимируем появление пузырьков по уровням
    animateBubblesByLevel(levelBubbles);
}

// Функция для преобразования ветви в иерархический формат для D3.js
function convertBranchToHierarchy(branch) {
    const result = {
        name: branch.title || 'Untitled'
    };
    
    if (branch.children && branch.children.length > 0) {
        result.children = branch.children.map(child => convertBranchToHierarchy(child));
    }
    
    return result;
}


function clearConnectedBubbles(rootBubble) {

    const connections = window.connections || [];
    const rootConnections = connections.filter(conn => 
        conn.startBubble === rootBubble || conn.endBubble === rootBubble
    );
    

    const connectedBubbles = new Set();
    rootConnections.forEach(conn => {
        if (conn.startBubble !== rootBubble) connectedBubbles.add(conn.startBubble);
        if (conn.endBubble !== rootBubble) connectedBubbles.add(conn.endBubble);
    });
    

    connectedBubbles.forEach(bubble => {
        if (bubble !== rootBubble) {
            window.removeBubble(bubble);
        }
    });
}


function calculateBranchDepth(branch, currentDepth = 1) {
    if (!branch.children || branch.children.length === 0) {
        return currentDepth;
    }
    
 
    const childDepths = branch.children.map(child => 
        calculateBranchDepth(child, currentDepth + 1)
    );
    
    return Math.max(...childDepths);
}


function calculateMaxChildCount(branches, currentCount = 0) {
    const thisLevelCount = branches.length;
    let maxChildCount = Math.max(thisLevelCount, currentCount);
    

    branches.forEach(branch => {
        if (branch.children && branch.children.length > 0) {
            const childMax = calculateMaxChildCount(branch.children, maxChildCount);
            maxChildCount = Math.max(maxChildCount, childMax);
        }
    });
    
    return maxChildCount;
}


function createOptimizedTree(rootBubble, parentBubble, children, sector, parentDistance, level, levelBubbles, allBubbles, siblingCount, parentBubbleSize) {
    if (!children || children.length === 0) return;
    

    if (!levelBubbles[level]) {
        levelBubbles[level] = [];
    }
    
 
    const rootRect = rootBubble.getBoundingClientRect();
    const rootX = rootRect.left + rootRect.width / 2;
    const rootY = rootRect.top + rootRect.height / 2;
    

    const parentRect = parentBubble.getBoundingClientRect();
    const parentX = parentRect.left + parentRect.width / 2;
    const parentY = parentRect.top + parentRect.height / 2;
    

    const bubbleSize = Math.max(parentBubbleSize - (level * 15), 75);
    

    const minSpacing = 20; 
    const minDistanceIncrement = (parentBubbleSize/2) + (bubbleSize/2) + minSpacing;
    

    const levelFactor = 1 + (level * 0.1); 
    const siblingFactor = 1 + (Math.min(siblingCount, 5) * 0.05); 
    

    const distanceIncrement = minDistanceIncrement * levelFactor * siblingFactor;
    

    // Увеличиваем расстояние между уровнями, чтобы избежать пересечения линий
    const childDistance = parentDistance + (distanceIncrement * 1.2);
    

    if (children.length === 1) {
        const angle = sector.middle;
        

        const x = rootX + Math.cos(angle) * childDistance;
        const y = rootY + Math.sin(angle) * childDistance;
        

        const childBubble = window.createBubble(x, y, false, children[0].title, null, bubbleSize, null, false);
        childBubble.style.opacity = "0";
        childBubble.style.transform = "scale(0.1)";
        

        levelBubbles[level].push(childBubble);
        allBubbles.push({
            bubble: childBubble,
            level: level,
            sector: {
                start: sector.start,
                middle: angle,
                end: sector.end
            }
        });
        

        const textArea = childBubble.querySelector('.bubble-text');
        if (textArea) window.adaptTextToFitBubble(childBubble, textArea);
        

        window.createConnection(parentBubble, childBubble);
        

        if (children[0].children && children[0].children.length > 0 && level < 5) {
            createOptimizedTree(
                rootBubble,
                childBubble,
                children[0].children,
                { 
                    start: sector.start,
                    middle: angle,
                    end: sector.end
                },
                childDistance,
                level + 1,
                levelBubbles,
                allBubbles,
                children[0].children.length,
                bubbleSize
            );
        }
        
        return;
    }
    

    const childCount = children.length;
    

    // Увеличиваем минимальный сектор для каждого дочернего элемента, чтобы они были дальше друг от друга
    const minSectorPerChild = 2 * Math.atan((bubbleSize * 1.5) / childDistance); 
    // Увеличиваем общий минимальный сектор для всех детей
    const minTotalSector = childCount * minSectorPerChild * 1.5; 
    
    // Выбираем максимальный размер сектора между минимальным и доступным
    const actualSectorSize = Math.max(minTotalSector, sector.end - sector.start);
    const childSectorSize = actualSectorSize / childCount;
    
    // Увеличиваем минимальный буфер между детьми
    const minBuffer = Math.atan((minSpacing * 2) / childDistance); 
    // Увеличиваем максимальный буфер
    const maxBuffer = childSectorSize * 0.3;  
    const childBuffer = Math.min(maxBuffer, Math.max(minBuffer, 0.05));
    
    // Рассчитываем эффективный размер сектора для каждого дочернего элемента
    const effectiveChildSectorSize = childSectorSize - childBuffer;
    
 
    // Добавляем дополнительное смещение для лучшего разделения пространства
    const startPos = sector.start + (childBuffer / 2);
    
    // Распределяем детей более равномерно
    children.forEach((child, index) => {
        // Рассчитываем сектор для каждого дочернего элемента
        const childSectorStart = startPos + (index * childSectorSize);
        const childSectorMiddle = childSectorStart + (effectiveChildSectorSize / 2);
        const childSectorEnd = childSectorStart + effectiveChildSectorSize;
        
 
        const x = rootX + Math.cos(childSectorMiddle) * childDistance;
        const y = rootY + Math.sin(childSectorMiddle) * childDistance;
        
  
        const childBubble = window.createBubble(x, y, false, child.title, null, bubbleSize, null, false);
        childBubble.style.opacity = "0";
        childBubble.style.transform = "scale(0.1)";
        
  
        levelBubbles[level].push(childBubble);
        allBubbles.push({
            bubble: childBubble,
            level: level,
            sector: {
                start: childSectorStart,
                middle: childSectorMiddle,
                end: childSectorEnd
            }
        });
        
    
        const textArea = childBubble.querySelector('.bubble-text');
        if (textArea) window.adaptTextToFitBubble(childBubble, textArea);
        
 
        window.createConnection(parentBubble, childBubble);
        
         if (child.children && child.children.length > 0 && level < 5) {
            createOptimizedTree(
                rootBubble,
                childBubble,
                child.children,
                {
                    start: childSectorStart,
                    middle: childSectorMiddle,
                    end: childSectorEnd
                },
                childDistance,
                level + 1,
                levelBubbles,
                allBubbles,
                child.children.length,
                bubbleSize
            );
        }
    });
}

 function animateBubblesByLevel(levelBubbles) {
 
    const maxLevel = Math.max(...Object.keys(levelBubbles).map(Number));
 
    
 
    for (let level = 1; level <= maxLevel; level++) {
        const bubbles = levelBubbles[level] || [];
        const delay = 250 + (level - 1) * 200;  
        
   
        
        setTimeout(() => {
            bubbles.forEach(bubble => {
                bubble.style.transition = "opacity 0.5s ease, transform 0.5s ease";
                bubble.style.opacity = "1";
                bubble.style.transform = "scale(1)";
            });
        }, delay);
    }
}

 
let totalBranches = 0;

 
window.AI = {
    setPrompt: setAIPrompt,
    getPrompt: getAIPrompt,
    generate: handleAIGeneration,
    generateForMultipleBubbles: generateForMultipleBubbles,
    generateMindmap: generateFullMindmap
};
