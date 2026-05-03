
        // ==================== MindMapNode 绫?====================
        class MindMapNode {
            constructor(id, text, parent = null) {
                this.id = id;
                this.text = text;
                this.parent = parent;
                this.children = [];
                this.x = 0;
                this.y = 0;
                this.expanded = true;
                this.width = 0;
                this.height = 0;
            }

            addChild(text) {
                const child = new MindMapNode(MindMap.instance.nodeIdCounter++, text, this);
                this.children.push(child);
                MindMap.instance.nodeMap.set(child.id, child);
                return child;
            }

            remove() {
                if (this.parent) {
                    const index = this.parent.children.indexOf(this);
                    if (index > -1) {
                        this.parent.children.splice(index, 1);
                    }
                }
                MindMap.instance.removeNodeRecursive(this);
            }

            getDepth() {
                let depth = 0;
                let node = this;
                while (node.parent) {
                    depth++;
                    node = node.parent;
                }
                return depth;
            }
        }

        // ==================== NodeLink 绫伙紙鑺傜偣鍏宠仈锛?====================
        class NodeLink {
            constructor(id, sourceId, targetId, sourceSide = 'right', targetSide = 'left') {
                this.id = id;
                this.sourceId = sourceId;
                this.targetId = targetId;
                this.sourceSide = sourceSide;
                this.targetSide = targetSide;
            }
        }

        // ==================== MindMap 涓荤被 ====================
        class MindMap {

            constructor() {
                MindMap.instance = this;

                // 鐘舵€?
                this.rootNode = null;
                this.selectedNode = null;
                this.nodeIdCounter = 1;
                this.nodeMap = new Map();

                // 鍏宠仈绾跨浉鍏?
                this.links = [];
                this.linkIdCounter = 0;
                this.selectedLink = null;
                this.isDraggingLink = false;
                this.dragLinkSource = null;
                this.dragLinkSourceSide = 'right';
                this.dragLinkStartPos = null;
                this.dragLinkCurrentPos = null;

                // 鑺傜偣鎷栧姩鐩稿叧
                this.isDraggingNode = false;
                this.draggedNode = null;
                this.dragNodeStartX = 0;
                this.dragNodeStartY = 0;
                this.dragNodeOffsetX = 0;
                this.dragNodeOffsetY = 0;
                this.mode = 'edit';

                // 瑙嗗浘鐘舵€?
                this.scale = 1;
                this.translateX = 0;
                this.translateY = 0;

                // 浜や簰鐘舵€?
                this.isDragging = false;
                this.isSpacePressed = false;
                this.dragStartX = 0;
                this.dragStartY = 0;

                // 甯搁噺
                this.NODE_HORIZONTAL_GAP = 100;
                this.NODE_VERTICAL_GAP = 24;
                this.NODE_MIN_WIDTH = 100;
                this.CANVAS_OFFSET = 5000;
                this.AUTO_NEW_NODE_OFFSET_Y = 68;

                // DOM 鍏冪礌
                this.canvas = document.getElementById('canvas');
                this.canvasContainer = document.getElementById('canvasContainer');
                this.nodesContainer = document.getElementById('nodes');
                this.connectionsSvg = document.getElementById('connections');
                this.zoomLevelEl = document.getElementById('zoomLevel');
                this.selectionInfoEl = document.getElementById('selectionInfo');
                this.selectedTextEl = document.getElementById('selectedText');
                this.toastEl = document.getElementById('toast');
                this.deleteLinkBtn = document.getElementById('deleteLinkBtn');
                this.modeReadBtn = document.getElementById('modeReadBtn');
                this.modeEditBtn = document.getElementById('modeEditBtn');

                this.init();
            }

            init() {
                // 鍒涘缓鏍硅妭鐐?
                this.rootNode = new MindMapNode(0, '中心主题', null);
                this.nodeMap.set(0, this.rootNode);

                // 娣诲姞绀轰緥鏁版嵁
                this.createSampleData();

                // 灞呬腑鏄剧ず
                this.centerView();

                // 娓叉煋
                this.render();
                this.selectNode(this.rootNode);

                // 缁戝畾浜嬩欢
                this.bindEvents();
                this.setMode('edit');

                // 鏄剧ず娆㈣繋鎻愮ず
                this.showToast('欢迎使用 MindFlow，按 ? 查看快捷键');
            }

            isReadMode() {
                return this.mode === 'read';
            }

            setMode(mode) {
                this.mode = mode === 'read' ? 'read' : 'edit';
                document.body.classList.toggle('read-mode', this.isReadMode());
                if (this.modeReadBtn) this.modeReadBtn.classList.toggle('active', this.isReadMode());
                if (this.modeEditBtn) this.modeEditBtn.classList.toggle('active', !this.isReadMode());
                this.showToast(this.isReadMode() ? '已切换到阅读模式' : '已切换到编辑模式');
            }

            createSampleData() {
                const child1 = this.rootNode.addChild('分支主题 1');
                const child2 = this.rootNode.addChild('分支主题 2');
                const child3 = this.rootNode.addChild('分支主题 3');

                child1.addChild('子主题 1.1');
                child1.addChild('子主题 1.2');
                child2.addChild('子主题 2.1');
            }

            centerView() {
                const rect = this.canvasContainer.getBoundingClientRect();
                this.translateX = this.CANVAS_OFFSET + rect.width / 2;
                this.translateY = this.CANVAS_OFFSET + rect.height / 2;
            }

            // ==================== 甯冨眬璁＄畻 ====================
            calculateLayout() {
                if (!this.rootNode) return;

                this.calculateNodeSizes(this.rootNode);
                this.calculatePositions(this.rootNode);
            }

            calculateNodeSizes(node) {
                // 鍒涘缓涓存椂鍏冪礌娴嬮噺鏂囨湰瀹藉害
                const tempSpan = document.createElement('span');
                tempSpan.style.cssText = `
                    position: absolute;
                    visibility: hidden;
                    white-space: nowrap;
                    font-size: ${node === this.rootNode ? '18px' : '14px'};
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    font-weight: ${node === this.rootNode ? '600' : '400'};
                `;
                tempSpan.textContent = node.text || '输入内容...';
                document.body.appendChild(tempSpan);

                const textWidth = tempSpan.offsetWidth;
                document.body.removeChild(tempSpan);

                // 璁＄畻鑺傜偣瀹藉害锛氭枃鏈搴?+ 鍐呰竟璺?
                const padding = node === this.rootNode ? 56 : 40;
                node.width = Math.max(this.NODE_MIN_WIDTH, Math.min(320, textWidth + padding));
                node.height = node === this.rootNode ? 52 : 44;

                if (node.children.length > 0 && node.expanded) {
                    for (const child of node.children) {
                        this.calculateNodeSizes(child);
                    }
                }
            }

            calculatePositions(node) {
                if (node === this.rootNode) {
                    node.x = 0;
                    node.y = 0;
                }

                if (node.children.length > 0 && node.expanded) {
                    let totalHeight = 0;
                    for (const child of node.children) {
                        totalHeight += this.getSubtreeHeight(child);
                    }
                    totalHeight += (node.children.length - 1) * this.NODE_VERTICAL_GAP;

                    let currentY = node.y - totalHeight / 2;
                    for (const child of node.children) {
                        const childHeight = this.getSubtreeHeight(child);
                        child.x = node.x + node.width + this.NODE_HORIZONTAL_GAP;
                        child.y = currentY + childHeight / 2;
                        currentY += this.getSubtreeHeight(child) + this.NODE_VERTICAL_GAP;

                        this.calculatePositions(child);
                    }
                }
            }

            getSubtreeHeight(node) {
                if (node.children.length === 0 || !node.expanded) {
                    return node.height;
                }

                let height = 0;
                for (const child of node.children) {
                    height += this.getSubtreeHeight(child);
                }
                height += (node.children.length - 1) * this.NODE_VERTICAL_GAP;
                return Math.max(node.height, height);
            }

            // ==================== 娓叉煋 ====================
            render() {
                this.calculateLayout();
                this.renderNodes();
                this.renderConnections();
                this.updateTransform();
            }

            renderWithoutLayout() {
                this.renderNodes();
                this.renderConnections();
                this.updateTransform();
                this.updateSelectionInfo();
            }

            renderNodes() {
                this.nodesContainer.innerHTML = '';
                this.renderNodeRecursive(this.rootNode, this.nodesContainer);
            }

            renderNodeRecursive(node, container) {
                const nodeEl = this.createNodeElement(node);
                container.appendChild(nodeEl);

                if (node.expanded) {
                    for (const child of node.children) {
                        this.renderNodeRecursive(child, container);
                    }
                }
            }

            createNodeElement(node) {
                const el = document.createElement('div');
                el.className = 'node' +
                    (node === this.rootNode ? ' root' : '') +
                    (node === this.selectedNode ? ' selected' : '');
                // 璁＄畻瀹為檯浣嶇疆锛氬噺鍘讳竴鍗婄殑瀹藉害鍜岄珮搴︽潵灞呬腑
                el.style.left = (node.x - node.width / 2) + 'px';
                el.style.top = (node.y - node.height / 2) + 'px';
                el.dataset.nodeId = node.id;

                const content = document.createElement('div');
                content.className = 'node-content';
                content.textContent = node.text;
                content.contentEditable = false;
                content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isDragging && !this.isDraggingLink && !this.isDraggingNode) {
                        this.handleNodeClick(node);
                    }
                });
                content.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.handleNodeClick(node);
                });
                el.appendChild(content);

                if (node.children.length > 0) {
                    const expandBtn = document.createElement('div');
                    expandBtn.className = 'expand-btn';
                    expandBtn.textContent = node.expanded ? '-' : '+';
                    expandBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleNode(node);
                    };
                    el.appendChild(expandBtn);
                }

                // 鍒涘缓鎮诞娣诲姞鎸夐挳瀹瑰櫒
                const addBtnContainer = document.createElement('div');
                addBtnContainer.className = 'add-btn-container';
                addBtnContainer.style.cssText = `
                    position: absolute;
                    inset: -30px;
                    z-index: 30;
                `;
                el.appendChild(addBtnContainer);

                // 鍙充晶娣诲姞瀛愯妭鐐规寜閽?
                const addChildBtn = document.createElement('div');
                addChildBtn.className = 'add-node-btn right';
                addChildBtn.innerHTML = '+';
                addChildBtn.title = '添加子节点';
                addChildBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.selectNode(node);
                    this.addChildNode();
                };
                addBtnContainer.appendChild(addChildBtn);

                // 濡傛灉涓嶆槸鏍硅妭鐐癸紝娣诲姞涓嬫柟娣诲姞鍏勫紵鑺傜偣鎸夐挳
                let addSiblingBtn = null;
                if (node !== this.rootNode) {
                    addSiblingBtn = document.createElement('div');
                    addSiblingBtn.className = 'add-node-btn bottom sibling';
                    addSiblingBtn.innerHTML = '+';
                    addSiblingBtn.title = '添加兄弟节点';
                    addSiblingBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.selectNode(node);
                        this.addSiblingNode();
                    };
                    addBtnContainer.appendChild(addSiblingBtn);
                }

                // 榧犳爣鎮诞浜嬩欢 - 浣跨敤瀹瑰櫒鏉ュ垽鏂?
                let isMouseOver = false;

                const showButtons = () => {
                    addChildBtn.classList.add('visible');
                    if (addSiblingBtn) addSiblingBtn.classList.add('visible');
                };

                const hideButtons = () => {
                    setTimeout(() => {
                        if (!isMouseOver) {
                            addChildBtn.classList.remove('visible');
                            if (addSiblingBtn) addSiblingBtn.classList.remove('visible');
                        }
                    }, 50);
                };

                el.addEventListener('mouseenter', () => {
                    isMouseOver = true;
                    showButtons();
                });

                el.addEventListener('mouseleave', () => {
                    isMouseOver = false;
                    hideButtons();
                });

                addBtnContainer.addEventListener('mouseenter', () => {
                    isMouseOver = true;
                    showButtons();
                });

                addBtnContainer.addEventListener('mouseleave', () => {
                    isMouseOver = false;
                    hideButtons();
                });

                // 娣诲姞杩炴帴鐐?
                const leftHandle = document.createElement('div');
                leftHandle.className = 'connection-handle left';
                leftHandle.dataset.handle = 'left';
                this.bindConnectionHandle(leftHandle, node, 'left');
                el.appendChild(leftHandle);

                const rightHandle = document.createElement('div');
                rightHandle.className = 'connection-handle right';
                rightHandle.dataset.handle = 'right';
                this.bindConnectionHandle(rightHandle, node, 'right');
                el.appendChild(rightHandle);

                const topHandle = document.createElement('div');
                topHandle.className = 'connection-handle top';
                topHandle.dataset.handle = 'top';
                this.bindConnectionHandle(topHandle, node, 'top');
                el.appendChild(topHandle);

                const bottomHandle = document.createElement('div');
                bottomHandle.className = 'connection-handle bottom';
                bottomHandle.dataset.handle = 'bottom';
                this.bindConnectionHandle(bottomHandle, node, 'bottom');
                el.appendChild(bottomHandle);

                el.addEventListener('click', (e) => {
                    if (!this.isDragging && !this.isDraggingLink && !this.isDraggingNode) {
                        this.handleNodeClick(node);
                    }
                });

                el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.handleNodeClick(node);
                });

                // 鑺傜偣鎷栧姩浜嬩欢
                el.addEventListener('mousedown', (e) => {
                    // 鍙湁宸﹂敭鐐瑰嚮涓斾笉鏄偣鍑诲湪缂栬緫鍖哄煙銆佹寜閽垨杩炴帴鐐逛笂鏃舵墠鍚姩鎷栧姩
                    const isContent = e.target.classList.contains('node-content');
                    const isAddBtn = e.target.classList.contains('add-node-btn');
                    const isHandle = e.target.classList.contains('connection-handle');
                    const isAddContainer = e.target.parentElement && e.target.parentElement.classList.contains('add-btn-container');
                    if (e.button === 0 && !isContent && !isAddBtn && !isHandle && !isAddContainer) {
                        this.startDragNode(node, e);
                    }
                });

                return el;
            }

            startDragNode(node, e) {
                if (this.isReadMode()) return;
                if (node === this.rootNode) return; // 鏍硅妭鐐逛笉鍏佽鎷栧姩

                this.isDraggingNode = true;
                this.draggedNode = node;
                this.dragNodeStartX = node.x;
                this.dragNodeStartY = node.y;

                // 璁＄畻榧犳爣鐩稿浜庤妭鐐逛腑蹇冪殑鍋忕Щ
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / this.scale;
                const mouseY = (e.clientY - rect.top) / this.scale;
                this.dragNodeOffsetX = mouseX - node.x;
                this.dragNodeOffsetY = mouseY - node.y;

                // 娣诲姞鎷栧姩鏍峰紡
                const el = document.querySelector(`[data-node-id="${node.id}"]`);
                if (el) el.classList.add('dragging');

                e.preventDefault();
                e.stopPropagation();
            }

            updateDragNode(e) {
                if (!this.isDraggingNode || !this.draggedNode) return;

                const rect = this.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / this.scale;
                const mouseY = (e.clientY - rect.top) / this.scale;

                // 鏇存柊鑺傜偣浣嶇疆
                this.draggedNode.x = mouseX - this.dragNodeOffsetX;
                this.draggedNode.y = mouseY - this.dragNodeOffsetY;

                // 鏇存柊DOM浣嶇疆
                const el = document.querySelector(`[data-node-id="${this.draggedNode.id}"]`);
                if (el) {
                    el.style.left = (this.draggedNode.x - this.draggedNode.width / 2) + 'px';
                    el.style.top = (this.draggedNode.y - this.draggedNode.height / 2) + 'px';
                }

                // 閲嶆柊娓叉煋杩炴帴绾?
                this.renderConnections();
            }

            endDragNode(e) {
                if (!this.isDraggingNode || !this.draggedNode) return;

                const el = document.querySelector(`[data-node-id="${this.draggedNode.id}"]`);
                if (el) el.classList.remove('dragging');

                // Persist sibling order based on vertical placement after drag.
                if (this.draggedNode.parent) {
                    this.sortSiblingsByY(this.draggedNode.parent);
                }

                this.isDraggingNode = false;
                this.draggedNode = null;
            }

            resetAllNodePositions() {
                this.render();
                this.showToast('已重置布局');
            }

            autoAlign() {
                // Keep current user-defined top/bottom sibling ordering before layout.
                this.normalizeSiblingOrderRecursive(this.rootNode);
                this.render();
                this.renderConnections();
                this.showToast('已自动对齐');
            }

            sortSiblingsByY(parentNode) {
                if (!parentNode || !Array.isArray(parentNode.children)) return;
                parentNode.children.sort((a, b) => {
                    const dy = a.y - b.y;
                    if (Math.abs(dy) > 0.001) return dy;
                    return a.id - b.id;
                });
            }

            normalizeSiblingOrderRecursive(node) {
                if (!node || !node.children || node.children.length === 0) return;
                this.sortSiblingsByY(node);
                for (const child of node.children) {
                    this.normalizeSiblingOrderRecursive(child);
                }
            }

            bindConnectionHandle(handle, node, position) {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startDragLink(node, position, e);
                });
            }

            renderConnections() {
                // 淇濈暀 defs锛屽彧绉婚櫎 path 鍏冪礌
                const defs = this.connectionsSvg.querySelector('defs');
                const paths = this.connectionsSvg.querySelectorAll('path');
                paths.forEach(path => path.remove());

                this.renderConnectionsRecursive(this.rootNode);
                this.renderLinks();
                this.renderDraggingLink();
            }

            renderConnectionsRecursive(node) {
                if (!node.expanded) return;

                for (const child of node.children) {
                    const path = this.createConnectionPath(node, child);
                    this.connectionsSvg.appendChild(path);
                    this.renderConnectionsRecursive(child);
                }
            }

            createConnectionPath(parent, child) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.classList.add('connection');

                // 浠庣埗鑺傜偣鍙充晶涓績杩炴帴鍒板瓙鑺傜偣宸︿晶涓績
                const startX = parent.x + parent.width / 2;
                const startY = parent.y;
                const endX = child.x - child.width / 2;
                const endY = child.y;

                const dx = endX - startX;
                const dy = endY - startY;
                let d = '';
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                    // Avoid degenerate zero-length path that can disappear.
                    d = `M ${startX} ${startY} L ${startX + 0.1} ${startY}`;
                } else if (Math.abs(dy) < 0.5) {
                    // Keep purely horizontal links visible and crisp.
                    d = `M ${startX} ${startY} L ${endX} ${endY}`;
                } else {
                    const controlOffset = Math.max(24, Math.abs(dx) * 0.5);
                    d = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
                }

                path.setAttribute('d', d);
                return path;
            }

            getNodeAnchor(node, side) {
                switch (side) {
                    case 'left':
                        return { x: node.x - node.width / 2, y: node.y };
                    case 'top':
                        return { x: node.x, y: node.y - node.height / 2 };
                    case 'bottom':
                        return { x: node.x, y: node.y + node.height / 2 };
                    case 'right':
                    default:
                        return { x: node.x + node.width / 2, y: node.y };
                }
            }

            getSideDirection(side) {
                switch (side) {
                    case 'left':
                        return { x: -1, y: 0 };
                    case 'top':
                        return { x: 0, y: -1 };
                    case 'bottom':
                        return { x: 0, y: 1 };
                    case 'right':
                    default:
                        return { x: 1, y: 0 };
                }
            }

            getNearestSide(node, pointX, pointY) {
                const sides = ['left', 'right', 'top', 'bottom'];
                let nearestSide = 'left';
                let nearestDist2 = Infinity;
                for (const side of sides) {
                    const p = this.getNodeAnchor(node, side);
                    const dx = p.x - pointX;
                    const dy = p.y - pointY;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < nearestDist2) {
                        nearestDist2 = d2;
                        nearestSide = side;
                    }
                }
                return nearestSide;
            }

            // ==================== 鍏宠仈绾垮姛鑳?====================
            renderLinks() {
                for (const link of this.links) {
                    const sourceNode = this.nodeMap.get(link.sourceId);
                    const targetNode = this.nodeMap.get(link.targetId);
                    if (sourceNode && targetNode) {
                        const path = this.createLinkPath(sourceNode, targetNode, link);
                        this.connectionsSvg.appendChild(path);
                    }
                }
            }

            createLinkPath(source, target, link) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.classList.add('link');
                if (link === this.selectedLink) {
                    path.classList.add('selected');
                }
                path.dataset.linkId = link.id;

                const sourceSide = link.sourceSide || 'right';
                const targetSide = link.targetSide || 'left';
                const start = this.getNodeAnchor(source, sourceSide);
                const end = this.getNodeAnchor(target, targetSide);
                const startX = start.x;
                const startY = start.y;
                const endX = end.x;
                const endY = end.y;

                const dx = endX - startX;
                const dy = endY - startY;
                const dist = Math.hypot(dx, dy);
                const controlLen = Math.max(30, Math.min(120, dist * 0.45));
                const sDir = this.getSideDirection(sourceSide);
                const tDir = this.getSideDirection(targetSide);
                const c1x = startX + sDir.x * controlLen;
                const c1y = startY + sDir.y * controlLen;
                const c2x = endX + tDir.x * controlLen;
                const c2y = endY + tDir.y * controlLen;
                const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

                path.setAttribute('d', d);
                path.setAttribute('marker-end', link === this.selectedLink ? 'url(#arrowhead-selected)' : 'url(#arrowhead)');

                path.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectLink(link);
                });

                return path;
            }

            renderDraggingLink() {
                if (this.isDraggingLink && this.dragLinkSource && this.dragLinkCurrentPos) {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.classList.add('dragging-link');

                    const source = this.dragLinkSource;
                    const start = this.getNodeAnchor(source, this.dragLinkSourceSide || 'right');
                    const startX = start.x;
                    const startY = start.y;
                    const endX = this.dragLinkCurrentPos.x;
                    const endY = this.dragLinkCurrentPos.y;

                    const dx = endX - startX;
                    const dy = endY - startY;
                    const dist = Math.hypot(dx, dy);
                    const controlLen = Math.max(24, Math.min(100, dist * 0.45));
                    const sDir = this.getSideDirection(this.dragLinkSourceSide || 'right');
                    const c1x = startX + sDir.x * controlLen;
                    const c1y = startY + sDir.y * controlLen;
                    const c2x = endX - sDir.x * (controlLen * 0.6);
                    const c2y = endY - sDir.y * (controlLen * 0.6);
                    const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

                    path.setAttribute('d', d);
                    this.connectionsSvg.appendChild(path);
                }
            }

            startDragLink(node, position, e) {
                if (this.isReadMode()) return;
                this.isDraggingLink = true;
                this.dragLinkSource = node;
                this.dragLinkSourceSide = position || 'right';
                this.dragLinkStartPos = { x: node.x, y: node.y };

                // 杞崲榧犳爣鍧愭爣鍒扮敾甯冨潗鏍?
                const rect = this.canvas.getBoundingClientRect();
                this.dragLinkCurrentPos = this.screenToCanvas(e.clientX, e.clientY);

                this.canvasContainer.style.cursor = 'crosshair';
            }

            updateDragLink(e) {
                if (!this.isDraggingLink) return;
                this.dragLinkCurrentPos = this.screenToCanvas(e.clientX, e.clientY);
                this.renderConnections();
            }

            endDragLink(e) {
                if (!this.isDraggingLink) return;

                // 妫€鏌ユ槸鍚﹂噴鏀惧埌鏌愪釜鑺傜偣涓?
                const targetNode = this.getNodeAtPosition(e.clientX, e.clientY);

                if (targetNode && targetNode !== this.dragLinkSource) {
                    // 妫€鏌ユ槸鍚﹀凡瀛樺湪杩炴帴
                    const existingLink = this.links.find(l =>
                        (l.sourceId === this.dragLinkSource.id && l.targetId === targetNode.id) ||
                        (l.sourceId === targetNode.id && l.targetId === this.dragLinkSource.id)
                    );

                    if (!existingLink) {
                        const targetSide = this.getNearestSide(
                            targetNode,
                            this.dragLinkCurrentPos.x,
                            this.dragLinkCurrentPos.y
                        );
                        this.addLink(
                            this.dragLinkSource.id,
                            targetNode.id,
                            this.dragLinkSourceSide || 'right',
                            targetSide
                        );
                        this.showToast('已创建关联');
                    } else {
                        this.showToast('关联已存在');
                    }
                }

                this.isDraggingLink = false;
                this.dragLinkSource = null;
                this.dragLinkSourceSide = 'right';
                this.dragLinkStartPos = null;
                this.dragLinkCurrentPos = null;
                this.canvasContainer.style.cursor = '';
                this.renderConnections();
            }

            screenToCanvas(screenX, screenY) {
                const rect = this.canvas.getBoundingClientRect();
                return {
                    x: (screenX - rect.left) / this.scale,
                    y: (screenY - rect.top) / this.scale
                };
            }

            getNodeAtPosition(screenX, screenY) {
                const canvasPos = this.screenToCanvas(screenX, screenY);

                for (const node of this.nodeMap.values()) {
                    const halfWidth = node.width / 2;
                    const halfHeight = node.height / 2;
                    if (canvasPos.x >= node.x - halfWidth && canvasPos.x <= node.x + halfWidth &&
                        canvasPos.y >= node.y - halfHeight && canvasPos.y <= node.y + halfHeight) {
                        return node;
                    }
                }
                return null;
            }

            addLink(sourceId, targetId, sourceSide = 'right', targetSide = 'left') {
                const link = new NodeLink(this.linkIdCounter++, sourceId, targetId, sourceSide, targetSide);
                this.links.push(link);
                this.renderConnections();
            }

            selectLink(link) {
                this.selectedLink = link;
                this.selectedNode = null;
                this.renderNodes();
                this.renderConnections();
                this.updateDeleteLinkButton();
            }

            updateDeleteLinkButton() {
                if (this.selectedLink) {
                    this.deleteLinkBtn.style.display = 'flex';
                } else {
                    this.deleteLinkBtn.style.display = 'none';
                }
            }

            deleteSelectedLink() {
                if (this.isReadMode()) return;
                if (!this.selectedLink) return;

                const index = this.links.indexOf(this.selectedLink);
                if (index > -1) {
                    this.links.splice(index, 1);
                    this.selectedLink = null;
                    this.renderConnections();
                    this.updateDeleteLinkButton();
                    this.showToast('已删除关联');
                }
            }

            clearLinksForNode(nodeId) {
                this.links = this.links.filter(link =>
                    link.sourceId !== nodeId && link.targetId !== nodeId
                );
                if (this.selectedLink &&
                    (this.selectedLink.sourceId === nodeId || this.selectedLink.targetId === nodeId)) {
                    this.selectedLink = null;
                    this.updateDeleteLinkButton();
                }
            }

            updateTransform() {
                this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
                this.zoomLevelEl.textContent = Math.round(this.scale * 100) + '%';
            }

            // ==================== 鑺傜偣鎿嶄綔 ====================
            selectNode(node) {
                this.selectedNode = node;
                this.selectedLink = null;
                this.updateDeleteLinkButton();
                this.renderNodes();
                this.renderConnections();
                this.updateSelectionInfo();
            }

            updateSelectionInfo() {
                if (this.selectedNode) {
                    this.selectedTextEl.textContent = this.selectedNode.text;
                    this.selectionInfoEl.classList.add('visible');
                } else {
                    this.selectionInfoEl.classList.remove('visible');
                }
            }

            editSelectedNode() {
                if (!this.selectedNode || this.isReadMode()) return;
                const el = document.querySelector(`[data-node-id="${this.selectedNode.id}"] .node-content`);
                if (el) this.startEditing(this.selectedNode, el);
            }

            handleNodeClick(node) {
                if (this.isReadMode()) {
                    this.selectNode(node);
                    return;
                }
                const activeEl = document.activeElement;
                if (activeEl && activeEl.classList && activeEl.classList.contains('node-content')) {
                    return;
                }
                if (this.selectedNode === node) {
                    this.editSelectedNode();
                    return;
                }
                this.selectNode(node);
            }

            toggleNode(node) {
                node.expanded = !node.expanded;
                this.render();
            }

            startEditing(node, contentEl) {
                if (this.isReadMode()) return;
                contentEl.contentEditable = true;
                contentEl.focus();

                const range = document.createRange();
                range.selectNodeContents(contentEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                // 缂栬緫鏃跺厑璁歌嚜鍔ㄦ崲琛屼互閫傚簲鍐呭
                const nodeEl = contentEl.parentElement;
                nodeEl.style.whiteSpace = 'normal';
                nodeEl.style.minWidth = nodeEl.style.width;
                nodeEl.style.width = 'auto';
                contentEl.style.whiteSpace = 'normal';

                const saveEdit = () => {
                    contentEl.contentEditable = false;
                    const newText = contentEl.textContent.trim();
                    if (newText) {
                        node.text = newText;
                        // 鎭㈠鏍峰紡
                        nodeEl.style.whiteSpace = 'nowrap';
                        nodeEl.style.minWidth = '';
                        contentEl.style.whiteSpace = 'nowrap';
                        this.renderWithoutLayout();
                        this.showToast('已保存');
                    } else {
                        contentEl.textContent = node.text;
                        nodeEl.style.whiteSpace = 'nowrap';
                        nodeEl.style.minWidth = '';
                        contentEl.style.whiteSpace = 'nowrap';
                        this.renderWithoutLayout();
                    }
                };

                contentEl.addEventListener('blur', saveEdit, { once: true });
                contentEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        contentEl.blur();
                    }
                    if (e.key === 'Escape') {
                        contentEl.textContent = node.text;
                        nodeEl.style.whiteSpace = 'nowrap';
                        nodeEl.style.minWidth = '';
                        contentEl.style.whiteSpace = 'nowrap';
                        contentEl.blur();
                        this.renderWithoutLayout();
                    }
                });
            }

            addChildNode() {
                if (this.isReadMode()) return;
                if (!this.selectedNode) {
                    this.showToast('请先选择一个节点');
                    return;
                }

                const newNode = this.selectedNode.addChild('新节点');
                this.selectedNode.expanded = true;
                this.calculateNodeSizes(newNode);
                const childCount = this.selectedNode.children.length;
                newNode.x = this.selectedNode.x + this.selectedNode.width + this.NODE_HORIZONTAL_GAP;
                newNode.y = this.selectedNode.y + (childCount - 1) * this.AUTO_NEW_NODE_OFFSET_Y;
                this.renderNodes();
                this.renderConnections();
                this.updateTransform();
                this.selectNode(newNode);

                setTimeout(() => {
                    const el = document.querySelector(`[data-node-id="${newNode.id}"] .node-content`);
                    if (el) this.startEditing(newNode, el);
                }, 50);
            }

            addSiblingNode() {
                if (this.isReadMode()) return;
                if (!this.selectedNode) {
                    this.showToast('请先选择一个节点');
                    return;
                }

                if (this.selectedNode === this.rootNode) {
                    this.addChildNode();
                    return;
                }

                const newNode = this.selectedNode.parent.addChild('新节点');
                this.calculateNodeSizes(newNode);
                newNode.x = this.selectedNode.x;
                newNode.y = this.selectedNode.y + this.AUTO_NEW_NODE_OFFSET_Y;
                this.renderNodes();
                this.renderConnections();
                this.updateTransform();
                this.selectNode(newNode);

                setTimeout(() => {
                    const el = document.querySelector(`[data-node-id="${newNode.id}"] .node-content`);
                    if (el) this.startEditing(newNode, el);
                }, 50);
            }

            deleteNode() {
                if (this.isReadMode()) return;
                if (!this.selectedNode) {
                    this.showToast('请先选择一个节点');
                    return;
                }

                if (this.selectedNode === this.rootNode) {
                    this.showToast('不能删除根节点');
                    return;
                }

                const parent = this.selectedNode.parent;
                this.selectedNode.remove();
                this.selectNode(parent);
                this.render();
                this.showToast('已删除');
            }

            removeNodeRecursive(node) {
                this.clearLinksForNode(node.id);
                this.nodeMap.delete(node.id);
                for (const child of node.children) {
                    this.removeNodeRecursive(child);
                }
            }

            expandAll() {
                this.expandAllRecursive(this.rootNode);
                this.render();
                this.showToast('已展开全部');
            }

            expandAllRecursive(node) {
                node.expanded = true;
                for (const child of node.children) {
                    this.expandAllRecursive(child);
                }
            }

            collapseAll() {
                this.collapseAllRecursive(this.rootNode);
                this.rootNode.expanded = true;
                this.render();
                this.showToast('已折叠全部');
            }

            collapseAllRecursive(node) {
                if (node.children.length > 0) {
                    node.expanded = false;
                    for (const child of node.children) {
                        this.collapseAllRecursive(child);
                    }
                }
            }

            // ==================== 瑙嗗浘鎺у埗 ====================
            zoomIn() {
                this.scale = Math.min(this.scale * 1.2, 3);
                this.updateTransform();
            }

            zoomOut() {
                this.scale = Math.max(this.scale / 1.2, 0.3);
                this.updateTransform();
            }

            resetView() {
                this.scale = 1;
                this.centerView();
                this.updateTransform();
                this.showToast('视图已重置');
            }

            // ==================== 瀵煎叆瀵煎嚭 ====================
            exportJSON() {
                const data = {
                    version: '1.1',
                    root: this.serializeNode(this.rootNode),
                    links: this.links.map(link => ({
                        id: link.id,
                        sourceId: link.sourceId,
                        targetId: link.targetId,
                        sourceSide: link.sourceSide || 'right',
                        targetSide: link.targetSide || 'left'
                    })),
                    view: {
                        scale: this.scale,
                        translateX: this.translateX,
                        translateY: this.translateY
                    }
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mindmap_${new Date().getTime()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('已导出');
            }

            getVisibleNodes(node = this.rootNode, acc = []) {
                if (!node) return acc;
                acc.push(node);
                if (node.expanded) {
                    for (const child of node.children) {
                        this.getVisibleNodes(child, acc);
                    }
                }
                return acc;
            }

            exportImage(format = 'png') {
                const visibleNodes = this.getVisibleNodes();
                if (!visibleNodes.length) return;

                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;

                for (const node of visibleNodes) {
                    minX = Math.min(minX, node.x - node.width / 2);
                    minY = Math.min(minY, node.y - node.height / 2);
                    maxX = Math.max(maxX, node.x + node.width / 2);
                    maxY = Math.max(maxY, node.y + node.height / 2);
                }

                const padding = 48;
                const width = Math.max(1, Math.ceil(maxX - minX + padding * 2));
                const height = Math.max(1, Math.ceil(maxY - minY + padding * 2));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const isJpeg = format === 'jpeg';
                ctx.fillStyle = isJpeg ? '#0f172a' : 'rgba(0,0,0,0)';
                ctx.fillRect(0, 0, width, height);

                const offsetX = padding - minX;
                const offsetY = padding - minY;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const drawTreeConnections = (node) => {
                    if (!node.expanded) return;
                    for (const child of node.children) {
                        const startX = node.x + node.width / 2 + offsetX;
                        const startY = node.y + offsetY;
                        const endX = child.x - child.width / 2 + offsetX;
                        const endY = child.y + offsetY;
                        const midX = (startX + endX) / 2;
                        ctx.strokeStyle = '#818cf8';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
                        ctx.stroke();
                        drawTreeConnections(child);
                    }
                };
                drawTreeConnections(this.rootNode);

                for (const link of this.links) {
                    const source = this.nodeMap.get(link.sourceId);
                    const target = this.nodeMap.get(link.targetId);
                    if (!source || !target) continue;
                    const startX = source.x + source.width / 2 + offsetX;
                    const startY = source.y + offsetY;
                    const endX = target.x - target.width / 2 + offsetX;
                    const endY = target.y + offsetY;
                    const controlOffset = Math.abs(endX - startX) * 0.5;
                    ctx.strokeStyle = '#22d3ee';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.bezierCurveTo(startX + controlOffset, startY, endX - controlOffset, endY, endX, endY);
                    ctx.stroke();
                }

                for (const node of visibleNodes) {
                    const x = node.x - node.width / 2 + offsetX;
                    const y = node.y - node.height / 2 + offsetY;
                    const r = 12;

                    ctx.fillStyle = node === this.rootNode ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.9)';
                    ctx.strokeStyle = node === this.rootNode ? 'rgba(99,102,241,0.7)' : 'rgba(148,163,184,0.3)';
                    ctx.lineWidth = 1.5;

                    ctx.beginPath();
                    ctx.moveTo(x + r, y);
                    ctx.lineTo(x + node.width - r, y);
                    ctx.quadraticCurveTo(x + node.width, y, x + node.width, y + r);
                    ctx.lineTo(x + node.width, y + node.height - r);
                    ctx.quadraticCurveTo(x + node.width, y + node.height, x + node.width - r, y + node.height);
                    ctx.lineTo(x + r, y + node.height);
                    ctx.quadraticCurveTo(x, y + node.height, x, y + node.height - r);
                    ctx.lineTo(x, y + r);
                    ctx.quadraticCurveTo(x, y, x + r, y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#f1f5f9';
                    ctx.font = node === this.rootNode ? '600 18px Segoe UI' : '400 14px Segoe UI';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(node.text || '', node.x + offsetX, node.y + offsetY);
                }

                const mime = isJpeg ? 'image/jpeg' : 'image/png';
                const quality = isJpeg ? 0.92 : undefined;
                const url = canvas.toDataURL(mime, quality);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mindmap_${new Date().getTime()}.${isJpeg ? 'jpeg' : 'png'}`;
                a.click();
                this.showToast(`已导出 ${isJpeg ? 'JPEG' : 'PNG'}`);
            }

            serializeNode(node) {
                return {
                    id: node.id,
                    text: node.text,
                    expanded: node.expanded,
                    children: node.children.map(child => this.serializeNode(child))
                };
            }

            importJSON(event) {
                if (this.isReadMode()) return;
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.loadFromData(data);
                        this.showToast('导入成功');
                    } catch (err) {
                        this.showToast('导入失败：文件格式错误');
                    }
                };
                reader.readAsText(file);
                event.target.value = '';
            }

            loadFromData(data) {
                this.nodeMap.clear();
                this.links = [];
                this.nodeIdCounter = 0;
                this.linkIdCounter = 0;
                this.selectedLink = null;
                this.updateDeleteLinkButton();

                this.rootNode = this.deserializeNode(data.root, null);
                this.nodeIdCounter++;

                // 鍔犺浇鍏宠仈绾?
                if (data.links) {
                    for (const linkData of data.links) {
                        const link = new NodeLink(
                            linkData.id,
                            linkData.sourceId,
                            linkData.targetId,
                            linkData.sourceSide || 'right',
                            linkData.targetSide || 'left'
                        );
                        this.links.push(link);
                        this.linkIdCounter = Math.max(this.linkIdCounter, linkData.id + 1);
                    }
                }

                if (data.view) {
                    this.scale = data.view.scale || 1;
                    this.translateX = data.view.translateX || (this.CANVAS_OFFSET + this.canvasContainer.clientWidth / 2);
                    this.translateY = data.view.translateY || (this.CANVAS_OFFSET + this.canvasContainer.clientHeight / 2);
                }

                this.render();
                this.selectNode(this.rootNode);
            }

            deserializeNode(data, parent) {
                const node = new MindMapNode(data.id, data.text, parent);
                node.expanded = data.expanded !== false;
                this.nodeMap.set(node.id, node);
                this.nodeIdCounter = Math.max(this.nodeIdCounter, data.id + 1);

                for (const childData of data.children || []) {
                    const child = this.deserializeNode(childData, node);
                    node.children.push(child);
                }

                return node;
            }

            // ==================== 宸ュ叿鏂规硶 ====================
            showToast(message) {
                this.toastEl.textContent = message;
                this.toastEl.classList.add('show');
                setTimeout(() => {
                    this.toastEl.classList.remove('show');
                }, 2000);
            }

            // ==================== 浜嬩欢缁戝畾 ====================
            bindEvents() {
                // 閿洏浜嬩欢
                document.addEventListener('keydown', (e) => this.handleKeyDown(e));
                document.addEventListener('keyup', (e) => this.handleKeyUp(e));

                // 榧犳爣浜嬩欢
                this.canvasContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
                document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
                document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

                // 婊氳疆缂╂斁
                this.canvasContainer.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

                // 绌虹櫧澶勭偣鍑诲彇娑堥€夋嫨
                this.canvasContainer.addEventListener('click', (e) => {
                    if (e.target === this.canvasContainer || e.target.classList.contains('grid')) {
                        this.selectedNode = null;
                        this.selectedLink = null;
                        this.updateDeleteLinkButton();
                        this.renderNodes();
                        this.renderConnections();
                        this.updateSelectionInfo();
                    }
                });

                // 绐楀彛澶у皬鏀瑰彉
                window.addEventListener('resize', () => {
                    if (this.translateX === 0 && this.translateY === 0) {
                        this.centerView();
                        this.updateTransform();
                    }
                });
            }

            handleKeyDown(e) {
                if (e.ctrlKey && e.key === '1') {
                    e.preventDefault();
                    this.setMode('read');
                    return;
                }
                if (e.ctrlKey && e.key === '2') {
                    e.preventDefault();
                    this.setMode('edit');
                    return;
                }

                // 甯姪
                if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    toggleShortcuts();
                    return;
                }

                // F2 缂栬緫
                if (!this.isReadMode() && e.key === 'F2' && this.selectedNode) {
                    e.preventDefault();
                    this.editSelectedNode();
                }

                // Tab 娣诲姞瀛愯妭鐐?
                if (!this.isReadMode() && e.key === 'Tab' && this.selectedNode) {
                    e.preventDefault();
                    this.addChildNode();
                }

                // Enter 娣诲姞鍏勫紵鑺傜偣
                if (!this.isReadMode() && e.key === 'Enter' && this.selectedNode && !e.shiftKey) {
                    const activeEl = document.activeElement;
                    if (!activeEl || !activeEl.classList.contains('node-content')) {
                        e.preventDefault();
                        this.addSiblingNode();
                    }
                }

                // Delete 鍒犻櫎鑺傜偣鎴栧叧鑱旂嚎
                if (!this.isReadMode() && e.key === 'Delete') {
                    const activeEl = document.activeElement;
                    if (!activeEl || !activeEl.classList.contains('node-content')) {
                        e.preventDefault();
                        if (this.selectedLink) {
                            this.deleteSelectedLink();
                        } else if (this.selectedNode) {
                            this.deleteNode();
                        }
                    }
                }

                // Ctrl+S 瀵煎嚭
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.exportJSON();
                }

                // Space 鍑嗗鎷栨嫿
                if (e.key === ' ' && !e.repeat) {
                    const activeEl = document.activeElement;
                    if (!activeEl || !activeEl.classList.contains('node-content')) {
                        e.preventDefault();
                        this.isSpacePressed = true;
                        this.canvasContainer.style.cursor = 'grab';
                    }
                }
            }

            handleKeyUp(e) {
                if (e.key === ' ') {
                    this.isSpacePressed = false;
                    this.canvasContainer.style.cursor = 'default';
                }
            }

            handleMouseDown(e) {
                if (e.button === 0 && (this.isSpacePressed || e.target === this.canvasContainer || e.target.classList.contains('grid'))) {
                    this.isDragging = true;
                    this.dragStartX = e.clientX - this.translateX;
                    this.dragStartY = e.clientY - this.translateY;
                    this.canvasContainer.classList.add('dragging');
                }
            }

            handleMouseMove(e) {
                if (this.isDragging) {
                    this.translateX = e.clientX - this.dragStartX;
                    this.translateY = e.clientY - this.dragStartY;
                    this.updateTransform();
                }
                if (this.isDraggingLink) {
                    this.updateDragLink(e);
                }
                if (this.isDraggingNode) {
                    this.updateDragNode(e);
                }
            }

            handleMouseUp(e) {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.canvasContainer.classList.remove('dragging');
                }
                if (this.isDraggingLink) {
                    this.endDragLink(e);
                }
                if (this.isDraggingNode) {
                    this.endDragNode(e);
                }
            }

            handleWheel(e) {
                e.preventDefault();
                const containerRect = this.canvasContainer.getBoundingClientRect();
                const mouseX = e.clientX - containerRect.left;
                const mouseY = e.clientY - containerRect.top;
                const base = this.CANVAS_OFFSET;

                // Classic canvas zoom with canvas base offset (-CANVAS_OFFSET in CSS):
                // screen = -base + translate + world * scale
                // => world = (screen + base - translate) / scale
                const worldX = (mouseX + base - this.translateX) / this.scale;
                const worldY = (mouseY + base - this.translateY) / this.scale;

                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.3, Math.min(3, this.scale * delta));
                if (newScale === this.scale) return;
                this.scale = newScale;

                // keep mouse anchored after scaling:
                // translate = screen + base - world * scale
                this.translateX = mouseX + base - worldX * this.scale;
                this.translateY = mouseY + base - worldY * this.scale;
                this.updateTransform();
            }
        }

        // ==================== 鍏ㄥ眬鍑芥暟 ====================
        let mindMap;
        let shortcutsVisible = false;
        let exportMenuVisible = false;

        function toggleShortcuts() {
            shortcutsVisible = !shortcutsVisible;
            const panel = document.getElementById('shortcutsPanel');
            const btn = document.getElementById('helpBtn');

            if (shortcutsVisible) {
                panel.classList.add('visible');
                btn.classList.add('hidden');
            } else {
                panel.classList.remove('visible');
                btn.classList.remove('hidden');
            }
        }

        // ==================== 鍒濆鍖?====================
        function bootMindMap() {
            if (mindMap) return;
            mindMap = new MindMap();
            window.mindMap = mindMap;
        }

        function hideExportMenu() {
            exportMenuVisible = false;
            const menu = document.getElementById('exportMenu');
            if (menu) menu.classList.remove('visible');
        }

        function toggleExportMenu() {
            exportMenuVisible = !exportMenuVisible;
            const menu = document.getElementById('exportMenu');
            if (!menu) return;
            menu.classList.toggle('visible', exportMenuVisible);
        }

        MindMap.instance = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootMindMap);
        } else {
            bootMindMap();
        }

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('exportMenu');
            if (!menu || !exportMenuVisible) return;
            const wrapper = menu.parentElement;
            if (wrapper && !wrapper.contains(e.target)) {
                hideExportMenu();
            }
        });
    
