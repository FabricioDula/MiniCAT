document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const drawingArea = document.getElementById('drawing-area');
    const coordsDisplay = document.getElementById('coords');
    const zoomLevel = document.getElementById('zoom-level');
    
    // Tamaños estándar para todas las figuras
    const STANDARD_SIZES = {
        line: 100,         // Longitud estándar para líneas
        rect: {            // Dimensiones estándar para rectángulos
            width: 80,
            height: 60
        },
        circle: 50,        // Radio estándar para círculos
        electric: 50       // Tamaño estándar para componentes eléctricos
    };

    // Tool buttons
    const toolButtons = document.querySelectorAll('.tool-btn');
    const colorPicker = document.getElementById('color-picker');
    const importBtn = document.getElementById('import-btn');
    const imageUpload = document.getElementById('image-upload');
    const lineWidth = document.getElementById('line-width');
    
    // Layers
    const layersList = document.getElementById('layers-list');
    const addLayerBtn = document.getElementById('add-layer');
    
    // File operations
    const openBtn = document.getElementById('open-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Mobile buttons
    const mobileOpenBtn = document.getElementById('mobile-open-btn');
    const mobileSaveBtn = document.getElementById('mobile-save-btn');
    const mobileLayersBtn = document.getElementById('mobile-layers-btn');
    const mobileToolsBtn = document.getElementById('mobile-tools-btn');
    const mobileHomeBtn = document.getElementById('mobile-home-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenu = document.getElementById('close-menu');
    
    // Export functionality
    const exportModal = document.getElementById('export-modal');
    const exportFormat = document.getElementById('export-format');
    const exportOptions = document.getElementById('export-options');
    const cancelExport = document.getElementById('cancel-export');
    const confirmExport = document.getElementById('confirm-export');

    // State variables
    let currentTool = 'select';
    let isDrawing = false;
    let startX, startY;
    let currentColor = colorPicker.value;
    let currentLineWidth = lineWidth.value;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let layers = [{
        name: 'Capa 1',
        visible: true,
        objects: []
    }];
    let currentLayerIndex = 0;
    let selectedObject = null;
    let isPanning = false;
    let panStartX, panStartY;
    let isMovingObject = false;
    let moveOffsetX = 0;
    let moveOffsetY = 0;
    let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints;

    // Initialize canvas
    function initCanvas() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', resizeCanvas);
        renderCanvas();
        
        if (isTouchDevice) {
            setupTouchEvents();
        }
    }

    function resizeCanvas() {
        let width, height;
        
        if (window.innerWidth <= 768) {
            width = window.innerWidth;
            height = window.innerHeight * 0.6;
        } else {
            width = drawingArea.clientWidth;
            height = drawingArea.clientHeight;
        }
        
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        ctx.scale(pixelRatio, pixelRatio);
        renderCanvas();
    }

    function renderCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        drawGrid();

        layers.forEach(layer => {
            if (layer.visible) {
                layer.objects.forEach(obj => {
                    drawObject(obj);
                });
            }
        });

        ctx.restore();
    }

    function drawGrid() {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        const gridSize = isTouchDevice ? 40 : 20;
        const startX = Math.floor(-offsetX / scale / gridSize) * gridSize;
        const startY = Math.floor(-offsetY / scale / gridSize) * gridSize;
        const endX = startX + Math.ceil(canvas.width / scale) + gridSize;
        const endY = startY + Math.ceil(canvas.height / scale) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    function drawObject(obj) {
        if (obj.type === 'image') {
            const img = new Image();
            img.src = obj.src;
            ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
            return;
        }

        ctx.strokeStyle = obj.color || '#000000';
        ctx.lineWidth = obj.lineWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        switch (obj.type) {
            case 'line':
                ctx.moveTo(obj.startX, obj.startY);
                ctx.lineTo(obj.endX, obj.endY);
                break;
                
            case 'rect':
                ctx.rect(obj.startX, obj.startY, obj.width, obj.height);
                break;
                
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(obj.endX - obj.startX, 2) + 
                    Math.pow(obj.endY - obj.startY, 2)
                );
                ctx.arc(obj.startX, obj.startY, radius, 0, Math.PI * 2);
                break;
                
            case 'power-source':
                drawElectricSource(ctx, obj);
                break;
                
            case 'resistor':
                drawResistor(ctx, obj);
                break;
                
            case 'capacitor':
                drawCapacitor(ctx, obj);
                break;
                
            case 'inductor':
                drawInductor(ctx, obj);
                break;
                
            case 'diode':
                drawDiode(ctx, obj);
                break;
                
            case 'ground':
                drawGround(ctx, obj);
                break;
        }
        
        ctx.stroke();
    }

    // Electric symbols drawing functions
    function drawElectricSource(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        // Círculo
        ctx.beginPath();
        ctx.arc(length/2, 0, length/4, 0, Math.PI*2);
        ctx.stroke();
        
        // Líneas de conexión
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length/4, 0);
        ctx.moveTo(length*3/4, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        
        // AC/DC
        if(obj.subType === 'DC') {
            ctx.beginPath();
            ctx.moveTo(length/2 - length/8, -length/8);
            ctx.lineTo(length/2 + length/8, -length/8);
            ctx.moveTo(length/2 - length/8, length/8);
            ctx.lineTo(length/2 + length/8, length/8);
            ctx.stroke();
        } else { // AC
            ctx.beginPath();
            ctx.moveTo(length/2 - length/8, 0);
            ctx.bezierCurveTo(
                length/2 - length/16, -length/8,
                length/2 + length/16, length/8,
                length/2 + length/8, 0
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }

    function drawResistor(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        let x = 0;
        const segment = length / 6;
        
        while(x < length) {
            ctx.lineTo(x + segment/2, x % (segment*2) === 0 ? -length/4 : length/4);
            ctx.lineTo(x + segment, 0);
            x += segment;
        }
        ctx.stroke();
        
        ctx.restore();
    }

    function drawCapacitor(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length/3, 0);
        ctx.moveTo(length*2/3, 0);
        ctx.lineTo(length, 0);
        
        // Placas del capacitor
        ctx.moveTo(length/3, -length/3);
        ctx.lineTo(length/3, length/3);
        ctx.moveTo(length*2/3, -length/3);
        ctx.lineTo(length*2/3, length/3);
        ctx.stroke();
        
        ctx.restore();
    }

    function drawInductor(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        const coils = 4;
        const coilWidth = length / coils;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        
        for(let i = 0; i < coils; i++) {
            const x = i * coilWidth;
            ctx.bezierCurveTo(
                x + coilWidth/4, -length/3,
                x + coilWidth*3/4, length/3,
                x + coilWidth, 0
            );
        }
        ctx.stroke();
        
        ctx.restore();
    }

    function drawDiode(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length/3, 0);
        ctx.moveTo(length*2/3, 0);
        ctx.lineTo(length, 0);
        
        // Triángulo del diodo
        ctx.moveTo(length/3, -length/3);
        ctx.lineTo(length*2/3, 0);
        ctx.lineTo(length/3, length/3);
        ctx.closePath();
        
        // Línea de cátodo
        ctx.moveTo(length/2, -length/6);
        ctx.lineTo(length/2, length/6);
        ctx.stroke();
        
        ctx.restore();
    }

    function drawGround(ctx, obj) {
        ctx.save();
        ctx.translate(obj.startX, obj.startY);
        
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, -length/2);
        ctx.lineTo(0, 0);
        
        // Líneas horizontales
        const steps = 3;
        for(let i = 1; i <= steps; i++) {
            const y = i * (length/2/steps);
            const lineWidth = length/2 * (i/steps);
            ctx.moveTo(-lineWidth/2, y);
            ctx.lineTo(lineWidth/2, y);
        }
        ctx.stroke();
        
        ctx.restore();
    }

    // Touch event handling
    function setupTouchEvents() {
        const getCanvasCoords = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left - offsetX) / scale,
                y: (clientY - rect.top - offsetY) / scale
            };
        };
        
        // Single touch (drawing)
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            } else if (e.touches.length === 2) {
                e.preventDefault();
                initialDistance = getDistance(e.touches[0], e.touches[1]);
            }
        }, {passive: false});
        
        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && !isPanning) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            } else if (e.touches.length === 2) {
                handlePinchZoom(e);
            }
        }, {passive: false});
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
            initialDistance = null;
        });
        
        // Double tap to reset zoom
        let lastTap = 0;
        canvas.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                resetZoom();
            }
            lastTap = currentTime;
        });
    }
    
    function resetZoom() {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        zoomLevel.textContent = "100%";
        renderCanvas();
    }
    
    let initialDistance = null;
    
    function handlePinchZoom(e) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        
        if (initialDistance === null) {
            initialDistance = currentDistance;
            return;
        }
        
        const zoomFactor = currentDistance / initialDistance;
        
        const rect = canvas.getBoundingClientRect();
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        
        // Apply zoom
        const newScale = Math.min(Math.max(0.1, scale * zoomFactor), 5);
        offsetX = centerX - (centerX - offsetX) * (newScale / scale);
        offsetY = centerY - (centerY - offsetY) * (newScale / scale);
        scale = newScale;
        
        initialDistance = currentDistance;
        zoomLevel.textContent = `${Math.round(scale * 100)}%`;
        renderCanvas();
    }
    
    function getDistance(touch1, touch2) {
        return Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
    }

    // Mouse event handling
    function handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;
        coordsDisplay.textContent = `${Math.round(x)}, ${Math.round(y)}`;

        if (currentTool === 'pan') {
            isPanning = true;
            panStartX = e.clientX - offsetX;
            panStartY = e.clientY - offsetY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (currentTool === 'select') {
            selectedObject = findObjectAt(x, y);
            if (selectedObject) {
                isMovingObject = true;
                // Calcular diferencia entre click y posición del objeto
                if (selectedObject.type === 'rect') {
                    moveOffsetX = x - selectedObject.startX;
                    moveOffsetY = y - selectedObject.startY;
                } else {
                    moveOffsetX = x - selectedObject.startX;
                    moveOffsetY = y - selectedObject.startY;
                }
            }
            return;
        }

        // Para todas las herramientas excepto selección y pan, crear el objeto completo al hacer click
        const newObj = {
            type: currentTool,
            startX: x,
            startY: y,
            color: currentColor,
            lineWidth: currentLineWidth
        };

        // Configurar tamaños estándar según el tipo de objeto
        switch(currentTool) {
            case 'line':
                newObj.endX = x + STANDARD_SIZES.line;
                newObj.endY = y;
                break;
                
            case 'rect':
                newObj.width = STANDARD_SIZES.rect.width;
                newObj.height = STANDARD_SIZES.rect.height;
                newObj.endX = x + STANDARD_SIZES.rect.width;
                newObj.endY = y + STANDARD_SIZES.rect.height;
                break;
                
            case 'circle':
                newObj.endX = x + STANDARD_SIZES.circle;
                newObj.endY = y;
                break;
                
            case 'power-source':
                newObj.subType = 'AC'; // Valor por defecto
                newObj.endX = x + STANDARD_SIZES.electric;
                newObj.endY = y;
                break;
                
            case 'resistor':
            case 'capacitor':
            case 'inductor':
            case 'diode':
            case 'ground':
                newObj.endX = x + STANDARD_SIZES.electric;
                newObj.endY = y;
                break;
        }
        
        layers[currentLayerIndex].objects.push(newObj);
        renderCanvas();
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - offsetX) / scale;
        const canvasY = (e.clientY - rect.top - offsetY) / scale;

        coordsDisplay.textContent = `${Math.round(canvasX)}, ${Math.round(canvasY)}`;

        if (currentTool === 'pan' && isPanning) {
            offsetX = e.clientX - panStartX;
            offsetY = e.clientY - panStartY;
            renderCanvas();
            return;
        }

        if (isMovingObject && selectedObject) {
            // Mover el objeto según el tipo
            const deltaX = canvasX - selectedObject.startX - moveOffsetX;
            const deltaY = canvasY - selectedObject.startY - moveOffsetY;
            
            selectedObject.startX += deltaX;
            selectedObject.startY += deltaY;
            
            if (selectedObject.type === 'line' || selectedObject.type === 'circle' || 
                ['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(selectedObject.type)) {
                selectedObject.endX += deltaX;
                selectedObject.endY += deltaY;
            } else if (selectedObject.type === 'rect') {
                selectedObject.endX = selectedObject.startX + selectedObject.width;
                selectedObject.endY = selectedObject.startY + selectedObject.height;
            }
            
            renderCanvas();
            return;
        }

        if (currentTool === 'eraser') {
            const eraseRadius = currentLineWidth * 5;
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, eraseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Eliminar cualquier objeto que intersecte con el área de borrado
            layers.forEach(layer => {
                if (layer.visible) {
                    layer.objects = layer.objects.filter(obj => {
                        if (obj.type === 'line') {
                            return !isPointNearLine(canvasX, canvasY, obj, eraseRadius);
                        } else if (obj.type === 'rect') {
                            return !isPointInRect(canvasX, canvasY, obj, eraseRadius);
                        } else if (obj.type === 'circle') {
                            return !isPointInCircle(canvasX, canvasY, obj, eraseRadius);
                        } else if (['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(obj.type)) {
                            return !isElectricComponentIntersecting(canvasX, canvasY, obj, eraseRadius);
                        } else if (obj.type === 'image') {
                            return !isPointInRect(canvasX, canvasY, obj, eraseRadius);
                        }
                        return true;
                    });
                }
            });
            renderCanvas();
            return;
        }
    }

    function handleMouseUp() {
        isDrawing = false;
        isMovingObject = false;
        if (currentTool === 'pan') {
            isPanning = false;
            canvas.style.cursor = 'grab';
        }
    }

    function handleWheel(e) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        
        const newScale = Math.min(Math.max(0.1, scale + delta), 5);
        
        if (newScale !== scale) {
            offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
            offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
            
            scale = newScale;
            zoomLevel.textContent = `${Math.round(scale * 100)}%`;
            renderCanvas();
        }
    }

    // Object detection utilities
    function findObjectAt(x, y) {
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (!layer.visible) continue;
            
            for (let j = layer.objects.length - 1; j >= 0; j--) {
                const obj = layer.objects[j];
                if (obj.type === 'line' && isPointNearLine(x, y, obj, 10)) {
                    return obj;
                } else if (obj.type === 'rect' && isPointInRect(x, y, obj, 10)) {
                    return obj;
                } else if (obj.type === 'circle' && isPointInCircle(x, y, obj, 10)) {
                    return obj;
                } else if (['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(obj.type)) {
                    if (isElectricComponentIntersecting(x, y, obj, 10)) {
                        return obj;
                    }
                } else if (obj.type === 'image' && isPointInRect(x, y, obj, 10)) {
                    return obj;
                }
            }
        }
        return null;
    }

    function isElectricComponentIntersecting(x, y, component, tolerance = 0) {
        // Crear un camino aproximado del componente eléctrico
        ctx.save();
        ctx.beginPath();
        
        const dx = component.endX - component.startX;
        const dy = component.endY - component.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        ctx.translate(component.startX, component.startY);
        ctx.rotate(angle);
        
        switch(component.type) {
            case 'power-source':
                // Círculo de la fuente
                ctx.arc(length/2, 0, length/4, 0, Math.PI*2);
                
                // Líneas de conexión
                ctx.moveTo(0, 0);
                ctx.lineTo(length/4, 0);
                ctx.moveTo(length*3/4, 0);
                ctx.lineTo(length, 0);
                break;
                
            case 'resistor':
                ctx.moveTo(0, 0);
                let pos = 0;
                const segment = length / 6;
                
                while(pos < length) {
                    ctx.lineTo(pos + segment/2, pos % (segment*2) === 0 ? -length/4 : length/4);
                    ctx.lineTo(pos + segment, 0);
                    pos += segment;
                }
                break;
                
            case 'capacitor':
                ctx.moveTo(0, 0);
                ctx.lineTo(length/3, 0);
                ctx.moveTo(length*2/3, 0);
                ctx.lineTo(length, 0);
                
                // Placas del capacitor
                ctx.moveTo(length/3, -length/3);
                ctx.lineTo(length/3, length/3);
                ctx.moveTo(length*2/3, -length/3);
                ctx.lineTo(length*2/3, length/3);
                break;
                
            case 'inductor':
                const coils = 4;
                const coilWidth = length / coils;
                ctx.moveTo(0, 0);
                
                for(let i = 0; i < coils; i++) {
                    const x = i * coilWidth;
                    ctx.bezierCurveTo(
                        x + coilWidth/4, -length/3,
                        x + coilWidth*3/4, length/3,
                        x + coilWidth, 0
                    );
                }
                break;
                
            case 'diode':
                ctx.moveTo(0, 0);
                ctx.lineTo(length/3, 0);
                ctx.moveTo(length*2/3, 0);
                ctx.lineTo(length, 0);
                
                // Triángulo del diodo
                ctx.moveTo(length/3, -length/3);
                ctx.lineTo(length*2/3, 0);
                ctx.lineTo(length/3, length/3);
                ctx.closePath();
                
                // Línea de cátodo
                ctx.moveTo(length/2, -length/6);
                ctx.lineTo(length/2, length/6);
                break;
                
            case 'ground':
                ctx.moveTo(0, -length/2);
                ctx.lineTo(0, 0);
                
                // Líneas horizontales
                const steps = 3;
                for(let i = 1; i <= steps; i++) {
                    const y = i * (length/2/steps);
                    const lineWidth = length/2 * (i/steps);
                    ctx.moveTo(-lineWidth/2, y);
                    ctx.lineTo(lineWidth/2, y);
                }
                break;
        }
        
        ctx.closePath();
        
        // Transformar las coordenadas del punto para que coincidan con el sistema de coordenadas del componente
        ctx.translate(-component.startX, -component.startY);
        ctx.rotate(-angle);
        
        const pointX = x - component.startX;
        const pointY = y - component.startY;
        const rotatedX = pointX * Math.cos(angle) + pointY * Math.sin(angle);
        const rotatedY = -pointX * Math.sin(angle) + pointY * Math.cos(angle);
        
        const isHit = ctx.isPointInStroke(rotatedX + component.startX, rotatedY + component.startY) || 
                     ctx.isPointInPath(rotatedX + component.startX, rotatedY + component.startY);
        
        ctx.restore();
        
        return isHit;
    }

    function isPointNearLine(x, y, line, tolerance) {
        const d = distanceToLine(x, y, line.startX, line.startY, line.endX, line.endY);
        return d <= tolerance;
    }

    function distanceToLine(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        const param = len_sq !== 0 ? dot / len_sq : -1;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function isPointInRect(x, y, rect, tolerance = 0) {
        return x >= rect.startX - tolerance && 
               x <= rect.startX + rect.width + tolerance &&
               y >= rect.startY - tolerance && 
               y <= rect.startY + rect.height + tolerance;
    }

    function isPointInCircle(x, y, circle, tolerance = 0) {
        const radius = Math.sqrt(
            Math.pow(circle.endX - circle.startX, 2) + 
            Math.pow(circle.endY - circle.startY, 2)
        );
        const dx = x - circle.startX;
        const dy = y - circle.startY;
        return dx * dx + dy * dy <= (radius + tolerance) * (radius + tolerance);
    }

    // Layer management
    function addNewLayer() {
        const newLayer = {
            name: `Capa ${getNextLayerNumber()}`,
            visible: true,
            objects: []
        };
        layers.push(newLayer);
        currentLayerIndex = layers.length - 1;
        updateLayersUI();
        renderCanvas();
    }

    function updateLayersUI() {
        layersList.innerHTML = '';
        layers.forEach((layer, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = `layer-item p-2 rounded cursor-pointer flex justify-between items-center ${index === currentLayerIndex ? 'active' : ''}`;
            layerItem.innerHTML = `
                <span>${layer.name}</span>
                <div class="flex space-x-1">
                    <button class="toggle-visibility text-gray-500 hover:text-gray-700" data-index="${index}">
                        ${layer.visible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button class="delete-layer text-gray-500 hover:text-gray-700" data-index="${index}">🗑️</button>
                </div>
            `;
            layerItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('toggle-visibility') && 
                    !e.target.classList.contains('delete-layer')) {
                    currentLayerIndex = index;
                    updateLayersUI();
                }
            });

            layerItem.querySelector('.toggle-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.dataset.index);
                layers[idx].visible = !layers[idx].visible;
                updateLayersUI();
                renderCanvas();
            });

            layerItem.querySelector('.delete-layer').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.dataset.index);
                if (layers.length > 1) {
                    layers.splice(idx, 1);
                    if (currentLayerIndex >= idx) {
                        currentLayerIndex = Math.max(0, currentLayerIndex - 1);
                    }
                    updateLayerNames();
                    updateLayersUI();
                    renderCanvas();
                } else {
                    alert('Debe haber al menos una capa');
                }
            });
            layersList.appendChild(layerItem);
        });
    }

    function updateLayerNames() {
        layers.forEach((layer, index) => {
            layer.name = `Capa ${index + 1}`;
        });
    }

    function getNextLayerNumber() {
        let maxNum = 0;
        layers.forEach(layer => {
            const num = parseInt(layer.name.replace('Capa ', ''));
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });
        return maxNum + 1;
    }

    // File operations
    function saveDrawing(fileName = 'dibujo-minicad.json') {
        const data = {
            layers: layers,
            currentLayerIndex: currentLayerIndex,
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY,
            name: fileName,
            timestamp: Date.now()
        };
        
        let drawings = JSON.parse(localStorage.getItem('minicad-drawings') || '[]');
        drawings.push(data);
        localStorage.setItem('minicad-drawings', JSON.stringify(data));
        
        updateDrawingsList();
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        return data;
    }

    function openDrawing(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                layers = data.layers;
                currentLayerIndex = data.currentLayerIndex;
                scale = data.scale || 1;
                offsetX = data.offsetX || 0;
                offsetY = data.offsetY || 0;
                updateLayersUI();
                renderCanvas();
            } catch (error) {
                alert('Error al cargar el archivo: ' + error.message);
            }
        };
        reader.onerror = () => {
            alert('Error al leer el archivo');
        };
        reader.readAsText(file);
    }

    // Export functions
    function updateExportOptions() {
        const format = exportFormat.value;
        let optionsHTML = '';
        
        switch(format) {
            case 'jpeg':
                optionsHTML = `
                    <div>
                        <label class="block text-sm font-medium mb-1">Calidad (0-1)</label>
                        <input type="number" id="jpeg-quality" min="0" max="1" step="0.1" value="0.92" class="w-full p-2 border rounded">
                    </div>
                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="jpeg-transparent" class="mr-2">
                            <span>Fondo transparente</span>
                        </label>
                    </div>
                `;
                break;
                
            case 'png':
                optionsHTML = `
                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="png-transparent" checked class="mr-2">
                            <span>Fondo transparente</span>
                        </label>
                    </div>
                `;
                break;
                
            case 'pdf':
                optionsHTML = `
                    <div>
                        <label class="block text-sm font-medium mb-1">Tamaño (mm)</label>
                        <select id="pdf-size" class="w-full p-2 border rounded">
                            <option value="a4">A4 (210 × 297)</option>
                            <option value="a3">A3 (297 × 420)</option>
                            <option value="letter">Carta (216 × 279)</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    <div id="pdf-custom-size" class="hidden grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-sm font-medium mb-1">Ancho (mm)</label>
                            <input type="number" id="pdf-width" value="210" class="w-full p-2 border rounded">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Alto (mm)</label>
                            <input type="number" id="pdf-height" value="297" class="w-full p-2 border rounded">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Orientación</label>
                        <select id="pdf-orientation" class="w-full p-2 border rounded">
                            <option value="portrait">Vertical</option>
                            <option value="landscape">Horizontal</option>
                        </select>
                    </div>
                `;
                break;
        }
        
        exportOptions.innerHTML = optionsHTML;
        
        if (format === 'pdf') {
            const pdfSize = document.getElementById('pdf-size');
            const customSize = document.getElementById('pdf-custom-size');
            
            pdfSize.addEventListener('change', () => {
                customSize.classList.toggle('hidden', pdfSize.value !== 'custom');
                
                if (pdfSize.value === 'a4') {
                    document.getElementById('pdf-width').value = 210;
                    document.getElementById('pdf-height').value = 297;
                } else if (pdfSize.value === 'a3') {
                    document.getElementById('pdf-width').value = 297;
                    document.getElementById('pdf-height').value = 420;
                } else if (pdfSize.value === 'letter') {
                    document.getElementById('pdf-width').value = 216;
                    document.getElementById('pdf-height').value = 279;
                }
            });
        }
    }

    async function exportDrawing() {
        const format = exportFormat.value;
        let fileName = prompt("Nombre del archivo:", `dibujo-minicad.${format}`);
        
        if (!fileName) return;
        
        try {
            switch(format) {
                case 'png':
                case 'jpeg':
                    exportAsImage(format, fileName);
                    break;
                    
                case 'svg':
                    exportAsSVG(fileName);
                    break;
                    
                case 'pdf':
                    await exportAsPDF(fileName);
                    break;
                    
                case 'json':
                    saveDrawing(fileName);
                    break;
            }
            
            exportModal.classList.add('hidden');
        } catch (error) {
            alert(`Error al exportar: ${error.message}`);
            console.error(error);
        }
    }

    function exportAsImage(format, fileName) {
        const padding = 20;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            layer.objects.forEach(obj => {
                if (obj.type === 'line') {
                    minX = Math.min(minX, obj.startX, obj.endX);
                    minY = Math.min(minY, obj.startY, obj.endY);
                    maxX = Math.max(maxX, obj.startX, obj.endX);
                    maxY = Math.max(maxY, obj.startY, obj.endY);
                } else if (obj.type === 'rect') {
                    minX = Math.min(minX, obj.startX);
                    minY = Math.min(minY, obj.startY);
                    maxX = Math.max(maxX, obj.startX + obj.width);
                    maxY = Math.max(maxY, obj.startY + obj.height);
                } else if (obj.type === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(obj.endX - obj.startX, 2) + 
                        Math.pow(obj.endY - obj.startY, 2)
                    );
                    minX = Math.min(minX, obj.startX - radius);
                    minY = Math.min(minY, obj.startY - radius);
                    maxX = Math.max(maxX, obj.startX + radius);
                    maxY = Math.max(maxY, obj.startY + radius);
                } else if (obj.type === 'image') {
                    minX = Math.min(minX, obj.x);
                    minY = Math.min(minY, obj.y);
                    maxX = Math.max(maxX, obj.x + obj.width);
                    maxY = Math.max(maxY, obj.y + obj.height);
                } else if (['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(obj.type)) {
                    minX = Math.min(minX, obj.startX, obj.endX);
                    minY = Math.min(minY, obj.startY, obj.endY);
                    maxX = Math.max(maxX, obj.startX, obj.endX);
                    maxY = Math.max(maxY, obj.startY, obj.endY);
                }
            });
        });
        
        if (!isFinite(minX)) {
            minX = minY = 0;
            maxX = maxY = 500;
        }
        
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        if (format === 'jpeg' && !document.getElementById('jpeg-transparent')?.checked) {
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, width, height);
        } else if (format === 'png' && !document.getElementById('png-transparent')?.checked) {
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, width, height);
        }
        
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            layer.objects.forEach(obj => {
                const adjustedObj = {...obj};
                
                if (obj.type === 'line') {
                    adjustedObj.startX = obj.startX - minX + padding;
                    adjustedObj.startY = obj.startY - minY + padding;
                    adjustedObj.endX = obj.endX - minX + padding;
                    adjustedObj.endY = obj.endY - minY + padding;
                } else if (obj.type === 'rect' || obj.type === 'image') {
                    adjustedObj.startX = obj.startX - minX + padding;
                    adjustedObj.startY = obj.startY - minY + padding;
                } else if (obj.type === 'circle') {
                    adjustedObj.startX = obj.startX - minX + padding;
                    adjustedObj.startY = obj.startY - minY + padding;
                    adjustedObj.endX = obj.endX - minX + padding;
                    adjustedObj.endY = obj.endY - minY + padding;
                } else if (['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(obj.type)) {
                    adjustedObj.startX = obj.startX - minX + padding;
                    adjustedObj.startY = obj.startY - minY + padding;
                    adjustedObj.endX = obj.endX - minX + padding;
                    adjustedObj.endY = obj.endY - minY + padding;
                }
                
                drawObjectOnContext(adjustedObj, tempCtx);
            });
        });
        
        const quality = format === 'jpeg' ? parseFloat(document.getElementById('jpeg-quality').value) || 0.92 : 1;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        
        tempCanvas.toBlob(blob => {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
        }, mimeType, quality);
    }

    function drawObjectOnContext(obj, ctx) {
        ctx.strokeStyle = obj.color || '#000000';
        ctx.lineWidth = obj.lineWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        switch (obj.type) {
            case 'line':
                ctx.moveTo(obj.startX, obj.startY);
                ctx.lineTo(obj.endX, obj.endY);
                break;
                
            case 'rect':
                ctx.rect(obj.startX, obj.startY, obj.width, obj.height);
                break;
                
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(obj.endX - obj.startX, 2) + 
                    Math.pow(obj.endY - obj.startY, 2)
                );
                ctx.arc(obj.startX, obj.startY, radius, 0, Math.PI * 2);
                break;
                
            case 'power-source':
                drawElectricSource(ctx, obj);
                break;
                
            case 'resistor':
                drawResistor(ctx, obj);
                break;
                
            case 'capacitor':
                drawCapacitor(ctx, obj);
                break;
                
            case 'inductor':
                drawInductor(ctx, obj);
                break;
                
            case 'diode':
                drawDiode(ctx, obj);
                break;
                
            case 'ground':
                drawGround(ctx, obj);
                break;
                
            case 'image':
                const img = new Image();
                img.src = obj.src;
                ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
                return;
        }
        
        ctx.stroke();
    }

    function exportAsSVG(fileName) {
        const padding = 20;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        layers.forEach(layer => {
            if (!layer.visible) return;
            
            layer.objects.forEach(obj => {
                if (obj.type === 'line') {
                    minX = Math.min(minX, obj.startX, obj.endX);
                    minY = Math.min(minY, obj.startY, obj.endY);
                    maxX = Math.max(maxX, obj.startX, obj.endX);
                    maxY = Math.max(maxY, obj.startY, obj.endY);
                } else if (obj.type === 'rect') {
                    minX = Math.min(minX, obj.startX);
                    minY = Math.min(minY, obj.startY);
                    maxX = Math.max(maxX, obj.startX + obj.width);
                    maxY = Math.max(maxY, obj.startY + obj.height);
                } else if (obj.type === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(obj.endX - obj.startX, 2) + 
                        Math.pow(obj.endY - obj.startY, 2)
                    );
                    minX = Math.min(minX, obj.startX - radius);
                    minY = Math.min(minY, obj.startY - radius);
                    maxX = Math.max(maxX, obj.startX + radius);
                    maxY = Math.max(maxY, obj.startY + radius);
                } else if (obj.type === 'image') {
                    minX = Math.min(minX, obj.x);
                    minY = Math.min(minY, obj.y);
                    maxX = Math.max(maxX, obj.x + obj.width);
                    maxY = Math.max(maxY, obj.y + obj.height);
                } else if (['power-source', 'resistor', 'capacitor', 'inductor', 'diode', 'ground'].includes(obj.type)) {
                    minX = Math.min(minX, obj.startX, obj.endX);
                    minY = Math.min(minY, obj.startY, obj.endY);
                    maxX = Math.max(maxX, obj.startX, obj.endX);
                    maxY = Math.max(maxY, obj.startY, obj.endY);
                }
            });
        });
        
        if (!isFinite(minX)) {
            minX = minY = 0;
            maxX = maxY = 500;
        }
        
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}px" height="${height}px" 
     viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="white"/>
