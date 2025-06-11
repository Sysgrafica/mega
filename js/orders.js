// Componente de Gestão de Pedidos
class OrdersComponent {
    constructor() {
        this.container = null;
        this.orders = [];
        this.currentView = 'list'; // 'list', 'detail', 'create', 'edit'
        this.currentOrderId = null;
        this.clients = [];
        this.products = [];
        this.employees = [];
        this.isLoading = true;
        this.formData = {
            items: [],
            payments: []
        };
    }
    
    // Renderiza o componente principal
    async render(container) {
        this.container = container;
        this.isLoading = true;
        
        // Exibe loader
        this.renderLoader();
        
        try {
            // Carrega dados necessários
            await this.loadInitialData();
            
            // Renderiza a visualização atual
            this.renderCurrentView();
            
            // Configura os listeners em tempo real
            this.setupRealtimeListeners();
        } catch (error) {
            console.error('Erro ao carregar dados de pedidos:', error);
            this.renderError('Não foi possível carregar os dados de pedidos. Por favor, tente novamente.');
        }
    }
    
    // Carrega dados iniciais
    async loadInitialData() {
        try {
            // Carrega pedidos
            const ordersSnapshot = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get();
                
            this.orders = [];
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                this.orders.push({
                    id: doc.id,
                    ...order
                });
            });
            
            // Carrega clientes
            const clientsSnapshot = await db.collection('clients').get();
            this.clients = [];
            clientsSnapshot.forEach(doc => {
                const client = doc.data();
                this.clients.push({
                    id: doc.id,
                    ...client
                });
            });
            
