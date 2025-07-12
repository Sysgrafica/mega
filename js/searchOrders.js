class SearchOrdersComponent {
    constructor() {
        this.container = null;
        this.orders = [];
        this.filteredOrders = [];
        this.filters = {
            clientName: '',
            orderNumber: '',
            orderDate: '',
            entryDate: '',
            productType: '',
            materialType: '',
            seller: '',
            deliveryClassification: '',
            status: ''
        };
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `<div class="dashboard-loader"><i class="fas fa-spinner fa-spin"></i><p>Carregando busca de pedidos...</p></div>`;

        try {
            await this.loadInitialData();
            this.renderSearchPage();
            this.setupEventListeners();
            
            // Verifica se há um filtro pré-definido no localStorage
            const presetFilter = localStorage.getItem('presetSearchFilter');
            if (presetFilter) {
                try {
                    // Remove o filtro do localStorage para não aplicá-lo novamente em futuras navegações
                    localStorage.removeItem('presetSearchFilter');
                    
                    // Aplica o filtro pré-definido
                    const filterObj = JSON.parse(presetFilter);
                    
                    // Define os valores dos campos de filtro na interface
                    if (filterObj.status) {
                        document.getElementById('filter-status').value = filterObj.status;
                    }
                    
                    // Aplica os filtros
                    this.applyFilters();
                } catch (error) {
                    console.error("Erro ao aplicar filtro pré-definido:", error);
                }
            }
        } catch (error) {
            console.error("Erro ao renderizar a página de busca de pedidos:", error);
            this.container.innerHTML = `<div class="error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Erro ao Carregar</h2>
                <p>Não foi possível carregar os dados para a busca de pedidos.</p>
                <button class="btn btn-primary" id="retry-search-load">Tentar Novamente</button>
            </div>`;
            document.getElementById('retry-search-load').addEventListener('click', () => this.render(container));
        }
    }

    async loadInitialData() {
        // Carrega pedidos
        const ordersSnapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        this.orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.filteredOrders = this.orders;
        // Carrega produtos
        const productsSnapshot = await db.collection('products').orderBy('name').get();
        this.productNames = productsSnapshot.docs.map(doc => doc.data().name).filter(Boolean);
    }

    renderSearchPage() {
        const pageHtml = `
            <div class="page-header">
                <h1><i class="fas fa-search"></i> Buscar Pedidos</h1>
            </div>
            <div class="search-orders-container">
                ${this.renderFilters()}
                ${this.renderResults()}
            </div>
        `;
        this.container.innerHTML = pageHtml;
    }
    
    // Mapeamento de categorias para nomes amigáveis
    static CATEGORY_LABELS = {
        'impressao': 'Impressão Digital',
        'grafica': 'Gráfica Offset',
        'servico': 'Serviços',
        'outro': 'Outros'
    };

    renderFilters() {
        const sellers = this.getUniqueValues('sellerName');
        const categories = this.getUniqueValues('items.product.category');
        const statuses = SYSTEM_CONFIG.orderStatus;
        const productNames = this.productNames || [];

        // Filtra apenas categorias conhecidas
        const knownCategories = Object.keys(SearchOrdersComponent.CATEGORY_LABELS);
        const categoriesToShow = knownCategories.filter(c => categories.includes(c));
        if (categories.some(c => !knownCategories.includes(c))) {
            if (!categoriesToShow.includes('outro')) categoriesToShow.push('outro');
        }

        return `
            <div class="filters-panel">
                <h3><i class="fas fa-filter"></i> Filtros</h3>
                <div class="filter-actions">
                    <button id="apply-filters-btn" class="btn btn-primary"><i class="fas fa-search"></i> Aplicar</button>
                    <button id="clear-filters-btn" class="btn btn-secondary"><i class="fas fa-times"></i> Limpar</button>
                </div>
                <div id="active-filters-chips" class="active-filters-chips"></div>
                <div class="filter-group">
                    <label for="filter-fulltext">Busca Inteligente</label>
                    <input type="text" id="filter-fulltext" class="input" placeholder="Busque por cliente, produto, número do pedido...">
                </div>
                <div class="filter-group">
                    <label for="filter-orderNumber">Número do Pedido</label>
                    <input type="text" id="filter-orderNumber" class="input" placeholder="Ex: 12345">
                </div>
                <div class="filter-group">
                    <label for="filter-clientName">Nome do Cliente</label>
                    <input type="text" id="filter-clientName" class="input" placeholder="Digite para buscar...">
                </div>
                <div class="filter-group">
                    <label for="filter-productName">Nome do Produto/Serviço</label>
                    <input list="product-names-list" id="filter-productName" class="input" placeholder="Digite ou selecione o nome do produto ou serviço...">
                    <datalist id="product-names-list">
                        ${productNames.map(p => `<option value="${p}">`).join('')}
                    </datalist>
                </div>
                <div class="filter-group">
                    <label for="filter-status">Status do Pedido</label>
                    <select id="filter-status" class="select">
                        <option value="">Todos</option>
                        ${statuses.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-seller">Vendedor</label>
                    <select id="filter-seller" class="select">
                        <option value="">Todos</option>
                        ${sellers.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-category">Categoria</label>
                    <select id="filter-category" class="select">
                        <option value="">Todas</option>
                        ${categoriesToShow.map(c => `<option value="${c}">${SearchOrdersComponent.CATEGORY_LABELS[c]}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-min-value">Valor Mínimo</label>
                    <input type="number" id="filter-min-value" class="input" min="0" step="0.01" placeholder="R$ 0,00">
                </div>
                <div class="filter-group">
                    <label for="filter-max-value">Valor Máximo</label>
                    <input type="number" id="filter-max-value" class="input" min="0" step="0.01" placeholder="R$ 0,00">
                </div>
                <div class="filter-group">
                    <label for="filter-entryDate-start">Entrada Inicial</label>
                    <input type="date" id="filter-entryDate-start" class="input">
                </div>
                <div class="filter-group">
                    <label for="filter-entryDate-end">Entrada Final</label>
                    <input type="date" id="filter-entryDate-end" class="input">
                </div>
                <div class="filter-group">
                    <label for="filter-deliveryDate-start">Entrega Inicial</label>
                    <input type="date" id="filter-deliveryDate-start" class="input">
                </div>
                <div class="filter-group">
                    <label for="filter-deliveryDate-end">Entrega Final</label>
                    <input type="date" id="filter-deliveryDate-end" class="input">
                </div>
                <div class="filter-group">
                    <label for="sort-orders">Ordenar por</label>
                    <select id="sort-orders" class="select">
                        <option value="createdAt:desc">Data (mais recentes)</option>
                        <option value="createdAt:asc">Data (mais antigos)</option>
                        <option value="deliveryDate:asc">Prazo de Entrega (próximos)</option>
                        <option value="deliveryDate:desc">Prazo de Entrega (futuros)</option>
                        <option value="totalValue:desc">Valor (maior para menor)</option>
                        <option value="totalValue:asc">Valor (menor para maior)</option>
                        <option value="clientName:asc">Cliente (A-Z)</option>
                        <option value="clientName:desc">Cliente (Z-A)</option>
                    </select>
                </div>
                
            </div>
        `;
    }

    renderResults() {
        let resultsHtml = `
            <div class="results-panel">
                <div class="results-header">
                    <h4>Resultados da Busca (${this.filteredOrders.length})</h4>
                </div>
                <div class="search-orders-grid">`;

        if (this.filteredOrders.length === 0) {
            resultsHtml += `<div class="no-results-message"><i class="fas fa-info-circle"></i> Nenhum pedido encontrado com os filtros aplicados.</div>`;
        } else {
            this.filteredOrders.forEach(order => {
                resultsHtml += this.renderOrderCard(order);
            });
        }

        resultsHtml += `</div></div>`;
        return resultsHtml;
    }

    renderOrderCard(order) {
        const situacao = this.getSituacao(order);
        const statusInfo = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || { name: order.status, color: 'status-pending' };

        return `
            <div class="search-order-card ${situacao.class}" data-id="${order.id}">
                <div class="card-header">
                    <span class="order-number">#${order.orderNumber}</span>
                    <span class="status-badge ${statusInfo.color}">${statusInfo.name}</span>
                </div>
                <div class="card-body">
                    <p class="client-name">${order.clientName}</p>
                    <div class="order-details">
                        <div><i class="fas fa-calendar-alt"></i> <strong>Entrada:</strong> ${this.formatDateTime(order.createdAt)}</div>
                        <div><i class="fas fa-calendar-check"></i> <strong>Entrega:</strong> ${this.formatDateTime(order.deliveryDate, true)}</div>
                        <div><i class="fas fa-user"></i> <strong>Vendedor:</strong> ${order.sellerName || 'N/A'}</div>
                        <div><i class="fas fa-box-open"></i> <strong>Itens:</strong> ${order.items.length}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="delivery-status ${situacao.class}">${situacao.text}</div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-tertiary view-details-btn" title="Ver Detalhes">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                        <button class="btn btn-sm btn-danger delete-order-btn" title="Excluir Pedido">
                            <i class="fas fa-trash-alt"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getSituacao(order) {
        // Se a situação final já foi definida (travada), retorna ela
        if (order.finalSituacao) {
            // Usa a classe salva ou determina com base no texto
            let situacaoClass = order.finalSituacaoClass || 'situacao-default';
            if (!order.finalSituacaoClass) {
                switch (order.finalSituacao) {
                    case 'Atrasado': situacaoClass = 'situacao-atrasado'; break;
                    case 'Apresse': situacaoClass = 'situacao-apresse'; break;
                    case 'No prazo': situacaoClass = 'situacao-no-prazo'; break;
                    case 'A combinar': situacaoClass = 'situacao-combinar'; break;
                    case 'Pendente': situacaoClass = 'situacao-pendente'; break;
                }
            }
            return { text: order.finalSituacao, class: situacaoClass };
        }

        if (order.toArrange) return { text: 'A combinar', class: 'situacao-combinar' };
        if (!order.deliveryDate) return { text: 'Pendente', class: 'situacao-pendente' };
        
        try {
            const now = new Date();
            let deliveryDate;
            
            if (order.deliveryDate.toDate && typeof order.deliveryDate.toDate === 'function') {
                deliveryDate = order.deliveryDate.toDate();
            } else if (order.deliveryDate instanceof Date) {
                deliveryDate = order.deliveryDate;
            } else if (order.deliveryDate.seconds) {
                deliveryDate = new Date(order.deliveryDate.seconds * 1000);
            } else {
                deliveryDate = new Date(order.deliveryDate);
            }
            
            const diffMinutes = (deliveryDate.getTime() - now.getTime()) / (1000 * 60);

            if (diffMinutes < 0) {
                return { text: 'Atrasado', class: 'situacao-atrasado' };
            }
            if (diffMinutes <= 60) {
                return { text: 'Apresse', class: 'situacao-apresse' };
            }
            return { text: 'No prazo', class: 'situacao-no-prazo' };
        } catch (error) {
            console.error('Erro ao calcular situação do pedido:', error);
            return { text: 'Erro na data', class: 'situacao-default' };
        }
    }

    formatDateTime(timestamp, toArrangeText = false) {
        if (toArrangeText && !timestamp) return 'A combinar';
        if (!timestamp) return 'Não definida';
        
        const date = timestamp.toDate();
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleString('pt-BR', options);
    }

    formatDate(timestamp, toArrangeText = false) {
        if (toArrangeText && !timestamp) return 'A combinar';
        if (!timestamp) return 'Não definida';
        return timestamp.toDate().toLocaleDateString('pt-BR');
    }

    setupEventListeners() {
        document.getElementById('apply-filters-btn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters-btn').addEventListener('click', () => this.clearFilters());

        const resultsPanel = this.container.querySelector('.results-panel');
        resultsPanel.addEventListener('click', e => {
            const viewBtn = e.target.closest('.view-details-btn');
            const deleteBtn = e.target.closest('.delete-order-btn');

            if (viewBtn) {
                const card = viewBtn.closest('.search-order-card');
                if (card && card.dataset.id) {
                    if (window.ui) {
                        window.ui.showOrderDetails(card.dataset.id);
                    } else {
                        console.warn('UI component not available to show order details.');
                    }
                }
            }
            
            if (deleteBtn) {
                const card = deleteBtn.closest('.search-order-card');
                if (card && card.dataset.id) {
                    const orderId = card.dataset.id;
                    // A função agora é global e está em window.ui
                    if (window.ui && typeof window.ui.confirmDeleteOrder === 'function') {
                        window.ui.confirmDeleteOrder(orderId);
                        
                        // Ouve pelo evento para remover o card da tela
                        document.addEventListener('orderDeleted', function handler(event) {
                            if (event.detail.orderId === orderId) {
                                card.remove();
                                // Atualiza o contador de resultados
                                const resultsHeader = document.querySelector('.results-header h4');
                                if(resultsHeader) {
                                    const currentCount = parseInt(resultsHeader.textContent.match(/\d+/)[0]);
                                    resultsHeader.textContent = `Resultados da Busca (${currentCount - 1})`;
                                }
                                document.removeEventListener('orderDeleted', handler);
                            }
                        });

                    } else {
                        console.error('A função de exclusão (window.ui.confirmDeleteOrder) não está disponível.');
                        window.ui.showNotification('Erro: A função de exclusão não está acessível.', 'error');
                    }
                }
            }
        });
    }

    applyFilters() {
        console.log('[SearchOrders] Aplicando filtros...');

        const orderNumber = document.getElementById('filter-orderNumber').value.trim();
        const clientName = document.getElementById('filter-clientName').value.toLowerCase();
        const status = document.getElementById('filter-status').value;
        const seller = document.getElementById('filter-seller').value;
        const productName = document.getElementById('filter-productName').value.trim();
        const category = document.getElementById('filter-category').value;
        const minValue = parseFloat(document.getElementById('filter-min-value').value) || null;
        const maxValue = parseFloat(document.getElementById('filter-max-value').value) || null;
        const entryDateStart = document.getElementById('filter-entryDate-start').value;
        const entryDateEnd = document.getElementById('filter-entryDate-end').value;
        const deliveryDateStart = document.getElementById('filter-deliveryDate-start').value;
        const deliveryDateEnd = document.getElementById('filter-deliveryDate-end').value;
        const fulltext = document.getElementById('filter-fulltext').value.trim();
        const sortBy = document.getElementById('sort-orders').value;

        const nProductName = SearchOrdersComponent.normalizeText(productName);
        const nFulltext = SearchOrdersComponent.normalizeText(fulltext);

        console.log(`[SearchOrders] Termo normalizado para produto: "${nProductName}"`);
        console.log(`[SearchOrders] Termo normalizado para busca inteligente: "${nFulltext}"`);

        this.filteredOrders = this.orders.filter((order, index) => {
            // Log para inspecionar a estrutura do primeiro pedido
            if (index === 0) {
                try {
                    console.log('[SearchOrders] INSPECIONANDO PRIMEIRO PEDIDO:', JSON.stringify(order, null, 2));
                } catch (e) {
                    console.log('[SearchOrders] INSPECIONANDO PRIMEIRO PEDIDO (não foi possível converter para JSON):', order);
                }
            }

            // Busca inteligente melhorada
            const fulltextMatch = !nFulltext || nFulltext.split(/\s+/).filter(Boolean).every(term =>
                (SearchOrdersComponent.normalizeText(order.orderNumber).includes(term)) ||
                (SearchOrdersComponent.normalizeText(order.clientName).includes(term)) ||
                (order.items && order.items.some(item =>
                    (item.product && SearchOrdersComponent.normalizeText(item.product.name).includes(term)) ||
                    (SearchOrdersComponent.normalizeText(item.description).includes(term)) ||
                    (item.product && SearchOrdersComponent.normalizeText(item.product.category).includes(term))
                ))
            );

            // Filtros de datas
            const entryDate = order.createdAt ? order.createdAt.toDate() : null;
            const deliveryDate = order.deliveryDate ? order.deliveryDate.toDate() : null;
            const entryDateStartMatch = !entryDateStart || (entryDate && entryDate >= new Date(entryDateStart));
            const entryDateEndMatch = !entryDateEnd || (entryDate && entryDate <= new Date(entryDateEnd + 'T23:59:59'));
            const deliveryDateStartMatch = !deliveryDateStart || (deliveryDate && deliveryDate >= new Date(deliveryDateStart));
            const deliveryDateEndMatch = !deliveryDateEnd || (deliveryDate && deliveryDate <= new Date(deliveryDateEnd + 'T23:59:59'));

            // Filtros de valor
            const valueMatch = (
                (minValue === null || (order.totalValue && order.totalValue >= minValue)) &&
                (maxValue === null || (order.totalValue && order.totalValue <= maxValue))
            );
            
            // Filtro específico de produto
            const productNameMatch = !nProductName || (order.items && order.items.some(item => {
                if (!item.product) return false;
                const normalizedItemName = SearchOrdersComponent.normalizeText(item.product.name);
                return nProductName.split(/\s+/).filter(Boolean).every(term => normalizedItemName.includes(term));
            }));

            return (
                fulltextMatch &&
                productNameMatch &&
                (!orderNumber || (order.orderNumber && order.orderNumber.includes(orderNumber))) &&
                (!clientName || (order.clientName && order.clientName.toLowerCase().includes(clientName))) &&
                (!status || order.status === status) &&
                (!seller || order.sellerName === seller) &&
                (!category || (order.items && order.items.some(item => item.product?.category === category))) &&
                valueMatch &&
                entryDateStartMatch &&
                entryDateEndMatch &&
                deliveryDateStartMatch &&
                deliveryDateEndMatch
            );
        });

        console.log(`[SearchOrders] ${this.filteredOrders.length} pedidos encontrados.`);

        // Aplica a ordenação
        this.filteredOrders = this.sortOrders(this.filteredOrders, sortBy);

        this.rerenderResults();
        this.updateCategoryFilter();
        this.renderActiveFiltersChips();
    }

    clearFilters() {
        document.getElementById('filter-orderNumber').value = '';
        document.getElementById('filter-clientName').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-seller').value = '';
        document.getElementById('filter-productName').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-min-value').value = '';
        document.getElementById('filter-max-value').value = '';
        document.getElementById('filter-entryDate-start').value = '';
        document.getElementById('filter-entryDate-end').value = '';
        document.getElementById('filter-deliveryDate-start').value = '';
        document.getElementById('filter-deliveryDate-end').value = '';
        document.getElementById('filter-fulltext').value = '';
        document.getElementById('sort-orders').value = 'createdAt:desc';
        
        this.filteredOrders = this.orders;
        this.rerenderResults();
        this.updateCategoryFilter();
        this.renderActiveFiltersChips();
    }

    rerenderResults() {
        const resultsContainer = this.container.querySelector('.results-panel');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.renderResults();
        }
    }

    getUniqueValues(key, ordersArray = null) {
        const source = ordersArray || this.orders;
        if (key.includes('.')) {
            const keys = key.split('.');
            const arrayKey = keys[0]; // 'items'
            const nestedKeys = keys.slice(1); // ['product', 'name']

            const values = source.flatMap(order => {
                const items = order[arrayKey];
                if (!Array.isArray(items)) return [];
                
                return items.map(item => {
                    let current = item;
                    for (const k of nestedKeys) {
                        if (current && typeof current === 'object') {
                            current = current[k];
                        } else {
                            return undefined;
                        }
                    }
                    return current;
                });
            }).filter(Boolean);
            return [...new Set(values)].sort();
        }
        const values = source.map(order => order[key]).filter(Boolean);
        return [...new Set(values)].sort();
    }

    updateCategoryFilter() {
        const categories = this.getUniqueValues('items.product.category', this.filteredOrders);
        const selectCategoria = document.getElementById('filter-category');
        if (selectCategoria) {
            const currentValue = selectCategoria.value;
            const knownCategories = Object.keys(SearchOrdersComponent.CATEGORY_LABELS);
            const categoriesToShow = knownCategories.filter(c => categories.includes(c));
            if (categories.some(c => !knownCategories.includes(c))) {
                if (!categoriesToShow.includes('outro')) categoriesToShow.push('outro');
            }
            selectCategoria.innerHTML = '<option value="">Todas</option>' +
                categoriesToShow.map(c => `<option value="${c}">${SearchOrdersComponent.CATEGORY_LABELS[c]}</option>`).join('');
            if (categoriesToShow.includes(currentValue)) {
                selectCategoria.value = currentValue;
            } else {
                selectCategoria.value = '';
            }
        }
    }

    sortOrders(orders, sortBy) {
        if (!sortBy) return orders;

        const [field, direction] = sortBy.split(':');

        const getDateValue = (timestamp) => {
            // Trata datas nulas para que fiquem no final da ordenação ascendente
            if (!timestamp) return direction === 'asc' ? Infinity : -Infinity;
            return timestamp.toDate().getTime();
        };

        return [...orders].sort((a, b) => {
            let valA, valB;

            if (field === 'createdAt' || field === 'deliveryDate') {
                valA = getDateValue(a[field]);
                valB = getDateValue(b[field]);
            } else if (field === 'totalValue') {
                valA = a.totalValue || 0;
                valB = b.totalValue || 0;
            } else { // clientName
                valA = a.clientName?.toLowerCase() || '';
                valB = b.clientName?.toLowerCase() || '';
            }

            if (valA < valB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    renderActiveFiltersChips() {
        const chipsContainer = document.getElementById('active-filters-chips');
        if (!chipsContainer) return;
        const chips = [];
        const get = id => document.getElementById(id)?.value;
        if (get('filter-fulltext')) chips.push(`<span class="chip">Busca: <b>${get('filter-fulltext')}</b></span>`);
        if (get('filter-orderNumber')) chips.push(`<span class="chip">Pedido: <b>${get('filter-orderNumber')}</b></span>`);
        if (get('filter-clientName')) chips.push(`<span class="chip">Cliente: <b>${get('filter-clientName')}</b></span>`);
        if (get('filter-productName')) chips.push(`<span class="chip">Produto: <b>${get('filter-productName')}</b></span>`);
        if (get('filter-status')) chips.push(`<span class="chip">Status: <b>${get('filter-status')}</b></span>`);
        if (get('filter-seller')) chips.push(`<span class="chip">Vendedor: <b>${get('filter-seller')}</b></span>`);
        if (get('filter-category')) chips.push(`<span class="chip">Categoria: <b>${get('filter-category')}</b></span>`);
        if (get('filter-min-value')) chips.push(`<span class="chip">Valor ≥ <b>${get('filter-min-value')}</b></span>`);
        if (get('filter-max-value')) chips.push(`<span class="chip">Valor ≤ <b>${get('filter-max-value')}</b></span>`);
        if (get('filter-entryDate-start')) chips.push(`<span class="chip">Entrada de: <b>${get('filter-entryDate-start')}</b></span>`);
        if (get('filter-entryDate-end')) chips.push(`<span class="chip">Entrada até: <b>${get('filter-entryDate-end')}</b></span>`);
        if (get('filter-deliveryDate-start')) chips.push(`<span class="chip">Entrega de: <b>${get('filter-deliveryDate-start')}</b></span>`);
        if (get('filter-deliveryDate-end')) chips.push(`<span class="chip">Entrega até: <b>${get('filter-deliveryDate-end')}</b></span>`);
        chipsContainer.innerHTML = chips.join(' ');
    }

    // Função utilitária para normalizar texto (remove acentos e coloca em minúsculas)
    static normalizeText(text) {
        if (typeof text === 'string') {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        }
        return '';
    }
}

window.SearchOrdersComponent = SearchOrdersComponent; 