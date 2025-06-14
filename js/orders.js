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
            
            // Verifica se há uma flag para criar novo pedido
            const createNewOrder = localStorage.getItem('createNewOrder');
            if (createNewOrder) {
                // Remove do localStorage para não abrir novamente em futuras navegações
                localStorage.removeItem('createNewOrder');
                
                // Abre a tela de criação de pedido
                this.currentView = 'create';
                console.log('Abrindo tela de criação de pedido');
            }
            // Verifica se há um pedido para visualizar (vindo do fluxo de trabalho)
            else {
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
    
    // Renderiza o formulário de pedido (novo ou edição)
    renderOrderForm(orderId = null) {
        const isEditing = orderId !== null;
        let orderData = null;
        
        if (isEditing) {
            // Buscar dados do pedido existente
            orderData = this.orders.find(order => order.id === orderId);
            if (!orderData) {
                this.renderError("Pedido não encontrado!");
                return;
            }
        }
        
        // Definir data atual para os campos de data
        const now = new Date();
        const today = this.formatDateForInput(now);
        const time = this.formatTimeForInput(now);
        
        const headerText = isEditing ? 'Editar Pedido' : 'Novo Pedido';
        
        const html = `
            <div class="page-header">
                <h1>${headerText}</h1>
                <button id="back-to-list" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
            </div>
            <div id="order-form-container">
                <form id="order-form" class="order-form">
                    <!-- Formulário será carregado aqui -->
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Carregando formulário...</p>
                    </div>
                </form>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Configurar evento para voltar à lista
        const backBtn = document.getElementById('back-to-list');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showListView();
            });
        }
        
        // Carregar o componente de novo pedido
        const orderFormContainer = document.getElementById('order-form-container');
        if (orderFormContainer) {
            const newOrderComponent = new NewOrderComponent();
            newOrderComponent.render(orderFormContainer, orderData);
        }
    }
    
    // Formata data para input tipo date (YYYY-MM-DD)
    formatDateForInput(date) {
        if (!date) return '';
        
        try {
            // Verificar tipo de data para converter adequadamente
            let dateObj;
            
            // Verifica se é um timestamp do Firestore (objeto com seconds e nanoseconds)
            if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
                // Converte timestamp do Firestore para Date
                dateObj = new Date(date.seconds * 1000);
                console.log('Convertendo timestamp Firestore para DateInput:', dateObj);
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (date && typeof date === 'object' && date.toDate) {
                dateObj = date.toDate();
            } else {
                dateObj = new Date(date);
            }
            
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida em formatDateForInput:', date);
                return '';
            }
            
            // Converte para data no fuso horário de São Paulo (GMT-3)
            const formatter = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            const parts = formatter.formatToParts(dateObj);
            const day = parts.find(part => part.type === 'day').value;
            const month = parts.find(part => part.type === 'month').value;
            const year = parts.find(part => part.type === 'year').value;
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Erro ao formatar data para input:', error);
            return '';
        }
    }
    
    // Formata hora para input tipo time (HH:MM)
    formatTimeForInput(date) {
        if (!date) return '-';
        
        try {
            // Verificar tipo de data para converter adequadamente
            let dateObj;
            
            // Verifica se é um timestamp do Firestore (objeto com seconds e nanoseconds)
            if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
                // Converte timestamp do Firestore para Date
                dateObj = new Date(date.seconds * 1000);
                console.log('Convertendo timestamp Firestore para Date:', dateObj);
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (date && typeof date === 'object' && date.toDate) {
                dateObj = date.toDate();
            } else {
                dateObj = new Date(date);
            }
            
            // Se for uma data inválida, retornar um valor padrão
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida em formatTimeForInput:', date);
                return '-';
            }
            
            // Converte para hora no fuso horário de São Paulo (GMT-3)
            const formatter = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const parts = formatter.formatToParts(dateObj);
            const hour = parts.find(part => part.type === 'hour').value;
            const minute = parts.find(part => part.type === 'minute').value;
            
            return `${hour}:${minute}`;
        } catch (error) {
            console.error('Erro ao formatar hora:', error, date);
            return '-';
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
                        <label for="status-filter">Status</label>
                        <select id="status-filter" class="filter-select">
                            <option value="">Todos os status</option>
                            ${SYSTEM_CONFIG.orderStatus.map(status => 
                                `<option value="${status.id}">${status.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="date-filter">Período</label>
                        <select id="date-filter" class="filter-select">
                            <option value="all">Todas as datas</option>
                            <option value="today">Hoje</option>
                            <option value="week">Esta semana</option>
                            <option value="month">Este mês</option>
                        </select>
                    </div>
                </div>
                
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
                </div>
                
                <div class="filters-row">
                    <div class="filter-group">
                        <label for="product-type-filter">Tipo de Produto</label>
                        <select id="product-type-filter" class="form-control filter-select">
                            ${this.renderProductTypeOptions()}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="seller-filter">Vendedor</label>
                        <select id="seller-filter" class="form-control filter-select">
                            ${this.renderSellerFilterOptions()}
                        </select>
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
                    <div class="filter-group date-range">
                        <label for="delivery-date-start">Entrega de</label>
                        <input type="date" id="delivery-date-start" class="form-control filter-input">
                    </div>
                    <div class="filter-group date-range">
                        <label for="delivery-date-end">Entrega até</label>
                        <input type="date" id="delivery-date-end" class="form-control filter-input">
                    </div>
                    <div class="filter-actions">
                        <button id="apply-filters" class="btn btn-primary">Aplicar Filtros</button>
                        <button id="clear-filters" class="btn btn-outline-secondary">Limpar Filtros</button>
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
                                <th>Cliente</th>
                                <th>Data de Entrega</th>
                                <th>Hora</th>
                                <th>Situação</th>
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
                        <td>${order.clientName}</td>
                        <td class="${dateClass}">${order.deliveryDate ? ui.formatDate(order.deliveryDate) : 'A combinar'}</td>
                        <td class="${dateClass}">${order.deliveryDate ? this.formatTimeForInput(order.deliveryDate) : '-'}</td>
                        <td>${this.getSituacaoHTML(order)}</td>
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
        // Removido código do toggle de filtros avançados, pois agora todos os filtros são exibidos juntos
        
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
        
        // Removido botão de debug dos filtros
        
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
    
    // Verifica se um pedido contém um tipo específico de produto
    orderHasProductType(order, productType) {
        if (!order.items || !productType) return true;
        
        return order.items.some(item => {
            return item.productId === productType;
        });
    }
    
    // Renderiza as opções de tipos de produtos para o filtro
    renderProductTypeOptions() {
        // Opção padrão para todos os produtos
        let options = '<option value="">Todos os produtos</option>';
        
        // Verifica se temos produtos carregados
        if (this.products && this.products.length > 0) {
            // Ordena os produtos por nome
            const produtosOrdenados = [...this.products].sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
            
            // Adiciona cada produto como uma opção
            produtosOrdenados.forEach(produto => {
                if (produto.name) {
                    options += `<option value="${produto.id}">${produto.name}</option>`;
                }
            });
        }
        
        return options;
    }
    
    // Renderiza as opções de vendedores para o filtro
    renderSellerFilterOptions() {
        if (!this.users || !Array.isArray(this.users)) {
            return '<option value="">Sem vendedores</option>';
        }
        
        // Filtra apenas usuários que são vendedores (role: 'seller' ou 'vendedor')
        const vendedores = this.users.filter(user => 
            user.role === 'seller' || 
            user.role === 'vendedor' || 
            user.role?.toLowerCase().includes('vend')
        );
        
        // Opção padrão
        let options = '<option value="">Todos os vendedores</option>';
        
        // Adiciona cada vendedor como uma opção
        if (vendedores.length > 0) {
            vendedores.forEach(vendedor => {
                options += `<option value="${vendedor.id}">${vendedor.name || vendedor.email || 'Vendedor'}</option>`;
            });
        }
        
        return options;
    }
    
    // Renderiza as opções de vendedores para o formulário de pedido
    renderSellerOptions() {
        if (!this.users || !Array.isArray(this.users)) {
            return '<option value="">Sem vendedores</option>';
        }
        
        // Filtra apenas usuários que são vendedores (role: 'seller' ou 'vendedor')
        const vendedores = this.users.filter(user => 
            user.role === 'seller' || 
            user.role === 'vendedor' || 
            user.role?.toLowerCase().includes('vend')
        );
        
        const currentSellerId = this.formData.sellerId || '';
        
        // Opção padrão
        let options = '<option value="">Selecione um vendedor</option>';
        
        // Adiciona cada vendedor como uma opção
        if (vendedores.length > 0) {
            vendedores.forEach(vendedor => {
                options += `<option value="${vendedor.id}" data-name="${vendedor.name || vendedor.email || 'Vendedor'}" 
                    ${vendedor.id === currentSellerId ? 'selected' : ''}>
                    ${vendedor.name || vendedor.email || 'Vendedor'}
                </option>`;
            });
        }
        
        return options;
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
                        if (clientIdInput) {
                            clientIdInput.value = client.id;
                        }
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
            if (clientIdInput) {
                clientIdInput.value = this.formData.client.id;
            }
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
        
        const currentStatus = order.status || 'pending';
        
        const statusOptions = SYSTEM_CONFIG.orderStatus.map(status => 
            `<option value="${status.id}" ${status.id === currentStatus ? 'selected' : ''}>${status.name}</option>`
        ).join('');
        
        const modalContent = `
            <div class="form-group">
                <label for="new-status">Novo Status:</label>
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
    
    // Calcula e formata a situação do pedido
    getSituacaoHTML(order) {
        if (order.toArrange) {
            return '<span>A combinar</span>';
        } else if (order.delivered) {
            return '<span>Entregue</span>';
        } else if (order.deliveryDate) {
            const today = new Date();
            let deliveryDate;
            
            if (order.deliveryDate.toDate) {
                deliveryDate = order.deliveryDate.toDate();
            } else if (order.deliveryDate instanceof Date) {
                deliveryDate = order.deliveryDate;
            } else {
                deliveryDate = new Date(order.deliveryDate);
            }
            
            // Calcula a diferença em minutos entre agora e a data de entrega
            const minutesToDelivery = Math.floor((deliveryDate - today) / (1000 * 60));
            
            if (minutesToDelivery < 0) {
                // Atrasado - vermelho
                return '<span class="situacao-atrasado">Atrasado</span>';
            } else if (minutesToDelivery <= 60) {
                // Menos de 60 minutos - amarelo
                return '<span class="situacao-apresse">Apresse</span>';
            } else {
                // Mais de 60 minutos - azul
                return '<span class="situacao-no-prazo">No prazo</span>';
            }
        } else {
            return '<span>Pendente</span>';
        }
    }
    
    // Verifica se um pedido é do dia de hoje
    isToday(date) {
        if (!date) return false;
        
        try {
            // Verificar tipo de data para converter adequadamente
            let dateObj;
            
            // Verifica se é um timestamp do Firestore (objeto com seconds e nanoseconds)
            if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
                // Converte timestamp do Firestore para Date
                dateObj = new Date(date.seconds * 1000);
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (date && typeof date === 'object' && date.toDate) {
                dateObj = date.toDate();
            } else {
                dateObj = new Date(date);
            }
            
            // Verifica se a data é válida
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida em isToday:', date);
                return false;
            }
            
            const today = new Date();
            return dateObj.getDate() === today.getDate() &&
                dateObj.getMonth() === today.getMonth() &&
                dateObj.getFullYear() === today.getFullYear();
        } catch (error) {
            console.error('Erro ao verificar se a data é hoje:', error);
            return false;
        }
    }
    
    // Formata data e hora para exibição
    formatDateTime(date) {
        if (!date) return '-';
        
        try {
            // Converte para Date conforme o tipo
            let dateObj;
            
            // Verifica se é um timestamp do Firestore (objeto com seconds e nanoseconds)
            if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
                // Converte timestamp do Firestore para Date
                dateObj = new Date(date.seconds * 1000);
                console.log('Convertendo timestamp Firestore para DateTime:', dateObj);
            } else if (date.toDate) {
                dateObj = date.toDate();
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                dateObj = new Date(date);
            }
            
            // Verifica se a data é válida
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida em formatDateTime:', date);
                return '-';
            }
            
            // Formatação usando o fuso horário de São Paulo
            const formatter = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            return formatter.format(dateObj).replace(',', ' às');
        } catch (error) {
            console.error('Erro ao formatar data e hora:', error);
            return '-';
        }
    }
    
    // Renderiza os detalhes de um pedido
    renderOrderDetail(orderId) {
        // Encontra o pedido pelo ID
        const order = this.orders.find(o => o.id === orderId);
        
        if (!order) {
            this.renderError(`Pedido não encontrado: ${orderId}`);
            return;
        }
        
        // Carrega o CSS específico para detalhes do pedido em formato A4
        if (!document.querySelector('link[href="css/detalhes-pedido-print.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/detalhes-pedido-print.css';
            document.head.appendChild(link);
        }
        
        // Encontra o objeto de status
        const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                          { name: 'Desconhecido', color: '' };
        
        // Formata as datas
        const createdDate = order.createdAt ? ui.formatDate(order.createdAt) : '-';
        const deliveryDate = order.deliveryDate ? ui.formatDate(order.deliveryDate) : 'A combinar';
        const deliveryTime = order.deliveryDate ? this.formatTimeForInput(order.deliveryDate) : '-';
        
        // Calcula o valor total
        const totalValue = order.totalValue || 
                          (order.items ? order.items.reduce((sum, item) => sum + (item.total || 0), 0) : 0);
        
        // Calcula o valor pago
        const paidValue = order.payments ? order.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) : 0;
        
        // Calcula o saldo
        const balance = totalValue - paidValue;
        
        // Monta o HTML do cabeçalho
        let html = `
            <div class="page-header no-print">
                <button class="btn btn-outline-secondary back-button" id="back-to-orders">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <h1>Detalhes do Pedido</h1>
                <div class="header-actions">
                    <button class="btn btn-primary edit-order-btn" data-id="${order.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-outline-secondary print-button" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            </div>
            
            <div class="order-detail-container">
                <div class="order-detail-content">
                    <div class="order-header">
                        <div class="order-title">
                            <h2>${order.orderNumber ? `${order.orderNumber}` : 'Pedido sem número'}</h2>
                            <span class="order-status-badge ${statusObj.color}">${statusObj.name}</span>
                        </div>
                        
                        <div class="order-meta">
                            <div class="meta-item">
                                <span class="meta-label">Data do Pedido:</span>
                                <span class="meta-value">${this.formatDateTime(order.createdAt)}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Entrega:</span>
                                <span class="meta-value">${order.deliveryDate ? this.formatDateTime(order.deliveryDate) : 'A combinar'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Situação:</span>
                                <span class="meta-value">${this.getSituacaoHTML(order)}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Vendedor:</span>
                                <span class="meta-value">${order.sellerName || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-sections">
                        <!-- Seção de Cliente -->
                        <div class="order-section">
                            <h3>Informações do Cliente</h3>
                            <div class="client-info">
                                <div class="info-group">
                                    <span class="info-label">Nome:</span>
                                    <span class="info-value">${order.clientName || '-'}</span>
                                </div>
                                <div class="info-group">
                                    <span class="info-label">Documento:</span>
                                    <span class="info-value">${order.clientDocument || '-'}</span>
                                </div>
                                <div class="info-group">
                                    <span class="info-label">Telefone:</span>
                                    <span class="info-value">${order.clientPhone || '-'}</span>
                                </div>
                                <div class="info-group">
                                    <span class="info-label">Email:</span>
                                    <span class="info-value">${order.clientEmail || '-'}</span>
                                </div>
                                ${order.deliveryAddress ? `
                                <div class="info-group">
                                    <span class="info-label">End. Entrega:</span>
                                    <span class="info-value">${order.deliveryAddress}</span>
                                </div>` : ''}
                                ${order.clientAddress ? `
                                <div class="info-group">
                                    <span class="info-label">Endereço:</span>
                                    <span class="info-value">${order.clientAddress}</span>
                                </div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Seção de Itens -->
                        <div class="order-section">
                            <h3>Itens do Pedido</h3>
                            <div class="order-items">
                                ${order.items && order.items.length > 0 ? 
                                    order.items.map((item, index) => this.renderOrderItemDetailsCompact(item, index + 1)).join('') : 
                                    '<p class="no-data-message">Nenhum item registrado neste pedido.</p>'}
                            </div>
                        </div>
                        
                        <!-- Seção de Pagamentos -->
                        <div class="order-section">
                            <h3>Pagamentos</h3>
                            <div class="payment-items">
                                ${order.payments && order.payments.length > 0 ? 
                                    order.payments.map(payment => `
                                        <div class="payment-item">
                                            <div class="payment-info">
                                                <i class="fas fa-money-bill-wave"></i>
                                                <span class="payment-method">${payment.method || 'Pagamento'}</span>
                                                <span class="payment-date">${payment.date ? ui.formatDate(payment.date) : '-'}</span>
                                                ${payment.reference ? `<span class="payment-reference">${payment.reference}</span>` : ''}
                                            </div>
                                            <div class="payment-amount">${ui.formatCurrency(payment.amount || 0)}</div>
                                        </div>
                                    `).join('') : 
                                    '<p class="no-data-message">Nenhum pagamento registrado.</p>'}
                            </div>
                            
                            <div class="order-summary">
                                <div class="summary-item">
                                    <span class="summary-label">Subtotal:</span>
                                    <span class="summary-value">${ui.formatCurrency(totalValue)}</span>
                                </div>
                                ${order.discount ? `
                                <div class="summary-item discount">
                                    <span class="summary-label">Desconto:</span>
                                    <span class="summary-value">- ${ui.formatCurrency(order.discount)}</span>
                                </div>` : ''}
                                ${order.deliveryCost ? `
                                <div class="summary-item">
                                    <span class="summary-label">Entrega:</span>
                                    <span class="summary-value">${ui.formatCurrency(order.deliveryCost)}</span>
                                </div>` : ''}
                                <div class="summary-item total">
                                    <span class="summary-label">Total:</span>
                                    <span class="summary-value">${ui.formatCurrency(totalValue - (order.discount || 0) + (order.deliveryCost || 0))}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Pago:</span>
                                    <span class="summary-value">${ui.formatCurrency(paidValue)}</span>
                                </div>
                                <div class="summary-item total">
                                    <span class="summary-label">Saldo:</span>
                                    <span class="summary-value">${ui.formatCurrency(Math.max(0, (totalValue - (order.discount || 0) + (order.deliveryCost || 0)) - paidValue))}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${order.notes ? `
                        <!-- Observações -->
                        <div class="order-section order-notes">
                            <div class="notes-title">Observações:</div>
                            <div class="notes-content">${order.notes}</div>
                        </div>` : ''}
                        
                        ${order.imageUrl ? `
                        <!-- Imagens do pedido -->
                        <div class="order-section order-images">
                            <h3>Imagem de Referência</h3>
                            <div class="order-image">
                                <img src="${order.imageUrl}" alt="Imagem do pedido">
                            </div>
                        </div>` : ''}
                        
                        <!-- Área de assinatura -->
                        <div class="signature-area">
                            <div class="signature-block">
                                <div class="signature-line">Cliente</div>
                            </div>
                            <div class="signature-block">
                                <div class="signature-line">Empresa</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona event listeners
        document.getElementById('back-to-orders').addEventListener('click', () => {
            this.showListView();
        });
        
        const editButtons = document.querySelectorAll('.edit-order-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.closest('.edit-order-btn').dataset.id;
                this.showEditView(orderId);
            });
        });
    }
    
    // Renderiza os detalhes de um item de pedido em formato compacto
    renderOrderItemDetailsCompact(item, index) {
        return `
            <div class="order-item">
                <div class="item-header">
                    <div class="item-name">#${index}: ${item.name || 'Item sem nome'}</div>
                    <div class="item-price">${ui.formatCurrency(item.total || 0)}</div>
                </div>
                <div class="item-details">
                    ${item.quantity ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Quantidade:</span>
                        <span class="item-detail-value">${item.quantity}</span>
                    </div>` : ''}
                    ${item.unitPrice ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Valor Unitário:</span>
                        <span class="item-detail-value">${ui.formatCurrency(item.unitPrice)}</span>
                    </div>` : ''}
                    ${item.width && item.height ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Dimensões:</span>
                        <span class="item-detail-value">${item.width} x ${item.height}${item.unit ? ` ${item.unit}` : ''}</span>
                    </div>` : ''}
                    ${item.area ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Área:</span>
                        <span class="item-detail-value">${item.area} ${item.unit === 'cm' ? 'cm²' : 'm²'}</span>
                    </div>` : ''}
                    ${item.material ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Material:</span>
                        <span class="item-detail-value">${item.material}</span>
                    </div>` : ''}
                    ${item.finish ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Acabamento:</span>
                        <span class="item-detail-value">${item.finish}</span>
                    </div>` : ''}
                    ${item.discount ? `
                    <div class="item-detail">
                        <span class="item-detail-label">Desconto:</span>
                        <span class="item-detail-value">- ${ui.formatCurrency(item.discount)}</span>
                    </div>` : ''}
                    ${item.description ? `
                    <div class="item-description">
                        ${item.description}
                    </div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Método para validar o formulário de pedido
    validateOrderForm() {
        // Verificar cliente
        if (!this.formData.client || !this.formData.client.id) {
            window.ui.showNotification('Selecione um cliente para o pedido.', 'warning');
            return false;
        }
        
        // Verificar itens
        if (!this.formData.items || this.formData.items.length === 0) {
            window.ui.showNotification('Adicione pelo menos um item ao pedido.', 'warning');
            return false;
        }
        
        // Verificar se todos os itens têm produto selecionado
        const invalidItems = this.formData.items.filter(item => !item.product || !item.product.id);
        if (invalidItems.length > 0) {
            window.ui.showNotification('Há itens sem produto selecionado. Remova ou complete esses itens.', 'warning');
            return false;
        }
        
        return true;
    }
    
    // Método para preparar os dados do pedido para salvar
    prepareOrderData(isForm = false) {
        // Preparar dados do pedido para salvar
        const now = new Date();
        
        // Verificar e processar a imagem se necessário
        let imageUrl = this.formData.imageUrl || '';
        
        // Garantir que as datas sejam objetos Date válidos
        let deliveryDate = null;
        
        if (this.formData.deliveryDate) {
            console.log('Tipo da data de entrega recebida:', typeof this.formData.deliveryDate, 
                        this.formData.deliveryDate instanceof Date ? 'É um objeto Date' : 'Não é um objeto Date');
            
            if (this.formData.deliveryDate instanceof Date) {
                deliveryDate = new Date(this.formData.deliveryDate); // Cria uma cópia da data
                console.log('Data de entrega é um objeto Date válido');
            } else if (typeof this.formData.deliveryDate === 'object' && this.formData.deliveryDate.toDate) {
                deliveryDate = this.formData.deliveryDate.toDate();
                console.log('Data de entrega é um objeto Firestore Timestamp');
            } else if (typeof this.formData.deliveryDate === 'string') {
                console.log('Data de entrega é uma string:', this.formData.deliveryDate);
                deliveryDate = new Date(this.formData.deliveryDate);
            } else {
                try {
                    deliveryDate = new Date(this.formData.deliveryDate);
                    if (isNaN(deliveryDate.getTime())) {
                        console.error('Data de entrega inválida:', this.formData.deliveryDate);
                        deliveryDate = null;
                    } else {
                        console.log('Data de entrega convertida com sucesso');
                    }
                } catch (error) {
                    console.error('Erro ao converter data de entrega:', error);
                    deliveryDate = null;
                }
            }
        }
        
        console.log('Data de entrega processada final:', 
            deliveryDate, 
            deliveryDate ? 'Valor em milissegundos: ' + deliveryDate.getTime() : null,
            deliveryDate ? this.formatDateForInput(deliveryDate) : null,
            deliveryDate ? this.formatTimeForInput(deliveryDate) : null
        );
        
        const orderData = {
            clientId: this.formData.client.id,
            clientName: this.formData.client.name,
            clientDocument: this.formData.client.document || '',
            clientPhone: this.formData.client.phone || '',
            clientEmail: this.formData.client.email || '',
            clientAddress: this.formData.client.address || '',
            orderNumber: this.formData.orderNumber || null,
            items: this.formData.items.map(item => ({
                product: item.product.name || 'Produto',
                productId: item.product.id,
                quantity: item.quantity || 1,
                price: item.unitPrice || 0,
                total: item.total || 0,
                description: item.description || '',
                width: item.width || null,
                height: item.height || null,
                area: item.area || null
            })),
            payments: this.formData.payments.map(payment => ({
                method: payment.method || 'Dinheiro',
                amount: payment.amount || 0,
                date: payment.date || now,
                reference: payment.reference || ''
            })),
            status: this.formData.status || 'pending',
            sellerId: this.formData.sellerId || '',
            sellerName: this.formData.sellerName || 'Sistema',
            createdAt: isForm && this.formData.createdAt ? this.formData.createdAt : now,
            updatedAt: now,
            deliveryDate: deliveryDate,
            deliveryType: this.formData.deliveryType || 'pickup',
            deliveryAddress: this.formData.deliveryAddress || '',
            notes: this.formData.notes || '',
            priority: this.formData.priority || 'normal',
            imageUrl: imageUrl,
            imageTitle: this.formData.imageTitle || ''
        };
        
        return orderData;
    }
    
    // Método assíncrono para processar a imagem e retornar uma URL otimizada
    async processImageForUpload(imageUrl) {
        if (!imageUrl || !imageUrl.startsWith('data:')) {
            return imageUrl;
        }
        
        // Estimar o tamanho da imagem em bytes
        const base64Length = imageUrl.split(',')[1]?.length || 0;
        const estimatedSize = Math.ceil(base64Length * 0.75);
        
        // Se a imagem não for muito grande, retorna a original
        if (estimatedSize <= 800000) {
            return imageUrl;
        }
        
        console.log(`Processando imagem grande (${Math.round(estimatedSize/1024)}KB)`);
        
        return new Promise((resolve) => {
            try {
                const img = new Image();
                
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        
                        // Calcular as novas dimensões - manter a proporção
                        let newWidth = img.width;
                        let newHeight = img.height;
                        
                        // Reduzir tamanho até 800px no lado maior se necessário
                        const maxDimension = 800;
                        if (newWidth > maxDimension || newHeight > maxDimension) {
                            if (newWidth > newHeight) {
                                newHeight = Math.round(newHeight * maxDimension / newWidth);
                                newWidth = maxDimension;
                            } else {
                                newWidth = Math.round(newWidth * maxDimension / newHeight);
                                newHeight = maxDimension;
                            }
                        }
                        
                        // Definir dimensões do canvas
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        
                        // Desenhar a imagem redimensionada
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, newWidth, newHeight);
                        
                        // Converter para base64 com qualidade reduzida
                        const compressedImageUrl = canvas.toDataURL('image/jpeg', 0.6); // Qualidade 60%
                        
                        console.log('Imagem redimensionada com sucesso');
                        resolve(compressedImageUrl);
                    } catch (err) {
                        console.error('Erro ao redimensionar imagem:', err);
                        window.ui.showNotification('A imagem é muito grande e não pôde ser processada.', 'warning');
                        resolve('');
                    }
                };
                
                img.onerror = function() {
                    console.error('Erro ao carregar imagem para processamento');
                    window.ui.showNotification('Erro ao processar imagem.', 'warning');
                    resolve('');
                };
                
                img.src = imageUrl;
            } catch (err) {
                console.error('Erro ao iniciar processamento da imagem:', err);
                window.ui.showNotification('A imagem não pôde ser processada.', 'warning');
                resolve('');
            }
        });
    }
    
    // Método para salvar o pedido
    async saveOrder(isForm = false) {
        try {
            // Preparar dados do pedido
            const orderData = this.prepareOrderData(isForm);
            
            // Processar imagem grande se necessário
            if (orderData.imageUrl && typeof orderData.imageUrl === 'string') {
                orderData.imageUrl = await this.processImageForUpload(orderData.imageUrl);
            }
            
            // Salvar no Firebase
            let docRef;
            
            if (this.currentOrderId && this.currentView === 'edit') {
                // Se estiver editando, atualiza o documento existente
                docRef = db.collection('orders').doc(this.currentOrderId);
                await docRef.update({
                    ...orderData,
                    updatedAt: new Date() // Atualiza a data de atualização
                });
            } else {
                // Se for um novo pedido, cria um novo documento
                docRef = await db.collection('orders').add(orderData);
            }
            
            return docRef;
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            throw error;
        }
    }
}

// Registra o componente globalmente
window.OrdersComponent = OrdersComponent;