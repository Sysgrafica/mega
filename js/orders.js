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
            // Carrega apenas os dados necessários em paralelo para melhorar a performance
            const [ordersSnapshot, clientsSnapshot, productsSnapshot, employeesSnapshot] = await Promise.all([
                // Carrega pedidos com limite e ordenação
                db.collection('orders')
                    .orderBy('createdAt', 'desc')
                    .limit(100) // Limita para melhor performance
                    .get(),
                
                // Carrega clientes
                db.collection('clients')
                    .orderBy('name') // Ordenação consistente
                    .limit(100)
                    .get(),
                
                // Carrega produtos ativos
                db.collection('products')
                    .where('active', '==', true)
                    .orderBy('name') // Usando índice composto (active + name)
                    .get(),
                
                // Carrega funcionários ativos
                db.collection('employees')
                    .where('active', '==', true)
                    .orderBy('name') // Usando índice composto (active + name)
                    .get()
            ]);
                
            // Processa os pedidos
            this.orders = [];
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                this.orders.push({
                    id: doc.id,
                    ...order
                });
            });
            
            // Processa os clientes
            this.clients = [];
            clientsSnapshot.forEach(doc => {
                const client = doc.data();
                this.clients.push({
                    id: doc.id,
                    ...client
                });
            });
            
            // Processa os produtos
            this.products = [];
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                this.products.push({
                    id: doc.id,
                    ...product
                });
            });
            
            // Processa os funcionários
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
            .limit(50) // Limita a quantidade de pedidos para melhor performance
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
                    this.renderOrdersList(false);
                }
            }, error => {
                console.error('Erro no listener de pedidos:', error);
            });
    }
    
    // Limpa os listeners quando o componente é desmontado
    cleanup() {
        console.log('Executando limpeza completa de recursos do componente de pedidos');
        
        // Limpar o listener de pedidos em tempo real
        if (this.unsubscribeOrders) {
            console.log('Cancelando inscrição de listener de pedidos');
            this.unsubscribeOrders();
            this.unsubscribeOrders = null;
        }
        
        // Limpar o observador de visibilidade
        if (this.visibilityObserver) {
            console.log('Limpando observador de visibilidade');
            clearInterval(this.visibilityObserver);
            this.visibilityObserver = null;
        }
        
        // Limpar o observador de mutação DOM
        if (this.domObserver) {
            console.log('Desconectando observador de mutação DOM');
            this.domObserver.disconnect();
            this.domObserver = null;
        }
        
        // Limpar o evento de atualização de item
        if (this._orderItemUpdatedListener) {
            console.log('Removendo listener de atualização de item');
            document.removeEventListener('orderItemUpdated', this._orderItemUpdatedListener);
            this._orderItemUpdatedListener = null;
        }
        
        // Limpar backups e snapshots
        this.lastOrderItemsSnapshot = null;
        
        console.log('Limpeza completa finalizada');
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
            
            // Log para debug
            console.log("Dados do pedido para edição:", orderData);
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
            this.initNewOrderComponent(orderFormContainer, orderData);
        }
    }
    
    // Verifica se o componente NewOrderComponent está disponível e carrega se necessário
    async ensureNewOrderComponentLoaded() {
        return new Promise((resolve, reject) => {
            // Verifica se o componente já está definido
            if (typeof NewOrderComponent === 'function') {
                resolve(true);
                return;
            }
            
            console.log('NewOrderComponent não está disponível. Tentando carregar...');
            
            // Verifica se o script já está carregado
            const scriptExists = Array.from(document.querySelectorAll('script'))
                .some(script => script.src.includes('new-order.js'));
            
            if (scriptExists) {
                console.log('Script new-order.js já existe no DOM, mas a classe não está disponível.');
                // Espera um pouco para ver se o script termina de carregar
                setTimeout(() => {
                    if (typeof NewOrderComponent === 'function') {
                        resolve(true);
                    } else {
                        reject(new Error('Timeout esperando NewOrderComponent ser definido.'));
                    }
                }, 1000);
                return;
            }
            
            // Carrega o script dinamicamente
            const script = document.createElement('script');
            script.src = 'js/new-order.js';
            script.onload = () => {
                console.log('Script new-order.js carregado com sucesso.');
                // Verifica se o componente está disponível após carregar o script
                if (typeof NewOrderComponent === 'function') {
                    resolve(true);
                } else {
                    reject(new Error('NewOrderComponent não foi definido após carregar o script.'));
                }
            };
            script.onerror = (error) => {
                console.error('Erro ao carregar script new-order.js:', error);
                reject(new Error('Erro ao carregar o script new-order.js.'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Inicializa o componente de novo pedido
    async initNewOrderComponent(container, orderData) {
        try {
            // Garante que o componente NewOrderComponent está carregado
            await this.ensureNewOrderComponentLoaded();
            
            // Cria e renderiza o componente
            const newOrderComponent = new NewOrderComponent();
            newOrderComponent.render(container, orderData);
        } catch (error) {
            console.error('Erro ao inicializar NewOrderComponent:', error);
            this.renderError('Erro ao carregar o formulário de pedido. Por favor, recarregue a página.');
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
        console.log('-------------------------------------------------------');
        console.log('Renderizando lista de pedidos, resetFilters =', resetFilters);
        
        // Debug para entender os status disponíveis
        this.debugOrderStatuses();
        
        // Restaura valores de filtros salvos, se não for para resetar
        if (!resetFilters) {
            this.restoreFilterValues();
        }
        
        const currentUser = window.auth.getCurrentUser();
        const userRole = currentUser ? currentUser.role : null;
        // Apenas vendedores e administradores podem criar novos pedidos
        const canCreateOrder = userRole === 'admin' || userRole === 'vendedor' || userRole === 'seller';

        // Cabeçalho da página
        let html = `
            <div class="page-header">
                <h1>Gestão de Pedidos</h1>
                ${canCreateOrder ? `
                <button id="new-order-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Pedido
                </button>
                ` : ''}
            </div>
        `;
        
        // Barra de filtros simplificada
        html += `
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="order-search" placeholder="Buscar por Nº do pedido, cliente, produto..." class="search-input">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="filter-group">
                    <select id="sort-orders" class="filter-select">
                        <option value="date-desc">Mais recentes</option>
                        <option value="date-asc">Mais antigos</option>
                        <option value="delivery-asc">Próximos da entrega</option>
                        <option value="value-desc">Maior valor</option>
                        <option value="value-asc">Menor valor</option>
                    </select>
                </div>
                <button id="advanced-filters-toggle" class="btn btn-secondary"><i class="fas fa-filter"></i> Filtros</button>
            </div>
            <div id="advanced-filters" style="display: none;">
                <!-- Outros filtros podem ser adicionados aqui -->
            </div>
        `;
        
        // Conteúdo principal - lista de pedidos ou mensagem vazia
        if (this.orders.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list empty-icon"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Você ainda não possui pedidos cadastrados.</p>
                    ${canCreateOrder ? `<button id="empty-new-order-btn" class="btn btn-primary">Cadastrar Primeiro Pedido</button>` : ''}
                </div>
            `;
        } else {
            html += `
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th data-sort="orderNumber">Nº Pedido <i class="fas fa-sort"></i></th>
                                <th data-sort="clientName">Cliente <i class="fas fa-sort"></i></th>
                                <th data-sort="status">Status <i class="fas fa-sort"></i></th>
                                <th>Situação</th> 
                                <th data-sort="totalValue">Valor Total <i class="fas fa-sort"></i></th>
                                <th data-sort="deliveryDate">Data de Entrega <i class="fas fa-sort"></i></th>
                                <th class="actions-header">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Renderiza cada pedido como uma linha na tabela
            this.orders.forEach(order => {
                // Obter o objeto de status
                const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || {
                    name: 'Status Desconhecido',
                    color: 'status-pending'
                };
                
                // Formatar data de criação
                const createdDate = order.createdAt ? this.formatDateTime(order.createdAt) : '-';
                
                // Formatar data de entrega
                let deliveryDate = '-';
                if (order.toArrange) {
                    deliveryDate = 'A combinar';
                } else if (order.deliveryDate) {
                    deliveryDate = this.formatDateTime(order.deliveryDate);
                }
                
                // Formatar valor
                const totalValue = order.totalValue || 
                          (order.items && Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item.total || 0), 0) : 0);
                
                // Calcula o valor pago
                const paidValue = order.payments && Array.isArray(order.payments) ? order.payments.reduce((sum, payment) => {
                    // Se o pagamento tem data futura, ainda considerar o valor para exibição
                    const paymentAmount = payment.amount !== undefined ? payment.amount : (payment.value || 0);
                    return sum + parseFloat(paymentAmount || 0);
                }, 0) : 0;
                
                // Calcula o subtotal (soma dos totais dos itens)
                const subtotal = order.items && Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) : 0;
                
                // Calcula o total final (subtotal + extras + entrega - desconto)
                const finalTotal = (subtotal + (order.extraServices || 0) + (order.deliveryCost || 0)) - (order.discount || 0);
                
                // Calcula o saldo
                const balance = Math.max(0, finalTotal - paidValue);
                
                // Formatar valor para exibição
                const formattedValue = this.formatCurrency(finalTotal);
                
                // Obter situação do pedido
                const situacao = this.getSituacaoHTML(order);

                html += `
                    <tr class="order-row" data-id="${order.id}">
                        <td>${order.orderNumber || '-'}</td>
                        <td>${order.clientName || 'Cliente não identificado'}</td>
                        <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                        <td class="${situacao.class}">${situacao.text}</td>
                        <td>${formattedValue}</td>
                        <td>${deliveryDate}</td>
                        <td>
                            <button class="btn-icon view-order" data-id="${order.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${window.auth.hasFeaturePermission('edit_order') ? `
                            <button class="btn-icon edit-order" data-id="${order.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>` : ''}
                            ${window.auth.hasFeaturePermission('delete_order') ? `
                            <button class="btn-icon delete-order" data-id="${order.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                            <button class="btn-icon change-status" data-id="${order.id}" title="Alterar Status">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Após renderizar o HTML
        this.container.innerHTML = html;

        // Adiciona event listeners diretos para cada botão de ação para maior robustez
        this.container.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', () => this.showDetailView(btn.dataset.id));
        });

        this.container.querySelectorAll('.edit-order').forEach(btn => {
            btn.addEventListener('click', () => this.showEditView(btn.dataset.id));
        });

        this.container.querySelectorAll('.delete-order').forEach(btn => {
            btn.addEventListener('click', () => this.confirmDeleteOrder(btn.dataset.id));
        });

        this.container.querySelectorAll('.change-status').forEach(btn => {
            btn.addEventListener('click', () => this.showChangeStatusDialog(btn.dataset.id));
        });
        
        // Configurar eventos para os filtros e botões
        const newOrderBtn = document.getElementById('new-order-btn');
        if (newOrderBtn) {
            newOrderBtn.addEventListener('click', () => this.showCreateView());
        }
        
        // Toggle para filtros avançados
        const advancedFiltersToggle = document.getElementById('advanced-filters-toggle');
        const advancedFilters = document.getElementById('advanced-filters');
        
        if (advancedFiltersToggle && advancedFilters) {
            // Verifica se os filtros avançados estavam abertos
            const filtersOpen = localStorage.getItem('ordersAdvancedFiltersOpen') === 'true';
            if (filtersOpen) {
                advancedFilters.style.display = 'block';
            }
            
            advancedFiltersToggle.addEventListener('click', () => {
                const isVisible = advancedFilters.style.display === 'block';
                advancedFilters.style.display = isVisible ? 'none' : 'block';
                localStorage.setItem('ordersAdvancedFiltersOpen', !isVisible);
            });
        }
        
        // Botão para limpar filtros
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                console.log('Botão Limpar Filtros clicado');
                this.clearAllFilters();
            });
        }

        // Setup dos eventos de filtro
        this.setupFilterEvents();
        
        // Aplicar os filtros salvos se não for resetar filtros
        if (!resetFilters) {
            console.log('Aplicando filtros salvos no localStorage');
            setTimeout(() => this.applyFilters(), 100);
        }
        
        console.log('Renderização da lista de pedidos finalizada');
        console.log('-------------------------------------------------------');
    }
    
    // Novo método para configurar os eventos de filtros
    setupFilterEvents() {
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Elemento de filtro não encontrado: ${id}`);
            }
        };

        addListener('order-search', 'input', () => this.applyFilters());
        addListener('sort-orders', 'change', () => this.applyFilters());

        // Verificar se estamos na situação de lista vazia
        const emptyNewOrderBtn = document.getElementById('empty-new-order-btn');
        if (emptyNewOrderBtn) {
            emptyNewOrderBtn.addEventListener('click', () => this.showCreateView());
        }
        
        // Eventos para os botões de visualizar e editar
        // Removido daqui e centralizado na delegação de eventos em renderOrdersList
    }
    
    // Aplica ordenação nos pedidos
    sortOrders(orders, sortBy) {
        if (!sortBy) return orders;
        
        const [field, direction] = sortBy.split(':');
        
        return [...orders].sort((a, b) => {
            let valA, valB;

            if (field === 'deliverySituation') {
                const situationA = this.getSituacaoHTML(a);
                const situationB = this.getSituacaoHTML(b);
                // Define uma ordem para as situações
                const orderMap = { 'situacao-atrasado': 1, 'situacao-urgente': 2, 'situacao-atencao': 3, 'situacao-no-prazo': 4, 'situacao-combinar': 5, 'situacao-pendente': 6 };
                valA = orderMap[situationA.class] || 99;
                valB = orderMap[situationB.class] || 99;
            } else if (field === 'deliveryDate') {
                valA = this.getDateValue(a.deliveryDate, a.toArrange);
                valB = this.getDateValue(b.deliveryDate, b.toArrange);
            } else if (field === 'status') {
                valA = a.status.toLowerCase();
                valB = b.status.toLowerCase();
            } else if (field === 'value') {
                valA = a.totalValue || 0;
                valB = b.totalValue || 0;
            } else if (field === 'client') {
                valA = a.clientName || '';
                valB = b.clientName || '';
            } else if (field === 'seller') {
                valA = a.sellerName || '';
                valB = b.sellerName || '';
            } else if (field === 'number') {
                valA = a.orderNumber || '';
                valB = b.orderNumber || '';
            } else {
                valA = this.getDateValue(a.createdAt);
                valB = this.getDateValue(b.createdAt);
            }

            if (direction === 'asc') {
                return valA < valB ? -1 : valA > valB ? 1 : 0;
            } else {
                return valA > valB ? -1 : valA < valB ? 1 : 0;
            }
        });
    }
    
    // Obtém um valor de data para comparação
    getDateValue(date, toArrange) {
        if (!date) return 0;
        try {
            const today = new Date();
            const deliveryDate = toArrange ? new Date(toArrange) : date;
            const diff = deliveryDate - today;
            return Math.floor(diff / (1000 * 60 * 60 * 24));
        } catch (error) {
            return 0;
        }
    }
    
    // Verifica se um pedido contém um determinado tipo de material
    orderHasMaterialType(order, materialType) {
        return order.items.some(item => item.material && item.material.toLowerCase().includes(materialType.toLowerCase()));
    }
    
    // Aplicar filtros à lista de pedidos
    applyFilters() {
        try {
            const searchTerm = document.getElementById('order-search')?.value.toLowerCase().trim();
            const tbody = document.querySelector('.data-table tbody');

            if (!tbody) {
                console.warn('Tabela de pedidos não encontrada. Abortando a aplicação de filtros.');
                return;
            }

            const rows = Array.from(tbody.querySelectorAll('tr.order-row'));
            let visibleCount = 0;

            rows.forEach(row => {
                const orderId = row.dataset.id;
                const order = this.orders.find(o => o.id === orderId);

                if (!order) {
                    row.style.display = 'none';
                    return;
                }

                let isVisible = true;
                if (searchTerm) {
                    const orderNumber = (order.orderNumber || '').toLowerCase();
                    const clientName = (order.clientName || '').toLowerCase();
                    const itemsContent = (order.items || []).map(item => (item.productName || '').toLowerCase()).join(' ');

                    isVisible = orderNumber.includes(searchTerm) ||
                                clientName.includes(searchTerm) ||
                                itemsContent.includes(searchTerm);
                }

                row.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    visibleCount++;
                }
            });

            // Exibe mensagem se nenhum resultado for encontrado
            const emptyMessage = document.querySelector('.empty-filter-message');
            if (emptyMessage) emptyMessage.remove();

            if (visibleCount === 0 && searchTerm) {
                const message = `
                    <tr class="empty-filter-message">
                        <td colspan="7">Nenhum pedido encontrado para "${searchTerm}".</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', message);
            }

        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    }
    
    // Limpa todos os filtros
    clearAllFilters() {
        // Lista de IDs dos elementos de filtro
        const filterIds = [
            'order-search',
            'status-filter',
            'date-filter',
            'order-number-filter',
            'client-name-filter',
            'material-type-filter',
            'product-type-filter',
            'seller-filter',
            'delivery-date-start',
            'delivery-date-end'
        ];
        
        // Limpa cada filtro
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0; // Primeiro item (geralmente "Todos")
                    
                    // Dispara evento change para atualizar a UI
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    element.value = ''; // Limpa input text
                    
                    // Dispara evento input para atualizar a UI
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
        
        // Restaura a ordenação padrão
        const sortSelect = document.getElementById('sort-orders');
        if (sortSelect) {
            sortSelect.value = 'date-desc'; // Ordenação padrão
            localStorage.setItem('ordersSortBy', 'date-desc');
            
            // Dispara evento change para atualizar a UI
            sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Limpa o localStorage para os filtros
        localStorage.removeItem('ordersFilters');
        
        // Remove a mensagem de filtro vazio se existir
        const emptyMessage = document.querySelector('.empty-filter-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Aplica os filtros limpos para mostrar todos os pedidos
        this.applyFilters();
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
        try {
            // Verifica se o usuário tem permissão para editar pedidos
            if (!window.auth.hasFeaturePermission('edit_order')) {
                ui.showNotification('Você não tem permissão para editar pedidos.', 'error');
                return;
            }
            
            console.log("Iniciando edição do pedido:", orderId);
            
            this.currentView = 'edit';
            this.currentOrderId = orderId;
            
            // Carrega os dados do pedido para o formulário
            const order = this.orders.find(o => o.id === orderId);
            if (!order) {
                console.error("Pedido não encontrado:", orderId);
                this.renderError(`Pedido não encontrado: ${orderId}`);
                return;
            }
            
            console.log("Dados do pedido encontrados:", order);
            
            // Garante que items e payments sejam arrays antes de usar o spread operator
            const itemsArray = Array.isArray(order.items) ? order.items : [];
            const paymentsArray = Array.isArray(order.payments) ? order.payments : [];
            
            this.formData = {
                client: this.clients.find(c => c.id === order.clientId),
                items: [...itemsArray],
                payments: [...paymentsArray],
                notes: order.notes || '',
                deliveryDate: order.deliveryDate,
                status: order.status || 'pending',
                deliveryType: order.deliveryType || 'retirada',
                deliveryAddress: order.deliveryAddress || '',
                title: order.title || '',
                imageUrl: order.imageUrl || '',
                imageTitle: order.imageTitle || '',
                sellerName: order.sellerName || 'Sistema',
                sellerId: order.sellerId || '',
                discount: order.discount || 0,
                deliveryCost: order.deliveryCost || null,
                extraServices: order.extraServices || 0
            };
            
            // Garanta que o cliente está sendo carregado corretamente
            const clienteObj = this.clients.find(c => c.id === order.clientId);
            if (clienteObj) {
                // Atualiza o formData com os detalhes completos do cliente
                this.formData.client = clienteObj;
                this.formData.clientId = clienteObj.id;
                this.formData.clientName = clienteObj.name;
                
                // Garante que os campos de cliente serão preenchidos corretamente no formulário
                setTimeout(() => {
                    const searchInput = document.getElementById('client-search');
                    const clientIdInput = document.getElementById('client-id');
                    
                    if (searchInput) searchInput.value = clienteObj.name;
                    if (clientIdInput) clientIdInput.value = clienteObj.id;
                    
                    // Atualiza os detalhes visíveis do cliente
                    const clientDetails = document.getElementById('client-details');
                    if (clientDetails) {
                        clientDetails.classList.remove('hidden');
                        // Exibe os detalhes do cliente aqui
                    }
                }, 500); // Pequeno atraso para garantir que os elementos já foram criados
            }
            
            this.renderCurrentView();
        } catch (error) {
            console.error("Erro ao editar pedido:", error);
            this.renderError("Ocorreu um erro ao tentar editar o pedido. Por favor, tente novamente.");
        }
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
        // DEPRECATED: A lógica foi movida para ui.js para ser global.
        return window.ui.askCancellationReason();
    }
    
    // Confirma a exclusão de um pedido
    confirmDeleteOrder(orderId) {
        // DEPRECATED: A lógica foi movida para ui.js para ser global.
        window.ui.confirmDeleteOrder(orderId);
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
    
    // Atualiza o status de um pedido
    async updateOrderStatus(orderId, newStatus) {
        try {
            ui.showLoading('Atualizando status do pedido...');
            
            // Obter informações do usuário atual do sistema de autenticação
            let userName = 'Usuário desconhecido';
            
            if (window.auth && window.auth.currentUser) {
                userName = window.auth.currentUser.name || 'Usuário desconhecido';
            }
            
            // Atualiza o documento no Firestore
            await firebase.firestore().collection('orders').doc(orderId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusUpdatedBy: userName,
                statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualiza o objeto local
            const orderIndex = this.orders.findIndex(o => o.id === orderId);
            if (orderIndex >= 0) {
                this.orders[orderIndex].status = newStatus;
                this.orders[orderIndex].updatedAt = new Date();
                this.orders[orderIndex].statusUpdatedBy = userName;
                this.orders[orderIndex].statusUpdatedAt = new Date();
                
                console.log("Pedido atualizado localmente:", {
                    status: newStatus,
                    statusUpdatedBy: userName,
                    userName: userName
                });
            }
            
            // Atualiza a visualização
            if (this.currentView === 'list') {
                this.renderOrdersList(false);
            } else if (this.currentView === 'detail' && this.selectedOrderId === orderId) {
                this.renderOrderDetail(orderId);
            }
            
            ui.hideLoading();
            ui.showNotification('Status do pedido atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar status do pedido:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao atualizar status do pedido. Tente novamente.', 'error');
        }
    }
    
    // Calcula e formata a situação do pedido
    getSituacaoHTML(order) {
        if (order.toArrange) {
            return { text: 'A combinar', class: 'situacao-combinar' };
        }
        
        if (!order.deliveryDate) {
            return { text: 'Pendente', class: 'situacao-pendente' };
        }
        
        const deliveryDate = order.deliveryDate.toDate ? order.deliveryDate.toDate() : new Date(order.deliveryDate);
        const diffMinutes = (deliveryDate.getTime() - new Date().getTime()) / (1000 * 60);

        if (diffMinutes < 0) {
            return { text: 'Atrasado', class: 'situacao-atrasado' };
        }
        if (diffMinutes <= 60) {
            return { text: 'Apresse', class: 'situacao-apresse' };
        }
        return { text: 'No prazo', class: 'situacao-no-prazo' };
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
    
    // Formata timestamp para data e hora legível
    formatDateTime(date) {
        if (!date) return '-';
        
        try {
            let dateObj;
            
            // Verifica se é um timestamp do Firestore
            if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
                dateObj = new Date(date.seconds * 1000);
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (typeof date === 'string') {
                dateObj = new Date(date);
            } else if (date && typeof date === 'object' && date.toDate) {
                dateObj = date.toDate();
            } else {
                return '-';
            }
            
            // Verificação adicional se a data é válida
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida:', date);
                return '-';
            }
            
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(dateObj);
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '-';
        }
    }
    
    // Formata um valor numérico como moeda (R$)
    formatCurrency(value) {
        if (value === undefined || value === null) return 'R$ 0,00';
        
        // Converte para número se for string
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        
        // Formata com Intl.NumberFormat
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numValue);
    }
    
    // Renderiza os detalhes de um pedido
    renderOrderDetail(orderId, customContainer = null) {
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
        
        // Define o contêiner onde renderizar os detalhes
        const targetContainer = customContainer || this.container;
        
        // Verifica permissões para editar e excluir
        const canEdit = window.auth.hasFeaturePermission('edit_order');
        const canDelete = window.auth.hasFeaturePermission('delete_order');
        
        // Encontra o objeto de status
        const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                          { name: 'Desconhecido', color: '' };
        
        // Log para depuração das informações de status e usuário
        console.log("Detalhes do pedido:", {
            id: order.id,
            status: order.status,
            statusName: statusObj.name,
            statusUpdatedBy: order.statusUpdatedBy,
            statusUpdatedAt: order.statusUpdatedAt,
            currentUser: window.auth && window.auth.currentUser ? window.auth.currentUser.name : 'Nenhum usuário logado'
        });
        
        // Formata as datas
        const createdDate = order.createdAt ? ui.formatDate(order.createdAt) : '-';
        const deliveryDate = order.deliveryDate ? ui.formatDate(order.deliveryDate) : 'A combinar';
        const deliveryTime = order.deliveryDate ? this.formatTimeForInput(order.deliveryDate) : '-';
        
        // Calcula o valor total
        const totalValue = order.totalValue || 
                          (order.items && Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item.total || 0), 0) : 0);
        
        // Calcula o valor pago
        const paidValue = order.payments && Array.isArray(order.payments) ? order.payments.reduce((sum, payment) => {
            // Se o pagamento tem data futura, ainda considerar o valor para exibição
            const paymentAmount = payment.amount !== undefined ? payment.amount : (payment.value || 0);
            return sum + parseFloat(paymentAmount || 0);
        }, 0) : 0;
        
        // Calcula o subtotal (soma dos totais dos itens)
        const subtotal = order.items && Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) : 0;
        
        // Calcula o total final (subtotal + extras + entrega - desconto)
        const finalTotal = (subtotal + (order.extraServices || 0) + (order.deliveryCost || 0)) - (order.discount || 0);
        
        // Calcula o saldo
        const balance = Math.max(0, finalTotal - paidValue);
        
        // Extrair data e hora separadamente para exibição
        let deliveryDateDisplay = '-';
        let deliveryTimeDisplay = '-';
        
        if (order.toArrange) {
            deliveryDateDisplay = 'A combinar';
        } else if (order.deliveryDate) {
            // Converter para objeto Date
            let deliveryDateObj;
            if (order.deliveryDate.toDate) {
                deliveryDateObj = order.deliveryDate.toDate();
            } else if (order.deliveryDate instanceof Date) {
                deliveryDateObj = order.deliveryDate;
            } else {
                deliveryDateObj = new Date(order.deliveryDate);
            }
            
            // Formatar data (DD/MM/YYYY)
            const formatter = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            deliveryDateDisplay = formatter.format(deliveryDateObj);
            
            // Formatar hora (HH:MM)
            const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            deliveryTimeDisplay = timeFormatter.format(deliveryDateObj);
        }
        
        // Obter situação do pedido
        const situacao = this.getSituacaoHTML(order);

        // HTML para o motivo do cancelamento (se aplicável)
        let cancellationReasonHTML = '';
        if (order.status === 'cancelled' && order.cancellationReason) {
            cancellationReasonHTML = `
                <div class="cancellation-reason-section" style="margin-top: 15px;">
                    <h4 class="notes-title">Motivo do Cancelamento</h4>
                    <p class="notes-content" style="color: #A94442; font-weight: bold; background-color: #F2DEDE; padding: 10px; border-radius: 4px;">
                        ${order.cancellationReason}
                    </p>
                </div>
            `;
        }

        // Declare a variável html antes de usar
        let html = `
            <div class="page-header no-print">
                <button class="btn btn-outline-secondary back-button" id="back-to-orders">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <h1>Detalhes do Pedido</h1>
                <div class="header-actions">
                    ${window.auth.hasFeaturePermission('edit_order') ? `
                    <button class="btn btn-primary edit-order-btn" data-id="${order.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ` : ''}
                    ${window.auth.hasFeaturePermission('delete_order') ? `
                    <button class="btn btn-danger delete-order-btn" data-id="${order.id}">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                    ` : ''}
                    <button class="btn btn-outline-secondary print-button" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            </div>
            
            <div class="container">
                <!-- CABEÇALHO COM INFORMAÇÕES DA EMPRESA -->
                <header class="header">
                    <div class="company-info">
                        <h1 class="company-name">GRAFSYS</h1>
                        <p class="company-slogan">Sistema de Gestão para Gráficas</p>
                        <div class="company-details">
                            <p>Rua Exemplo, 123 - Centro - Cidade/UF</p>
                            <p>Tel: (00) 0000-0000 / WhatsApp: (00) 90000-0000</p>
                            <p>E-mail: contato@grafsys.com.br | CNPJ: 00.000.000/0000-00</p>
                        </div>
                    </div>
                    <div class="order-title">
                        <h2>O.S. <strong>${order.orderNumber || 'Sem número'}</strong></h2>
                       
                    </div>
                </header>
                
                <main>
                    <!-- SEÇÃO DE STATUS E DATAS -->
                    <section class="card">
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Data do Pedido</span>
                                <span class="value">${this.formatDateTime(order.createdAt)}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Previsão de Entrega</span>
                                <span class="value">${order.deliveryDate ? this.formatDateTime(order.deliveryDate) : 'A combinar'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Situação</span>
                                ${(() => {
                                    // Determina a classe do status baseado na situação do pedido
                                    let statusClass = 'status-normal';
                                    const situacao = this.getSituacaoHTML(order);
                                    statusClass = situacao.class || 'status-normal';
                                    return `<span class="value"><span class="status-badge ${statusClass}">${situacao.text}</span></span>`;
                                })()}
                            </div>
                            <div class="info-item">
                                <span class="label">Vendedor(a)</span>
                                <span class="value">${order.sellerName || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Status do Pedido</span>
                                <span class="value status-badge ${statusObj.color || 'status-pending'}">${statusObj.name || 'Desconhecido'}</span>
                            </div>
                            <div class="info-item status-updated-info">
                                <span class="label">Modificado por</span>
                                <span class="value">${order.statusUpdatedBy || 'Sistema'} ${order.statusUpdatedAt ? '- ' + this.formatDateTime(order.statusUpdatedAt) : ''}</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- LAYOUT PRINCIPAL: ITENS, CLIENTE E RESUMO FINANCEIRO -->
                    <div class="main-layout">
                        <div class="content-column">
                            <!-- SEÇÃO DE CLIENTE E ENTREGA -->
                            <section class="card customer-details">
                                <h3 class="card-title">Cliente e Entrega</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">Nome</span>
                                        <span class="value">${order.clientName || '-'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Documento</span>
                                        <span class="value">${order.clientDocument || '-'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Telefone</span>
                                        <span class="value">${order.clientPhone || '-'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Email</span>
                                        <span class="value">${order.clientEmail || '-'}</span>
                                    </div>
                                    <div class="info-item full-width">
                                        <span class="label">Endereço de Entrega</span>
                                        <span class="value">${order.deliveryAddress || order.clientAddress || '-'}</span>
                                    </div>
                                </div>
                                ${order.deliveryType === 'entrega' ? `
                                <div class="delivery-details">
                                    <span>Tipo: <strong>Entrega</strong></span>
                                    ${order.deliveryCost ? `<span>Custo: <strong>${ui.formatCurrency(order.deliveryCost)}</strong></span>` : ''}
                                </div>` : `
                                <div class="delivery-details">
                                    <span>Tipo: <strong>Retirada</strong></span>
                                </div>`}
                            </section>
                            
                            <!-- SEÇÃO DE ITENS DO PEDIDO -->
                            <section class="card" id="order-items-section">
                                <h3 class="card-title">Itens do Pedido</h3>
                                ${order.items && order.items.length > 0 ? 
                                    order.items.map((item, index) => {
                                        // Código para verificação de status de impressão e acabamento foi removido
                                        const itemClasses = ["order-item", "visible-item"];
                                        
                                        // Verifica se o item tem marcação de impressão
                                        if (item.printChecked) {
                                            itemClasses.push("print-checked");
                                        }
                                        
                                        // Extrair o nome do produto corretamente, lidando com o caso em que item.product é um objeto
                                        let productName = 'Item sem nome';
                                        if (item.product) {
                                            if (typeof item.product === 'string') {
                                                productName = item.product;
                                            } else if (typeof item.product === 'object' && item.product.name) {
                                                productName = item.product.name;
                                            }
                                        } else if (item.name) {
                                            productName = item.name;
                                        }
                                        
                                        return `
                                        <div class="${itemClasses.join(' ')}" data-item-index="${index}">
                                            <div class="item-header">
                                                <span>#${index + 1}: ${productName}</span>
                                                <span>${ui.formatCurrency(item.total || 0)}</span>
                                            </div>
                                            <div class="item-specs">
                                                <span>Quantidade: <strong>${item.quantity || 1}</strong></span>
                                                ${item.width && item.height ? `<span>Dimensões: <strong>${item.width} x ${item.height}${item.unit ? ` ${item.unit}` : ''}</strong></span>` : ''}
                                                ${item.area ? `<span>Área: <strong>${item.area}${item.unit ? ` ${item.unit}²` : ' m²'}</strong></span>` : ''}
                                            </div>
                                            ${item.description ? `<p class="item-notes"><strong>Obs:</strong> ${item.description}</p>` : ''}
                                            
                                            <!-- Checkbox e indicador de informação para controle de impressão -->
                                            <div class="item-actions">
                                                <div class="print-checkbox-container">
                                                    <input type="checkbox" id="print-check-${order.id}-${index}" 
                                                           class="print-checkbox" 
                                                           data-order-id="${order.id}" 
                                                           data-item-index="${index}"
                                                           ${item.printChecked ? 'checked' : ''}>
                                                    <label for="print-check-${order.id}-${index}" class="print-checkbox-label">
                                                        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                    </label>
                                                </div>
                                                <div class="info-indicator" data-order-id="${order.id}" data-item-index="${index}">
                                                    !
                                                    <div class="info-tooltip" id="info-tooltip-${order.id}-${index}">
                                                        ${item.printChecked && item.printCheckedBy ? 
                                                          `Impresso por: ${item.printCheckedBy}<br>Em: ${item.printCheckedAt ? this.formatDateTime(item.printCheckedAt) : '-'}` : 
                                                          'Aguardando impressão'}
                                                    </div>
                                                </div>
                                                
                                                <!-- Checkbox e indicador para controle de acabamento -->
                                                <div class="finishing-checkbox-container">
                                                    <input type="checkbox" id="finishing-check-${order.id}-${index}" 
                                                           class="finishing-checkbox" 
                                                           data-order-id="${order.id}" 
                                                           data-item-index="${index}"
                                                           ${item.finishingChecked ? 'checked' : ''}>
                                                    <label for="finishing-check-${order.id}-${index}" class="finishing-checkbox-label">
                                                        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                    </label>
                                                </div>
                                                <div class="info-indicator" data-order-id="${order.id}" data-item-index="${index}">
                                                    !
                                                    <div class="info-tooltip" id="finishing-tooltip-${order.id}-${index}">
                                                        ${item.finishingChecked && item.finishingCheckedBy ? 
                                                          `Acabado por: ${item.finishingCheckedBy}<br>Em: ${item.finishingCheckedAt ? this.formatDateTime(item.finishingCheckedAt) : '-'}` : 
                                                          'Aguardando acabamento'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        `;
                                    }).join('') : 
                                    '<p class="no-data-message">Nenhum item registrado neste pedido.</p>'}
                            </section>
                            
                            <!-- SEÇÃO DE PAGAMENTOS -->
                            <section class="card">
                                <h3 class="card-title">Pagamentos</h3>
                                ${order.payments && order.payments.length > 0 ? 
                                    order.payments.map(payment => {
                                        // Recupera o valor do pagamento considerando ambos os campos
                                        const paymentAmount = payment.amount !== undefined ? payment.amount : (payment.value || 0);
                                        return `
                                        <div class="payment-item">
                                            <div class="info-item">
                                                <span class="label">${payment.date ? ui.formatDate(payment.date) : '-'}</span>
                                                <span class="value">${payment.method || 'Pagamento'}</span>
                                            </div>
                                            <span class="payment-amount">${ui.formatCurrency(paymentAmount)}</span>
                                        </div>
                                        `;
                                    }).join('') : 
                                    '<p class="no-data-message">Nenhum pagamento registrado.</p>'}
                                
                                ${order.extraServices || order.discount ? `
                                <div class="payment-details">
                                    ${order.extraServices ? `
                                    <div class="payment-item">
                                        <div class="info-item">
                                            <span class="label">Serviços Extras</span>
                                            <span class="value">Adicionais</span>
                                        </div>
                                        <span class="payment-amount">${ui.formatCurrency(order.extraServices)}</span>
                                    </div>` : ''}
                                    
                                    ${order.discount ? `
                                    <div class="payment-item">
                                        <div class="info-item">
                                            <span class="label">Desconto</span>
                                            <span class="value">Aplicado</span>
                                        </div>
                                        <span class="payment-amount" style="color: var(--danger-color)">- ${ui.formatCurrency(order.discount)}</span>
                                    </div>` : ''}
                                </div>` : ''}
                            </section>
                            
                            ${order.notes ? `
                            <!-- SEÇÃO DE OBSERVAÇÕES -->
                            <section class="card">
                                <h3 class="card-title">Observações</h3>
                                <p class="summary-line paid">${order.notes}</p>
                            </section>` : ''}
                            
                            ${order.status === 'cancelled' && order.cancellationReason ? `
                            <!-- SEÇÃO DE MOTIVO DO CANCELAMENTO -->
                            <section class="card">
                                <h3 class="card-title">Motivo do Cancelamento</h3>
                                <p class="summary-line" style="color: #A94442; font-weight: bold; background-color: #F2DEDE; padding: 10px; border-radius: 4px;">${order.cancellationReason}</p>
                            </section>` : ''}
                            
                            ${order.imageUrl ? `
                            <!-- SEÇÃO DE IMAGEM -->
                            <section class="card">
                                <h3 class="card-title">Imagem de Referência</h3>
                                <div style="text-align: center;">
                                    <img src="${order.imageUrl}" alt="Imagem do pedido" style="max-width: 100%; border-radius: 8px;">
                                </div>
                            </section>` : ''}
                        </div>
                        
                        <!-- RESUMO FINANCEIRO -->
                        <aside class="financial-summary card">
                            <h3 class="card-title">Resumo Financeiro</h3>
                            <div class="summary-line">
                                <span>Subtotal</span>
                                <span>${ui.formatCurrency(subtotal)}</span>
                            </div>
                            ${order.extraServices ? `
                            <div class="summary-line">
                                <span>Serviços Extras</span>
                                <span>${ui.formatCurrency(order.extraServices)}</span>
                            </div>` : ''}
                            ${order.deliveryCost ? `
                            <div class="summary-line">
                                <span>Entrega</span>
                                <span>${ui.formatCurrency(order.deliveryCost)}</span>
                            </div>` : ''}
                            ${order.discount ? `
                            <div class="summary-line discount">
                                <span>Desconto</span>
                                <span>- ${ui.formatCurrency(order.discount)}</span>
                            </div>` : ''}
                            <hr class="summary-divider">
                            <div class="summary-line total">
                                <span>Total</span>
                                <span>${ui.formatCurrency(finalTotal)}</span>
                            </div>
                            <div class="summary-line paid">
                                <span>Total Pago</span>
                                <span>${ui.formatCurrency(paidValue)}</span>
                            </div>
                            <div class="summary-line balance">
                                <span>Saldo Devedor</span>
                                <span>${ui.formatCurrency(balance)}</span>
                            </div>
                        </aside>
                    </div>
                </main>
                
                <!-- RODAPÉ PARA ASSINATURAS -->
                <footer class="footer">
                    <div class="signature-line">
                        <p>_________________________</p>
                        <p>Assinatura do Cliente</p>
                    </div>
                    <div class="signature-line">
                        <p>_________________________</p>
                        <p>Assinatura da Empresa</p>
                    </div>
                </footer>
            </div>
        `;
        
        targetContainer.innerHTML = html;
        
        // Adiciona event listeners
        this.setupPrintCheckboxListeners(order.id);
        this.setupFinishingCheckboxListeners(order.id);
        
        const backButton = document.getElementById('back-to-orders');
        if (backButton) {
            backButton.addEventListener('click', () => this.showListView());
        }
        
        const deleteButton = document.querySelector('.delete-order-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.confirmDeleteOrder(orderId);
            });
        }
        
        // Iniciar observador de mutações no DOM
        this.startDomMutationObserver();
    }
    
    // Renderiza os detalhes de um item de pedido em formato compacto
    renderOrderItemDetailsCompact(item, index) {
        // Extrair o nome do produto corretamente, lidando com o caso em que item.product é um objeto
        let productName = 'Item sem nome';
        if (item.product) {
            if (typeof item.product === 'string') {
                productName = item.product;
            } else if (typeof item.product === 'object' && item.product.name) {
                productName = item.product.name;
            }
        } else if (item.name) {
            productName = item.name;
        }
        
        return `
            <div class="order-item">
                <div class="item-header">
                    <div class="item-name">#${index}: ${productName}</div>
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
        const now = new Date();
        
        // Trata a data de entrega
        let deliveryDate = null;
        if (this.formData.deliveryDate) {
            // Se a data de entrega é um objeto Date, usa diretamente
            if (this.formData.deliveryDate instanceof Date) {
                deliveryDate = this.formData.deliveryDate;
            }
            // Se a data de entrega é uma string, converte para Date
            else if (typeof this.formData.deliveryDate === 'string') {
                deliveryDate = new Date(this.formData.deliveryDate);
            }
            // Se a data de entrega é um timestamp do Firestore, converte para Date
            else if (this.formData.deliveryDate.toDate) {
                deliveryDate = this.formData.deliveryDate.toDate();
            }
        }
        
        // Prepara URL da imagem
        let imageUrl = '';
        if (this.formData.imageUrl) {
            // Se a imageUrl começa com "http", é uma URL válida
            if (this.formData.imageUrl.startsWith('http')) {
                imageUrl = this.formData.imageUrl;
            }
            // Se começa com "data:", é uma imagem em base64
            else if (this.formData.imageUrl.startsWith('data:')) {
                // Mantém a imagem em base64
                imageUrl = this.formData.imageUrl;
            }
        }
        
        const orderData = {
            clientId: this.formData.client.id,
            clientName: this.formData.client.name,
            clientDocument: this.formData.client.document || '',
            clientPhone: this.formData.client.phone || '',
            clientEmail: this.formData.client.email || '',
            clientAddress: this.formData.client.address || '',
            orderNumber: this.formData.orderNumber || null,
            items: this.formData.items.map(item => {
                // Garantir que o nome do produto seja extraído corretamente
                let productName = 'Produto';
                if (item.product) {
                    if (typeof item.product === 'string') {
                        productName = item.product;
                    } else if (typeof item.product === 'object' && item.product.name) {
                        productName = item.product.name;
                    }
                }
                
                return {
                    product: productName,
                    productId: item.product && item.product.id ? item.product.id : '',
                    quantity: item.quantity || 1,
                    price: item.unitPrice || 0,
                    total: item.total || 0,
                    description: item.description || '',
                    width: item.width || null,
                    height: item.height || null,
                    area: item.area || null,
                    // Preservar os status de marcação, se existirem
                    printChecked: item.printChecked || false,
                    printCheckedBy: item.printCheckedBy || null,
                    printCheckedAt: item.printCheckedAt || null,
                    finishingChecked: item.finishingChecked || false,
                    finishingCheckedBy: item.finishingCheckedBy || null,
                    finishingCheckedAt: item.finishingCheckedAt || null
                };
            }),
            payments: this.formData.payments.map(payment => {
                // Recupera o valor considerando ambos os campos
                const paymentAmount = payment.amount !== undefined ? payment.amount : (payment.value || 0);
                return {
                    method: payment.method || 'Dinheiro',
                    amount: paymentAmount,
                    value: paymentAmount, // Para compatibilidade
                    date: payment.date || now,
                    reference: payment.reference || ''
                };
            }),
            status: this.formData.status || 'pending',
            sellerId: this.formData.sellerId || '',
            sellerName: this.formData.sellerName || 'Sistema',
            createdAt: isForm && this.formData.createdAt ? this.formData.createdAt : now,
            updatedAt: now,
            deliveryDate: deliveryDate,
            deliveryType: this.formData.deliveryType || 'pickup',
            deliveryAddress: this.formData.deliveryAddress || '',
            deliveryCost: this.formData.deliveryCost || null,
            notes: this.formData.notes || '',
            imageUrl: imageUrl,
            imageTitle: this.formData.imageTitle || '',
            extraServices: this.formData.extraServices || 0,
            discount: this.formData.discount || 0
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
            window.ui.showLoading('Salvando pedido...');
            
            // Preparar dados do pedido
            const orderData = this.prepareOrderData(isForm);
            
            // Processar imagem grande se necessário
            if (orderData.imageUrl && typeof orderData.imageUrl === 'string') {
                // Limitar o tamanho da imagem ou remover se for muito grande
                if (orderData.imageUrl.length > 1000000) { // Mais de ~1MB em base64
                    console.warn('Imagem muito grande, tentando redimensionar');
                    orderData.imageUrl = await this.processImageForUpload(orderData.imageUrl);
                    
                    // Se mesmo após o processamento a imagem continuar grande, remover
                    if (orderData.imageUrl && orderData.imageUrl.length > 1000000) {
                        console.warn('Imagem ainda muito grande após processamento, removendo');
                        orderData.imageUrl = '';
                        window.ui.showNotification('A imagem era muito grande e foi removida do pedido.', 'warning');
                    }
                }
            }
            
            // Garantir que todas as datas sejam objetos Date válidos
            if (orderData.deliveryDate && !(orderData.deliveryDate instanceof Date)) {
                try {
                    orderData.deliveryDate = new Date(orderData.deliveryDate);
                } catch (e) {
                    console.warn('Data de entrega inválida, removendo', e);
                    orderData.deliveryDate = null;
                }
            }
            
            // Garantir que payments.date sejam Date válidos
            if (orderData.payments && Array.isArray(orderData.payments)) {
                orderData.payments = orderData.payments.map(payment => {
                    if (payment.date && !(payment.date instanceof Date)) {
                        try {
                            payment.date = new Date(payment.date);
                        } catch (e) {
                            payment.date = new Date(); // Data atual como fallback
                        }
                    }
                    return payment;
                });
            }
            
            // Garantir que createdAt e updatedAt sejam Date válidos
            orderData.createdAt = orderData.createdAt instanceof Date ? orderData.createdAt : new Date();
            orderData.updatedAt = new Date();
            
            // Obter informações do usuário atual do sistema de autenticação
            let userName = 'Usuário desconhecido';
            
            if (window.auth && window.auth.currentUser) {
                userName = window.auth.currentUser.name || 'Usuário desconhecido';
            }
            
            // Salvar no Firebase
            let docRef;
            
            if (this.currentOrderId && this.currentView === 'edit') {
                // Se estiver editando, atualiza o documento existente
                docRef = db.collection('orders').doc(this.currentOrderId);
                
                // Remover campos undefined ou null para evitar erros no Firestore
                const cleanedData = {};
                Object.keys(orderData).forEach(key => {
                    if (orderData[key] !== undefined && orderData[key] !== null) {
                        cleanedData[key] = orderData[key];
                    }
                });
                
                await docRef.update({
                    ...cleanedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    statusUpdatedBy: userName,
                    statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Se for um novo pedido, cria um novo documento
                // Remover campos undefined ou null para evitar erros no Firestore
                const cleanedData = {};
                Object.keys(orderData).forEach(key => {
                    if (orderData[key] !== undefined && orderData[key] !== null) {
                        cleanedData[key] = orderData[key];
                    }
                });
                
                docRef = await db.collection('orders').add({
                    ...cleanedData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    statusUpdatedBy: userName,
                    statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            window.ui.hideLoading();
            window.ui.showNotification('Pedido salvo com sucesso!', 'success');
            return docRef;
        } catch (error) {
            window.ui.hideLoading();
            console.error('Erro ao salvar pedido:', error);
            window.ui.showNotification('Erro ao salvar pedido. Por favor, tente novamente.', 'error');
            throw error;
        }
    }
    
    // Método para salvar os valores dos filtros no localStorage
    saveFilterValues() {
        console.log('Salvando valores dos filtros no localStorage');
        
        try {
            const filters = {
                searchTerm: document.getElementById('order-search')?.value || '',
                statusFilter: document.getElementById('status-filter')?.value || '',
                dateFilter: document.getElementById('date-filter')?.value || 'all',
                orderNumberFilter: document.getElementById('order-number-filter')?.value || '',
                clientNameFilter: document.getElementById('client-name-filter')?.value || '',
                materialTypeFilter: document.getElementById('material-type-filter')?.value || '',
                productTypeFilter: document.getElementById('product-type-filter')?.value || '',
                sellerFilter: document.getElementById('seller-filter')?.value || '',
                deliveryDateStart: document.getElementById('delivery-date-start')?.value || '',
                deliveryDateEnd: document.getElementById('delivery-date-end')?.value || ''
            };
            
            localStorage.setItem('ordersFilters', JSON.stringify(filters));
            localStorage.setItem('ordersSortBy', document.getElementById('sort-orders')?.value || 'date-desc');
            
            console.log('Filtros salvos com sucesso:', filters);
        } catch (error) {
            console.error('Erro ao salvar filtros:', error);
        }
    }
    
    // Método para restaurar os valores dos filtros do localStorage
    restoreFilterValues() {
        console.log('-------------------------------------------------------');
        console.log('INÍCIO: Restaurando valores dos filtros do localStorage');
        
        try {
            // Debug: Verificar se window.auth e window.auth.currentUser existem
            console.log('Auth disponível:', !!window.auth);
            console.log('Usuário autenticado:', !!window.auth?.currentUser);
            if (window.auth?.currentUser) {
                console.log('Usuário atual:', window.auth.currentUser.name);
                console.log('Cargo/Role:', window.auth.currentUser.role);
            }
            
            // Verifica se o usuário é do setor de impressão ou acabamento para aplicar filtros específicos
            const isProductionUser = this.checkIsPrinterUser();
            const isFinishingUser = this.checkIsFinishingUser();
            
            console.log('É usuário de impressão?', isProductionUser);
            console.log('É usuário de acabamento?', isFinishingUser);
            
            if (isProductionUser) {
                console.log('Usuário do setor de impressão detectado. Aplicando filtros específicos.');
                this.applyPrinterFilters();
                console.log('FIM: Filtros de impressão aplicados');
                console.log('-------------------------------------------------------');
                return; // Não restaura os filtros anteriores
            }
            
            if (isFinishingUser) {
                console.log('Usuário do setor de acabamento detectado. Aplicando filtros específicos.');
                this.applyFinishingFilters();
                console.log('FIM: Filtros de acabamento aplicados');
                console.log('-------------------------------------------------------');
                return; // Não restaura os filtros anteriores
            }
            
            // Recupera os filtros salvos
            const savedFilters = localStorage.getItem('ordersFilters');
            if (savedFilters) {
                const filters = JSON.parse(savedFilters);
                console.log('Filtros encontrados no localStorage:', filters);
                
                // Restaura cada filtro
                if (filters.searchTerm) {
                    const searchInput = document.getElementById('order-search');
                    if (searchInput) searchInput.value = filters.searchTerm;
                }
                
                if (filters.statusFilter) {
                    const statusFilter = document.getElementById('status-filter');
                    if (statusFilter) statusFilter.value = filters.statusFilter;
                }
                
                if (filters.dateFilter) {
                    const dateFilter = document.getElementById('date-filter');
                    if (dateFilter) dateFilter.value = filters.dateFilter;
                }
                
                if (filters.orderNumberFilter) {
                    const orderNumberFilter = document.getElementById('order-number-filter');
                    if (orderNumberFilter) orderNumberFilter.value = filters.orderNumberFilter;
                }
                
                if (filters.clientNameFilter) {
                    const clientNameFilter = document.getElementById('client-name-filter');
                    if (clientNameFilter) clientNameFilter.value = filters.clientNameFilter;
                }
                
                if (filters.materialTypeFilter) {
                    const materialTypeFilter = document.getElementById('material-type-filter');
                    if (materialTypeFilter) materialTypeFilter.value = filters.materialTypeFilter;
                }
                
                if (filters.productTypeFilter) {
                    const productTypeFilter = document.getElementById('product-type-filter');
                    if (productTypeFilter) productTypeFilter.value = filters.productTypeFilter;
                }
                
                if (filters.sellerFilter) {
                    const sellerFilter = document.getElementById('seller-filter');
                    if (sellerFilter) sellerFilter.value = filters.sellerFilter;
                }
                
                if (filters.deliveryDateStart) {
                    const deliveryDateStart = document.getElementById('delivery-date-start');
                    if (deliveryDateStart) deliveryDateStart.value = filters.deliveryDateStart;
                }
                
                if (filters.deliveryDateEnd) {
                    const deliveryDateEnd = document.getElementById('delivery-date-end');
                    if (deliveryDateEnd) deliveryDateEnd.value = filters.deliveryDateEnd;
                }
            } else {
                console.log('Nenhum filtro encontrado no localStorage');
            }
            
            // Restaura a ordenação
            const sortBy = localStorage.getItem('ordersSortBy');
            if (sortBy) {
                const sortSelect = document.getElementById('sort-orders');
                if (sortSelect) sortSelect.value = sortBy;
            }
            
            console.log('FIM: Filtros padrões restaurados do localStorage');
            console.log('-------------------------------------------------------');
        } catch (error) {
            console.error('Erro ao restaurar filtros:', error);
            console.log('-------------------------------------------------------');
        }
    }
    
    // As funções de verificação de usuário e aplicação de filtros específicos foram removidas
    
    // Adiciona uma nova função para depurar o problema com os filtros dos setores
    debugOrderStatuses() {
        console.log('-------------------------------------------------------');
        console.log('DEPURAÇÃO DE STATUS DE PEDIDOS');
        console.log('Verificando IDs e nomes dos status de pedidos:');
        
        if (!SYSTEM_CONFIG || !SYSTEM_CONFIG.orderStatus) {
            console.log('ERRO: SYSTEM_CONFIG ou SYSTEM_CONFIG.orderStatus não definido');
            console.log('-------------------------------------------------------');
            return;
        }
        
        // Listar todos os status disponíveis
        SYSTEM_CONFIG.orderStatus.forEach((status, index) => {
            console.log(`${index + 1}. ID: "${status.id}", Nome: "${status.name}", Cor: "${status.color}"`);
        });
        
        // Verificar especificamente os status de impressão e acabamento
        const printingStatus = SYSTEM_CONFIG.orderStatus.find(s => s.id === 'printing');
        const finishingStatus = SYSTEM_CONFIG.orderStatus.find(s => s.id === 'finishing');
        
        console.log('Status de impressão encontrado:', !!printingStatus);
        if (printingStatus) {
            console.log('Detalhes do status de impressão:', printingStatus);
        } else {
            console.log('Status disponíveis que podem ser de impressão:');
            SYSTEM_CONFIG.orderStatus
                .filter(s => s.name.toLowerCase().includes('impress'))
                .forEach(s => console.log(`- ID: "${s.id}", Nome: "${s.name}"`));
        }
        
        console.log('Status de acabamento encontrado:', !!finishingStatus);
        if (finishingStatus) {
            console.log('Detalhes do status de acabamento:', finishingStatus);
        } else {
            console.log('Status disponíveis que podem ser de acabamento:');
            SYSTEM_CONFIG.orderStatus
                .filter(s => s.name.toLowerCase().includes('acaba'))
                .forEach(s => console.log(`- ID: "${s.id}", Nome: "${s.name}"`));
        }
        
        console.log('-------------------------------------------------------');
    }
    
    // Verifica e registra informações sobre o usuário atual e sua role
    checkUserRole() {
        console.log('-------------------------------------------------------');
        console.log('VERIFICAÇÃO DE ROLE DO USUÁRIO');
        
        try {
            // Verifica se o auth está disponível
            if (!window.auth) {
                console.log('ERRO: window.auth não está disponível!');
                console.log('-------------------------------------------------------');
                return null;
            }
            
            // Verifica se há um usuário autenticado
            if (!window.auth.currentUser) {
                console.log('ERRO: Nenhum usuário autenticado encontrado!');
                console.log('-------------------------------------------------------');
                return null;
            }
            
            // Registra informações detalhadas sobre o usuário
            const user = window.auth.currentUser;
            console.log('USUÁRIO ATUAL:', {
                id: user.id,
                nome: user.name,
                role: user.role,
                email: user.email || 'N/A',
                permissões: user.permissions || 'N/A'
            });
            
            // Verifica se a role existe no sistema
            if (!SYSTEM_CONFIG.roles[user.role]) {
                console.log('ALERTA: Role do usuário não está definida em SYSTEM_CONFIG.roles!');
            } else {
                console.log('Informações da role no sistema:', SYSTEM_CONFIG.roles[user.role]);
            }
            
            console.log('-------------------------------------------------------');
            return user.role;
        } catch (error) {
            console.error('Erro ao verificar role do usuário:', error);
            console.log('-------------------------------------------------------');
            return null;
        }
    }

    // Funções de marcação de itens como impressos e acabados foram removidas

    // Formata a data e hora para exibição
    formatStatusTimestamp(timestamp) {
        if (!timestamp) return '-';
        
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Adiciona um observador para garantir que os itens permaneçam visíveis
    startItemVisibilityObserver(orderId) {
        console.log('Iniciando observador de visibilidade para itens do pedido:', orderId);
        
        // Pare qualquer observador anterior
        if (this.visibilityObserver) {
            console.log('Parando observador de visibilidade anterior');
            clearInterval(this.visibilityObserver);
            this.visibilityObserver = null;
        }
        
        // Forçar a exibição dos itens inicialmente
        const items = document.querySelectorAll('.order-item');
        if (items.length > 0) {
            items.forEach(item => {
                item.style.display = 'block';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
            });
        }
        
        // Não usamos mais o intervalo contínuo para melhorar a performance
        // Em vez disso, verificamos uma única vez
    }

    // Iniciar o observador de mutação DOM para monitorar modificações no DOM
    startDomMutationObserver() {
        // Verifica se já existe um observador
        if (this.domMutationObserver) {
            this.domMutationObserver.disconnect();
            this.domMutationObserver = null;
        }
        
        // Vamos simplificar esta função para evitar loops infinitos
        // Em vez de usar MutationObserver, vamos apenas garantir que os itens estejam visíveis inicialmente
        const orderItemsSection = document.getElementById('order-items-section');
        if (orderItemsSection) {
            const items = orderItemsSection.querySelectorAll('.order-item');
            items.forEach(item => {
                item.style.display = 'block';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
            });
        }
    }
    
    // Configura os listeners para os checkboxes de impressão
    setupPrintCheckboxListeners(orderId) {
        try {
            const checkboxes = document.querySelectorAll(`.print-checkbox[data-order-id="${orderId}"]`);
            console.log(`Configurando ${checkboxes.length} checkboxes para o pedido ${orderId}`);
            
            // Obter o usuário atual para verificar permissões
            const currentUser = window.auth.getCurrentUser();
            const userRole = currentUser ? currentUser.role : null;
            
            // Verifica se o usuário tem permissão para marcar os checkboxes (apenas admin ou impressor)
            const canMarkCheckbox = userRole === 'admin' || userRole === 'impressor';
            
            // Remover listeners antigos primeiro para evitar duplicação
            checkboxes.forEach(checkbox => {
                const clonedCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(clonedCheckbox, checkbox);
            });
            
            // Buscar novamente os checkboxes após a clonagem
            const refreshedCheckboxes = document.querySelectorAll(`.print-checkbox[data-order-id="${orderId}"]`);
            
            refreshedCheckboxes.forEach(checkbox => {
                // Desabilitar checkbox se o usuário não tiver permissão
                if (!canMarkCheckbox) {
                    checkbox.disabled = true;
                    checkbox.title = "Apenas impressores e administradores podem marcar itens";
                }
                
                checkbox.addEventListener('change', async (e) => {
                    // Verificar novamente a permissão (segurança adicional)
                    if (!canMarkCheckbox) {
                        e.preventDefault();
                        ui.showNotification('Apenas impressores e administradores podem marcar itens.', 'warning');
                        e.target.checked = !e.target.checked; // Reverte a alteração
                        return;
                    }
                    
                    const checked = e.target.checked;
                    const itemIndex = parseInt(e.target.dataset.itemIndex);
                    const orderId = e.target.dataset.orderId;
                    
                    // Desabilita o checkbox durante o processamento
                    e.target.disabled = true;
                    
                    try {
                        // Busca o pedido atual
                        const orderRef = db.collection('orders').doc(orderId);
                        const orderDoc = await orderRef.get();
                        
                        if (!orderDoc.exists) {
                            console.error('Pedido não encontrado:', orderId);
                            e.target.disabled = false;
                            return;
                        }
                        
                        const orderData = orderDoc.data();
                        const items = orderData.items || [];
                        
                        // Verifica se o índice é válido
                        if (itemIndex >= items.length || itemIndex < 0) {
                            console.error('Índice de item inválido:', itemIndex);
                            e.target.disabled = false;
                            return;
                        }
                        
                        // Obtém informações do usuário atual
                        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
                        
                        // Atualiza o item no array
                        items[itemIndex] = {
                            ...items[itemIndex],
                            printChecked: checked,
                            printCheckedBy: checked ? userName : null,
                            printCheckedAt: checked ? new Date() : null
                        };
                        
                        // Atualiza o documento no Firestore
                        await orderRef.update({
                            items: items,
                            lastUpdate: new Date()
                        });
                        
                        // Atualiza o tooltip com as informações de quem marcou
                        const tooltip = document.getElementById(`info-tooltip-${orderId}-${itemIndex}`);
                        if (tooltip) {
                            if (checked) {
                                tooltip.innerHTML = `Impresso por: ${userName}<br>Em: ${this.formatDateTime(new Date())}`;
                            } else {
                                tooltip.innerHTML = 'Aguardando impressão';
                            }
                        }
                        
                        // Mostra notificação de sucesso
                        ui.showNotification(`Item ${checked ? 'marcado' : 'desmarcado'} com sucesso!`, 'success');
                        
                    } catch (error) {
                        console.error('Erro ao atualizar status de impressão:', error);
                        ui.showNotification('Erro ao atualizar status de impressão.', 'error');
                        
                        // Reverte o estado do checkbox em caso de erro
                        e.target.checked = !checked;
                    }
                    
                    // Reabilita o checkbox após o processamento se o usuário tiver permissão
                    if (canMarkCheckbox) {
                        e.target.disabled = false;
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao configurar checkboxes de impressão:', error);
        }
    }

    // Configura os listeners para os checkboxes de acabamento
    setupFinishingCheckboxListeners(orderId) {
        try {
            const checkboxes = document.querySelectorAll(`.finishing-checkbox[data-order-id="${orderId}"]`);
            console.log(`Configurando ${checkboxes.length} checkboxes de acabamento para o pedido ${orderId}`);
            
            // Obter o usuário atual para verificar permissões
            const currentUser = window.auth.getCurrentUser();
            const userRole = currentUser ? currentUser.role : null;
            
            // Verifica se o usuário tem permissão para marcar os checkboxes (apenas admin ou acabamento)
            const canMarkCheckbox = userRole === 'admin' || userRole === 'acabamento';
            
            // Remover listeners antigos primeiro para evitar duplicação
            checkboxes.forEach(checkbox => {
                const clonedCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(clonedCheckbox, checkbox);
            });
            
            // Buscar novamente os checkboxes após a clonagem
            const refreshedCheckboxes = document.querySelectorAll(`.finishing-checkbox[data-order-id="${orderId}"]`);
            
            refreshedCheckboxes.forEach(checkbox => {
                // Desabilitar checkbox se o usuário não tiver permissão
                if (!canMarkCheckbox) {
                    checkbox.disabled = true;
                    checkbox.title = "Apenas funcionários do acabamento e administradores podem marcar itens";
                }
                
                checkbox.addEventListener('change', async (e) => {
                    // Verificar novamente a permissão (segurança adicional)
                    if (!canMarkCheckbox) {
                        e.preventDefault();
                        ui.showNotification('Apenas funcionários do acabamento e administradores podem marcar itens.', 'warning');
                        e.target.checked = !e.target.checked; // Reverte a alteração
                        return;
                    }
                    
                    const checked = e.target.checked;
                    const itemIndex = parseInt(e.target.dataset.itemIndex);
                    const orderId = e.target.dataset.orderId;
                    
                    // Desabilita o checkbox durante o processamento
                    e.target.disabled = true;
                    
                    try {
                        // Busca o pedido atual
                        const orderRef = db.collection('orders').doc(orderId);
                        const orderDoc = await orderRef.get();
                        
                        if (!orderDoc.exists) {
                            console.error('Pedido não encontrado:', orderId);
                            e.target.disabled = false;
                            return;
                        }
                        
                        const orderData = orderDoc.data();
                        const items = orderData.items || [];
                        
                        // Verifica se o índice é válido
                        if (itemIndex >= items.length || itemIndex < 0) {
                            console.error('Índice de item inválido:', itemIndex);
                            e.target.disabled = false;
                            return;
                        }
                        
                        // Obtém informações do usuário atual
                        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
                        
                        // Atualiza o item no array
                        items[itemIndex] = {
                            ...items[itemIndex],
                            finishingChecked: checked,
                            finishingCheckedBy: checked ? userName : null,
                            finishingCheckedAt: checked ? new Date() : null
                        };
                        
                        // Atualiza o documento no Firestore
                        await orderRef.update({
                            items: items,
                            lastUpdate: new Date()
                        });
                        
                        // Atualiza o tooltip com as informações de quem marcou
                        const tooltip = document.getElementById(`finishing-tooltip-${orderId}-${itemIndex}`);
                        if (tooltip) {
                            if (checked) {
                                tooltip.innerHTML = `Acabado por: ${userName}<br>Em: ${this.formatDateTime(new Date())}`;
                            } else {
                                tooltip.innerHTML = 'Aguardando acabamento';
                            }
                        }
                        
                        // Mostra notificação de sucesso
                        ui.showNotification(`Item ${checked ? 'marcado' : 'desmarcado'} como finalizado!`, 'success');
                        
                    } catch (error) {
                        console.error('Erro ao atualizar status de acabamento:', error);
                        ui.showNotification('Erro ao atualizar status de acabamento.', 'error');
                        
                        // Reverte o estado do checkbox em caso de erro
                        e.target.checked = !checked;
                    }
                    
                    // Reabilita o checkbox após o processamento se o usuário tiver permissão
                    if (canMarkCheckbox) {
                        e.target.disabled = false;
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao configurar checkboxes de acabamento:', error);
        }
    }

    // Verifica se o usuário logado pertence ao setor de impressão
    checkIsPrinterUser() {
        const user = window.auth.currentUser;
        // Verifica se a role é 'printer' ou se tem permissão específica
        return user && (user.role === 'printer' || window.auth.hasPermission('view_printer_queue'));
    }

    // Verifica se o usuário logado pertence ao setor de acabamento
    checkIsFinishingUser() {
        const user = window.auth.currentUser;
        // Verifica se a role é 'finishing' ou se tem permissão específica
        return user && (user.role === 'finishing' || window.auth.hasPermission('view_finishing_queue'));
    }

    // Aplica os filtros padrão para o setor de impressão
    applyPrinterFilters() {
        // Limpa filtros existentes
        this.clearAllFilters(false); // false para não aplicar filtros depois

        // Aplica o filtro para status "Aguardando Impressão" e "Em Impressão"
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            // Supondo que você tenha um grupo de status para impressão
            statusFilter.value = 'printing_group'; // Ou o valor que agrupa os status relevantes
        }
        
        // Aplica os filtros na tabela
        setTimeout(() => this.applyFilters(), 100);
    }

    // Aplica os filtros padrão para o setor de acabamento
    applyFinishingFilters() {
        // Limpa filtros existentes
        this.clearAllFilters(false); // false para não aplicar filtros depois

        // Aplica o filtro para status "Aguardando Acabamento" e "Em Acabamento"
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = 'finishing_group'; // Ou o valor que agrupa os status relevantes
        }
        
        // Aplica os filtros na tabela
        setTimeout(() => this.applyFilters(), 100);
    }
}

// Registra o componente globalmente
window.OrdersComponent = OrdersComponent;