            // Carrega produtos
            const productsSnapshot = await db.collection('products')
                .where('active', '==', true)
                .get();
            this.products = [];
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                this.products.push({
                    id: doc.id,
                    ...product
                });
            });
            
            // Carrega funcionários
            const employeesSnapshot = await db.collection('employees')
                .where('active', '==', true)
                .get();
            this.employees = [];
            employeesSnapshot.forEach(doc => {
                const employee = doc.data();
                this.employees.push({
                    id: doc.id,
                    ...employee
                });
            });
            
            this.isLoading = false;
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            throw error;
        }
    }
    
    // Configura listeners para atualizações em tempo real
    setupRealtimeListeners() {
        // Listener para alterações em pedidos
        this.unsubscribeOrders = db.collection('orders')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                let hasChanges = false;
                
                snapshot.docChanges().forEach(change => {
                    const order = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added') {
                        // Verifica se já existe na lista
                        const index = this.orders.findIndex(o => o.id === order.id);
                        if (index === -1) {
                            this.orders.unshift(order);
                            hasChanges = true;
                        }
                    } else if (change.type === 'modified') {
                        // Atualiza o pedido existente
                        const index = this.orders.findIndex(o => o.id === order.id);
                        if (index !== -1) {
                            this.orders[index] = order;
                            hasChanges = true;
                            
                            // Se estiver visualizando este pedido, atualiza a visualização
                            if (this.currentView === 'detail' && this.currentOrderId === order.id) {
                                this.renderOrderDetail(order.id);
                            }
                        }
                    } else if (change.type === 'removed') {
                        // Remove o pedido da lista
                        const index = this.orders.findIndex(o => o.id === order.id);
                        if (index !== -1) {
                            this.orders.splice(index, 1);
                            hasChanges = true;
                            
                            // Se estiver visualizando este pedido, volta para a lista
                            if (this.currentView === 'detail' && this.currentOrderId === order.id) {
                                this.showListView();
                            }
                        }
                    }
                });
                
                // Se houve mudanças e estiver na visualização de lista, atualiza a lista
                if (hasChanges && this.currentView === 'list') {
                    this.renderOrdersList();
                }
            }, error => {
                console.error('Erro no listener de pedidos:', error);
            });
    }
    
    // Limpa os listeners quando o componente é desmontado
    cleanup() {
        if (this.unsubscribeOrders) {
            this.unsubscribeOrders();
        }
    }
    
    // Renderiza a visualização atual
    renderCurrentView() {
        switch (this.currentView) {
            case 'list':
                this.renderOrdersList();
                break;
            case 'detail':
                this.renderOrderDetail(this.currentOrderId);
                break;
            case 'create':
                this.renderOrderForm();
                break;
            case 'edit':
                this.renderOrderForm(this.currentOrderId);
                break;
        }
    }
    
    // Renderiza a lista de pedidos
    renderOrdersList(resetFilters = true) {
        // Se resetFilters for true, limpa qualquer filtro existente no localStorage
        if (resetFilters) {
            console.log("Resetando filtros na renderização da lista de pedidos");
            localStorage.removeItem('orderFilters');
            localStorage.setItem('ordersSortBy', 'date-desc');
        }
        const headerHtml = `
            <div class="page-header">
                <h1>Gestão de Pedidos</h1>
                <button id="new-order-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Pedido
                </button>
            </div>
        `;
        
        let filtersHtml = `
            <div class="filters-bar">
                <div class="filters-row">
                    <div class="search-box">
                        <input type="text" id="order-search" placeholder="Buscar pedido..." class="search-input">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                    <div class="filter-group">
                        <select id="status-filter" class="filter-select">
                            <option value="">Todos os status</option>
                            ${SYSTEM_CONFIG.orderStatus.map(status => 
                                `<option value="${status.id}">${status.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <select id="date-filter" class="filter-select">
                            <option value="all">Todas as datas</option>
                            <option value="today">Hoje</option>
                            <option value="week">Esta semana</option>
                            <option value="month">Este mês</option>
                        </select>
                    </div>
                    <button id="toggle-advanced-filters" class="btn btn-outline-secondary">
                        <i class="fas fa-filter"></i> Filtros Avançados
                    </button>
                </div>
                
                <div id="advanced-filters" class="advanced-filters" style="display: none;">
                    <div class="filters-row">
                        <div class="filter-group">
                            <label for="order-number-filter">Nº do Pedido</label>
                            <input type="text" id="order-number-filter" class="form-control filter-input" placeholder="Ex: OS23">
                        </div>
                        <div class="filter-group">
                            <label for="client-name-filter">Nome do Cliente</label>
                            <input type="text" id="client-name-filter" class="form-control filter-input" placeholder="Nome do cliente">
                        </div>
                        <div class="filter-group">
                            <label for="material-type-filter">Tipo de Material</label>
                            <select id="material-type-filter" class="form-control filter-select">
                                <option value="">Todos os materiais</option>
                                <option value="impressao">Impressão Digital</option>
                                <option value="grafica">Gráfica Offset</option>
                                <option value="servico">Serviços</option>
                                <option value="outro">Outros</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="product-type-filter">Tipo de Produto</label>
                            <select id="product-type-filter" class="form-control filter-select">
                                ${this.renderProductTypeOptions()}
                            </select>
                        </div>
                    </div>
                    <div class="filters-row">
                        <div class="filter-group">
                            <label for="seller-filter">Vendedor</label>
                            <select id="seller-filter" class="form-control filter-select">
                                <option value="">Todos os vendedores</option>
                                ${this.renderSellerFilterOptions()}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="delivery-date-start">Entrega de</label>
                            <input type="date" id="delivery-date-start" class="form-control filter-input">
                        </div>
                        <div class="filter-group">
                            <label for="delivery-date-end">Entrega até</label>
                            <input type="date" id="delivery-date-end" class="form-control filter-input">
                        </div>
                        <div class="filter-group">
                            <label for="sort-orders">Ordenar por</label>
                            <select id="sort-orders" class="form-control filter-select">
                                <option value="date-desc">Data (mais recentes)</option>
                                <option value="date-asc">Data (mais antigos)</option>
                                <option value="delivery-asc">Prazo de entrega (próximos)</option>
                                <option value="delivery-desc">Prazo de entrega (futuros)</option>
                                <option value="value-desc">Valor (maior para menor)</option>
                                <option value="value-asc">Valor (menor para maior)</option>
                                <option value="client-asc">Cliente (A-Z)</option>
                                <option value="client-desc">Cliente (Z-A)</option>
                            </select>
                        </div>
                    </div>
                    <div class="filters-row">
                        <div class="filter-actions">
                            <button id="apply-filters" class="btn btn-primary">Aplicar Filtros</button>
                            <button id="clear-filters" class="btn btn-outline-secondary">Limpar Filtros</button>
                            <button id="debug-filters" class="btn btn-text" title="Verificar Estado dos Filtros"><i class="fas fa-bug"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        let ordersHtml = '';
        
        // Aplicar ordenação se selecionada
        let displayOrders = [...this.orders];
        const sortBy = localStorage.getItem('ordersSortBy') || 'date-desc';
        displayOrders = this.sortOrders(displayOrders, sortBy);
        
        if (displayOrders.length === 0) {
            ordersHtml = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list empty-icon"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Você ainda não possui pedidos registrados.</p>
                    <button id="empty-new-order-btn" class="btn btn-primary">Criar Primeiro Pedido</button>
                </div>
            `;
        } else {
            ordersHtml = `
                <div class="data-table-container">
                    <table class="data-table orders-table">
                        <thead>
                            <tr>
                                <th>Nº Pedido</th>
                                <th>Cliente</th>
                                <th>Data</th>
                                <th>Entrega</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            displayOrders.forEach(order => {
                const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                                { name: 'Desconhecido', color: '' };
                
                // Formata as datas
                const createdDate = order.createdAt ? ui.formatDate(order.createdAt) : '-';
                
                // Verificações para estilização
                const isDeliveryToday = this.isToday(order.deliveryDate);
                const isLate = order.deliveryDate && new Date(order.deliveryDate.toDate ? 
                    order.deliveryDate.toDate() : order.deliveryDate) < new Date() && 
                    ['pending', 'approved', 'production'].includes(order.status);
                
                let dateClass = '';
                if (isLate) {
                    dateClass = 'late-delivery';
                } else if (isDeliveryToday) {
                    dateClass = 'today-delivery';
                }
                
                // Formata data e hora de entrega
                const deliveryDateTime = order.deliveryDate ? this.formatDateTime(order.deliveryDate) : '-';
                
                ordersHtml += `
                    <tr class="order-row ${isLate ? 'late-delivery' : ''}" data-id="${order.id}">
                        <td>${order.orderNumber}</td>
                        <td>${order.clientName}</td>
                        <td>${createdDate}</td>
                        <td class="${dateClass}">${deliveryDateTime}</td>
                        <td>${ui.formatCurrency(order.totalValue || 0)}</td>
                        <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                        <td>
                            <button class="btn-icon view-order" data-id="${order.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-order" data-id="${order.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            ordersHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        this.container.innerHTML = headerHtml + filtersHtml + ordersHtml;
        
        // Adiciona eventos
        document.getElementById('new-order-btn').addEventListener('click', () => this.showCreateView());
        
        // Inicializa o valor de ordenação salvo
        const sortSelect = document.getElementById('sort-orders');
        if (sortSelect) {
            sortSelect.value = localStorage.getItem('ordersSortBy') || 'date-desc';
        }
        
        // Toggle de filtros avançados
        const toggleFiltersBtn = document.getElementById('toggle-advanced-filters');
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => {
                const advancedFilters = document.getElementById('advanced-filters');
                if (advancedFilters) {
                    const isVisible = advancedFilters.style.display === 'block';
                    advancedFilters.style.display = isVisible ? 'none' : 'block';
                    
                    // Atualiza o texto do botão
                    toggleFiltersBtn.innerHTML = isVisible 
                        ? '<i class="fas fa-filter"></i> Filtros Avançados'
                        : '<i class="fas fa-filter"></i> Ocultar Filtros';
                }
            });
        }
        
        // Botão de aplicar filtros
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
                
                // Salva a ordenação escolhida
                const sortSelect = document.getElementById('sort-orders');
                if (sortSelect) {
                    localStorage.setItem('ordersSortBy', sortSelect.value);
                }
                
                // Feedback visual
                applyFiltersBtn.innerHTML = '<i class="fas fa-check"></i> Filtros Aplicados';
                setTimeout(() => {
                    applyFiltersBtn.innerHTML = 'Aplicar Filtros';
                }, 1500);
            });
        }
        
        // Botão de limpar filtros
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            // Remover quaisquer event listeners existentes para evitar duplicação
            clearFiltersBtn.removeEventListener('click', this._handleClearFiltersClick);
            
            // Definir o manipulador de eventos como uma propriedade da instância para referência futura
            this._handleClearFiltersClick = (event) => {
                event.preventDefault();
                console.log("Botão 'Limpar Filtros' clicado");
                
                // Usa o método centralizado para limpar todos os filtros
                const success = this.clearAllFilters();
                
                // Feedback visual
                if (success) {
                    clearFiltersBtn.innerHTML = '<i class="fas fa-check"></i> Filtros Limpos';
                    setTimeout(() => {
                        clearFiltersBtn.innerHTML = 'Limpar Filtros';
                    }, 1500);
                }
            };
            
            // Adicionar o novo event listener
            clearFiltersBtn.addEventListener('click', this._handleClearFiltersClick);
            console.log("Event listener 'click' adicionado ao botão 'Limpar Filtros'");
        } else {
            console.error("Botão 'Limpar Filtros' não encontrado no DOM");
        }
        
        // Botão de debug dos filtros
        const debugFiltersBtn = document.getElementById('debug-filters');
        if (debugFiltersBtn) {
            debugFiltersBtn.addEventListener('click', () => {
                // Obtém todos os filtros e seus valores
                const filterValues = {};
                const filterElements = document.querySelectorAll('.filter-input, .filter-select');
                
                filterElements.forEach(el => {
                    filterValues[el.id] = {
                        id: el.id,
                        value: el.value,
                        type: el.tagName,
                        inputType: el.type,
                        hasListeners: el.getEventListeners ? true : false
                    };
                });
                
                // Exibe no console
                console.table(filterValues);
                alert('Informações de depuração dos filtros foram exibidas no console do navegador (F12)');
            });
        }
        
        if (this.orders.length === 0) {
            document.getElementById('empty-new-order-btn').addEventListener('click', () => this.showCreateView());
        } else {
            // Eventos para os botões de visualizar e editar
            document.querySelectorAll('.view-order').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const orderId = e.currentTarget.getAttribute('data-id');
                    this.showDetailView(orderId);
                });
            });
            
            document.querySelectorAll('.edit-order').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const orderId = e.currentTarget.getAttribute('data-id');
                    this.showEditView(orderId);
                });
            });
            
            // Evento para as linhas da tabela
            document.querySelectorAll('.order-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    // Ignora se o clique foi em um botão
                    if (e.target.closest('.btn-icon')) return;
                    
                    const orderId = row.getAttribute('data-id');
                    this.showDetailView(orderId);
                });
            });
            
            // Eventos para os filtros básicos (aplicação em tempo real)
            document.getElementById('order-search').addEventListener('input', () => this.applyFilters());
            document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());
            document.getElementById('date-filter').addEventListener('change', () => this.applyFilters());
            
            // Eventos para os filtros avançados (aplicação em tempo real)
            document.getElementById('order-number-filter').addEventListener('input', () => this.applyFilters());
            document.getElementById('client-name-filter').addEventListener('input', () => this.applyFilters());
            document.getElementById('material-type-filter').addEventListener('change', () => this.applyFilters());
            document.getElementById('product-type-filter').addEventListener('change', () => this.applyFilters());
            document.getElementById('seller-filter').addEventListener('change', () => this.applyFilters());
            document.getElementById('delivery-date-start').addEventListener('change', () => this.applyFilters());
            document.getElementById('delivery-date-end').addEventListener('change', () => this.applyFilters());
            document.getElementById('sort-orders').addEventListener('change', () => {
                // Salva a ordenação escolhida e aplica os filtros
                localStorage.setItem('ordersSortBy', document.getElementById('sort-orders').value);
                this.applyFilters();
            });
        }
        
        // Aplica os filtros salvos (se houver) após a renderização
        // mas somente se não estivermos limpando os filtros
        if (!resetFilters) {
            setTimeout(() => this.applyFilters(), 0);
        } else {
            console.log("Filtros não aplicados após reset");
        }
    }
    
    // Aplica ordenação nos pedidos
    sortOrders(orders, sortBy) {
        if (!sortBy) return orders;
        
        return [...orders].sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    // Data do pedido (mais recentes primeiro)
                    return this.getDateValue(b.createdAt) - this.getDateValue(a.createdAt);
                
                case 'date-asc':
                    // Data do pedido (mais antigos primeiro)
                    return this.getDateValue(a.createdAt) - this.getDateValue(b.createdAt);
                
                case 'delivery-asc':
                    // Prazo de entrega (próximos primeiro)
                    return this.getDateValue(a.deliveryDate) - this.getDateValue(b.deliveryDate);
                
                case 'delivery-desc':
                    // Prazo de entrega (futuros primeiro)
                    return this.getDateValue(b.deliveryDate) - this.getDateValue(a.deliveryDate);
                
                case 'value-desc':
                    // Valor (maior para menor)
                    return (b.totalValue || 0) - (a.totalValue || 0);
                
                case 'value-asc':
                    // Valor (menor para maior)
                    return (a.totalValue || 0) - (b.totalValue || 0);
                
                case 'client-asc':
                    // Cliente (A-Z)
                    return (a.clientName || '').localeCompare(b.clientName || '');
                
                case 'client-desc':
                    // Cliente (Z-A)
                    return (b.clientName || '').localeCompare(a.clientName || '');
                
                default:
                    return 0;
            }
        });
    }
    
    // Obtém um valor de data para comparação
    getDateValue(date) {
        if (!date) return 0;
        try {
            return date.toDate ? date.toDate().getTime() : new Date(date).getTime();
        } catch (error) {
            return 0;
        }
    }
    
    // Verifica se um pedido contém um determinado tipo de material
    orderHasMaterialType(order, materialType) {
        if (!order.items || !materialType) return true;
        
        return order.items.some(item => {
            const product = this.products.find(p => p.id === item.productId);
            return product && product.category === materialType;
        });
    }
    
    // Aplicar filtros à lista de pedidos
    applyFilters() {
        // Filtros básicos
        const searchTerm = document.getElementById('order-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const dateFilter = document.getElementById('date-filter')?.value || 'all';
        
        // Filtros avançados
        const orderNumberFilter = document.getElementById('order-number-filter')?.value?.toLowerCase() || '';
        const clientNameFilter = document.getElementById('client-name-filter')?.value?.toLowerCase() || '';
        const materialTypeFilter = document.getElementById('material-type-filter')?.value || '';
        const productTypeFilter = document.getElementById('product-type-filter')?.value || '';
        const sellerFilter = document.getElementById('seller-filter')?.value || '';
        const deliveryDateStart = document.getElementById('delivery-date-start')?.value || '';
        const deliveryDateEnd = document.getElementById('delivery-date-end')?.value || '';
        const sortBy = document.getElementById('sort-orders')?.value || 'date-desc';
        
        // Log para depuração
        console.log('Filtros aplicados:', { 
            searchTerm, statusFilter, dateFilter, orderNumberFilter, 
            clientNameFilter, materialTypeFilter, productTypeFilter, 
            sellerFilter, deliveryDateStart, deliveryDateEnd, sortBy 
        });
        
        // Datas de referência para filtros de data de criação
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Datas de referência para filtros de data de entrega
        const startDate = deliveryDateStart ? new Date(deliveryDateStart) : null;
        startDate?.setHours(0, 0, 0, 0);
        
        const endDate = deliveryDateEnd ? new Date(deliveryDateEnd) : null;
        if (endDate) {
            endDate.setHours(23, 59, 59, 999); // Fim do dia
        }
        
        // Primeiro ordenamos os pedidos de acordo com o critério escolhido
        let filteredOrders = this.sortOrders(this.orders, sortBy);
        
        // Filtragem
        filteredOrders = filteredOrders.filter(order => {
            if (!order) return false;
            
            // Filtro de texto básico (busca geral)
            if (searchTerm) {
                const textMatch = 
                    (order.orderNumber || '').toLowerCase().includes(searchTerm) || 
                    (order.clientName || '').toLowerCase().includes(searchTerm) ||
                    (order.sellerName || '').toLowerCase().includes(searchTerm);
                if (!textMatch) return false;
            }
            
            // Filtro de número de pedido específico
            if (orderNumberFilter && !(order.orderNumber || '').toLowerCase().includes(orderNumberFilter)) {
                return false;
            }
            
            // Filtro de nome de cliente específico
            if (clientNameFilter && !(order.clientName || '').toLowerCase().includes(clientNameFilter)) {
                return false;
            }
            
            // Filtro de vendedor
            if (sellerFilter) {
                // Se estamos filtrando por ID do vendedor
                if (!(order.sellerId === sellerFilter)) {
                    return false;
                }
            }
            
            // Filtro de tipo de material
            if (materialTypeFilter && !this.orderHasMaterialType(order, materialTypeFilter)) {
                return false;
            }
            
            // Filtro de tipo de produto específico
            if (productTypeFilter && !this.orderHasProductType(order, productTypeFilter)) {
                return false;
            }
            
            // Filtro de status
            if (statusFilter && order.status !== statusFilter) {
                return false;
            }
            
            // Filtro de data de criação
            if (dateFilter !== 'all' && order.createdAt) {
                const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                
                if (dateFilter === 'today' && orderDate < today) {
                    return false;
                } else if (dateFilter === 'week' && orderDate < weekStart) {
                    return false;
                } else if (dateFilter === 'month' && orderDate < monthStart) {
                    return false;
                }
            }
            
            // Filtro de data de entrega (intervalo)
            if (order.deliveryDate) {
                const deliveryDate = order.deliveryDate.toDate ? 
                    order.deliveryDate.toDate() : new Date(order.deliveryDate);
                
                if (startDate && deliveryDate < startDate) {
                    return false;
                }
                
                if (endDate && deliveryDate > endDate) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Obter a tabela e o corpo da tabela
        const table = document.querySelector('.data-table-container table');
        const tbody = table?.querySelector('tbody');
        
        if (!tbody) {
            // Se não encontrarmos a tabela, renderizamos a lista novamente
            if (this.orders.length > 0) {
                this.renderOrdersList();
            }
            return;
        }
        
        // Primeiro, armazenamos as linhas em um array e as removemos da tabela
        const rows = Array.from(tbody.querySelectorAll('tr.order-row'));
        
        // Para cada linha, encontramos o pedido correspondente e a marcamos como visível ou não
        rows.forEach(row => {
            const orderId = row.getAttribute('data-id');
            const orderVisible = filteredOrders.some(o => o.id === orderId);
            row.style.display = orderVisible ? '' : 'none';
        });
        
        // Agora reordenamos as linhas visíveis de acordo com a ordem dos pedidos filtrados
        const visibleRows = rows.filter(row => row.style.display !== 'none');
        
        // Limpa o tbody para reordenar
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
        
        // Função para encontrar a linha correspondente a um pedido
        const findRowById = (orderId) => visibleRows.find(row => row.getAttribute('data-id') === orderId);
        
        // Adiciona as linhas de volta na ordem correta
        filteredOrders.forEach(order => {
            const row = findRowById(order.id);
            if (row) {
                tbody.appendChild(row);
            }
        });
        
        // Mostra mensagem se nenhum pedido foi encontrado
        const tableContainer = document.querySelector('.data-table-container');
        const emptyMessage = document.querySelector('.empty-filter-message');
        
        if (tableContainer) {
            const visibleRowsCount = visibleRows.length;
            
            if (visibleRowsCount === 0) {
                if (!emptyMessage) {
                    const message = document.createElement('div');
                    message.className = 'empty-filter-message';
                    message.innerHTML = `
                        <p>Nenhum pedido encontrado com os filtros aplicados.</p>
                        <button id="clear-filters-empty" class="btn btn-outline-secondary">Limpar Filtros</button>
                    `;
                    tableContainer.appendChild(message);
                    
                    document.getElementById('clear-filters-empty').addEventListener('click', (e) => {
                        // Evita que o clique propague
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log("Botão 'Limpar Filtros Empty' clicado");
                        
                        try {
                            // Alternativa mais direta: recarregar a lista completa
                            this.renderOrdersList();
                            
                            // Feedback
                            console.log("Lista de pedidos recarregada após limpar filtros");
                        } catch (error) {
                            console.error("Erro ao recarregar após limpeza de filtros:", error);
                            // Tenta o método tradicional
                            this.clearAllFilters();
                        }
                        
                        // Remove a mensagem de erro já que agora deve mostrar resultados
                        if (emptyMessage) {
                            emptyMessage.remove();
                        }
                    });
                }
            } else if (emptyMessage) {
                emptyMessage.remove();
            }
            
            // Atualiza o contador de resultados (se existir)
            const resultsCounter = document.querySelector('.filter-results-counter');
            if (resultsCounter) {
                resultsCounter.textContent = `${visibleRowsCount} resultados encontrados`;
            } else if (visibleRowsCount > 0) {
                // Adiciona um contador de resultados caso não exista
                const counter = document.createElement('div');
                counter.className = 'filter-results-counter';
                counter.textContent = `${visibleRowsCount} resultados encontrados`;
                tableContainer.before(counter);
            }
        }
    }
    
    // Limpa todos os filtros aplicados
    clearAllFilters() {
        console.log("Executando limpeza de todos os filtros");
        
        try {
            // Método 1: Resetar os valores diretamente e forçar filtragem
            const searchInput = document.getElementById('order-search');
            if (searchInput) searchInput.value = '';
            
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) statusFilter.value = '';
            
            const dateFilter = document.getElementById('date-filter');
            if (dateFilter) dateFilter.value = 'all';
            
            const orderNumberFilter = document.getElementById('order-number-filter');
            if (orderNumberFilter) orderNumberFilter.value = '';
            
            const clientNameFilter = document.getElementById('client-name-filter');
            if (clientNameFilter) clientNameFilter.value = '';
            
            const materialTypeFilter = document.getElementById('material-type-filter');
            if (materialTypeFilter) materialTypeFilter.value = '';
            
            const productTypeFilter = document.getElementById('product-type-filter');
            if (productTypeFilter) productTypeFilter.value = '';
            
            const sellerFilter = document.getElementById('seller-filter');
            if (sellerFilter) sellerFilter.value = '';
            
            const deliveryDateStart = document.getElementById('delivery-date-start');
            if (deliveryDateStart) deliveryDateStart.value = '';
            
            const deliveryDateEnd = document.getElementById('delivery-date-end');
            if (deliveryDateEnd) deliveryDateEnd.value = '';
            
            const sortOrders = document.getElementById('sort-orders');
            if (sortOrders) sortOrders.value = 'date-desc';
            
            // Resetar storage
            localStorage.setItem('ordersSortBy', 'date-desc');
            
            console.log("Valores dos campos foram resetados. Aplicando filtros...");
            
                         // Método 2: Recarregar a lista completa, forçando o reset de filtros
             this.renderOrdersList(true);
            
            console.log("Lista recarregada com sucesso!");
            return true;
        } catch (error) {
            console.error("Erro ao limpar filtros:", error);
            return false;
        }
    }
    
    // Renderiza o loader
    renderLoader() {
        this.container.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Carregando...</p>
            </div>
        `;
    }
    
    // Renderiza mensagem de erro
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-message-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar dados</h3>
                <p>${message}</p>
                <button id="retry-button" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
        
        document.getElementById('retry-button').addEventListener('click', () => {
            this.render(this.container);
        });
    }
    
    // Altera para a visualização de lista
    showListView() {
        this.currentView = 'list';
        this.currentOrderId = null;
        this.renderCurrentView();
    }
    
    // Altera para a visualização de detalhes
    showDetailView(orderId) {
        this.currentView = 'detail';
        this.currentOrderId = orderId;
        this.renderCurrentView();
    }
    
    // Altera para a visualização de criação
    showCreateView() {
        this.currentView = 'create';
        this.currentOrderId = null;
        // Inicializa o formulário vazio
        
        // Define a data e hora de entrega para 24 horas a partir de agora
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        
        // Obtém informações do vendedor logado
        let sellerName = 'Sistema';
        let sellerId = '';
        
        if (window.auth && window.auth.currentUser) {
            sellerId = window.auth.currentUser.id; // Corrigido: era 'uid' e deveria ser 'id'
            sellerName = window.auth.currentUser.name || 'Sistema';
        }
        
        this.formData = {
            client: null,
            items: [],
            payments: [],
            notes: '',
            deliveryDate: tomorrow,
            status: 'pending',
            title: '', // Novo campo para título do pedido
            imageUrl: '', // Novo campo para imagem do pedido
            sellerName: sellerName, // Nome do vendedor logado
            sellerId: sellerId // ID do vendedor logado
        };
        this.renderCurrentView();
    }
    
    // Altera para a visualização de edição
    showEditView(orderId) {
        this.currentView = 'edit';
        this.currentOrderId = orderId;
        // Carrega os dados do pedido para o formulário
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            this.formData = {
                client: this.clients.find(c => c.id === order.clientId),
                items: [...order.items || []],
                payments: [...order.payments || []],
                notes: order.notes || '',
                deliveryDate: order.deliveryDate,
                status: order.status || 'pending',
                title: order.title || '',
                imageUrl: order.imageUrl || '',
                sellerName: order.sellerName || 'Sistema',
                sellerId: order.sellerId || ''
            };
        }
        this.renderCurrentView();
    }
    
    // Renderiza os detalhes do item na visualização de pedido
    renderOrderItemDetails(item) {
        const product = this.products.find(p => p.id === item.productId) || {};
        const isCustomSize = product.productType === 'custom_size' || item.width && item.height;
        
        let html = `
            <div class="order-item-details">
                <div class="item-info">
                    <h4>${item.productName}</h4>
                    <div class="item-meta">
                        <span class="item-quantity">${item.quantity} x </span>
                        <span class="item-price">R$ ${item.unitPrice.toFixed(2)}</span>
                    </div>
                </div>
                <div class="item-total">
                    <span>R$ ${item.totalPrice.toFixed(2)}</span>
                </div>
            </div>
        `;
        
        // Se for um produto com medida personalizada, mostra as dimensões
        if (isCustomSize) {
            html += `
                <div class="item-dimensions">
                    <span>Dimensões: ${item.width}cm x ${item.height}cm (${item.squareMeters}m²)</span>
                </div>
            `;
        }
        
        return html;
    }
    
    // Renderiza a visualização detalhada do pedido
    renderOrderDetail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            this.container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>Pedido não encontrado</h3>
                    <p>O pedido solicitado não existe ou foi removido.</p>
                    <button id="back-to-list-btn" class="btn btn-primary">Voltar para Lista</button>
                </div>
            `;
            
            document.getElementById('back-to-list-btn').addEventListener('click', () => {
                this.showListView();
            });
            
            return;
        }
        
        const statusInfo = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || {
            name: 'Status Desconhecido',
            color: '#999'
        };
        
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const dateTimeOptions = { ...dateOptions, hour: '2-digit', minute: '2-digit' };
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Pedido #${order.orderNumber || 'Novo'}</h1>
                </div>
                <div class="action-buttons">
                    ${order.status !== 'canceled' ? `
                        <button id="edit-order-btn" class="btn btn-secondary">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button id="print-order-btn" class="btn btn-info">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="order-detail-content">
                <div class="order-header">
                    <div class="order-status-badge" style="background-color: ${statusInfo.color}">
                        ${statusInfo.name}
                    </div>
                    
                    <div class="order-meta">
                        <div class="meta-item">
                            <span class="meta-label">Data do Pedido:</span>
                            <span class="meta-value">${new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-BR', dateOptions)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Última Atualização:</span>
                            <span class="meta-value">${new Date(order.lastUpdate.seconds * 1000).toLocaleString('pt-BR', dateTimeOptions)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Data de Entrega:</span>
                            <span class="meta-value">${this.formatDateTime(order.deliveryDate)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="order-sections">
                    <div class="order-section">
                        <h3>Informações do Cliente</h3>
                        <div class="client-info">
                            <div class="info-group">
                                <span class="info-label">Nome:</span>
                                <span class="info-value">${order.clientName || 'Não informado'}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Documento:</span>
                                <span class="info-value">${order.clientDocument || 'Não informado'}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Telefone:</span>
                                <span class="info-value">${order.clientPhone || 'Não informado'}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Email:</span>
                                <span class="info-value">${order.clientEmail || 'Não informado'}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Endereço:</span>
                                <span class="info-value">${order.clientAddress || 'Não informado'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h3>Itens do Pedido</h3>
                        <div class="order-items">
                            ${order.items.length > 0 ? order.items.map(item => 
                                this.renderOrderItemDetails(item)
                            ).join('') : '<p>Nenhum item no pedido</p>'}
                        </div>
                        
                        <div class="order-summary">
                            <div class="summary-item">
                                <span class="summary-label">Valor Total:</span>
                                <span class="summary-value">R$ ${order.totalValue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h3>Pagamentos</h3>
                        <div class="order-payments">
                            ${order.payments && order.payments.length > 0 ? order.payments.map(payment => {
                                const methodInfo = SYSTEM_CONFIG.paymentMethods.find(m => m.id === payment.method) || {
                                    name: payment.method,
                                    icon: 'fas fa-money-bill'
                                };
                                
                                return `
                                    <div class="payment-item">
                                        <div class="payment-info">
                                            <i class="${methodInfo.icon}"></i>
                                            <div class="payment-meta">
                                                <div class="payment-method">${methodInfo.name}</div>
                                                <div class="payment-date">
                                                    ${new Date(payment.date.seconds * 1000).toLocaleDateString('pt-BR', dateOptions)}
                                                </div>
                                                ${payment.reference ? `<div class="payment-reference">${payment.reference}</div>` : ''}
                                            </div>
                                        </div>
                                        <div class="payment-amount">
                                            R$ ${payment.amount.toFixed(2)}
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<p>Nenhum pagamento registrado</p>'}
                        </div>
                        
                        <div class="order-summary">
                            <div class="summary-item">
                                <span class="summary-label">Total Pago:</span>
                                <span class="summary-value">R$ ${order.totalPaid.toFixed(2)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Saldo Restante:</span>
                                <span class="summary-value ${order.remainingValue > 0 ? 'text-danger' : ''}">
                                    R$ ${order.remainingValue.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    ${order.notes ? `
                        <div class="order-section">
                            <h3>Observações</h3>
                            <div class="order-notes">
                                ${order.notes}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                ${order.status !== 'canceled' ? `
                    <div class="action-panel">
                        <div class="status-actions">
                            <h3>Alterar Status</h3>
                            <div class="status-buttons">
                                ${SYSTEM_CONFIG.orderStatus.map(status => 
                                    status.id !== order.status ? `
                                        <button class="btn status-btn" 
                                                data-status="${status.id}" 
                                                style="background-color: ${status.color}; color: white;">
                                            ${status.name}
                                        </button>
                                    ` : ''
                                ).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showListView();
        });
        
        if (order.status !== 'canceled') {
            const editBtn = document.getElementById('edit-order-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.showEditView(orderId);
                });
            }
            
            const printBtn = document.getElementById('print-order-btn');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    this.printOrder(orderId);
                });
            }
            
            // Adiciona eventos para os botões de status
            document.querySelectorAll('.status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const newStatus = btn.getAttribute('data-status');
                    this.updateOrderStatus(orderId, newStatus);
                });
            });
        }
    }
    
    // Renderiza o formulário de pedido (para criação ou edição)
    renderOrderForm(orderId = null) {
        const isEdit = !!orderId;
        const formTitle = isEdit ? 'Editar Pedido' : 'Novo Pedido';
        
        // Cabeçalho
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${formTitle}</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-order-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Pedido
                    </button>
                </div>
            </div>
            
            <form id="order-form" class="order-form">
                <!-- Título e Imagem do Pedido -->
                <div class="form-section">
                    <h3>Informações Gerais</h3>
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="order-title">Título do Pedido</label>
                            <input type="text" id="order-title" class="form-control" 
                                placeholder="Ex: Banner para Evento X, Conjunto de Adesivos para Loja Y..." 
                                value="${this.formData.title || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="order-image">Imagem de Referência</label>
                            <div class="image-upload-container">
                                <div class="image-preview" id="image-preview">
                                    ${this.formData.imageUrl ? 
                                        `<img src="${this.formData.imageUrl}" alt="Imagem do pedido">
                                         <button type="button" id="remove-image" class="btn-icon remove-image">
                                             <i class="fas fa-times"></i>
                                         </button>` 
                                        : 
                                        `<div class="no-image">
                                            <i class="fas fa-image"></i>
                                            <p>Nenhuma imagem</p>
                                         </div>`
                                    }
                                </div>
                                <div class="image-upload-options">
                                    <label for="file-upload" class="btn btn-outline-secondary">
                                        <i class="fas fa-upload"></i> Enviar Arquivo
                                    </label>
                                    <input id="file-upload" type="file" accept="image/*" style="display: none;">
                                    
                                    <button type="button" id="screenshot-btn" class="btn btn-outline-secondary">
                                        <i class="fas fa-camera"></i> Capturar Tela
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Informações do Cliente -->
                <div class="form-section">
                    <h3>Cliente</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="client-search">Pesquisar Cliente</label>
                            <div class="autocomplete-container">
                                <input type="text" id="client-search" class="form-control" 
                                    placeholder="Digite o nome do cliente..." 
                                    value="${this.formData.client ? this.formData.client.name : ''}">
                                <input type="hidden" id="client-id" value="${this.formData.client ? this.formData.client.id : ''}">
                                <div id="client-suggestions" class="autocomplete-items"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <button type="button" id="new-client-btn" class="btn btn-secondary">
                                <i class="fas fa-plus"></i> Novo Cliente
                            </button>
                        </div>
                    </div>
                    
                    <div id="client-details" class="client-details" style="display: ${this.formData.client ? 'block' : 'none'}">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Documento</label>
                                <div class="field-value" id="client-document-display">
                                    ${this.formData.client ? this.formData.client.document || '-' : '-'}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Telefone</label>
                                <div class="field-value" id="client-phone-display">
                                    ${this.formData.client ? this.formData.client.phone || '-' : '-'}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>E-mail</label>
                                <div class="field-value" id="client-email-display">
                                    ${this.formData.client ? this.formData.client.email || '-' : '-'}
                                </div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group full-width">
                                <label>Endereço</label>
                                <div class="field-value" id="client-address-display">
                                    ${this.formData.client ? this.formData.client.address || '-' : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Itens do Pedido -->
                <div class="form-section">
                    <div class="section-header">
                        <h3>Itens do Pedido</h3>
                        <button type="button" id="add-item-btn" class="btn btn-secondary">
                            <i class="fas fa-plus"></i> Adicionar Item
                        </button>
                    </div>
                    
                    <div id="items-container" class="items-container">
                        ${this.renderOrderItems()}
                    </div>
                    
                    <div class="order-totals">
                        <div class="total-row">
                            <div class="total-label">Valor Total:</div>
                            <div class="total-value" id="order-total">${ui.formatCurrency(this.calculateOrderTotal())}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Pagamentos -->
                <div class="form-section">
                    <div class="section-header">
                        <h3>Pagamentos</h3>
                        <button type="button" id="add-payment-btn" class="btn btn-secondary">
                            <i class="fas fa-plus"></i> Adicionar Pagamento
                        </button>
                    </div>
                    
                    <div id="payments-container" class="payments-container">
                        ${this.renderPayments()}
                    </div>
                    
                    <div class="order-totals">
                        <div class="total-row">
                            <div class="total-label">Total Pago:</div>
                            <div class="total-value" id="payments-total">${ui.formatCurrency(this.calculatePaymentsTotal())}</div>
                        </div>
                        <div class="total-row">
                            <div class="total-label">Saldo Restante:</div>
                            <div class="total-value" id="remaining-total">${ui.formatCurrency(this.calculateOrderTotal() - this.calculatePaymentsTotal())}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Detalhes Adicionais -->
                <div class="form-section">
                    <h3>Detalhes Adicionais</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="delivery-date">Data de Entrega</label>
                            <input type="date" id="delivery-date" class="form-control" required
                                value="${this.formatDateForInput(this.formData.deliveryDate)}">
                        </div>
                        
                        <div class="form-group">
                            <label for="delivery-time">Hora de Entrega</label>
                            <input type="time" id="delivery-time" class="form-control" required
                                value="${this.formatTimeForInput(this.formData.deliveryDate) || '12:00'}">
                        </div>
                        
                        <div class="form-group">
                            <label for="status-select">Status</label>
                            <select id="status-select" class="form-control" required>
                                ${SYSTEM_CONFIG.orderStatus.map(status => 
                                    `<option value="${status.id}" ${this.formData.status === status.id ? 'selected' : ''}>
                                        ${status.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="seller-select">Vendedor</label>
                            <select id="seller-select" class="form-control">
                                <option value="">Selecione um vendedor</option>
                                ${this.renderSellerOptions()}
                            </select>
                            <input type="hidden" id="seller-id" value="${this.formData.sellerId || ''}">
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="order-notes">Observações</label>
                            <textarea id="order-notes" class="form-control" rows="3">${this.formData.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            if (isEdit) {
                this.showDetailView(orderId);
            } else {
                this.showListView();
            }
        });
        
        document.getElementById('save-order-btn').addEventListener('click', () => this.saveOrder(isEdit));
        document.getElementById('add-item-btn').addEventListener('click', () => this.addOrderItem());
        document.getElementById('add-payment-btn').addEventListener('click', () => this.addPayment());
        
        // Eventos para upload e screenshot
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('screenshot-btn').addEventListener('click', () => this.captureScreenshot());
        
        if (this.formData.imageUrl) {
            document.getElementById('remove-image').addEventListener('click', () => this.removeImage());
        }
        
        // Configurar o autocomplete de clientes
        this.setupClientAutocomplete();
        
        // Eventos para os botões de remover itens e pagamentos
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removeOrderItem(index);
            });
        });
        
        document.querySelectorAll('.remove-payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removePayment(index);
            });
        });
        
        // Eventos para atualização de valores de itens
        document.querySelectorAll('.item-quantity, .item-width, .item-height, .item-unit-price, .item-description').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.updateItemValues(index);
            });
        });
        
        // Evento para seleção de produto
        document.querySelectorAll('.product-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                const productId = e.target.value;
                if (productId) {
                    const product = this.products.find(p => p.id === productId);
                    if (product) {
                        this.updateProductDetails(index, product);
                    }
                }
            });
        });
        
        // Evento para botão de novo cliente
        document.getElementById('new-client-btn').addEventListener('click', () => this.showNewClientForm());
        
        // Atualiza o título do pedido
        document.getElementById('order-title').addEventListener('input', (e) => {
            this.formData.title = e.target.value;
        });
        
        // Evento para selecionar vendedor
        document.getElementById('seller-select').addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            this.formData.sellerId = e.target.value;
            this.formData.sellerName = selectedOption.getAttribute('data-name') || 'Sistema';
            document.getElementById('seller-id').value = this.formData.sellerId;
        });
    }
    
    // Renderiza os itens do pedido no formulário
    renderOrderItems() {
        if (this.formData.items.length === 0) {
            return `<p class="empty-items-message">Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>`;
        }
        
        let html = '';
        
        this.formData.items.forEach((item, index) => {
            const product = item.productId ? this.products.find(p => p.id === item.productId) : null;
            const pricingType = product ? product.pricingType : 'unit';
            const isCustomSize = product ? product.productType === 'custom_size' : false;
            
            html += `
                <div class="order-item" data-index="${index}">
                    <div class="item-header">
                        <h4>Item #${index + 1}</h4>
                        <button type="button" class="btn-icon remove-item-btn" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-${index}">Produto</label>
                            <select id="product-${index}" class="form-control product-select" data-index="${index}" required>
                                <option value="">-- Selecione um Produto --</option>
                                ${this.products.map(product => 
                                    `<option value="${product.id}" ${item.productId === product.id ? 'selected' : ''}>
                                        ${product.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="quantity-${index}">Quantidade</label>
                            <input type="number" id="quantity-${index}" class="form-control item-quantity" 
                                data-index="${index}" min="1" value="${item.quantity || 1}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="item-description-${index}">Descrição do Item</label>
                            <textarea id="item-description-${index}" class="form-control item-description" 
                                data-index="${index}" rows="2" placeholder="Detalhes específicos sobre este item...">${item.description || ''}</textarea>
                        </div>
                    </div>
                    
                    ${(pricingType === 'area' || isCustomSize) ? `
                        <div class="form-row">
                            <div class="form-group">
                                <label for="width-${index}">Largura (cm)</label>
                                <input type="number" id="width-${index}" class="form-control item-width" 
                                    data-index="${index}" min="1" step="1" value="${item.width || 100}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="height-${index}">Altura (cm)</label>
                                <input type="number" id="height-${index}" class="form-control item-height" 
                                    data-index="${index}" min="1" step="1" value="${item.height || 100}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="area-${index}">Área Total (m²)</label>
                                <input type="text" id="area-${index}" class="form-control" 
                                    value="${item.squareMeters || 1}" readonly>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="unit-price-${index}">Preço Unitário</label>
                            <div class="input-group">
                                <span class="input-group-text">R$</span>
                                <input type="number" id="unit-price-${index}" class="form-control item-unit-price" 
                                    data-index="${index}" min="0" step="0.01" value="${item.unitPrice || 0}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="total-price-${index}">Preço Total</label>
                            <div class="input-group">
                                <span class="input-group-text">R$</span>
                                <input type="text" id="total-price-${index}" class="form-control" 
                                    value="${item.totalPrice || 0}" readonly>
                            </div>
                        </div>
                        
                        ${this.currentView === 'edit' ? `
                            <div class="form-group">
                                <label for="completed-${index}">Status</label>
                                <select id="completed-${index}" class="form-control" data-index="${index}">
                                    <option value="false" ${!item.completed ? 'selected' : ''}>Pendente</option>
                                    <option value="true" ${item.completed ? 'selected' : ''}>Concluído</option>
                                </select>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    // Renderiza os pagamentos no formulário
    renderPayments() {
        if (this.formData.payments.length === 0) {
            return `<p class="empty-payments-message">Nenhum pagamento adicionado. Clique em "Adicionar Pagamento" para registrar.</p>`;
        }
        
        let html = '';
        
        this.formData.payments.forEach((payment, index) => {
            // Garante que o valor é numérico
            const paymentAmount = typeof payment.amount === 'string' 
                ? parseFloat(payment.amount) || 0 
                : (payment.amount || 0);
                
            html += `
                <div class="payment-item" data-index="${index}">
                    <div class="item-header">
                        <h4>Pagamento #${index + 1}</h4>
                        <button type="button" class="btn-icon remove-payment-btn" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="payment-method-${index}">Método</label>
                            <select id="payment-method-${index}" class="form-control" required>
                                ${SYSTEM_CONFIG.paymentMethods.map(method => 
                                    `<option value="${method.id}" ${payment.method === method.id ? 'selected' : ''}>
                                        ${method.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="payment-amount-${index}">Valor</label>
                            <div class="input-group">
                                <span class="input-group-text">R$</span>
                                <input type="number" id="payment-amount-${index}" class="form-control payment-amount" 
                                    data-index="${index}" min="0" step="0.01" value="${paymentAmount.toFixed(2)}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="payment-date-${index}">Data</label>
                            <input type="date" id="payment-date-${index}" class="form-control" 
                                value="${this.formatDateForInput(payment.date)}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="payment-reference-${index}">Referência</label>
                            <input type="text" id="payment-reference-${index}" class="form-control" 
                                value="${payment.reference || ''}" placeholder="Ex: Entrada, Parcela 1, etc.">
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    // Atualiza os detalhes do cliente selecionado
    updateClientDetails(client) {
        if (!client) return;
        
        console.log('Atualizando detalhes do cliente:', client);
        
        // Garante que o elemento está visível
        const clientDetailsElement = document.getElementById('client-details');
        if (clientDetailsElement) {
            clientDetailsElement.style.display = 'block';
            
            // Atualiza os detalhes do cliente na interface
            const documentElement = document.getElementById('client-document-display');
            const phoneElement = document.getElementById('client-phone-display');
            const emailElement = document.getElementById('client-email-display');
            const addressElement = document.getElementById('client-address-display');
            
            // Certifica-se de que os elementos existem antes de tentar atualizá-los
            if (documentElement) documentElement.textContent = client.document || '-';
            if (phoneElement) phoneElement.textContent = client.phone || '-';
            if (emailElement) emailElement.textContent = client.email || '-';
            if (addressElement) addressElement.textContent = client.address || '-';
        }
        
        // Guarda o cliente no formData
        this.formData.client = {
            id: client.id,
            name: client.name || '',
            document: client.document || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || ''
        };
        
        // Atualiza os totais do pedido (caso haja descontos específicos para este cliente)
        this.updateOrderTotals();
    }
    
    // Adiciona um novo item ao pedido
    addOrderItem() {
        this.formData.items.push({
            id: `item_${Date.now()}`,
            productId: '',
            productName: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            completed: false
        });
        
        document.getElementById('items-container').innerHTML = this.renderOrderItems();
        
        // Adiciona eventos para o novo item
        this.addItemEventListeners();
        
        // Atualiza os totais
        this.updateOrderTotals();
    }
    
    // Remove um item do pedido
    removeOrderItem(index) {
        this.formData.items.splice(index, 1);
        document.getElementById('items-container').innerHTML = this.renderOrderItems();
        
        // Adiciona eventos novamente
        this.addItemEventListeners();
        
        // Atualiza os totais
        this.updateOrderTotals();
    }
    
    // Adiciona todos os event listeners para os itens do pedido
    addItemEventListeners() {
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removeOrderItem(index);
            });
        });
        
        document.querySelectorAll('.product-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                const productId = e.target.value;
                if (productId) {
                    const product = this.products.find(p => p.id === productId);
                    if (product) {
                        this.updateProductDetails(index, product);
                    }
                }
            });
        });
        
        document.querySelectorAll('.item-quantity, .item-width, .item-height, .item-unit-price').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.updateItemValues(index);
            });
        });
    }
    
    // Atualiza os detalhes do produto selecionado
    updateProductDetails(index, product) {
        const item = this.formData.items[index];
        if (item) {
            item.productId = product.id;
            item.productName = product.name;
            item.unitPrice = product.price || 0;
            
            // Reinicia os campos específicos para produtos de medida personalizada
            if (product.productType === 'custom_size') {
                item.width = 100; // 100 cm valor padrão
                item.height = 100; // 100 cm valor padrão
                // Calcula a área em metros quadrados (cm² para m²)
                item.squareMeters = this.toDecimal((item.width * item.height) / 10000);
            }
            
            // Atualiza a interface
            document.getElementById(`unit-price-${index}`).value = item.unitPrice;
            
            // Atualiza os elementos de tamanho, se existirem
            const widthElement = document.getElementById(`width-${index}`);
            const heightElement = document.getElementById(`height-${index}`);
            const areaElement = document.getElementById(`area-${index}`);
            
            if (widthElement && heightElement && areaElement) {
                widthElement.value = item.width || 100;
                heightElement.value = item.height || 100;
                areaElement.value = item.squareMeters || 1;
            }
            
            // Atualiza os valores
            this.updateItemValues(index);
            
            // Atualiza a interface do formulário (necessário para renderizar/esconder campos de dimensões)
            document.getElementById('items-container').innerHTML = this.renderOrderItems();
            
            // Readiciona eventos após renderizar novamente os itens
            this.addItemEventListeners();
        }
    }
    
    // Atualiza os valores do item quando há mudanças nos inputs
    updateItemValues(index) {
        const item = this.formData.items[index];
        if (!item) return;
        
        // Obtém os valores dos inputs
        const quantityInput = document.getElementById(`quantity-${index}`);
        const unitPriceInput = document.getElementById(`unit-price-${index}`);
        const widthInput = document.getElementById(`width-${index}`);
        const heightInput = document.getElementById(`height-${index}`);
        const descriptionInput = document.getElementById(`item-description-${index}`);
        
        // Atualiza a descrição
        if (descriptionInput) {
            item.description = descriptionInput.value;
        }
        
        // Atualiza quantidade e preço unitário
        if (quantityInput && unitPriceInput) {
            item.quantity = parseInt(quantityInput.value) || 1;
            item.unitPrice = parseFloat(unitPriceInput.value) || 0;
        }
        
        // Verifica se é produto com medidas personalizadas
        const product = this.products.find(p => p.id === item.productId);
        const isCustomSize = product ? product.productType === 'custom_size' : false;
        
        if (isCustomSize && widthInput && heightInput) {
            item.width = parseInt(widthInput.value) || 100;
            item.height = parseInt(heightInput.value) || 100;
            
            // Calcula a área em metros quadrados (cm² para m²)
            item.squareMeters = this.toDecimal((item.width * item.height) / 10000);
            
            // Atualiza o campo de área
            const areaInput = document.getElementById(`area-${index}`);
            if (areaInput) {
                areaInput.value = item.squareMeters;
            }
            
            // Para produtos com medida personalizada, o preço é calculado por m²
            item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
        } else {
            // Para produtos normais, o preço é calculado por unidade
            item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
        }
        
        // Atualiza o campo de preço total
        const totalPriceInput = document.getElementById(`total-price-${index}`);
        if (totalPriceInput) {
            totalPriceInput.value = item.totalPrice;
        }
        
        // Atualiza os totais do pedido
        this.updateOrderTotals();
    }
    
    // Adiciona um novo pagamento
    addPayment() {
        // Calcula o valor restante a ser pago como valor default para o novo pagamento
        const orderTotal = this.calculateOrderTotal();
        const paymentsTotal = this.calculatePaymentsTotal();
        const remainingValue = Math.max(0, orderTotal - paymentsTotal);
        
        this.formData.payments.push({
            id: `payment_${Date.now()}`,
            method: 'pix',
            amount: remainingValue,
            date: new Date(),
            reference: ''
        });
        
        document.getElementById('payments-container').innerHTML = this.renderPayments();
        
        // Adiciona eventos para o novo pagamento
        document.querySelectorAll('.remove-payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removePayment(index);
            });
        });
        
        // Adiciona eventos para atualização em tempo real dos totais
        document.querySelectorAll('.payment-amount').forEach(input => {
            input.addEventListener('input', (e) => {
                // Atualiza o valor no objeto de pagamento
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                if (this.formData.payments[index]) {
                    this.formData.payments[index].amount = parseFloat(e.currentTarget.value) || 0;
                }
                this.updateOrderTotals();
            });
        });
        
        // Atualiza os totais
        this.updateOrderTotals();
    }
    
    // Remove um pagamento
    removePayment(index) {
        this.formData.payments.splice(index, 1);
        document.getElementById('payments-container').innerHTML = this.renderPayments();
        
        // Adiciona eventos novamente
        document.querySelectorAll('.remove-payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removePayment(index);
            });
        });
        
        document.querySelectorAll('.payment-amount').forEach(input => {
            input.addEventListener('input', (e) => {
                // Atualiza o valor no objeto de pagamento
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                if (this.formData.payments[index]) {
                    this.formData.payments[index].amount = parseFloat(e.currentTarget.value) || 0;
                }
                this.updateOrderTotals();
            });
        });
        
        // Atualiza os totais
        this.updateOrderTotals();
    }
    
    // Atualiza os totais do pedido
    updateOrderTotals() {
        // Atualiza os dados do formulário primeiro
        this.saveFormDataPayments();
        
        // Calcula os totais
        const orderTotal = this.calculateOrderTotal();
        const paymentsTotal = this.calculatePaymentsTotal();
        const remainingValue = Math.max(0, orderTotal - paymentsTotal);
        
        // Atualiza a interface
        document.getElementById('order-total').textContent = ui.formatCurrency(orderTotal);
        document.getElementById('payments-total').textContent = ui.formatCurrency(paymentsTotal);
        document.getElementById('remaining-total').textContent = ui.formatCurrency(remainingValue);
    }
    
    // Função auxiliar para garantir precisão decimal
    toDecimal(value, decimals = 2) {
        if (typeof value !== 'number') {
            value = parseFloat(value) || 0;
        }
        return parseFloat(value.toFixed(decimals));
    }
    
    // Calcula o total do pedido com precisão
    calculateOrderTotal() {
        if (!this.formData.items || this.formData.items.length === 0) return 0;
        
        const total = this.formData.items.reduce((total, item) => {
            const itemTotal = this.toDecimal(item.totalPrice || 0);
            return total + itemTotal;
        }, 0);
        
        return this.toDecimal(total);
    }
    
    // Calcula o total de pagamentos com precisão
    calculatePaymentsTotal() {
        if (!this.formData.payments || this.formData.payments.length === 0) return 0;
        
        // Soma os valores diretamente do objeto de dados com precisão decimal
        const total = this.formData.payments.reduce((sum, payment) => {
            // Certifica-se de que o valor é um número com precisão decimal
            const amount = this.toDecimal(
                typeof payment.amount === 'string' 
                    ? parseFloat(payment.amount) || 0 
                    : (payment.amount || 0)
            );
            
            // Log para debug
            console.log(`Pagamento: método=${payment.method}, valor=${amount}`);
            
            return this.toDecimal(sum + amount);
        }, 0);
        
        // Log do total para debug
        console.log('Total de pagamentos calculado:', total);
        
        return total;
    }
    
    // Salva apenas os dados de pagamentos do formulário
    saveFormDataPayments() {
        // Atualiza apenas os pagamentos a partir dos campos do formulário
        this.formData.payments.forEach((payment, index) => {
            const methodSelect = document.getElementById(`payment-method-${index}`);
            const amountInput = document.getElementById(`payment-amount-${index}`);
            const dateInput = document.getElementById(`payment-date-${index}`);
            const referenceInput = document.getElementById(`payment-reference-${index}`);
            
            if (methodSelect && amountInput && dateInput) {
                payment.method = methodSelect.value;
                payment.amount = parseFloat(amountInput.value) || 0;
                payment.date = dateInput.value ? new Date(dateInput.value) : new Date();
                payment.reference = referenceInput ? referenceInput.value : '';
            }
        });
    }
    
    // Formata uma data para input date
    formatDateForInput(date) {
        if (!date) return '';
        
        // Se for um timestamp do Firestore
        if (date.toDate) {
            date = date.toDate();
        } else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Formata uma data para input time
    formatTimeForInput(date) {
        if (!date) return '';
        
        // Se for um timestamp do Firestore
        if (date.toDate) {
            date = date.toDate();
        } else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    // Formata data e hora para exibição
    formatDateTime(date) {
        if (!date) return '-';
        
        // Se for um timestamp do Firestore
        if (date.toDate) {
            date = date.toDate();
        } else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
    
    // Mostra o formulário de novo cliente
    showNewClientForm() {
        // Salva os dados do formulário atual
        this.saveFormData();
        
        // Cria uma instância do componente de clientes que permanecerá acessível
        this.clientsComponent = new ClientsComponent();
        
        // Mostra o formulário de criação dentro de um modal
        this.clientsComponent.showCreateForm(async () => {
            // Esconde o indicador de carregamento
            ui.hideLoading();
            
            try {
                // Obtém o ID do cliente recém-criado
                const createdClientId = this.clientsComponent.currentClientId;
                if (!createdClientId) return;
                
                // Exibe indicador de carregamento
                ui.showLoading('Carregando cliente...');
                
                // Busca o cliente completo usando o novo método
                const client = await this.clientsComponent.getClientFromFirestore(createdClientId);
                if (!client) {
                    ui.hideLoading();
                    ui.showNotification('Erro ao recuperar dados do cliente', 'error');
                    return;
                }
                
                // Log para debug
                console.log('Cliente recuperado com sucesso:', client);
                
                // Adiciona à lista de clientes local
                const existingIndex = this.clients.findIndex(c => c.id === client.id);
                if (existingIndex >= 0) {
                    this.clients[existingIndex] = client;
                } else {
                    this.clients.push(client);
                }
                
                // Define o cliente no formulário
                this.formData.client = client;
                
                // Renderiza o formulário de pedido
                this.renderOrderForm(this.currentOrderId);
                
                // Seleciona o cliente no dropdown e atualiza os detalhes
                setTimeout(() => {
                    const clientSelect = document.getElementById('client-select');
                    if (clientSelect) {
                        clientSelect.value = client.id;
                        this.updateClientDetails(client);
                    }
                }, 100);
                
                // Oculta o indicador de carregamento
                ui.hideLoading();
            } catch (error) {
                console.error('Erro ao carregar cliente:', error);
                ui.hideLoading();
                ui.showNotification('Erro ao carregar dados do cliente', 'error');
            }
        });
    }
    
    // Salva os dados do formulário atual
    saveFormData() {
        // Obtém dados do cliente
        const clientIdInput = document.getElementById('client-id');
        if (clientIdInput && clientIdInput.value) {
            const clientId = clientIdInput.value;
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                this.formData.client = client;
            }
        }
        
        // Obtém título do pedido
        const orderTitle = document.getElementById('order-title');
        if (orderTitle) {
            this.formData.title = orderTitle.value;
        }
        
        // Obtém dados do vendedor
        const sellerSelect = document.getElementById('seller-select');
        const sellerIdInput = document.getElementById('seller-id');
        
        if (sellerSelect && sellerSelect.value) {
            const selectedOption = sellerSelect.options[sellerSelect.selectedIndex];
            this.formData.sellerId = sellerSelect.value;
            this.formData.sellerName = selectedOption.getAttribute('data-name') || 'Sistema';
            // Atualiza também o campo hidden
            if (sellerIdInput) {
                sellerIdInput.value = this.formData.sellerId;
            }
        } else if (sellerIdInput && sellerIdInput.value) {
            // Se não tem vendedor selecionado mas tem um ID no campo hidden
            this.formData.sellerId = sellerIdInput.value;
            
            // Tenta encontrar o nome do vendedor
            const seller = this.employees.find(e => e.id === this.formData.sellerId);
            if (seller) {
                this.formData.sellerName = seller.name;
            } else if (window.auth?.currentUser?.id === this.formData.sellerId) {
                this.formData.sellerName = window.auth.currentUser.name || 'Sistema';
            }
        } else if (window.auth?.currentUser) {
            // Se não há vendedor selecionado nem no campo hidden, usa o usuário logado
            this.formData.sellerId = window.auth.currentUser.id;
            this.formData.sellerName = window.auth.currentUser.name || 'Sistema';
        }
        
        // Obtém data e hora de entrega
        const deliveryDateInput = document.getElementById('delivery-date');
        const deliveryTimeInput = document.getElementById('delivery-time');
        
        if (deliveryDateInput && deliveryTimeInput) {
            const dateValue = deliveryDateInput.value;
            const timeValue = deliveryTimeInput.value || '12:00';
            
            if (dateValue) {
                // Combina data e hora
                const [year, month, day] = dateValue.split('-');
                const [hours, minutes] = timeValue.split(':');
                
                const deliveryDate = new Date(year, month - 1, day, hours, minutes);
                this.formData.deliveryDate = deliveryDate;
            }
        }
        
        // Obtém o status
        const statusSelect = document.getElementById('status-select');
        if (statusSelect) {
            this.formData.status = statusSelect.value;
        }
        
        // Obtém as observações
        const notesTextarea = document.getElementById('order-notes');
        if (notesTextarea) {
            this.formData.notes = notesTextarea.value;
        }
        
        // Atualiza os itens com os valores mais recentes dos inputs
        this.formData.items.forEach((item, index) => {
            // Quantidade
            const quantityInput = document.getElementById(`quantity-${index}`);
            if (quantityInput) {
                item.quantity = parseInt(quantityInput.value) || 1;
            }
            
            // Preço unitário
            const unitPriceInput = document.getElementById(`unit-price-${index}`);
            if (unitPriceInput) {
                item.unitPrice = parseFloat(unitPriceInput.value) || 0;
            }
            
            // Descrição do item
            const descriptionInput = document.getElementById(`item-description-${index}`);
            if (descriptionInput) {
                item.description = descriptionInput.value;
            }
            
            // Status do item (completado ou não)
            const completedSelect = document.getElementById(`completed-${index}`);
            if (completedSelect) {
                item.completed = completedSelect.value === 'true';
            }
            
            // Se for um produto com dimensões, obter largura e altura
            const widthInput = document.getElementById(`width-${index}`);
            const heightInput = document.getElementById(`height-${index}`);
            
            if (widthInput && heightInput) {
                item.width = parseInt(widthInput.value) || 100;
                item.height = parseInt(heightInput.value) || 100;
                item.squareMeters = this.toDecimal((item.width * item.height) / 10000);
            }
            
            // Atualiza o preço total
            if (item.width && item.height) {
                item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
            } else {
                item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
            }
        });
        
        // Atualiza os pagamentos com os valores mais recentes dos inputs
        this.saveFormDataPayments();
    }
    
    // Salva o pedido
    async saveOrder(isEdit) {
        try {
            // Valida o formulário
            if (!this.validateOrderForm()) {
                return;
            }
            
            // Salva os dados do formulário
            this.saveFormData();
            
            // Prepara os dados para salvar
            const orderData = this.prepareOrderData(isEdit);
            if (!orderData) return;
            
            // Verifica e remove campos undefined que podem causar erro no Firestore
            Object.keys(orderData).forEach(key => {
                if (orderData[key] === undefined) {
                    console.warn(`Campo undefined detectado e removido: ${key}`);
                    delete orderData[key];
                }
            });
            
            // Exibe o indicador de carregamento
            ui.showLoading('Salvando pedido...');
            
            // Salva no Firestore
            if (isEdit && this.currentOrderId) {
                // Atualiza o pedido existente
                await db.collection('orders').doc(this.currentOrderId).update(orderData);
                ui.showNotification('Pedido atualizado com sucesso!', 'success');
                
                // Volta para a visualização de detalhes
                this.showDetailView(this.currentOrderId);
            } else {
                // Cria um novo pedido
                const docRef = await db.collection('orders').add(orderData);
                ui.showNotification('Pedido criado com sucesso!', 'success');
                
                // Vai para a visualização de detalhes do novo pedido
                this.showDetailView(docRef.id);
            }
            
            // Oculta o indicador de carregamento
            ui.hideLoading();
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao salvar pedido. Por favor, tente novamente.', 'error');
        }
    }
    
    // Valida o formulário de pedido
    validateOrderForm() {
        // Valida cliente
        const clientIdInput = document.getElementById('client-id');
        if (!clientIdInput || !clientIdInput.value) {
            ui.showNotification('Por favor, selecione um cliente.', 'error');
            document.getElementById('client-search').focus();
            return false;
        }
        
        // Valida itens
        if (this.formData.items.length === 0) {
            ui.showNotification('Por favor, adicione pelo menos um item ao pedido.', 'error');
            document.getElementById('add-item-btn').focus();
            return false;
        }
        
        // Valida cada item
        let itemsValid = true;
        this.formData.items.forEach((item, index) => {
            if (!item.productId) {
                ui.showNotification(`Por favor, selecione um produto para o item #${index + 1}.`, 'error');
                document.getElementById(`product-${index}`).focus();
                itemsValid = false;
            }
            
            if (item.unitPrice <= 0) {
                ui.showNotification(`Por favor, defina um preço válido para o item #${index + 1}.`, 'error');
                document.getElementById(`unit-price-${index}`).focus();
                itemsValid = false;
            }
        });
        
        if (!itemsValid) return false;
        
        // Valida data de entrega
        const deliveryDateInput = document.getElementById('delivery-date');
        if (!deliveryDateInput || !deliveryDateInput.value) {
            ui.showNotification('Por favor, defina uma data de entrega.', 'error');
            deliveryDateInput?.focus();
            return false;
        }
        
        // Valida hora de entrega
        const deliveryTimeInput = document.getElementById('delivery-time');
        if (!deliveryTimeInput || !deliveryTimeInput.value) {
            ui.showNotification('Por favor, defina uma hora para a entrega.', 'error');
            deliveryTimeInput?.focus();
            return false;
        }
        
        return true;
    }
    
    // Prepara os dados do pedido para salvar
    prepareOrderData(isEdit) {
        // Obtém os dados do formulário
        this.saveFormData();
        
        if (!this.formData.client) {
            ui.showNotification('Selecione um cliente para o pedido', 'error');
            return null;
        }
        
        // Valida se há pelo menos um item no pedido
        if (this.formData.items.length === 0) {
            ui.showNotification('Adicione pelo menos um item ao pedido', 'error');
            return null;
        }
        
        // Prepara os dados do pedido
        const orderData = {
            clientId: this.formData.client.id,
            clientName: this.formData.client.name,
            clientDocument: this.formData.client.document || '',
            clientPhone: this.formData.client.phone || '',
            clientEmail: this.formData.client.email || '',
            clientAddress: this.formData.client.address || '',
            items: this.formData.items.map(item => ({
                id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                description: item.description || '', // Descrição do item
                completed: item.completed || false,
                ...(item.width && item.height ? { 
                    width: item.width,
                    height: item.height,
                    squareMeters: item.squareMeters
                } : {})
            })),
            payments: this.formData.payments.map(payment => ({
                id: payment.id || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                method: payment.method,
                amount: payment.amount,
                date: payment.date,
                reference: payment.reference || ''
            })),
            notes: this.formData.notes || '',
            status: this.formData.status,
            totalValue: this.calculateOrderTotal(),
            totalPaid: this.calculatePaymentsTotal(),
            remainingValue: this.calculateOrderTotal() - this.calculatePaymentsTotal(),
            deliveryDate: this.formData.deliveryDate,
            title: this.formData.title || '', // Título do pedido
            imageUrl: this.formData.imageUrl || '', // URL da imagem
            lastUpdate: new Date(),
            // Definimos um valor padrão para o vendedor, mesmo quando não há usuário autenticado
            sellerName: this.formData.sellerName || 'Sistema'
        };
        
        // Adiciona o ID do vendedor apenas se ele existir
        if (this.formData.sellerId) {
            orderData.sellerId = this.formData.sellerId;
        }
        
        // Se for um novo pedido, adiciona informações adicionais
        if (!isEdit) {
            orderData.createdAt = new Date();
            orderData.orderNumber = this.generateOrderNumber();
        }
        
        console.log('Dados do pedido preparados:', orderData);
        return orderData;
    }
    
    // Gera um número de pedido
    generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `OS${year}${month}${day}-${randomPart}`;
    }
    
    // Atualiza o status de um pedido
    async updateOrderStatus(orderId, newStatus) {
        if (!orderId || !newStatus) return;
        
        try {
            ui.showLoading('Atualizando status do pedido...');
            
            // Se o status for 'cancelled', pergunta o motivo
            if (newStatus === 'cancelled') {
                const reason = await this.askCancellationReason(orderId);
                if (reason === null) {
                    ui.hideLoading();
                    return; // Cancelou a operação
                }
                
                await db.collection('orders').doc(orderId).update({
                    status: newStatus,
                    cancellationReason: reason,
                    lastUpdate: new Date()
                });
            } else {
                await db.collection('orders').doc(orderId).update({
                    status: newStatus,
                    lastUpdate: new Date()
                });
            }
            
            ui.showNotification('Status do pedido atualizado com sucesso!', 'success');
            
            // Atualiza a interface
            this.renderOrderDetail(orderId);
            
            ui.hideLoading();
        } catch (error) {
            console.error('Erro ao atualizar status do pedido:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao atualizar status do pedido.', 'error');
        }
    }
    
    // Pergunta o motivo do cancelamento
    async askCancellationReason(orderId) {
        return new Promise((resolve) => {
            ui.promptModal(
                'Motivo do Cancelamento', 
                'Por favor, informe o motivo do cancelamento:',
                (reason) => {
                    resolve(reason);
                },
                () => {
                    resolve(null);
                }
            );
        });
    }
    
    // Imprime o pedido
    printOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        
        if (!order) {
            ui.showNotification('Pedido não encontrado.', 'error');
            return;
        }
        
        // Obtém os dados para a impressão
        const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                        { name: 'Desconhecido', color: '#999' };
        
        const createdDate = order.createdAt ? ui.formatDate(order.createdAt) : '-';
        const deliveryDate = order.deliveryDate ? ui.formatDate(order.deliveryDate) : '-';
        
        // Abre uma nova janela para impressão
        const printWindow = window.open('', '_blank');
        
        // Conteúdo a ser impresso
        let printContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <title>Pedido #${order.orderNumber}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    h1, h2, h3 {
                        margin-bottom: 10px;
                    }
                    .order-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }
                </tbody>
            </table>
        `;
        
        // Adiciona observações
        if (order.notes) {
            printContent += `
                <div class="notes">
                    <h3>Observações</h3>
                    <p>${order.notes}</p>
                </div>
            `;
        }
        
        // Área de assinaturas
        printContent += `
            <div class="signature-area">
                <div class="signature-box">
                    <p>Cliente</p>
                </div>
                <div class="signature-box">
                    <p>Responsável</p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este documento foi gerado em ${ui.formatDate(new Date())} pelo sistema GrafSys.</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
        `;
        
        // Escreve o conteúdo na nova janela
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
    
    // Verifica se uma data é para hoje
    isToday(date) {
        if (!date) return false;
        
        // Se for um timestamp do Firestore
        if (date.toDate) {
            date = date.toDate();
        } else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
    
    // Obtém a lista de produtos únicos do sistema com contagem
    getUniqueProductTypes() {
        const commonProductTypes = [
            'Adesivo', 'Banner', 'Cartão', 'Flyer', 'Folder', 
            'Placa', 'Lona', 'Vinil', 'Papel', 'Outdoor', 
            'Brilho', 'Fosco', 'Recortado', 'Impressão'
        ];
        
        // Mapa para contar ocorrências de cada tipo
        const typeCounts = new Map();
        
        // Inicializa contadores para tipos comuns
        commonProductTypes.forEach(type => typeCounts.set(type, 0));
        
        // Coleta e conta todos os tipos de produtos nos pedidos
        this.orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productName = item.productName || '';
                    
                    // Conta o produto completo
                    if (!typeCounts.has(productName)) {
                        typeCounts.set(productName, 1);
                    } else {
                        typeCounts.set(productName, typeCounts.get(productName) + 1);
                    }
                    
                    // Conta tipos comuns dentro do nome
                    commonProductTypes.forEach(type => {
                        if (productName.toLowerCase().includes(type.toLowerCase())) {
                            typeCounts.set(type, typeCounts.get(type) + 1);
                        }
                    });
                });
            }
        });
        
        // Filtra tipos sem ocorrências e ordena por número de ocorrências (decrescente)
        const sortedTypes = Array.from(typeCounts.entries())
            .filter(([_, count]) => count > 0)
            .sort((a, b) => {
                // Primeiro por contagem (decrescente)
                if (b[1] !== a[1]) return b[1] - a[1];
                // Depois alfabeticamente
                return a[0].localeCompare(b[0], 'pt-BR');
            });
        
        return sortedTypes;
    }
    
    // Renderiza opções de tipo de produto com contagem
    renderProductTypeOptions() {
        const productTypes = this.getUniqueProductTypes();
        
        let html = '<option value="">Todos os tipos</option>';
        
        productTypes.forEach(([type, count]) => {
            html += `<option value="${type}">${type} (${count})</option>`;
        });
        
        return html;
    }
    
    // Renderiza as opções de vendedores para o select
    renderSellerOptions() {
        // Filtra apenas funcionários que são vendedores
        const sellers = this.employees.filter(employee => employee.role === 'seller' || employee.role === 'admin');
        
        let options = '';
        
        // Adiciona uma opção vazia por padrão
        options += `<option value="">Selecione um vendedor</option>`;
        
        // Verifica se há um vendedor definido nos dados do formulário
        const hasSelectedSeller = this.formData.sellerId && this.formData.sellerName;
        const loggedUserId = window.auth?.currentUser?.id;
        
        // Adiciona todos os vendedores à lista
        sellers.forEach(seller => {
            // Marca como selecionado se for o vendedor definido nos dados do formulário
            // ou se for um novo pedido e for o usuário logado
            let isSelected = false;
            
            if (hasSelectedSeller) {
                // Se temos um vendedor já definido (edição)
                isSelected = this.formData.sellerId === seller.id;
            } else if (loggedUserId) {
                // Se não temos vendedor definido (novo pedido) e há um usuário logado
                isSelected = seller.id === loggedUserId;
            }
            
            const isLoggedUser = seller.id === loggedUserId;
            
            options += `<option value="${seller.id}" 
                ${isSelected ? 'selected' : ''} 
                data-name="${seller.name}">
                ${seller.name}${isLoggedUser ? ' (Você)' : ''}
            </option>`;
        });
        
        return options;
    }
    
    // Renderiza as opções de vendedores para o filtro
    renderSellerFilterOptions() {
        // Obtém todos os vendedores (role seller ou admin)
        const sellers = this.employees.filter(employee => employee.role === 'seller' || employee.role === 'admin');
        
        // Também coleta vendedores únicos dos pedidos existentes (pode haver vendedores que não estão mais ativos)
        const sellerIdsFromOrders = new Set();
        const sellerNamesFromOrders = new Map();
        
        this.orders.forEach(order => {
            if (order.sellerId && order.sellerName) {
                sellerIdsFromOrders.add(order.sellerId);
                sellerNamesFromOrders.set(order.sellerId, order.sellerName);
            }
        });
        
        let options = '';
        const addedSellerIds = new Set();
        
        // Adiciona primeiro os vendedores ativos do sistema
        sellers.forEach(seller => {
            options += `<option value="${seller.id}" data-name="${seller.name}">${seller.name}</option>`;
            addedSellerIds.add(seller.id);
        });
        
        // Adiciona vendedores de pedidos que não estão na lista de funcionários ativos
        sellerIdsFromOrders.forEach(sellerId => {
            if (!addedSellerIds.has(sellerId) && sellerNamesFromOrders.has(sellerId)) {
                const sellerName = sellerNamesFromOrders.get(sellerId);
                options += `<option value="${sellerId}" data-name="${sellerName}">${sellerName}</option>`;
            }
        });
        
        return options;
    }
    
    // Verifica se um pedido contém um tipo específico de produto
    orderHasProductType(order, productType) {
        if (!order.items || !productType) return true;
        
        return order.items.some(item => {
            const productName = item.productName || '';
            return productName.toLowerCase().includes(productType.toLowerCase());
        });
    }
    
    // Configurar o autocomplete para busca de clientes
    setupClientAutocomplete() {
        const searchInput = document.getElementById('client-search');
        const suggestionsContainer = document.getElementById('client-suggestions');
        const clientIdInput = document.getElementById('client-id');
        
        if (!searchInput || !suggestionsContainer) return;
        
        // Função para exibir as sugestões conforme o usuário digita
        searchInput.addEventListener('input', () => {
            const searchText = searchInput.value.toLowerCase();
            suggestionsContainer.innerHTML = '';
            
            if (searchText.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }
            
            const filteredClients = this.clients.filter(client => 
                client.name.toLowerCase().includes(searchText)
            );
            
            if (filteredClients.length > 0) {
                suggestionsContainer.style.display = 'block';
                
                filteredClients.forEach(client => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.innerHTML = `
                        <div class="client-suggestion">
                            <div class="client-name">${client.name}</div>
                            <div class="client-details">${client.document || ''} ${client.phone ? '| ' + client.phone : ''}</div>
                        </div>
                    `;
                    
                    item.addEventListener('click', () => {
                        searchInput.value = client.name;
                        clientIdInput.value = client.id;
                        suggestionsContainer.style.display = 'none';
                        
                        // Atualiza os detalhes do cliente
                        this.formData.client = client;
                        this.updateClientDetails(client);
                    });
                    
                    suggestionsContainer.appendChild(item);
                });
            } else {
                suggestionsContainer.style.display = 'block';
                suggestionsContainer.innerHTML = '<div class="no-results">Nenhum cliente encontrado</div>';
            }
        });
        
        // Esconde as sugestões quando clicar fora
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
        
        // Verifica se o cliente já foi selecionado (para edição)
        if (this.formData.client) {
            searchInput.value = this.formData.client.name;
            clientIdInput.value = this.formData.client.id;
        }
    }
    
    // Lidar com o upload de imagem
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Verificar se é uma imagem válida
        if (!file.type.match('image.*')) {
            ui.showNotification('Apenas arquivos de imagem são permitidos', 'error');
            return;
        }
        
        // Tamanho máximo (5MB)
        if (file.size > 5 * 1024 * 1024) {
            ui.showNotification('A imagem deve ter no máximo 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            this.formData.imageUrl = event.target.result;
            this.updateImagePreview();
        };
        
        reader.readAsDataURL(file);
    }
    
    // Capturar screenshot
    captureScreenshot() {
        ui.showNotification('Preparando para capturar tela...', 'info');
        
        // Minimiza o formulário para capturar o que está por trás
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.style.opacity = '0.1';
            orderForm.style.pointerEvents = 'none';
            
            // Mostra instrução
            const instruction = document.createElement('div');
            instruction.className = 'screenshot-instruction';
            instruction.innerHTML = `
                <div class="instruction-content">
                    <i class="fas fa-camera"></i>
                    <h3>Preparado para capturar tela</h3>
                    <p>Posicione o conteúdo que deseja capturar e pressione <kbd>Print Screen</kbd> no teclado.</p>
                    <p>Em seguida, clique no botão abaixo para colar a imagem:</p>
                    <button id="paste-screenshot" class="btn btn-primary">Colar Imagem</button>
                    <button id="cancel-screenshot" class="btn btn-secondary">Cancelar</button>
                </div>
            `;
            
            document.body.appendChild(instruction);
            
            // Evento para colar a imagem
            document.getElementById('paste-screenshot').addEventListener('click', () => {
                navigator.clipboard.read().then(clipboardItems => {
                    for (const clipboardItem of clipboardItems) {
                        if (!clipboardItem.types.includes('image/png')) continue;
                        
                        clipboardItem.getType('image/png').then(blob => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                this.formData.imageUrl = event.target.result;
                                this.updateImagePreview();
                                
                                // Restaura o formulário
                                orderForm.style.opacity = '1';
                                orderForm.style.pointerEvents = 'auto';
                                instruction.remove();
                            };
                            reader.readAsDataURL(blob);
                        });
                    }
                }).catch(err => {
                    ui.showNotification('Erro ao acessar a área de transferência. Tente novamente.', 'error');
                    console.error('Erro na clipboard API:', err);
                    
                    // Restaura o formulário
                    orderForm.style.opacity = '1';
                    orderForm.style.pointerEvents = 'auto';
                    instruction.remove();
                });
            });
            
            // Evento para cancelar
            document.getElementById('cancel-screenshot').addEventListener('click', () => {
                orderForm.style.opacity = '1';
                orderForm.style.pointerEvents = 'auto';
                instruction.remove();
            });
        }
    }
    
    // Atualiza a visualização da imagem
    updateImagePreview() {
        const imagePreview = document.getElementById('image-preview');
        if (!imagePreview) return;
        
        if (this.formData.imageUrl) {
            imagePreview.innerHTML = `
                <img src="${this.formData.imageUrl}" alt="Imagem do pedido">
                <button type="button" id="remove-image" class="btn-icon remove-image">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Adiciona evento para remover imagem
            document.getElementById('remove-image').addEventListener('click', () => this.removeImage());
        } else {
            imagePreview.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Nenhuma imagem</p>
                </div>
            `;
        }
    }
    
    // Remove a imagem
    removeImage() {
        this.formData.imageUrl = '';
        this.updateImagePreview();
    }
}

// Registra o componente globalmente
window.OrdersComponent = OrdersComponent;