`;

        layers.forEach(layer => {
            if (!layer.visible) return;
            
            layer.objects.forEach(obj => {
                const x1 = obj.startX - minX + padding;
                const y1 = obj.startY - minY + padding;
                const x2 = obj.endX - minX + padding;
                const y2 = obj.endY - minY + padding;
                
                switch(obj.type) {
                    case 'line':
                        svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        break;
                        
                    case 'rect':
                        svgContent += `    <rect x="${x1}" y="${y1}" width="${obj.width}" height="${obj.height}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        break;
                        
                    case 'circle':
                        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        svgContent += `    <circle cx="${x1}" cy="${y1}" r="${radius}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        break;
                        
                    case 'power-source':
                        const sourceRadius = Math.min(width, height) * 0.05;
                        svgContent += `    <circle cx="${(x1 + x2)/2}" cy="${(y1 + y2)/2}" r="${sourceRadius}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        svgContent += `    <line x1="${x1}" y1="${(y1 + y2)/2}" x2="${(x1 + x2)/2 - sourceRadius}" y2="${(y1 + y2)/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <line x1="${(x1 + x2)/2 + sourceRadius}" y1="${(y1 + y2)/2}" x2="${x2}" y2="${(y1 + y2)/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        
                        if (obj.subType === 'DC') {
                            svgContent += `    <line x1="${(x1 + x2)/2 - sourceRadius/2}" y1="${(y1 + y2)/2 - sourceRadius/2}" 
        x2="${(x1 + x2)/2 + sourceRadius/2}" y2="${(y1 + y2)/2 - sourceRadius/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                            svgContent += `    <line x1="${(x1 + x2)/2 - sourceRadius/2}" y1="${(y1 + y2)/2 + sourceRadius/2}" 
        x2="${(x1 + x2)/2 + sourceRadius/2}" y2="${(y1 + y2)/2 + sourceRadius/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        } else {
                            svgContent += `    <path d="M${(x1 + x2)/2 - sourceRadius/2} ${(y1 + y2)/2} 
        C${(x1 + x2)/2 - sourceRadius/4} ${(y1 + y2)/2 - sourceRadius/2}, 
        ${(x1 + x2)/2 + sourceRadius/4} ${(y1 + y2)/2 + sourceRadius/2}, 
        ${(x1 + x2)/2 + sourceRadius/2} ${(y1 + y2)/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        }
                        break;
                        
                    case 'resistor':
                        const resistorLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        const segment = resistorLength / 6;
                        let pathData = `M${x1} ${y1} L${x1 + segment/2} ${y1}`;
                        
                        for (let i = 1; i <= 5; i++) {
                            const zigY = i % 2 === 0 ? y1 - resistorLength/4 : y1 + resistorLength/4;
                            pathData += ` L${x1 + segment * (i - 0.5)} ${zigY} L${x1 + segment * i} ${y1}`;
                        }
                        
                        pathData += ` L${x2} ${y2}`;
                        svgContent += `    <path d="${pathData}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        break;
                        
                    case 'capacitor':
                        const plateLength = Math.min(width, height) * 0.1;
                        svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x1 + (x2 - x1)*0.4}" y2="${y1 + (y2 - y1)*0.4}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <line x1="${x1 + (x2 - x1)*0.6}" y1="${y1 + (y2 - y1)*0.6}" x2="${x2}" y2="${y2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <line x1="${x1 + (x2 - x1)*0.4}" y1="${y1 + (y2 - y1)*0.4 - plateLength/2}" 
        x2="${x1 + (x2 - x1)*0.4}" y2="${y1 + (y2 - y1)*0.4 + plateLength/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <line x1="${x1 + (x2 - x1)*0.6}" y1="${y1 + (y2 - y1)*0.6 - plateLength/2}" 
        x2="${x1 + (x2 - x1)*0.6}" y2="${y1 + (y2 - y1)*0.6 + plateLength/2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        break;
                        
                    case 'diode':
                        const diodeLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        const triangleSize = diodeLength * 0.4;
                        svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x1 + (x2 - x1)*0.3}" y2="${y1 + (y2 - y1)*0.3}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <line x1="${x1 + (x2 - x1)*0.7}" y1="${y1 + (y2 - y1)*0.7}" x2="${x2}" y2="${y2}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        svgContent += `    <path d="M${x1 + (x2 - x1)*0.3} ${y1 + (y2 - y1)*0.3 - triangleSize/2} 
        L${x1 + (x2 - x1)*0.7} ${y1 + (y2 - y1)*0.7} 
        L${x1 + (x2 - x1)*0.3} ${y1 + (y2 - y1)*0.3 + triangleSize/2} Z" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}" fill="none"/>\n`;
                        svgContent += `    <line x1="${x1 + (x2 - x1)*0.5}" y1="${y1 + (y2 - y1)*0.5 - triangleSize/4}" 
        x2="${x1 + (x2 - x1)*0.5}" y2="${y1 + (y2 - y1)*0.5 + triangleSize/4}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        break;
                        
                    case 'ground':
                        const groundLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        const stepSize = groundLength / 4;
                        svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 + stepSize*3}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        for (let i = 1; i <= 3; i++) {
                            const lineWidth = stepSize * (i/3);
                            svgContent += `    <line x1="${x1 - lineWidth/2}" y1="${y1 + stepSize*i}" 
        x2="${x1 + lineWidth/2}" y2="${y1 + stepSize*i}" 
        stroke="${obj.color}" stroke-width="${obj.lineWidth}"/>\n`;
                        }
                        break;
                        
                    case 'image':
                        svgContent += `    <image xlink:href="${obj.src}" x="${x1}" y="${y1}" 
        width="${obj.width}" height="${obj.height}"/>\n`;
                        break;
                }
            });
        });
        
        svgContent += `</svg>`;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    async function exportAsPDF(fileName) {
        if (typeof jsPDF === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/svg2pdf.js/1.4.0/svg2pdf.umd.min.js');
        }
        
        const tempSvg = document.createElement('div');
        document.body.appendChild(tempSvg);
        const svgString = exportAsSVG(fileName, true);
        tempSvg.innerHTML = svgString;
        const svgElement = tempSvg.querySelector('svg');
        
        const pdfSize = document.getElementById('pdf-size').value;
        const orientation = document.getElementById('pdf-orientation').value;
        
        let width, height;
        if (pdfSize === 'custom') {
            width = parseFloat(document.getElementById('pdf-width').value);
            height = parseFloat(document.getElementById('pdf-height').value);
        } else {
            const sizes = {
                a4: [210, 297],
                a3: [297, 420],
                letter: [216, 279]
            };
            [width, height] = sizes[pdfSize];
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: width > height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [width, height]
        });
        
        await svg2pdf(svgElement, pdf, {
            xOffset: 0,
            yOffset: 0,
            scale: 1
        });
        
        pdf.save(fileName);
        document.body.removeChild(tempSvg);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Home screen functions
    function updateDrawingsList() {
        const drawingsList = document.getElementById('drawings-list');
        drawingsList.innerHTML = '';
        
        const drawings = JSON.parse(localStorage.getItem('minicad-drawings') || '[]');
        
        if (drawings.length === 0) {
            drawingsList.innerHTML = '<p class="col-span-3 text-center text-gray-500">No hay dibujos guardados</p>';
            return;
        }
        
        drawings.forEach((drawing, index) => {
            const drawingItem = document.createElement('div');
            drawingItem.className = 'p-4 border rounded cursor-pointer hover:bg-gray-100 active:bg-gray-200';
            drawingItem.innerHTML = `
                <h3 class="font-bold truncate">${drawing.name}</h3>
                <p class="text-sm text-gray-500">${new Date(drawing.timestamp).toLocaleString()}</p>
            `;
            drawingItem.addEventListener('click', () => loadDrawing(index));
            drawingsList.appendChild(drawingItem);
        });
    }
    
    function loadDrawing(index) {
        const drawings = JSON.parse(localStorage.getItem('minicad-drawings') || '[]');
        if (index >= 0 && index < drawings.length) {
            const drawing = drawings[index];
            layers = drawing.layers;
            currentLayerIndex = drawing.currentLayerIndex;
            scale = drawing.scale || 1;
            offsetX = drawing.offsetX || 0;
            offsetY = drawing.offsetY || 0;
            
            document.getElementById('home-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            initCanvas();
            mobileMenu.classList.add('hidden');
        }
    }
    
    // Event listeners
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tool-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
            currentTool = this.dataset.tool;
            canvas.style.cursor = currentTool === 'pan' ? 'grab' : 
                                 currentTool === 'select' ? 'move' : 'default';
        });
    });

    // Mobile tool buttons
    document.querySelectorAll('#mobile-tools .tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#mobile-tools .tool-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
            currentTool = this.dataset.tool;
            canvas.style.cursor = currentTool === 'pan' ? 'grab' : 
                                 currentTool === 'select' ? 'move' : 'default';
        });
    });

    colorPicker.addEventListener('input', () => {
        currentColor = colorPicker.value;
    });

    lineWidth.addEventListener('input', () => {
        currentLineWidth = lineWidth.value;
    });

    importBtn.addEventListener('click', () => imageUpload.click());
    
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                layers[currentLayerIndex].objects.push({
                    type: 'image',
                    x: 10,
                    y: 10,
                    width: img.width,
                    height: img.height,
                    src: e.target.result
                });
                renderCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    addLayerBtn.addEventListener('click', addNewLayer);

    // File operations
    openBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', openDrawing);
        input.click();
    });

    mobileOpenBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', openDrawing);
        input.click();
        mobileMenu.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        const drawing = saveDrawing();
        alert(`Dibujo "${drawing.name}" guardado!`);
    });

    mobileSaveBtn.addEventListener('click', () => {
        const drawing = saveDrawing();
        alert(`Dibujo "${drawing.name}" guardado!`);
        mobileMenu.classList.add('hidden');
    });

    exportBtn.addEventListener('click', () => {
        exportModal.classList.remove('hidden');
        updateExportOptions();
    });

    mobileLayersBtn.addEventListener('click', () => {
        document.getElementById('layers-panel').classList.toggle('hidden');
        mobileMenu.classList.add('hidden');
    });

    mobileToolsBtn.addEventListener('click', () => {
        document.getElementById('tools-panel').classList.toggle('hidden');
        mobileMenu.classList.add('hidden');
    });

    mobileHomeBtn.addEventListener('click', () => {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('home-screen').style.display = 'flex';
        mobileMenu.classList.add('hidden');
        updateDrawingsList();
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la capa actual?')) {
            layers[currentLayerIndex].objects = [];
            renderCanvas();
        }
    });

    // Export modal
    exportFormat.addEventListener('change', updateExportOptions);
    cancelExport.addEventListener('click', () => exportModal.classList.add('hidden'));
    confirmExport.addEventListener('click', exportDrawing);

    // Mobile menu
    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.remove('hidden');
    });

    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });

    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Canvas events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    // Initialize the app
    document.getElementById('new-drawing-btn').addEventListener('click', () => {
        layers = [{
            name: 'Capa 1',
            visible: true,
            objects: []
        }];
        currentLayerIndex = 0;
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        
        document.getElementById('home-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initCanvas();
        updateLayersUI();
    });
    
    updateDrawingsList();
});