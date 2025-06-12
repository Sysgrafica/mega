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
        
        // Inicializa o listener de colagem para Ctrl+V
        this.setupPasteListener();
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
            
            // Verifica se há um pedido para visualizar (vindo do fluxo de trabalho)
            const viewOrderId = localStorage.getItem('viewOrderId');
            if (viewOrderId) {
                // Remove do localStorage para não abrir novamente em futuras navegações
                localStorage.removeItem('viewOrderId');
                
                // Abre o pedido em detalhes
                this.currentView = 'detail';
                this.currentOrderId = viewOrderId;
                console.log('Abrindo pedido do fluxo de trabalho:', viewOrderId);
            }
            
            // Verifica se há um pedido para editar
            const editOrderId = localStorage.getItem('editOrderId');
            if (editOrderId) {
                // Remove do localStorage para não abrir novamente em futuras navegações
                localStorage.removeItem('editOrderId');
                
                // Abre o pedido para edição
                this.currentView = 'edit';
                this.currentOrderId = editOrderId;
                console.log('Abrindo pedido para edição:', editOrderId);
            }
            
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
            
            // Carrega funcionários para usar como vendedores
            const employeesSnapshot = await db.collection('employees')
                .where('active', '==', true)
                .get();
            this.employees = [];
            this.users = []; // Adiciona lista de usuários para vendedores
            
            employeesSnapshot.forEach(doc => {
                const employee = doc.data();
                this.employees.push({
                    id: doc.id,
                    ...employee
                });
                
                // Adiciona à lista de usuários/vendedores
                this.users.push({
                    id: doc.id,
                    name: employee.name || 'Usuário',
                    role: employee.role || 'employee'
                });
            });
            
            // Se não houver vendedores e estamos no modo de demonstração, cria alguns
            if (this.users.length === 0) {
                console.log("Nenhum vendedor encontrado, usando dados de demonstração");
                this.users = [
                    { id: 'seller1', name: 'Vendedor 1', role: 'seller' },
                    { id: 'seller2', name: 'Vendedor 2', role: 'seller' },
                    { id: 'admin1', name: 'Administrador', role: 'admin' }
                ];
            }
            
            console.log("Vendedores carregados:", this.users);
            
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
                this.setupDeliveryToArrangeHandler();
                this.setupDeliveryTypeHandler();
                break;
            case 'edit':
                this.renderOrderForm(this.currentOrderId);
                this.setupDeliveryToArrangeHandler();
                this.setupDeliveryTypeHandler();
                break;
        }
    }
    
    // Configurar o handler para o checkbox "A combinar"
    setupDeliveryToArrangeHandler() {
        const toArrangeCheckbox = document.getElementById('to-arrange');
        const deliveryDateInput = document.getElementById('delivery-date');
        const deliveryTimeInput = document.getElementById('delivery-time');
        
        if (toArrangeCheckbox && deliveryDateInput && deliveryTimeInput) {
            toArrangeCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;
                
                // Desabilita ou habilita os campos de data e hora
                deliveryDateInput.disabled = isChecked;
                deliveryTimeInput.disabled = isChecked;
                
                // Se marcar como "A combinar", limpa os campos
                if (isChecked) {
                    deliveryDateInput.value = '';
                    deliveryTimeInput.value = '';
                } else {
                    // Se desmarcar, define uma data padrão (hoje)
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    deliveryDateInput.value = `${yyyy}-${mm}-${dd}`;
                    deliveryTimeInput.value = '12:00';
                }
            });
        }
    }
    
    // Configurar o handler para o tipo de entrega (Retirada ou Entregar)
    setupDeliveryTypeHandler() {
        const pickupRadio = document.getElementById('pickup');
        const deliverRadio = document.getElementById('deliver');
        const deliveryCostRow = document.getElementById('delivery-cost-row');
        
        if (pickupRadio && deliverRadio && deliveryCostRow) {
            // Evento para a opção "Retirada"
            pickupRadio.addEventListener('change', function() {
                if (this.checked) {
                    // Esconde o campo de valor de entrega
                    deliveryCostRow.style.display = 'none';
                }
            });
            
            // Evento para a opção "Entregar"
            deliverRadio.addEventListener('change', function() {
                if (this.checked) {
                    // Mostra o campo de valor de entrega
                    deliveryCostRow.style.display = 'flex';
                }
            });
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
                const deliveryDateTime = order.toArrange ? 'A combinar' : (order.deliveryDate ? this.formatDateTime(order.deliveryDate) : '-');
                
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
                            <button class="btn-icon delete-order" data-id="${order.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn-icon change-status" data-id="${order.id}" title="Alterar Status">
                                <i class="fas fa-exchange-alt"></i>
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
            
            document.querySelectorAll('.delete-order').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const orderId = e.currentTarget.getAttribute('data-id');
                    this.confirmDeleteOrder(orderId);
                });
            });
            
            document.querySelectorAll('.change-status').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const orderId = e.currentTarget.getAttribute('data-id');
                    this.showChangeStatusDialog(orderId);
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
            sellerId: sellerId, // ID do vendedor logado
            discount: 0 // Campo para desconto
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
                sellerId: order.sellerId || '',
                discount: order.discount || 0 // Campo para desconto
            };
        }
        this.renderCurrentView();
    }
    
    // Renderiza os detalhes do item na visualização de pedido
    renderOrderItemDetails(item) {
        return `
            <div class="order-item-detail">
                <div class="order-item-header">
                    <div class="item-title">${item.product || 'Item sem nome'}</div>
                    <div class="item-price">${ui.formatCurrency(item.total || 0)}</div>
                </div>
                
                <div class="item-specs">
                    <div class="item-spec">
                        <span class="spec-label">Quantidade</span>
                        <span class="spec-value">${item.quantity || 0}</span>
                    </div>
                    <div class="item-spec">
                        <span class="spec-label">Preço Unitário</span>
                        <span class="spec-value">${ui.formatCurrency(item.price || 0)}</span>
                    </div>
                    
                    ${item.width ? `
                    <div class="item-spec">
                        <span class="spec-label">Largura</span>
                        <span class="spec-value">${item.width} ${item.unit || 'cm'}</span>
                    </div>` : ''}
                    
                    ${item.height ? `
                    <div class="item-spec">
                        <span class="spec-label">Altura</span>
                        <span class="spec-value">${item.height} ${item.unit || 'cm'}</span>
                    </div>` : ''}
                    
                    ${item.area ? `
                    <div class="item-spec">
                        <span class="spec-label">Área</span>
                        <span class="spec-value">${item.area} ${item.areaUnit || 'm²'}</span>
                    </div>` : ''}
                    
                    ${item.material ? `
                    <div class="item-spec">
                        <span class="spec-label">Material</span>
                        <span class="spec-value">${item.material}</span>
                    </div>` : ''}
                    
                    ${item.finish ? `
                    <div class="item-spec">
                        <span class="spec-label">Acabamento</span>
                        <span class="spec-value">${item.finish}</span>
                    </div>` : ''}
                    
                    ${item.installation ? `
                    <div class="item-spec">
                        <span class="spec-label">Instalação</span>
                        <span class="spec-value">${item.installation === true ? 'Sim' : 'Não'}</span>
                    </div>` : ''}
                </div>
                
                ${item.description ? `
                <div class="item-description">
                    <span class="spec-label">Descrição</span>
                    <span class="spec-value description-text">${item.description}</span>
                </div>` : ''}
            </div>
        `;
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
        
        // Garantindo que os itens tenham IDs
        if (order.items) {
            order.items.forEach((item, idx) => {
                if (!item.id) {
                    item.id = `item_${orderId}_${idx}`;
                }
                console.log(`Item ${idx} ID:`, item.id);
            });
        }
        
        console.log('Renderizando detalhes do pedido:', orderId);
        console.log('Itens do pedido:', order.items);
        
        const statusInfo = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || {
            name: 'Status Desconhecido',
            color: '#999'
        };
        
        // Formato para data
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Não definida';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        // Formato para data e hora
        const formatDateTime = (timestamp) => {
            if (!timestamp) return 'Não definida';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        // Prepara detalhes de entrega
        const deliveryType = order.needsDelivery ? 'Entregar' : 'Retirada';
        const deliveryDate = order.toArrange 
            ? 'A combinar' 
            : order.deliveryDate 
                ? formatDateTime(order.deliveryDate) 
                : 'Não definida';

        // Novo layout baseado no design fornecido
        let html = `
            <div class="order-detail-container">
                <div class="page" style="width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15px; background: Black; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <!-- Cabeçalho com título e botão de impressão -->
                    <header class="main-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                        <div class="header-content">
                            <h1 style="margin: 0; font-size: 20px;">Detalhes do Pedido #${order.orderNumber || 'Novo'}</h1>
                            <p class="order-title" style="margin: 5px 0 0 0; font-size: 16px; color: #666;">${order.title || ''}</p>
                        </div>
                        <button id="print-order-btn" class="print-button" style="margin-left: 10px;">Imprimir Pedido</button>
                    </header>

                    <!-- Imagem de referência no topo com largura máxima -->
                    ${order.imageUrl ? `
                        <div class="reference-image" style="text-align: center; margin-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; font-weight: bold;">${order.title || ''}</p>
                            <img src="${order.imageUrl}" alt="Imagem do pedido" style="max-width: 100%; max-height: 200px; object-fit: contain;">
                        </div>
                    ` : ''}

                    <!-- Grid com informações gerais do pedido -->
                    <section class="info-grid" style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div class="info-card" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                            <h3 class="card-title" style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Status e Prazos</h3>
                            <p style="margin: 5px 0;"><strong>Status:</strong> ${statusInfo.name}</p>
                            <p style="margin: 5px 0;"><strong>Data do Pedido:</strong> ${formatDate(order.createdAt)}</p>
                            <p style="margin: 5px 0;"><strong>Última Atualização:</strong> ${formatDateTime(order.lastUpdate)}</p>
                            <p style="margin: 5px 0;"><strong>Tipo de Entrega:</strong> ${deliveryType}</p>
                            <p class="delivery-date" style="margin: 5px 0;"><strong>Data de Entrega:</strong> ${deliveryDate}</p>
                            <p style="margin: 5px 0;"><strong>Vendedor(a):</strong> ${order.sellerName || 'Não informado'}</p>
                        </div>
                        <div class="info-card" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                            <h3 class="card-title" style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Informações do Cliente</h3>
                            <p style="margin: 5px 0;"><strong>Nome:</strong> ${order.clientName || 'Não informado'}</p>
                            <p style="margin: 5px 0;"><strong>Documento:</strong> ${order.clientDocument || 'Não informado'}</p>
                            <p style="margin: 5px 0;"><strong>Telefone:</strong> ${order.clientPhone || 'Não informado'}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${order.clientEmail || 'Não informado'}</p>
                            <p style="margin: 5px 0;"><strong>Endereço:</strong> ${order.clientAddress || 'Não informado'}</p>
                        </div>
                    </section>

                    <!-- Seção principal com os detalhes dos itens -->
                    <section class="order-details" style="margin-bottom: 15px;">
                        <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detalhes do Pedido</h2>
                        <!-- Itens do pedido em layout compacto -->
                        <div class="order-items" style="border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                            ${order.items.length > 0 ? order.items.map((item, index) => `
                                <div class="item" style="border-bottom: ${index < order.items.length-1 ? '1px solid #eee' : 'none'}; padding: 8px 0; ${index > 0 ? 'margin-top: 5px;' : ''}">
                                    <div class="item-header" style="display: flex; justify-content: space-between;">
                                        <span class="item-name" style="font-weight: bold;">${item.productName || item.product || 'Produto'}</span>
                                        <span class="item-total-price" style="font-weight: bold;">${ui.formatCurrency(item.totalPrice || item.total || 0)}</span>
                                    </div>
                                    <div class="item-body" style="display: flex; flex-wrap: wrap; gap: 5px; font-size: 12px; margin-top: 5px;">
                                        <div style="display: flex; flex-wrap: wrap; gap: 10px; width: 100%;">
                                            <span><strong>Qtd:</strong> ${item.quantity || 0}</span>
                                            <span><strong>Preço Unit:</strong> ${ui.formatCurrency(item.unitPrice || item.price || 0)}</span>
                                            ${item.width ? `<span><strong>Dim:</strong> ${item.width}x${item.height} ${item.unit || 'cm'}</span>` : ''}
                                            ${item.squareMeters || item.area ? `<span><strong>Área:</strong> ${item.squareMeters || item.area} ${item.areaUnit || 'm²'}</span>` : ''}
                                            ${item.material ? `<span><strong>Material:</strong> ${item.material}</span>` : ''}
                                            ${item.finish ? `<span><strong>Acabamento:</strong> ${item.finish}</span>` : ''}
                                            ${item.installation ? `<span><strong>Instalação:</strong> ${item.installation === true ? 'Sim' : 'Não'}</span>` : ''}
                                            
                                            <!-- Botões de ação para impressão e acabamento como ícones -->
                                            <div style="display: inline-flex; gap: 5px; margin-left: auto;">
                                                <div style="position: relative; cursor: pointer;">
                                                    <button type="button" id="print-btn-${item.id}" class="print-action-btn" data-item-id="${item.id}"
                                                          style="width: 24px; height: 24px; background-color: #3498db; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                                                        <i class="fas fa-print"></i>
                                                    </button>
                                                    <div class="tooltip" style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: #333; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 10px; opacity: 0; visibility: hidden; z-index: 10; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2); pointer-events: none;">Registrar impressão</div>
                                                </div>
                                                
                                                <div style="position: relative; cursor: pointer;">
                                                    <button type="button" id="finish-btn-${item.id}" class="finish-action-btn" data-item-id="${item.id}"
                                                          style="width: 24px; height: 24px; background-color: #2ecc71; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                    <div class="tooltip" style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: #333; color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 10px; opacity: 0; visibility: hidden; z-index: 10; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2); pointer-events: none;">Registrar acabamento</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        ${item.description ? `<p class="item-description" style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 3px 0 0 0; font-style: italic; font-size: 11px;">${item.description}</p>` : ''}
                                    </div>
                                </div>
                            `).join('') : '<p>Nenhum item no pedido</p>'}
                            
                            <!-- Sumário de valores -->
                            <div class="totals" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
                                    <span>Subtotal</span> <span>${ui.formatCurrency(order.subtotal || 0)}</span>
                                </div>
                                ${order.discount ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; color: #e74c3c;"><span>Desconto</span> <span>- ${ui.formatCurrency(order.discount)}</span></div>` : ''}
                                ${order.needsDelivery ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;"><span>Frete</span> <span>${ui.formatCurrency(order.deliveryCost || 0)}</span></div>` : ''}
                                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 3px 0; border-top: 1px dashed #eee; padding-top: 5px;"><span>Valor Total</span> <span>${ui.formatCurrency(order.totalValue || 0)}</span></div>
                            </div>
                        </div>
                    </section>

                    <!-- Seção de Pagamentos e Valores em layout flexível -->
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <!-- Seção de Pagamentos -->
                        <section class="payment-details" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                            <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Pagamentos</h2>
                            ${order.payments && order.payments.length > 0 ? order.payments.map(payment => {
                                const methodInfo = SYSTEM_CONFIG.paymentMethods.find(m => m.id === payment.method) || {
                                    name: payment.method || 'Outro'
                                };
                                
                                return `
                                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; border-bottom: 1px dashed #eee; padding-bottom: 5px;">
                                        <span><strong>${methodInfo.name}</strong> - ${formatDate(payment.date)} ${payment.reference ? `(Ref: ${payment.reference})` : ''}</span>
                                        <span>${ui.formatCurrency(payment.amount)}</span>
                                    </div>
                                `;
                            }).join('') : '<p style="font-size: 12px; color: #999; margin: 5px 0;">Nenhum pagamento registrado</p>'}
                            
                            <div style="margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
                                    <span>Total Pago</span> <span class="paid-amount">${ui.formatCurrency(order.totalPaid || 0)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin: 3px 0;">
                                    <span>Saldo Restante</span> <span class="remaining-balance">${ui.formatCurrency(order.remainingValue || 0)}</span>
                                </div>
                            </div>
                        </section>

                        <!-- Seção de Observações -->
                        ${order.notes ? `
                            <section class="observations" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                                <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Observações</h2>
                                <p style="font-size: 12px; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.notes}</p>
                            </section>
                        ` : ''}

                    </div>
                    
                    <!-- Área de controle de status (visível apenas para não cancelados) -->
                    ${order.status !== 'canceled' ? `
                        <section class="status-actions" style="margin-top: 15px; border: 1px solid #eee; border-radius: 5px; padding: 10px;">
                            <h2 class="section-title" style="font-size: 16px; margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Alterar Status</h2>
                            <div class="status-buttons" style="display: flex; flex-wrap: wrap; gap: 5px;">
                                ${SYSTEM_CONFIG.orderStatus.map(status => 
                                    status.id !== order.status ? `
                                        <button class="status-btn" 
                                                data-status="${status.id}" 
                                                style="background-color: ${status.color}; color: black; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                            ${status.name}
                                        </button>
                                    ` : ''
                                ).join('')}
                            </div>
                        </section>
                    ` : ''}

                    <!-- Rodapé da página -->
                    <footer class="main-footer" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px; font-size: 11px; color: #999; text-align: center;">
                        <p style="margin: 0;">Documento gerado em: ${formatDateTime(new Date())}</p>
                    </footer>

                    <!-- Botão para voltar para a lista (fora do layout de impressão) -->
                    <div style="margin-top: 15px; text-align: center;">
                        <button id="back-to-list" class="btn btn-secondary">Voltar para Lista</button>
                        ${order.status !== 'canceled' ? `
                            <button id="edit-order-btn" class="btn btn-primary" style="margin-left: 10px;">
                                <i class="fas fa-edit"></i> Editar Pedido
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showListView();
        });
        
        const printBtn = document.getElementById('print-order-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printOrder(orderId);
            });
        }
        
        if (order.status !== 'canceled') {
            const editBtn = document.getElementById('edit-order-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.showEditView(orderId);
                });
            }
            
            // Adiciona eventos para os botões de status
            document.querySelectorAll('.status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const newStatus = btn.getAttribute('data-status');
                    this.updateOrderStatus(orderId, newStatus);
                });
            });
            
            // Adiciona eventos para os checkboxes de impressão e acabamento
            this.setupProductionCheckboxes(orderId);
        }
    }
    
    // Função para configurar os checkboxes de produção
    setupProductionCheckboxes(orderId) {
        // Adiciona logs para depuração inicial
        console.log('Configurando botões de produção para pedido:', orderId);
        
        const printButtons = document.querySelectorAll('.print-action-btn');
        const finishButtons = document.querySelectorAll('.finish-action-btn');
        
        console.log('Botões encontrados - Impressão:', printButtons.length, 'Acabamento:', finishButtons.length);
        
        if (printButtons.length === 0 || finishButtons.length === 0) {
            console.warn('Nenhum botão encontrado, verificando novamente em 500ms');
            // Se os botões não foram encontrados, tenta novamente após um pequeno atraso
            setTimeout(() => this.setupProductionCheckboxes(orderId), 500);
            return;
        }
        
        // Para cada botão, registra o ID para depuração
        printButtons.forEach(button => {
            console.log('Print button ID:', button.id, 'Item ID:', button.dataset.itemId);
        });
        
        finishButtons.forEach(button => {
            console.log('Finish button ID:', button.id, 'Item ID:', button.dataset.itemId);
            
            // Inicializa os botões de acabamento como habilitados
            button.disabled = false;
            button.style.opacity = "1";
            
            // Atualiza o texto do tooltip
            const tooltipEl = button.parentElement.querySelector('.tooltip');
            if (tooltipEl) {
                tooltipEl.textContent = "Clique para registrar acabamento";
            }
        });
        
        // Obtém as permissões do usuário atual
        const currentUser = firebase.auth().currentUser;
        const userPermissions = this.getUserPermissions(currentUser);
        
        console.log('Permissões do usuário para botões:', userPermissions);
        
        // Configura os eventos para botões de impressão (apenas usuários com permissão de impressão)
        printButtons.forEach(button => {
            // Define se o botão deve estar habilitado com base nas permissões
            if (userPermissions.canPrint) {
                button.disabled = false;
                button.style.opacity = "1";
                button.title = "Clique para registrar impressão";
                console.log(`Botão de impressão ${button.id} habilitado`);
            } else {
                button.disabled = true;
                button.style.opacity = "0.6";
                button.title = "Você não tem permissão para registrar impressão";
                console.log(`Botão de impressão ${button.id} desabilitado por falta de permissão`);
            }
            
            // Adiciona evento de clique ao botão
            button.addEventListener('click', async (e) => {
                console.log('Botão de impressão clicado:', e.target.id);
                
                if (!userPermissions.canPrint) {
                    ui.showNotification('Você não tem permissão para registrar impressão', 'error');
                    return;
                }
                
                // Cria um modal simples para confirmar o registro
                ui.showModal({
                    title: 'Registrar Impressão',
                    content: `
                        <p>Confirme o registro de impressão para este item:</p>
                        <p><small>Este registro não poderá ser desfeito.</small></p>
                    `,
                    confirmText: 'Confirmar',
                    cancelText: 'Cancelar',
                    onConfirm: async () => {
                        const itemId = button.dataset.itemId;
                        
                        try {
                            // Registra o evento e obtém as informações do usuário que fez o registro
                            const eventInfo = await this.registerProductionEvent(orderId, itemId, 'print');
                            
                            // Desabilita o botão depois de registrado - não pode ser usado novamente
                            button.disabled = true;
                            button.style.opacity = "0.6";
                            button.innerHTML = `<i class="fas fa-check"></i> Impressão Registrada`;
                            
                            // Mostra o status com o nome de quem registrou
                            const statusEl = document.getElementById(`print-status-${itemId}`);
                            if (statusEl) {
                                // Usa o nome retornado pela função registerProductionEvent
                                const userName = eventInfo?.userName || 'Usuário';
                                const date = new Date();
                                const formattedDate = date.toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${userName}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                statusEl.style.display = "block";
                                statusEl.style.color = "#3498db";
                            }
                        } catch (error) {
                            console.error('Erro ao registrar impressão:', error);
                            ui.showNotification('Erro ao registrar impressão: ' + error.message, 'error');
                        }
                    }
                });
            });
            
            // Mostra detalhes ao passar o mouse
            const tooltipEl = button.parentElement.querySelector('.tooltip');
            if (tooltipEl) {
                button.parentElement.addEventListener('mouseover', () => {
                    this.updateTooltip(tooltipEl, orderId, button.dataset.itemId, 'print');
                    tooltipEl.style.opacity = '1';
                    tooltipEl.style.visibility = 'visible';
                    const tooltipArrow = button.parentElement.querySelector('.tooltip-arrow');
                    if (tooltipArrow) {
                        tooltipArrow.style.opacity = '1';
                        tooltipArrow.style.visibility = 'visible';
                    }
                });
                
                button.parentElement.addEventListener('mouseout', () => {
                    tooltipEl.style.opacity = '0';
                    tooltipEl.style.visibility = 'hidden';
                    const tooltipArrow = button.parentElement.querySelector('.tooltip-arrow');
                    if (tooltipArrow) {
                        tooltipArrow.style.opacity = '0';
                        tooltipArrow.style.visibility = 'hidden';
                    }
                });
            }
        });
        
        // Carrega os dados existentes de produção (se houver) - depois de configurar os eventos
        this.loadProductionData(orderId);
        
        // Configura eventos para os botões de acabamento
        finishButtons.forEach(button => {
            // Adiciona o evento de clique
            button.addEventListener('click', async (e) => {
                console.log('Botão de acabamento clicado:', e.target.id);
                
                // Verifica se o usuário tem permissão para registrar acabamento
                if (!userPermissions.canFinish) {
                    ui.showNotification('Você não tem permissão para registrar acabamento', 'error');
                    return;
                }
                
                // Não é mais necessário verificar se a impressão foi registrada antes
                const itemId = button.dataset.itemId;
                
                // Cria um modal simples para confirmar o registro
                ui.showModal({
                    title: 'Registrar Acabamento',
                    content: `
                        <p>Confirme o registro de acabamento para este item:</p>
                        <p><small>Este registro não poderá ser desfeito.</small></p>
                    `,
                    confirmText: 'Confirmar',
                    cancelText: 'Cancelar',
                    onConfirm: async () => {
                        try {
                            // Registra o evento e obtém as informações do usuário que fez o registro
                            const eventInfo = await this.registerProductionEvent(orderId, itemId, 'finish');
                            
                            // Desabilita o botão depois de registrado - não pode ser usado novamente
                            button.disabled = true;
                            button.style.opacity = "0.6";
                            button.innerHTML = `<i class="fas fa-check"></i> Acabamento Registrado`;
                            
                            // Mostra o status com o nome de quem registrou
                            const statusEl = document.getElementById(`finish-status-${itemId}`);
                            if (statusEl) {
                                // Usa o nome retornado pela função registerProductionEvent
                                const userName = eventInfo?.userName || 'Usuário';
                                const date = new Date();
                                const formattedDate = date.toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${userName}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                statusEl.style.display = "block";
                                statusEl.style.color = "#2ecc71";
                            }
                        } catch (error) {
                            console.error('Erro ao registrar acabamento:', error);
                            ui.showNotification('Erro ao registrar acabamento: ' + error.message, 'error');
                        }
                    }
                });
            });
            
            // Mostra detalhes ao passar o mouse
            const tooltipEl = button.parentElement.querySelector('.tooltip');
            if (tooltipEl) {
                button.parentElement.addEventListener('mouseover', () => {
                    this.updateTooltip(tooltipEl, orderId, button.dataset.itemId, 'finish');
                    tooltipEl.style.opacity = '1';
                    tooltipEl.style.visibility = 'visible';
                    const tooltipArrow = button.parentElement.querySelector('.tooltip-arrow');
                    if (tooltipArrow) {
                        tooltipArrow.style.opacity = '1';
                        tooltipArrow.style.visibility = 'visible';
                    }
                });
                
                button.parentElement.addEventListener('mouseout', () => {
                    tooltipEl.style.opacity = '0';
                    tooltipEl.style.visibility = 'hidden';
                    const tooltipArrow = button.parentElement.querySelector('.tooltip-arrow');
                    if (tooltipArrow) {
                        tooltipArrow.style.opacity = '0';
                        tooltipArrow.style.visibility = 'hidden';
                    }
                });
            }
        });
        
        // Adiciona logs para depuração
        console.log('Configuração de botões concluída');
    }
    
    // Função para obter as permissões do usuário atual
    getUserPermissions(user) {
        // Por padrão, permissões básicas
        let permissions = {
            canPrint: false,
            canFinish: false
        };
        
        if (!user) {
            // Tenta obter o usuário do localStorage
            try {
                const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
                if (userConfig && userConfig.role) {
                    console.log('Usuário obtido do localStorage:', userConfig);
                    
                    // Define permissões com base no papel do usuário
                    switch (userConfig.role) {
                        case 'admin':
                            permissions.canPrint = true;
                            permissions.canFinish = true;
                            break;
                        case 'impressor':
                            permissions.canPrint = true;
                            permissions.canFinish = false;
                            break;
                        case 'acabamento':
                            permissions.canPrint = false;
                            permissions.canFinish = true;
                            break;
                        case 'production':
                            permissions.canPrint = true;
                            permissions.canFinish = true;
                            break;
                        default:
                            // Para qualquer outro papel, concede todas as permissões para teste
                            permissions.canPrint = true;
                            permissions.canFinish = true;
                            console.log('Permissões concedidas para teste (papel não reconhecido)');
                    }
                } else {
                    // Se não houver usuário no localStorage, concede todas as permissões para teste
                    permissions.canPrint = true;
                    permissions.canFinish = true;
                    console.log('Nenhum usuário encontrado no localStorage, permissões concedidas para teste');
                }
            } catch (error) {
                console.error('Erro ao obter usuário do localStorage:', error);
                // Em caso de erro, concede todas as permissões para teste
                permissions.canPrint = true;
                permissions.canFinish = true;
            }
        } else {
            console.log('Usuário autenticado:', user.email || user.uid);
            
            // Busca as configurações do usuário do localStorage
            try {
                // Obtém o usuário atual do localStorage
                const userConfig = JSON.parse(localStorage.getItem('userConfig')) || {};
                const userRole = userConfig.role || 'viewer';
                
                console.log('Papel do usuário obtido do localStorage:', userRole);
                
                // Define permissões com base no papel do usuário
                switch (userRole) {
                    case 'admin':
                        permissions.canPrint = true;
                        permissions.canFinish = true;
                        break;
                    case 'impressor':
                        permissions.canPrint = true;
                        permissions.canFinish = false;
                        break;
                    case 'acabamento':
                        permissions.canPrint = false;
                        permissions.canFinish = true;
                        break;
                    case 'production':
                        permissions.canPrint = true;
                        permissions.canFinish = true;
                        break;
                    case 'seller':
                        permissions.canPrint = false;
                        permissions.canFinish = false;
                        break;
                    default:
                        // Para qualquer outro papel, concede todas as permissões para teste
                        permissions.canPrint = true;
                        permissions.canFinish = true;
                        console.log('Permissões concedidas para teste (papel não reconhecido)');
                }
            } catch (error) {
                console.error('Erro ao obter permissões do usuário:', error);
                // Em caso de erro, concede todas as permissões para teste
                permissions.canPrint = true;
                permissions.canFinish = true;
            }
        }
        
        console.log('Permissões finais do usuário:', permissions);
        return permissions;
    }
    
    // Função para carregar dados de produção existentes
    async loadProductionData(orderId) {
        try {
            const orderRef = firebase.firestore().collection('orders').doc(orderId);
            const orderDoc = await orderRef.get();
            
            if (orderDoc.exists) {
                const orderData = orderDoc.data();
                
                if (orderData.productionEvents) {
                    // Obtém as permissões do usuário
                    const currentUser = firebase.auth().currentUser;
                    const userPermissions = this.getUserPermissions(currentUser);
                    console.log("Processando eventos de produção do pedido", orderId);
                    
                    // Para cada item que tem eventos de produção
                    Object.keys(orderData.productionEvents).forEach(itemId => {
                        const itemEvents = orderData.productionEvents[itemId];
                        
                        // Verifica se tem evento de impressão
                        if (itemEvents.print) {
                            const printButton = document.getElementById(`print-btn-${itemId}`);
                            if (printButton) {
                                console.log(`Atualizando botão de impressão para item ${itemId}`);
                                printButton.disabled = true;
                                printButton.style.opacity = "0.6";
                                printButton.innerHTML = `<i class="fas fa-check"></i> Impressão Registrada`;
                                
                                // Mostra o status com o nome de quem registrou
                                const statusEl = document.getElementById(`print-status-${itemId}`);
                                if (statusEl) {
                                    const date = itemEvents.print.date ? 
                                        new Date(itemEvents.print.date.seconds * 1000) : new Date();
                                    const formattedDate = date.toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${itemEvents.print.userName || 'Usuário'}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    statusEl.style.display = "block";
                                    statusEl.style.color = "#3498db";
                                }
                                
                                const tooltipEl = printButton.parentElement.querySelector('.tooltip');
                                if (tooltipEl) {
                                    this.updateTooltip(tooltipEl, orderId, itemId, 'print', itemEvents.print);
                                }
                                
                                // Verifica apenas se o acabamento já foi registrado e se o usuário tem permissão
                                const finishButton = document.getElementById(`finish-btn-${itemId}`);
                                if (finishButton && !itemEvents.finish) {
                                    if (userPermissions.canFinish) {
                                        console.log(`Verificando botão de acabamento para item ${itemId}`);
                                        finishButton.disabled = false;
                                        finishButton.style.opacity = "1";
                                        
                                        // Atualiza o texto do tooltip
                                        const finishTooltip = finishButton.parentElement.querySelector('.tooltip');
                                        if (finishTooltip) {
                                            finishTooltip.textContent = "Clique para registrar acabamento";
                                        }
                                    } else {
                                        // Mantém desabilitado para usuários sem permissão
                                        finishButton.disabled = true;
                                        finishButton.style.opacity = "0.6";
                                        
                                        const finishTooltip = finishButton.parentElement.querySelector('.tooltip');
                                        if (finishTooltip) {
                                            finishTooltip.textContent = "Você não tem permissão para registrar acabamento";
                                        }
                                        
                                        console.log(`Botão de acabamento permanece desabilitado para item ${itemId} por falta de permissão`);
                                    }
                                }
                            }
                        }
                        
                        // Verifica se tem evento de acabamento
                        if (itemEvents.finish) {
                            const finishButton = document.getElementById(`finish-btn-${itemId}`);
                            if (finishButton) {
                                console.log(`Atualizando botão de acabamento para item ${itemId}`);
                                finishButton.disabled = true;
                                finishButton.style.opacity = "0.6";
                                finishButton.innerHTML = `<i class="fas fa-check"></i> Acabamento Registrado`;
                                
                                // Mostra o status com o nome de quem registrou
                                const statusEl = document.getElementById(`finish-status-${itemId}`);
                                if (statusEl) {
                                    const date = itemEvents.finish.date ? 
                                        new Date(itemEvents.finish.date.seconds * 1000) : new Date();
                                    const formattedDate = date.toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${itemEvents.finish.userName || 'Usuário'}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    statusEl.style.display = "block";
                                    statusEl.style.color = "#2ecc71";
                                }
                                
                                const tooltipEl = finishButton.parentElement.querySelector('.tooltip');
                                if (tooltipEl) {
                                    this.updateTooltip(tooltipEl, orderId, itemId, 'finish', itemEvents.finish);
                                }
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados de produção:', error);
        }
    }
    
    // Função para atualizar o tooltip com as informações do evento
    updateTooltip(tooltipEl, orderId, itemId, eventType, eventData = null) {
        if (eventData) {
            const date = eventData.date ? new Date(eventData.date.seconds * 1000) : new Date();
            const formattedDate = date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            tooltipEl.textContent = `${eventType === 'print' ? 'Impressão' : 'Acabamento'} realizado por ${eventData.userName} em ${formattedDate}`;
        } else {
            tooltipEl.textContent = `Sem registro de ${eventType === 'print' ? 'impressão' : 'acabamento'}`;
        }
    }
    
    // Função para registrar um evento de produção
    async registerProductionEvent(orderId, itemId, eventType) {
        try {
            const orderRef = firebase.firestore().collection('orders').doc(orderId);
            const currentUser = firebase.auth().currentUser;
            
            // Obtém informações do usuário armazenadas no localStorage caso o usuário não esteja autenticado
            let userData;
            if (!currentUser) {
                console.log('Usuário não autenticado no Firebase, tentando obter do localStorage');
                const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
                if (!userConfig || !userConfig.name) {
                    ui.showNotification('Usuário não identificado. Faça login novamente.', 'error');
                    throw new Error('Usuário não identificado');
                }
                
                userData = {
                    userId: userConfig.id || 'local-user',
                    userName: userConfig.name || 'Usuário local',
                    date: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                console.log('Usando informações do usuário do localStorage:', userData);
            } else {
                // Verifica se currentUser tem a propriedade displayName para evitar erros
                // Se não tiver, tenta obter do localStorage como backup
                let userName = 'Usuário';
                if (currentUser.displayName) {
                    userName = currentUser.displayName;
                } else if (currentUser.email) {
                    userName = currentUser.email;
                } else {
                    // Tenta buscar do localStorage como fallback adicional
                    const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
                    if (userConfig && userConfig.name) {
                        userName = userConfig.name;
                    }
                }
                
                userData = {
                    userId: currentUser.uid,
                    userName: userName,
                    date: firebase.firestore.FieldValue.serverTimestamp()
                };
                console.log('Usando informações do usuário autenticado:', userData);
            }
            
            // Atualiza o documento no Firestore
            await orderRef.update({
                [`productionEvents.${itemId}.${eventType}`]: userData,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualiza o tooltip se estiver usando botões antigos (checkbox)
            const checkbox = document.getElementById(`${eventType}-check-${itemId}`);
            if (checkbox) {
                const tooltipEl = checkbox.parentElement.querySelector('.tooltip');
                if (tooltipEl) {
                    this.updateTooltip(tooltipEl, orderId, itemId, eventType, {
                        ...userData,
                        date: new Date() // Usa a data atual para exibição imediata
                    });
                }
            }
            
            // Atualiza o tooltip se estiver usando botões novos
            const button = document.getElementById(`${eventType}-btn-${itemId}`);
            if (button) {
                const tooltipEl = button.parentElement.querySelector('.tooltip');
                if (tooltipEl) {
                    this.updateTooltip(tooltipEl, orderId, itemId, eventType, {
                        ...userData,
                        date: new Date() // Usa a data atual para exibição imediata
                    });
                }
            }
            
            ui.showNotification(`${eventType === 'print' ? 'Impressão' : 'Acabamento'} registrado com sucesso`, 'success');
            
            // Retorna as informações do usuário para uso na interface
            return {
                ...userData,
                date: new Date() // Retorna a data atual para uso imediato
            };
        } catch (error) {
            console.error(`Erro ao registrar evento de ${eventType}:`, error);
            ui.showNotification(`Erro ao registrar ${eventType === 'print' ? 'impressão' : 'acabamento'}`, 'error');
            throw error; // Repropaga o erro para ser tratado pelo chamador
        }
    }
    
    // Função para remover um evento de produção
    async removeProductionEvent(orderId, itemId, eventType) {
        try {
            const orderRef = firebase.firestore().collection('orders').doc(orderId);
            
            // Remove o evento específico
            await orderRef.update({
                [`productionEvents.${itemId}.${eventType}`]: firebase.firestore.FieldValue.delete(),
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualiza o tooltip
            const checkbox = document.getElementById(`${eventType}-check-${itemId}`);
            if (checkbox) {
                const tooltipEl = checkbox.parentElement.querySelector('.tooltip');
                if (tooltipEl) {
                    tooltipEl.textContent = `Sem registro de ${eventType === 'print' ? 'impressão' : 'acabamento'}`;
                }
            }
            
            ui.showNotification(`Registro de ${eventType === 'print' ? 'impressão' : 'acabamento'} removido`, 'success');
        } catch (error) {
            console.error(`Erro ao remover evento de ${eventType}:`, error);
            ui.showNotification(`Erro ao remover registro de ${eventType === 'print' ? 'impressão' : 'acabamento'}`, 'error');
        }
    }
    
    // Renderiza o formulário de pedido (para criação ou edição)
    renderOrderForm(orderId = null) {
        const isEdit = !!orderId;
        const formTitle = isEdit ? 'Editar Pedido' : 'Novo Pedido';
        
        // Adiciona a fonte Inter do Google Fonts
        if (!document.getElementById('inter-font')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'inter-font';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            document.head.appendChild(fontLink);
        }
        
        // Template com o novo design CSS customizado
        let html = `
            <div class="container">
                <!-- Header -->
                <header>
                    <h1>${formTitle}</h1>
                    <button id="save-order-btn" class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                        </svg>
                        Salvar Pedido
                    </button>
                </header>

                <main>
                    <div class="main-content">
                        <!-- General Information Card -->
                        <section class="card">
                            <h2 class="card-title" style="margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb;">Informações Gerais</h2>
                            
                            <div class="form-group">
                                <label for="order-title" class="form-label">Título do Pedido</label>
                                <input type="text" id="order-title" placeholder="Ex: Adesivos para vitrine" class="form-input" value="${this.formData.title || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Imagem de Referência</label>
                                <div class="image-reference">
                                    <div id="image-preview" class="image-placeholder">
                                        ${this.formData.imageUrl ? 
                                            `<img src="${this.formData.imageUrl}" alt="Imagem do pedido" style="width: 100%; height: 100%; object-fit: cover;">
                                             <button type="button" id="remove-image" style="position: absolute; top: 0; right: 0; background-color: #fee2e2; color: #ef4444; border-radius: 9999px; padding: 4px; margin: -4px; display: flex; align-items: center; justify-content: center;">
                                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                 </svg>
                                             </button>` 
                                            : 
                                            `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>`
                                        }
                                    </div>
                                    <div>
                                        <p id="file-name">${this.formData.imageUrl ? 'Imagem selecionada' : 'Nenhuma imagem'}</p>
                                        <div class="file-upload-actions">
                                            <label for="file-upload" class="file-input-label">Enviar Arquivo</label>
                                            <input id="file-upload" type="file" accept="image/*" class="sr-only">
                                            <button type="button" id="screenshot-btn" class="btn-capture">Capturar Tela</button>
                                            <button type="button" id="screenshot-help-btn" class="btn-link" title="Ajuda com captura de tela">
                                                <i class="fas fa-question-circle"></i>
                                            </button>
                                        </div>
                                        <div class="paste-instructions">
                                            <p><i class="fas fa-keyboard"></i> Use <kbd>Ctrl</kbd>+<kbd>V</kbd> para colar uma imagem diretamente!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="client-search" class="form-label">Cliente</label>
                                <div class="customer-search-group">
                                    <div class="customer-search-input-wrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                                        </svg>
                                        <input type="search" id="client-search" placeholder="Pesquisar Cliente por nome ou CPF/CNPJ" class="form-input" value="${this.formData.client ? this.formData.client.name : ''}">
                                        <input type="hidden" id="client-id" value="${this.formData.client ? this.formData.client.id : ''}">
                                        <div id="client-suggestions" class="autocomplete-items"></div>
                                    </div>
                                    <button type="button" id="new-client-btn" class="btn btn-secondary">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                        </svg>
                                        Novo Cliente
                                    </button>
                                </div>
                            </div>
                            
                            <div id="client-details" style="display: ${this.formData.client ? 'block' : 'none'}; margin-top: 1rem; padding: 1rem; background-color:rgb(11, 15, 19); border-radius: 0.5rem;">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                                    <div>
                                        <span style="display: block; font-size: 0.75rem; color: #6b7280;">Documento</span>
                                        <span id="client-document-display" style="font-weight: 500;">${this.formData.client ? this.formData.client.document || '-' : '-'}</span>
                                    </div>
                                    <div>
                                        <span style="display: block; font-size: 0.75rem; color: #6b7280;">Telefone</span>
                                        <span id="client-phone-display" style="font-weight: 500;">${this.formData.client ? this.formData.client.phone || '-' : '-'}</span>
                                    </div>
                                    <div>
                                        <span style="display: block; font-size: 0.75rem; color: #6b7280;">E-mail</span>
                                        <span id="client-email-display" style="font-weight: 500;">${this.formData.client ? this.formData.client.email || '-' : '-'}</span>
                                    </div>
                                    <div style="grid-column: span 3;">
                                        <span style="display: block; font-size: 0.75rem; color: #6b7280;">Endereço</span>
                                        <span id="client-address-display" style="font-weight: 500;">${this.formData.client ? this.formData.client.address || '-' : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Order Items Card -->
                        <section class="card">
                            <div class="card-header">
                                <h2 class="card-title">Itens do Pedido</h2>
                                <button type="button" id="add-item-btn" class="btn btn-success">
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                    </svg>
                                    Adicionar Item
                                </button>
                            </div>
                            <div id="items-container" class="items-container">
                                ${this.formData.items.length === 0 ? 
                                    `<div class="empty-state">
                                        <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
                                     </div>` 
                                    : 
                                    this.renderOrderItems()
                                }
                            </div>
                        </section>
                        
                        <!-- Payments Card -->
                        <section class="card">
                            <div class="card-header">
                                <h2 class="card-title">Pagamentos</h2>
                                <button type="button" id="add-payment-btn" class="btn btn-success">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                    </svg>
                                    Adicionar Pagamento
                                </button>
                            </div>
                            <div id="payments-container" class="payments-container">
                                ${this.formData.payments.length === 0 ? 
                                    `<div class="empty-state">
                                        <p>Nenhum pagamento adicionado. Clique em "Adicionar Pagamento" para registrar.</p>
                                     </div>` 
                                    : 
                                    this.renderPayments()
                                }
                            </div>
                        </section>
                    </div>
                    
                    <!-- Sidebar Column -->
                    <aside class="sidebar">
                        <!-- Totals Card -->
                        <section class="card financial-summary" style="margin-bottom: 2rem;">
                            <h3 class="card-title" style="font-size: 1.125rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">Resumo Financeiro</h3>
                            <div class="summary-item">
                                <span>Valor Total:</span>
                                <span id="order-total" style="font-weight: 500; color:rgb(233, 236, 241);">${ui.formatCurrency(this.calculateOrderTotal())}</span>
                            </div>
                            <div class="summary-item">
                                <label for="order-discount">Desconto:</label>
                                <div class="discount-wrapper">
                                    <span>R$</span>
                                    <input type="number" id="order-discount" value="${this.formData.discount || 0}" min="0" class="form-input">
                                </div>
                            </div>
                            <div class="summary-item divider total">
                                <span>Valor com Desconto:</span>
                                <span id="order-total-with-discount">${ui.formatCurrency(this.calculateOrderTotal() - (this.formData.discount || 0))}</span>
                            </div>
                            <div class="summary-item divider" style="font-size: 0.875rem;">
                                <span>Total Pago:</span>
                                <span id="payments-total" style="font-weight: 500; color:rgb(224, 224, 224);">${ui.formatCurrency(this.calculatePaymentsTotal())}</span>
                            </div>
                            <div class="summary-item" style="color: #dc2626; font-weight: 600; font-size: 0.875rem;">
                                <span>Saldo Restante:</span>
                                <span id="remaining-total">${ui.formatCurrency(Math.max(0, (this.calculateOrderTotal() - (this.formData.discount || 0)) - this.calculatePaymentsTotal()))}</span>
                            </div>
                            
                            <!-- Campo de valor de entrega - visível apenas quando "Entregar" está selecionado -->
                            <div id="delivery-cost-row" class="summary-item divider" style="display: ${this.formData.needsDelivery ? 'flex' : 'none'}">
                                <label for="delivery-cost">Valor da Entrega:</label>
                                <div class="discount-wrapper">
                                    <span>R$</span>
                                    <input type="number" id="delivery-cost" value="${this.formData.deliveryCost || 0}" min="0" step="0.01" class="form-input">
                                </div>
                            </div>
                        </section>

                        <!-- Additional Details Card -->
                        <section class="card">
                            <h3 class="card-title" style="font-size: 1.125rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">Detalhes Adicionais</h3>
                            <div class="details-grid form-group">
                                <div>
                                    <label for="delivery-date" class="form-label">Data de Entrega</label>
                                    <input type="date" id="delivery-date" class="form-input" required value="${this.formatDateForInput(this.formData.deliveryDate)}" ${this.formData.toArrange ? 'disabled' : ''}>
                                </div>
                                <div>
                                    <label for="delivery-time" class="form-label">Hora de Entrega</label>
                                    <input type="time" id="delivery-time" class="form-input" required value="${this.formatTimeForInput(this.formData.deliveryDate) || '12:00'}" ${this.formData.toArrange ? 'disabled' : ''}>
                                </div>
                            </div>
                            <div class="checkbox-group form-group">
                                <input id="to-arrange" type="checkbox" ${this.formData.toArrange ? 'checked' : ''}>
                                <label for="to-arrange">A combinar</label>
                            </div>
                            <div class="form-group">
                                <label for="status-select" class="form-label">Status</label>
                                <select id="status-select" class="form-select" required>
                                    ${SYSTEM_CONFIG.orderStatus.map(status => 
                                        `<option value="${status.id}" ${this.formData.status === status.id ? 'selected' : ''}>
                                            ${status.name}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo de Entrega</label>
                                <div class="radio-group">
                                    <div class="radio-item">
                                        <input id="pickup" name="delivery-type" type="radio" value="pickup" ${!this.formData.needsDelivery ? 'checked' : ''}>
                                        <label for="pickup">Retirada</label>
                                    </div>
                                    <div class="radio-item">
                                        <input id="deliver" name="delivery-type" type="radio" value="deliver" ${this.formData.needsDelivery ? 'checked' : ''}>
                                        <label for="deliver">Entregar</label>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="seller-select" class="form-label">Vendedor</label>
                                <select id="seller-select" class="form-select">
                                    <option value="">Selecione um vendedor</option>
                                    ${this.renderSellerOptions()}
                                </select>
                                <input type="hidden" id="seller-id" value="${this.formData.sellerId || ''}">

                            </div>
                            <div class="form-group">
                                <label for="order-notes" class="form-label">Observações</label>
                                <textarea id="order-notes" rows="4" placeholder="Algum detalhe importante para a produção..." class="form-textarea">${this.formData.notes || ''}</textarea>
                            </div>
                        </section>
                    </aside>
                </main>
            </div>
        `;
        
        // Adiciona a fonte Inter do Google Fonts
        if (!document.getElementById('inter-font')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'inter-font';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            document.head.appendChild(fontLink);
        }
        
        // Remover o script do Tailwind se existir
        const tailwindScript = document.getElementById('tailwind-css');
        if (tailwindScript) {
            tailwindScript.remove();
        }
        
        // Aplicar a classe CSS personalizada ao elemento container
        this.container.classList.add('order-form-custom-styles');
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('save-order-btn').addEventListener('click', () => this.saveOrder(isEdit));
        document.getElementById('add-item-btn').addEventListener('click', () => this.addOrderItem());
        document.getElementById('add-payment-btn').addEventListener('click', () => this.addPayment());
        
        // Eventos para upload e screenshot
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('screenshot-btn').addEventListener('click', () => this.captureScreenshot());
        
        // Adiciona o evento para o botão de ajuda de captura de tela
        document.getElementById('screenshot-help-btn').addEventListener('click', () => {
            ui.showScreenshotHelp();
        });
        
        // Verifica se há problemas conhecidos com captura de tela
        ui.detectScreenshotIssues();
        
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
        
        // Evento para campo de desconto
        const discountInput = document.getElementById('order-discount');
        if (discountInput) {
            discountInput.addEventListener('input', (e) => {
                this.formData.discount = parseFloat(e.target.value) || 0;
                this.updateOrderTotals();
            });
        }
        
        // Setup de entrega "a combinar"
        this.setupDeliveryToArrangeHandler();
        
        // Setup de tipo de entrega
        this.setupDeliveryTypeHandler();
    }
    
    // Renderiza os itens do pedido no formulário
    renderOrderItems() {
        if (!this.formData.items || this.formData.items.length === 0) {
            return '<div class="empty-items">Nenhum item adicionado</div>';
        }
        
        // Assegura que todos os itens tenham valores válidos antes de renderizar
        this.formData.items.forEach(item => {
            // Garante que quantidade seja pelo menos 1
            item.quantity = item.quantity || 1;
            
            // Garante que preço unitário seja pelo menos 0
            item.unitPrice = item.unitPrice || 0;
            
            // Recalcula o preço total para garantir consistência
            const product = this.products.find(p => p.id === item.productId);
            const isCustomSize = product ? product.productType === 'custom_size' : false;
            
            if (isCustomSize && item.squareMeters) {
                item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
            } else {
                item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
            }
        });
        
        let html = '<div class="order-items">';
        
        this.formData.items.forEach((item, index) => {
            // Determina se o produto selecionado usa tamanho personalizado
            const product = this.products.find(p => p.id === item.productId);
            const isCustomSize = product ? product.productType === 'custom_size' : false;
            
            html += `
                <div class="order-item" data-index="${index}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                        <h4 style="font-weight: 600; color:rgb(255, 255, 255);">Item #${index + 1}</h4>
                        <button type="button" class="remove-item-btn" style="color: #ef4444; hover: text-red-700;" data-index="${index}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                        <div>
                            <label for="product-${index}" class="form-label">Produto</label>
                            <select id="product-${index}" class="form-select product-select" data-index="${index}" required>
                                <option value="">-- Selecione um Produto --</option>
                                ${this.products.map(product => 
                                    `<option value="${product.id}" ${item.productId === product.id ? 'selected' : ''}>
                                        ${product.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label for="quantity-${index}" class="form-label">Quantidade</label>
                            <input type="number" id="quantity-${index}" class="form-input item-quantity" 
                                data-index="${index}" min="1" value="${item.quantity || 1}" required>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 0.75rem;">
                        <label for="item-description-${index}" class="form-label">Descrição do Item</label>
                        <textarea id="item-description-${index}" class="form-textarea item-description" 
                            data-index="${index}" rows="2" placeholder="Detalhes específicos sobre este item...">${item.description || ''}</textarea>
                    </div>
                    
                    ${(product ? product.pricingType === 'area' || isCustomSize : false) ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                            <div>
                                <label for="width-${index}" class="form-label">Largura (cm)</label>
                                <input type="number" id="width-${index}" class="form-input item-width" 
                                    data-index="${index}" min="1" step="1" value="${item.width || 100}" required>
                            </div>
                            
                            <div>
                                <label for="height-${index}" class="form-label">Altura (cm)</label>
                                <input type="number" id="height-${index}" class="form-input item-height" 
                                    data-index="${index}" min="1" step="1" value="${item.height || 100}" required>
                            </div>
                            
                            <div>
                                <label for="area-${index}" class="form-label">Área (m²)</label>
                                <input type="text" id="area-${index}" class="form-input" 
                                    value="${this.toDecimal((item.width * item.height) / 10000)}" readonly>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                        <div>
                            <label for="unit-price-${index}" class="form-label">Valor Unitário</label>
                            <div style="position: relative;">
                                <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #6b7280;">R$</span>
                                <input type="number" id="unit-price-${index}" class="form-input item-unit-price" 
                                    data-index="${index}" min="0" step="0.01" value="${item.unitPrice}" required>
                            </div>
                        </div>
                        
                        <div>
                            <label for="total-price-${index}" class="form-label">Preço Total</label>
                            <div class="input-group">
                                <input type="number" id="total-price-${index}" class="form-input" 
                                    value="${item.totalPrice}" readonly>
                                <span class="price-type-indicator" style="font-size: 0.75rem; color: #6b7280; display: block; margin-top: 0.25rem;">
                                    ${this.formData.client && this.formData.client.category === 'reseller' ? 'Preço de revenda' : 'Preço cliente final'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    // Renderiza os pagamentos no formulário
    renderPayments() {
        if (this.formData.payments.length === 0) {
            return `<div class="empty-state">
                        <p>Nenhum pagamento adicionado. Clique em "Adicionar Pagamento" para registrar.</p>
                    </div>`;
        }
        
        let html = '';
        
        this.formData.payments.forEach((payment, index) => {
            html += `
                <div class="order-item" data-index="${index}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                        <h4 style="font-weight: 600; color:rgb(255, 255, 255);">Pagamento #${index + 1}</h4>
                        <button type="button" class="remove-payment-btn" style="color: #ef4444; hover: text-red-700" data-index="${index}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                        <div>
                            <label for="payment-method-${index}" class="form-label">Método de Pagamento</label>
                            <select id="payment-method-${index}" class="form-select payment-method" data-index="${index}">
                                <option value="money" ${payment.method === 'money' ? 'selected' : ''}>Dinheiro</option>
                                <option value="credit_card" ${payment.method === 'credit_card' ? 'selected' : ''}>Cartão de Crédito</option>
                                <option value="debit_card" ${payment.method === 'debit_card' ? 'selected' : ''}>Cartão de Débito</option>
                                <option value="pix" ${payment.method === 'pix' ? 'selected' : ''}>PIX</option>
                                <option value="transfer" ${payment.method === 'transfer' ? 'selected' : ''}>Transferência Bancária</option>
                                <option value="boleto" ${payment.method === 'boleto' ? 'selected' : ''}>Boleto Bancário</option>
                                <option value="check" ${payment.method === 'check' ? 'selected' : ''}>Cheque</option>
                                <option value="other" ${payment.method === 'other' ? 'selected' : ''}>Outro</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="payment-value-${index}" class="form-label">Valor</label>
                            <div style="position: relative;">
                                <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #6b7280;">R$</span>
                                <input type="number" id="payment-value-${index}" class="form-input payment-value" 
                                    data-index="${index}" min="0" step="0.01" value="${payment.value || 0}" style="padding-left: 2.25rem;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                        <div>
                            <label for="payment-date-${index}" class="form-label">Data</label>
                            <input type="date" id="payment-date-${index}" class="form-input payment-date" 
                                data-index="${index}" value="${this.formatDateForInput(payment.date)}">
                        </div>
                        
                        <div>
                            <label for="payment-note-${index}" class="form-label">Observação</label>
                            <input type="text" id="payment-note-${index}" class="form-input payment-note" 
                                data-index="${index}" placeholder="Ex: Parcela 1/3" value="${payment.note || ''}">
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
        
        this.formData.client = client;
        
        // Atualiza a interface
        document.getElementById('client-id').value = client.id || '';
        document.getElementById('client-search').value = client.name || '';
        
        const clientDetailsContainer = document.getElementById('client-details');
        if (clientDetailsContainer) {
            clientDetailsContainer.style.display = 'block';
            
            // Atualiza os detalhes do cliente na interface
            const documentDisplay = document.getElementById('client-document-display');
            const phoneDisplay = document.getElementById('client-phone-display');
            const emailDisplay = document.getElementById('client-email-display');
            const addressDisplay = document.getElementById('client-address-display');
            
            if (documentDisplay) documentDisplay.textContent = client.document || '-';
            if (phoneDisplay) phoneDisplay.textContent = client.phone || '-';
            if (emailDisplay) emailDisplay.textContent = client.email || '-';
            if (addressDisplay) addressDisplay.textContent = client.address || '-';
        }
        
        // Recalcula todos os preços dos itens baseado no tipo de cliente
        if (this.formData.items && this.formData.items.length > 0) {
            this.formData.items.forEach((item, index) => {
                if (item.productId) {
                    const product = this.products.find(p => p.id === item.productId);
                    if (product) {
                        // Define o preço adequado com base no tipo de cliente
                        if (client.category === 'reseller') {
                            // Cliente é revendedor
                            item.unitPrice = product.priceReseller || product.price || 0;
                        } else {
                            // Cliente final
                            item.unitPrice = product.priceFinal || product.price || 0;
                        }
                        
                        // Recalcula o preço total
                        if (product.productType === 'custom_size' && item.squareMeters) {
                            item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
                        } else {
                            item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
                        }
                    }
                }
            });
            
            // Atualiza a interface
            document.getElementById('items-container').innerHTML = this.renderOrderItems();
            this.addItemEventListeners();
        }
        
        // Atualiza os totais
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
        // Log para debug
        console.log('Adicionando event listeners para os itens do pedido');
        
        // Remove event listeners para evitar duplicidade
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            const clonedBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(clonedBtn, btn);
        });
        
        document.querySelectorAll('.product-select').forEach(select => {
            const clonedSelect = select.cloneNode(true);
            select.parentNode.replaceChild(clonedSelect, select);
        });
        
        document.querySelectorAll('.item-quantity, .item-width, .item-height, .item-unit-price, .item-description').forEach(input => {
            const clonedInput = input.cloneNode(true);
            input.parentNode.replaceChild(clonedInput, input);
        });
        
        // Adiciona novos event listeners
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
        
        // Combina todos os inputs que afetam o cálculo
        const inputSelectors = '.item-quantity, .item-width, .item-height, .item-unit-price';
        document.querySelectorAll(inputSelectors).forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                console.log(`Input alterado: ${e.currentTarget.id}, valor: ${e.currentTarget.value}`);
                this.updateItemValues(index);
            });
            
            // Adiciona evento de perda de foco para garantir atualizações
            input.addEventListener('blur', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                console.log(`Input perdeu foco: ${e.currentTarget.id}, valor: ${e.currentTarget.value}`);
                this.updateItemValues(index);
                this.updateOrderTotals();
            });
        });
        
        // Adiciona evento para descrição do item
        document.querySelectorAll('.item-description').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                const item = this.formData.items[index];
                if (item) {
                    item.description = e.currentTarget.value;
                }
            });
        });
        
        console.log('Event listeners adicionados com sucesso');
    }
    
    // Atualiza os detalhes do produto selecionado
    updateProductDetails(index, product) {
        const item = this.formData.items[index];
        if (item) {
            item.productId = product.id;
            item.productName = product.name;
            item.product = product.name; // Garante compatibilidade com ambos os campos
            
            // Define o preço com base no tipo de cliente
            if (this.formData.client && this.formData.client.category === 'reseller') {
                // Usa o preço de revenda se o cliente for revendedor
                item.unitPrice = product.priceReseller || product.price || 0;
            } else {
                // Usa o preço para cliente final (ou preço padrão para compatibilidade)
                item.unitPrice = product.priceFinal || product.price || 0;
            }
            
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
            // Converte para números e garante valores mínimos
            item.quantity = Math.max(1, parseInt(quantityInput.value) || 1);
            item.unitPrice = Math.max(0, parseFloat(unitPriceInput.value) || 0);
            
            // Atualiza o valor no input (caso tenha sido ajustado)
            quantityInput.value = item.quantity;
            unitPriceInput.value = item.unitPrice;
        }
        
        // Verifica se é produto com medidas personalizadas
        const product = this.products.find(p => p.id === item.productId);
        const isCustomSize = product ? product.productType === 'custom_size' : false;
        
        try {
            if (isCustomSize && widthInput && heightInput) {
                // Garante valores mínimos para largura e altura
                item.width = Math.max(1, parseInt(widthInput.value) || 100);
                item.height = Math.max(1, parseInt(heightInput.value) || 100);
                
                // Atualiza os valores nos inputs (caso tenham sido ajustados)
                widthInput.value = item.width;
                heightInput.value = item.height;
                
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
            
            // Garante que o item tenha um totalPrice no objeto, mesmo que não tenha sido atualizado na interface
            if (isNaN(item.totalPrice) || item.totalPrice === undefined) {
                // Calcula novamente para garantir
                if (isCustomSize && item.squareMeters) {
                    item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
                } else {
                    item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
                }
            }
        } catch (error) {
            console.error("Erro ao atualizar valores do item:", error);
            // Garante que temos um valor válido mesmo em caso de erro
            item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
        }
        
        // Log para debug
        console.log(`Item ${index} atualizado:`, {
            produto: item.productName,
            quantidade: item.quantity,
            precoUnitario: item.unitPrice,
            precoTotal: item.totalPrice,
            isCustomSize: isCustomSize,
            dimensoes: isCustomSize ? `${item.width}x${item.height}cm (${item.squareMeters}m²)` : 'N/A'
        });
        
        // Atualiza os totais do pedido
        this.updateOrderTotals();
    }
    
    // Adiciona um novo pagamento
    addPayment() {
        // Calcula o valor restante a ser pago como valor default para o novo pagamento
        const orderTotal = this.calculateOrderTotal();
        const discount = this.formData.discount || 0;
        const totalWithDiscount = Math.max(0, orderTotal - discount);
        const paymentsTotal = this.calculatePaymentsTotal();
        const remainingValue = Math.max(0, totalWithDiscount - paymentsTotal);
        
        this.formData.payments.push({
            id: `payment_${Date.now()}`,
            method: 'pix',
            value: remainingValue,
            amount: remainingValue, // Mantém compatibilidade
            date: new Date(),
            notes: ''
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
        document.querySelectorAll('.payment-value').forEach(input => {
            input.addEventListener('input', (e) => {
                // Atualiza o valor no objeto de pagamento
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                if (this.formData.payments[index]) {
                    this.formData.payments[index].value = parseFloat(e.currentTarget.value) || 0;
                    this.formData.payments[index].amount = parseFloat(e.currentTarget.value) || 0; // Compatibilidade
                }
                this.updateOrderTotals();
            });
        });
        
        // Adiciona eventos para outros campos de pagamento
        document.querySelectorAll('.payment-method, .payment-date, .payment-notes').forEach(input => {
            input.addEventListener('input', (e) => {
                this.saveFormDataPayments();
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
        
        document.querySelectorAll('.payment-value').forEach(input => {
            input.addEventListener('input', (e) => {
                // Atualiza o valor no objeto de pagamento
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                if (this.formData.payments[index]) {
                    this.formData.payments[index].value = parseFloat(e.currentTarget.value) || 0;
                    this.formData.payments[index].amount = parseFloat(e.currentTarget.value) || 0; // Compatibilidade
                }
                this.updateOrderTotals();
            });
        });
        
        // Adiciona eventos para outros campos de pagamento
        document.querySelectorAll('.payment-method, .payment-date, .payment-notes').forEach(input => {
            input.addEventListener('input', (e) => {
                this.saveFormDataPayments();
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
        const discount = this.formData.discount || 0;
        const totalWithDiscount = Math.max(0, orderTotal - discount);
        const paymentsTotal = this.calculatePaymentsTotal();
        const remainingValue = Math.max(0, totalWithDiscount - paymentsTotal);
        
        // Atualiza a interface
        document.getElementById('order-total').textContent = ui.formatCurrency(orderTotal);
        document.getElementById('order-total-with-discount').textContent = ui.formatCurrency(totalWithDiscount);
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
        
        let total = 0;
        
        // Log para debug
        console.log("Calculando total do pedido:");
        
        this.formData.items.forEach((item, index) => {
            // Verifica se o item tem um preço total válido
            if (isNaN(item.totalPrice) || item.totalPrice === undefined) {
                // Recalcula o preço total baseado nos dados disponíveis
                const product = this.products.find(p => p.id === item.productId);
                const isCustomSize = product ? product.productType === 'custom_size' : false;
                
                if (isCustomSize && item.squareMeters) {
                    item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
                } else {
                    item.totalPrice = this.toDecimal(item.unitPrice * item.quantity);
                }
                
                // Atualiza o input na interface, se existir
                const totalPriceInput = document.getElementById(`total-price-${index}`);
                if (totalPriceInput) {
                    totalPriceInput.value = item.totalPrice;
                }
            }
            
            const itemTotal = this.toDecimal(item.totalPrice || 0);
            total += itemTotal;
            
            // Log para debug
            console.log(`Item ${index}: ${item.productName || 'Sem nome'} - Preço total: ${itemTotal}`);
        });
        
        const finalTotal = this.toDecimal(total);
        console.log(`Total do pedido: ${finalTotal}`);
        
        return finalTotal;
    }
    
    // Calcula o total de pagamentos com precisão
    calculatePaymentsTotal() {
        if (!this.formData.payments || this.formData.payments.length === 0) return 0;
        
        // Soma os valores diretamente do objeto de dados com precisão decimal
        const total = this.formData.payments.reduce((sum, payment) => {
            // Verifica se temos o novo campo 'value' ou o legado 'amount'
            const paymentValue = payment.value !== undefined ? payment.value : payment.amount;
            
            // Certifica-se de que o valor é um número com precisão decimal
            const amount = this.toDecimal(
                typeof paymentValue === 'string' 
                    ? parseFloat(paymentValue) || 0 
                    : (paymentValue || 0)
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
            const valueInput = document.getElementById(`payment-value-${index}`);
            const dateInput = document.getElementById(`payment-date-${index}`);
            const notesInput = document.getElementById(`payment-notes-${index}`);
            
            if (methodSelect && valueInput && dateInput) {
                payment.method = methodSelect.value;
                payment.value = parseFloat(valueInput.value) || 0;
                payment.amount = parseFloat(valueInput.value) || 0; // Mantém compatibilidade
                payment.date = dateInput.value ? new Date(dateInput.value) : new Date();
                payment.notes = notesInput ? notesInput.value : '';
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
        
        const d = date.toDate ? date.toDate() : new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    // Verifica se uma data é hoje
    isToday(date) {
        if (!date) return false;
        
        const today = new Date();
        const compareDate = date.toDate ? date.toDate() : new Date(date);
        
        return compareDate.getDate() === today.getDate() &&
               compareDate.getMonth() === today.getMonth() &&
               compareDate.getFullYear() === today.getFullYear();
    }
    
    // Formata data e hora para exibição
    formatDateTime(date) {
        if (!date) return '-';
        
        try {
            // Converte para Date se for timestamp
            const dateObj = date instanceof Date ? date : date.toDate();
            
            // Formatação de data
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            
            // Formatação de hora
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year} às ${hours}:${minutes}`;
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '-';
        }
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
        try {
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
            const toArrangeCheckbox = document.getElementById('to-arrange');
            
            // Verifica se é para combinar a data/hora ou usar uma data específica
            if (toArrangeCheckbox && toArrangeCheckbox.checked) {
                // Se "A combinar" estiver marcado
                this.formData.toArrange = true;
                this.formData.deliveryDate = null; // Não há data específica
            } else if (deliveryDateInput && deliveryTimeInput) {
                // Se houver uma data específica
                this.formData.toArrange = false;
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
            
            // Obtém o tipo de entrega (Retirada ou Entregar)
            const deliverRadio = document.getElementById('deliver');
            if (deliverRadio) {
                this.formData.needsDelivery = deliverRadio.checked;
            }
            
            // Obtém o valor da entrega se for para entregar
            if (this.formData.needsDelivery) {
                const deliveryCostInput = document.getElementById('delivery-cost');
                if (deliveryCostInput) {
                    this.formData.deliveryCost = parseFloat(deliveryCostInput.value) || 0;
                }
            } else {
                this.formData.deliveryCost = 0;
            }
            
            // Obtém o valor do desconto
            const discountInput = document.getElementById('order-discount');
            if (discountInput) {
                this.formData.discount = parseFloat(discountInput.value) || 0;
            } else {
                this.formData.discount = 0;
            }
            
            // Atualiza os itens com os valores mais recentes dos inputs
            this.formData.items.forEach((item, index) => {
                try {
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
                    
                    // Garante que o nome do produto esteja correto
                    if (item.productId && !item.productName) {
                        const product = this.products.find(p => p.id === item.productId);
                        if (product) {
                            item.productName = product.name;
                        }
                    }
                } catch (error) {
                    console.error(`Erro ao processar item ${index}:`, error);
                    // Garante um valor padrão para evitar erros
                    item.totalPrice = item.unitPrice * item.quantity;
                }
            });
        } catch (error) {
            console.error("Erro ao salvar dados do formulário:", error);
            ui.showNotification("Ocorreu um erro ao salvar os dados. Tente novamente.", "error");
        }
        
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
            
            // Garante que os itens tenham nomes de produtos corretos
            if (orderData.items && Array.isArray(orderData.items)) {
                orderData.items.forEach(item => {
                    if (!item.productName && item.productId) {
                        const product = this.products.find(p => p.id === item.productId);
                        if (product) {
                            item.productName = product.name;
                        }
                    }
                });
            }
            
            // Verifica se há itens com dimensões inválidas e corrige
            if (orderData.items && Array.isArray(orderData.items)) {
                orderData.items.forEach(item => {
                    // Verifica se as dimensões são números válidos
                    if (item.width !== undefined && (isNaN(item.width) || item.width <= 0)) {
                        console.warn(`Dimensão inválida detectada: largura = ${item.width}. Corrigindo para 100.`);
                        item.width = 100;
                    }
                    if (item.height !== undefined && (isNaN(item.height) || item.height <= 0)) {
                        console.warn(`Dimensão inválida detectada: altura = ${item.height}. Corrigindo para 100.`);
                        item.height = 100;
                    }
                    
                    // Recalcula área e preço total se necessário
                    if (item.width && item.height) {
                        item.squareMeters = this.toDecimal((item.width * item.height) / 10000);
                        item.totalPrice = this.toDecimal(item.unitPrice * item.squareMeters * item.quantity);
                    }
                });
            }
            
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
        
        // Verifica se é "A combinar" ou se precisa validar data/hora
        const toArrangeCheckbox = document.getElementById('to-arrange');
        const isToArrange = toArrangeCheckbox && toArrangeCheckbox.checked;
        
        if (!isToArrange) {
            // Valida data de entrega apenas se não for "A combinar"
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
            discount: this.formData.discount || 0, // Valor do desconto
            remainingValue: Math.max(0, (this.calculateOrderTotal() - (this.formData.discount || 0)) - this.calculatePaymentsTotal()),
            deliveryDate: this.formData.deliveryDate,
            toArrange: this.formData.toArrange || false, // Indica se a entrega é "A combinar"
            needsDelivery: this.formData.needsDelivery || false, // Indica se o pedido precisa ser entregue
            deliveryCost: this.formData.needsDelivery ? (this.formData.deliveryCost || 0) : 0, // Valor da entrega
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
    
    // Imprime o pedido atual
    printOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // Cria um novo elemento para impressão
        const printWindow = window.open('', '_blank');
        
        // Formato para data
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Não definida';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        // Formato para data e hora
        const formatDateTime = (timestamp) => {
            if (!timestamp) return 'Não definida';
            
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        const statusInfo = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || {
            name: 'Status Desconhecido',
            color: '#999'
        };
        
        // Prepara detalhes de entrega
        const deliveryType = order.needsDelivery ? 'Entregar' : 'Retirada';
        const deliveryDate = order.toArrange 
            ? 'A combinar' 
            : order.deliveryDate 
                ? formatDateTime(order.deliveryDate) 
                : 'Não definida';

        let htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Pedido #${order.orderNumber || 'Novo'} - Impressão</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="css/print-styles.css">
                <style>
                    /* Estilos específicos para esta impressão */
                    body {
                        font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f4f7fa;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .print-preview {
                        padding: 20px;
                    }
                    
                    .print-page {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15px;
                        background: Black;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        margin: 0 auto;
                    }
                    
                    .status-badge {
                        display: inline-block;
                        padding: 6px 10px;
                        border-radius: 4px;
                        color: white;
                        font-weight: 600;
                    }
                    
                    @media print {
                        @page {
                            size: A4;
                            margin: 10mm;
                        }
                        
                        body {
                            background-color: white;
                        }
                        
                        .print-preview {
                            padding: 0;
                        }
                        
                        .print-page {
                            width: 100%;
                            min-height: auto;
                            padding: 0;
                            box-shadow: none;
                        }
                        
                        .print-button {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-preview">
                    <button class="print-button" onclick="window.print()">Imprimir</button>
                    
                    <div class="print-page">
                        <!-- Cabeçalho com título e botão de impressão -->
                        <header class="main-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                            <div class="header-content">
                                <h1 style="margin: 0; font-size: 20px; color: white;">Detalhes do Pedido #${order.orderNumber || 'Novo'}</h1>
                                <p class="order-title" style="margin: 5px 0 0 0; font-size: 16px; color: #aaa;">${order.title || ''}</p>
                            </div>
                            <div class="status-badge" style="background-color: ${statusInfo.color}; margin-left: 10px;">
                                ${statusInfo.name}
                            </div>
                        </header>

                        <!-- Imagem de referência no topo com largura máxima -->
                        ${order.imageUrl ? `
                        <div class="reference-image" style="text-align: center; margin-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; font-weight: bold; color: white;">${order.title || ''}</p>
                            <img src="${order.imageUrl}" alt="Imagem do pedido" style="max-width: 100%; max-height: 200px; object-fit: contain;">
                        </div>
                        ` : ''}

                        <!-- Grid com informações gerais do pedido -->
                        <section class="info-grid" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="info-card" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                                <h3 class="card-title" style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Status e Prazos</h3>
                                <p style="margin: 5px 0;"><strong>Data do Pedido:</strong> ${formatDate(order.createdAt)}</p>
                                <p style="margin: 5px 0;"><strong>Última Atualização:</strong> ${formatDateTime(order.lastUpdate)}</p>
                                <p style="margin: 5px 0;"><strong>Tipo de Entrega:</strong> ${deliveryType}</p>
                                <p class="delivery-date" style="margin: 5px 0;"><strong>Data de Entrega:</strong> ${deliveryDate}</p>
                                <p style="margin: 5px 0;"><strong>Vendedor(a):</strong> ${order.sellerName || 'Não informado'}</p>
                            </div>
                            <div class="info-card" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                                <h3 class="card-title" style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Informações do Cliente</h3>
                                <p style="margin: 5px 0;"><strong>Nome:</strong> ${order.clientName || 'Não informado'}</p>
                                <p style="margin: 5px 0;"><strong>Documento:</strong> ${order.clientDocument || 'Não informado'}</p>
                                <p style="margin: 5px 0;"><strong>Telefone:</strong> ${order.clientPhone || 'Não informado'}</p>
                                <p style="margin: 5px 0;"><strong>Email:</strong> ${order.clientEmail || 'Não informado'}</p>
                                <p style="margin: 5px 0;"><strong>Endereço:</strong> ${order.clientAddress || 'Não informado'}</p>
                            </div>
                        </section>

                        <!-- Seção principal com os detalhes dos itens -->
                        <section class="order-details" style="margin-bottom: 15px;">
                            <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Detalhes do Pedido</h2>
                            <!-- Itens do pedido em layout compacto -->
                            <div class="order-items" style="border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                                ${order.items.length > 0 ? order.items.map(item => `
                                    <div class="print-item avoid-break" style="margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #eee;">
                                        <div class="print-item-header" style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                            <div class="print-item-name" style="font-weight: bold;">${item.productName || item.product || 'Produto'}</div>
                                            <div class="print-item-total" style="font-weight: bold;">${ui.formatCurrency(item.totalPrice || item.total || 0)}</div>
                                        </div>
                                        <div class="print-item-row" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 3px; font-size: 11px;">
                                            <span><strong>Qtd:</strong> ${item.quantity || 0}</span>
                                            <span><strong>P.Unit:</strong> ${ui.formatCurrency(item.unitPrice || item.price || 0)}</span>
                                            ${item.width ? `<span><strong>Dim:</strong> ${item.width}x${item.height} ${item.unit || 'cm'}</span>` : ''}
                                            ${item.squareMeters || item.area ? `<span><strong>Área:</strong> ${item.squareMeters || item.area} ${item.areaUnit || 'm²'}</span>` : ''}
                                            ${item.material ? `<span><strong>Material:</strong> ${item.material}</span>` : ''}
                                            ${item.finish ? `<span><strong>Acab:</strong> ${item.finish}</span>` : ''}
                                            ${item.installation ? `<span><strong>Inst:</strong> ${item.installation === true ? 'Sim' : 'Não'}</span>` : ''}
                                        </div>
                                        
                                        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;">
                                            ${item.description ? `<div style="font-style: italic; font-size: 10px; flex: 1;"><strong>Desc:</strong> ${item.description}</div>` : ''}
                                            
                                            <!-- Caixas de marcação para impressão e acabamento -->
                                            <div style="display: flex; gap: 10px; margin-left: auto;">
                                                <label style="display: inline-flex; align-items: center;">
                                                    <input type="checkbox" style="margin-right: 3px; width: 14px; height: 14px;">
                                                    <span style="font-size: 11px;">Impressão</span>
                                                </label>
                                                
                                                <label style="display: inline-flex; align-items: center;">
                                                    <input type="checkbox" style="margin-right: 3px; width: 14px; height: 14px;">
                                                    <span style="font-size: 11px;">Acabamento</span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        <!-- Totais -->
                                        <div class="print-totals avoid-break">
                                            <div class="print-total-row">
                                                <div class="print-total-label">Subtotal</div>
                                                <div>${ui.formatCurrency(order.subtotal || 0)}</div>
                                            </div>
                                            
                                            ${order.discount ? `
                                            <div class="print-total-row">
                                                <div class="print-total-label">Desconto</div>
                                                <div style="color: #198754;">- ${ui.formatCurrency(order.discount)}</div>
                                            </div>
                                            ` : ''}
                                            
                                            ${order.needsDelivery ? `
                                            <div class="print-total-row">
                                                <div class="print-total-label">Frete</div>
                                                <div>${ui.formatCurrency(order.deliveryCost || 0)}</div>
                                            </div>
                                            ` : ''}
                                            
                                            <div class="print-total-row print-grand-total">
                                                <div class="print-total-label">Valor Total</div>
                                                <div>${ui.formatCurrency(order.totalValue || 0)}</div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : '<p>Nenhum item no pedido</p>'}
                                
                                <!-- Totais -->
                                <div class="totals" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
                                        <span>Subtotal</span> <span>${ui.formatCurrency(order.subtotal || 0)}</span>
                                    </div>
                                    ${order.discount ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; color: #e74c3c;"><span>Desconto</span> <span>- ${ui.formatCurrency(order.discount)}</span></div>` : ''}
                                    ${order.needsDelivery ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;"><span>Frete</span> <span>${ui.formatCurrency(order.deliveryCost || 0)}</span></div>` : ''}
                                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 3px 0; border-top: 1px dashed #eee; padding-top: 5px;"><span>Valor Total</span> <span>${ui.formatCurrency(order.totalValue || 0)}</span></div>
                                </div>
                            </div>
                        </section>

                        <!-- Seção de Pagamentos e Valores em layout flexível -->
                        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <!-- Seção de Pagamentos -->
                            <section class="payment-details" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                                <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Pagamentos</h2>
                                ${order.payments && order.payments.length > 0 ? order.payments.map(payment => {
                                    const methodInfo = SYSTEM_CONFIG.paymentMethods.find(m => m.id === payment.method) || {
                                        name: payment.method || 'Outro'
                                    };
                                    
                                    return `
                                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; border-bottom: 1px dashed #eee; padding-bottom: 5px;">
                                            <span><strong>${methodInfo.name}</strong> - ${formatDate(payment.date)} ${payment.reference ? `(Ref: ${payment.reference})` : ''}</span>
                                            <span>${ui.formatCurrency(payment.amount)}</span>
                                        </div>
                                    `;
                                }).join('') : '<p style="font-size: 12px; color: #999; margin: 5px 0;">Nenhum pagamento registrado</p>'}
                                
                                <div style="margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
                                        <span>Total Pago</span> <span class="paid-amount">${ui.formatCurrency(order.totalPaid || 0)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin: 3px 0;">
                                        <span>Saldo Restante</span> <span class="remaining-balance">${ui.formatCurrency(order.remainingValue || 0)}</span>
                                    </div>
                                </div>
                            </section>

                            <!-- Seção de Observações -->
                            ${order.notes ? `
                                <section class="observations" style="flex: 1; border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                                    <h2 class="section-title" style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Observações</h2>
                                    <p style="font-size: 12px; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.notes}</p>
                                </section>
                            ` : ''}
                        
                        </div>
                        
                        <!-- Área de assinaturas -->
                        <section class="status-actions" style="margin-top: 15px; border: 1px solid #eee; border-radius: 5px; padding: 10px; color: white;">
                            <h2 class="section-title" style="font-size: 16px; margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: white;">Assinaturas</h2>
                            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                                <div style="flex: 1; text-align: center; border-top: 1px solid #eee; padding-top: 5px; margin: 0 10px;">
                                    <p>Cliente</p>
                                </div>
                                <div style="flex: 1; text-align: center; border-top: 1px solid #eee; padding-top: 5px; margin: 0 10px;">
                                    <p>Responsável</p>
                                </div>
                            </div>
                        </section>

                        <!-- Rodapé da página -->
                        <footer class="main-footer" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px; font-size: 11px; color: #999; text-align: center;">
                            <p style="margin: 0;">Documento gerado em: ${formatDateTime(new Date())}</p>
                            <p style="margin: 5px 0 0 0;">GrafSys - Sistema de Gestão para Gráficas</p>
                        </footer>
                    </div>
                </div>
                
                <script>
                    // Configuração da página para impressão automática
                    window.onload = function() {
                        // Impressão automática após 1 segundo para carregar recursos
                        setTimeout(function() {
                            window.print();
                        }, 1000);
                    }
                </script>
            </body>
            </html>
        `;
        
        // Escreve o conteúdo na nova janela
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
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
            sellerId: sellerId, // ID do vendedor logado
            discount: 0 // Campo para desconto
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
                sellerId: order.sellerId || '',
                discount: order.discount || 0 // Campo para desconto
            };
        }
        this.renderCurrentView();
    }
    
    // Renderiza os detalhes do item na visualização de pedido
    renderOrderItemDetails(item) {
        return `
            <div class="order-item-detail">
                <div class="order-item-header">
                    <div class="item-title">${item.product || 'Item sem nome'}</div>
                    <div class="item-price">${ui.formatCurrency(item.total || 0)}</div>
                </div>
                
                <div class="item-specs">
                    <div class="item-spec">
                        <span class="spec-label">Quantidade</span>
                        <span class="spec-value">${item.quantity || 0}</span>
                    </div>
                    <div class="item-spec">
                        <span class="spec-label">Preço Unitário</span>
                        <span class="spec-value">${ui.formatCurrency(item.price || 0)}</span>
                    </div>
                    
                    ${item.width ? `
                    <div class="item-spec">
                        <span class="spec-label">Largura</span>
                        <span class="spec-value">${item.width} ${item.unit || 'cm'}</span>
                    </div>` : ''}
                    
                    ${item.height ? `
                    <div class="item-spec">
                        <span class="spec-label">Altura</span>
                        <span class="spec-value">${item.height} ${item.unit || 'cm'}</span>
                    </div>` : ''}
                    
                    ${item.area ? `
                    <div class="item-spec">
                        <span class="spec-label">Área</span>
                        <span class="spec-value">${item.area} ${item.areaUnit || 'm²'}</span>
                    </div>` : ''}
                    
                    ${item.material ? `
                    <div class="item-spec">
                        <span class="spec-label">Material</span>
                        <span class="spec-value">${item.material}</span>
                    </div>` : ''}
                    
                    ${item.finish ? `
                    <div class="item-spec">
                        <span class="spec-label">Acabamento</span>
                        <span class="spec-value">${item.finish}</span>
                    </div>` : ''}
                    
                    ${item.installation ? `
                    <div class="item-spec">
                        <span class="spec-label">Instalação</span>
                        <span class="spec-value">${item.installation === true ? 'Sim' : 'Não'}</span>
                    </div>` : ''}
                </div>
                
                ${item.description ? `
                <div class="item-description">
                    <span class="spec-label">Descrição</span>
                    <span class="spec-value description-text">${item.description}</span>
                </div>` : ''}
            </div>
        `;
    }
    
    // Verifica se um pedido contém um tipo específico de produto
    orderHasProductType(order, productType) {
        if (!order.items || !productType) return true;
        
        return order.items.some(item => {
            const productName = item.productName || '';
            return productName.toLowerCase().includes(productType.toLowerCase());
        });
    }
    
    // Renderiza as opções de tipos de produtos para o filtro
    renderProductTypeOptions() {
        // Lista de tipos de produtos comum no sistema
        const productTypes = [
            { id: '', name: 'Todos os produtos' },
            { id: 'banner', name: 'Banner/Lona' },
            { id: 'adesivo', name: 'Adesivo' },
            { id: 'cartao', name: 'Cartão de Visita' },
            { id: 'panfleto', name: 'Panfleto/Folder' },
            { id: 'impressao', name: 'Impressão Digital' },
            { id: 'plotagem', name: 'Plotagem' },
            { id: 'offset', name: 'Material Gráfica' },
            { id: 'camiseta', name: 'Camiseta/Uniforme' },
            { id: 'outro', name: 'Outro' }
        ];
        
        return productTypes.map(type => 
            `<option value="${type.id}">${type.name}</option>`
        ).join('');
    }
    
    // Renderiza as opções de vendedores para o filtro
    renderSellerFilterOptions() {
        if (!this.users || !Array.isArray(this.users)) {
            return '<option value="">Sem vendedores</option>';
        }
        
        return this.users.map(user => 
            `<option value="${user.id}">${user.name || user.email}</option>`
        ).join('');
    }
    
    // Renderiza as opções de vendedores para o formulário de pedido
    renderSellerOptions() {
        if (!this.users || !Array.isArray(this.users)) {
            return '<option value="">Sem vendedores</option>';
        }
        
        const currentSellerId = this.formData.sellerId || '';
        
        return this.users.map(user => 
            `<option value="${user.id}" data-name="${user.name || user.email}" 
                ${user.id === currentSellerId ? 'selected' : ''}>
                ${user.name || user.email}
            </option>`
        ).join('');
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
    
    // Lidar com colagem direta (Ctrl+V)
    setupPasteListener() {
        // Adiciona um evento global para detectar Ctrl+V
        document.addEventListener('paste', (e) => {
            // Verifica se estamos na tela de criação/edição de pedido
            if (this.currentView !== 'create' && this.currentView !== 'edit') return;
            
            // Verifica se há imagens na área de transferência
            const items = e.clipboardData.items;
            let imageItem = null;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageItem = items[i];
                    break;
                }
            }
            
            // Se encontrou uma imagem, processa ela
            if (imageItem) {
                e.preventDefault(); // Previne o comportamento padrão
                
                // Obtém o blob da imagem
                const blob = imageItem.getAsFile();
                
                // Tamanho máximo (5MB)
                if (blob.size > 5 * 1024 * 1024) {
                    ui.showNotification('A imagem deve ter no máximo 5MB', 'error');
                    return;
                }
                
                // Lê a imagem como URL de dados
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.formData.imageUrl = event.target.result;
                    this.updateImagePreview();
                    ui.showNotification('Imagem colada com sucesso!', 'success');
                };
                
                reader.readAsDataURL(blob);
            }
        });
    }
    
    // Capturar screenshot
    captureScreenshot() {
        // Verifica se a biblioteca html2canvas está disponível
        if (typeof html2canvas !== 'function') {
            ui.showNotification('Biblioteca de captura de tela não está disponível. Verifique sua conexão com a internet e recarregue a página.', 'error');
            return;
        }

        ui.showNotification('Preparando para capturar tela...', 'info');
        
        // Minimiza o formulário para mostrar a área de captura
        const orderForm = document.getElementById('order-form');
        const mainContent = document.getElementById('main-content');
        
        if (!orderForm || !mainContent) {
            ui.showNotification('Elementos da página não encontrados. Recarregue a página e tente novamente.', 'error');
            return;
        }
        
        // Mostra instrução para selecionar área
        const instruction = document.createElement('div');
        instruction.className = 'screenshot-instruction';
        instruction.innerHTML = `
            <div class="instruction-content">
                <i class="fas fa-camera"></i>
                <h3>Selecione a área para capturar</h3>
                <p>Escolha o que deseja capturar:</p>
                <div class="screenshot-options">
                    <button id="capture-screen" class="btn btn-primary">Tela Inteira</button>
                    <button id="capture-content" class="btn btn-primary">Área Principal</button>
                    <button id="capture-window" class="btn btn-primary">Janela Atual</button>
                    <button id="cancel-screenshot" class="btn btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(instruction);
        
        // Esconde temporariamente o formulário
        orderForm.style.opacity = '0.1';
        orderForm.style.pointerEvents = 'none';
        
        // Função para processar a captura
        const processCapture = (element) => {
            ui.showNotification('Capturando imagem...', 'info');
            
            // Usar html2canvas para capturar a tela com opções melhoradas
            html2canvas(element, {
                allowTaint: true,
                useCORS: true,
                logging: false,
                scale: window.devicePixelRatio || 1,
                foreignObjectRendering: false, // Desativa renderização de objetos estrangeiros que podem causar problemas
                removeContainer: true, // Remove o container temporário após a captura
                ignoreElements: (element) => {
                    // Ignora elementos que podem causar problemas
                    return element.classList.contains('screenshot-instruction');
                }
            }).then(canvas => {
                try {
                    // Converter para base64
                    const base64image = canvas.toDataURL('image/png');
                    
                    // Salvar a imagem nos dados do formulário
                    this.formData.imageUrl = base64image;
                    this.updateImagePreview();
                    
                    // Restaurar formulário
                    orderForm.style.opacity = '1';
                    orderForm.style.pointerEvents = 'auto';
                    instruction.remove();
                    
                    ui.showNotification('Imagem capturada com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao processar a imagem capturada:', error);
                    ui.showNotification('Erro ao processar a imagem. Verifique as permissões do navegador.', 'error');
                    
                    // Restaurar formulário
                    orderForm.style.opacity = '1';
                    orderForm.style.pointerEvents = 'auto';
                    instruction.remove();
                }
            }).catch(error => {
                console.error('Erro ao capturar tela:', error);
                ui.showNotification('Erro ao capturar tela. Isso pode ser devido a restrições do navegador ou do sistema operacional.', 'error');
                
                // Restaurar formulário
                orderForm.style.opacity = '1';
                orderForm.style.pointerEvents = 'auto';
                instruction.remove();
            });
        };
        
        // Evento para capturar a tela inteira
        document.getElementById('capture-screen').addEventListener('click', () => {
            processCapture(document.documentElement);
        });
        
        // Evento para capturar apenas o conteúdo principal
        document.getElementById('capture-content').addEventListener('click', () => {
            processCapture(mainContent);
        });
        
        // Evento para capturar apenas a janela atual (melhor compatibilidade com Windows 11)
        document.getElementById('capture-window').addEventListener('click', () => {
            // Usa uma abordagem alternativa para capturar apenas a janela visível
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Cria um elemento temporário com as dimensões da janela visível
            const tempElement = document.createElement('div');
            tempElement.style.position = 'fixed';
            tempElement.style.top = '0';
            tempElement.style.left = '0';
            tempElement.style.width = viewportWidth + 'px';
            tempElement.style.height = viewportHeight + 'px';
            tempElement.style.zIndex = '-1';
            
            document.body.appendChild(tempElement);
            
            // Captura apenas este elemento que representa a janela visível
            html2canvas(tempElement, {
                allowTaint: true,
                useCORS: true,
                logging: false,
                scale: window.devicePixelRatio || 1,
                width: viewportWidth,
                height: viewportHeight,
                x: window.scrollX,
                y: window.scrollY,
                windowWidth: viewportWidth,
                windowHeight: viewportHeight
            }).then(canvas => {
                try {
                    // Converter para base64
                    const base64image = canvas.toDataURL('image/png');
                    
                    // Salvar a imagem nos dados do formulário
                    this.formData.imageUrl = base64image;
                    this.updateImagePreview();
                    
                    // Restaurar formulário
                    orderForm.style.opacity = '1';
                    orderForm.style.pointerEvents = 'auto';
                    instruction.remove();
                    
                    // Remove o elemento temporário
                    document.body.removeChild(tempElement);
                    
                    ui.showNotification('Imagem capturada com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao processar a imagem capturada:', error);
                    ui.showNotification('Erro ao processar a imagem. Verifique as permissões do navegador.', 'error');
                    
                    // Restaurar formulário
                    orderForm.style.opacity = '1';
                    orderForm.style.pointerEvents = 'auto';
                    instruction.remove();
                    
                    // Remove o elemento temporário
                    if (document.body.contains(tempElement)) {
                        document.body.removeChild(tempElement);
                    }
                }
            }).catch(error => {
                console.error('Erro ao capturar janela:', error);
                ui.showNotification('Erro ao capturar janela. Tente uma abordagem alternativa.', 'error');
                
                // Restaurar formulário
                orderForm.style.opacity = '1';
                orderForm.style.pointerEvents = 'auto';
                instruction.remove();
                
                // Remove o elemento temporário
                if (document.body.contains(tempElement)) {
                    document.body.removeChild(tempElement);
                }
            });
        });
        
        // Evento para cancelar
        document.getElementById('cancel-screenshot').addEventListener('click', () => {
            orderForm.style.opacity = '1';
            orderForm.style.pointerEvents = 'auto';
            instruction.remove();
        });
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
    
    // Confirma a exclusão de um pedido
    confirmDeleteOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        ui.confirmModal(
            'Excluir Pedido', 
            `Tem certeza que deseja excluir o pedido #${order.orderNumber}? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    ui.showLoading('Excluindo pedido...');
                    
                    // Exclui o pedido do banco de dados
                    await db.collection('orders').doc(orderId).delete();
                    
                    // Remove o pedido da lista local
                    const index = this.orders.findIndex(o => o.id === orderId);
                    if (index !== -1) {
                        this.orders.splice(index, 1);
                    }
                    
                    // Atualiza a interface
                    this.renderOrdersList();
                    
                    ui.hideLoading();
                    ui.showNotification('Pedido excluído com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao excluir pedido:', error);
                    ui.hideLoading();
                    ui.showNotification('Erro ao excluir pedido.', 'error');
                }
            }
        );
    }
    
    // Mostra diálogo para alterar o status do pedido
    showChangeStatusDialog(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // Cria um modal para seleção do status
        const currentStatus = order.status;
        let statusOptions = '';
        
        SYSTEM_CONFIG.orderStatus.forEach(status => {
            if (status.id !== currentStatus) {
                statusOptions += `<option value="${status.id}">${status.name}</option>`;
            }
        });
        
        const modalContent = `
            <div class="form-group">
                <label for="new-status">Selecione o novo status:</label>
                <select id="new-status" class="form-control">
                    ${statusOptions}
                </select>
            </div>
        `;
        
        ui.showModal('Alterar Status do Pedido', modalContent, async () => {
            const newStatus = document.getElementById('new-status').value;
            if (newStatus && newStatus !== currentStatus) {
                await this.updateOrderStatus(orderId, newStatus);
            }
        });
    }
}

// Registra o componente globalmente
window.OrdersComponent = OrdersComponent;