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

    // Obtém as permissões do usuário
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
                            // Para qualquer outro papel, mantém as permissões básicas
                            console.log('Papel não reconhecido, mantendo permissões básicas');
                    }
                } else {
                    console.log('Nenhum usuário encontrado no localStorage, mantendo permissões básicas');
                }
            } catch (error) {
                console.error('Erro ao obter usuário do localStorage:', error);
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
                        // Para qualquer outro papel, mantém as permissões básicas
                        console.log('Papel não reconhecido, mantendo permissões básicas');
                }
            } catch (error) {
                console.error('Erro ao obter permissões do usuário:', error);
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
                    const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
                    const userRole = userConfig.role || 'viewer';
                    
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
                                
                                // Mostra o status com o nome de quem registrou (exceto para vendedores)
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
                                    
                                    // Se for vendedor, mostra apenas que foi registrado
                                    if (userRole === 'seller') {
                                        statusEl.innerHTML = `<i class="fas fa-check"></i> Impressão Registrada<br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    } else {
                                        statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${itemEvents.print.userName || 'Usuário'}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    }
                                    statusEl.style.display = "block";
                                    statusEl.style.color = "#3498db";
                                }
                                
                                const tooltipEl = printButton.parentElement.querySelector('.tooltip');
                                if (tooltipEl) {
                                    // Se for vendedor, mostra apenas que foi registrado
                                    if (userRole === 'seller') {
                                        tooltipEl.textContent = `Impressão registrada em ${formattedDate}`;
                                    } else {
                                        this.updateTooltip(tooltipEl, orderId, itemId, 'print', itemEvents.print);
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
                                    
                                    // Se for vendedor, mostra apenas que foi registrado
                                    if (userRole === 'seller') {
                                        statusEl.innerHTML = `<i class="fas fa-check"></i> Acabamento Registrado<br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    } else {
                                        statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${itemEvents.finish.userName || 'Usuário'}</strong><br><i class="fas fa-clock"></i> ${formattedDate}`;
                                    }
                                    statusEl.style.display = "block";
                                    statusEl.style.color = "#2ecc71";
                                }
                                
                                const tooltipEl = finishButton.parentElement.querySelector('.tooltip');
                                if (tooltipEl) {
                                    // Se for vendedor, mostra apenas que foi registrado
                                    if (userRole === 'seller') {
                                        tooltipEl.textContent = `Acabamento registrado em ${formattedDate}`;
                                    } else {
                                        this.updateTooltip(tooltipEl, orderId, itemId, 'finish', itemEvents.finish);
                                    }
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
            
            // Obtém o papel do usuário atual
            const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
            const userRole = userConfig.role || 'viewer';
            
            // Se for vendedor, mostra apenas que foi registrado
            if (userRole === 'seller') {
                tooltipEl.textContent = `${eventType === 'print' ? 'Impressão' : 'Acabamento'} registrado em ${formattedDate}`;
            } else {
                tooltipEl.textContent = `${eventType === 'print' ? 'Impressão' : 'Acabamento'} realizado por ${eventData.userName} em ${formattedDate}`;
            }
        } else {
            tooltipEl.textContent = `Sem registro de ${eventType === 'print' ? 'impressão' : 'acabamento'}`;
        }
    }

    // Função para registrar um evento de produção
    async registerProductionEvent(orderId, itemId, eventType) {
        try {
            // Obtém o usuário atual
            const currentUser = firebase.auth().currentUser;
            const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
            const userRole = userConfig.role || 'viewer';
            
            // Obtém os dados do usuário que está registrando
            const userData = {
                userId: currentUser.uid,
                userName: userConfig.name || 'Usuário',
                date: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Registra o evento no Firestore
            const orderRef = firebase.firestore().collection('orders').doc(orderId);
            await orderRef.update({
                [`productionEvents.${itemId}.${eventType}`]: userData,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualiza a interface
            const button = document.getElementById(`${eventType}-btn-${itemId}`);
            if (button) {
                button.disabled = true;
                button.style.opacity = "0.6";
                button.innerHTML = `<i class="fas fa-check"></i> ${eventType === 'print' ? 'Impressão' : 'Acabamento'} Registrado`;
                
                // Mostra o status com o nome de quem registrou
                const statusEl = document.getElementById(`${eventType}-status-${itemId}`);
                if (statusEl) {
                    // Se for vendedor, mostra apenas que foi registrado
                    if (userRole === 'seller') {
                        statusEl.innerHTML = `<i class="fas fa-check"></i> ${eventType === 'print' ? 'Impressão' : 'Acabamento'} Registrado<br><i class="fas fa-clock"></i> ${new Date().toLocaleString('pt-BR')}`;
                    } else {
                        statusEl.innerHTML = `<i class="fas fa-user"></i> <strong>${userData.userName}</strong><br><i class="fas fa-clock"></i> ${new Date().toLocaleString('pt-BR')}`;
                    }
                    statusEl.style.display = "block";
                    statusEl.style.color = eventType === 'print' ? "#3498db" : "#2ecc71";
                }
                
                const tooltipEl = button.parentElement.querySelector('.tooltip');
                if (tooltipEl) {
                    // Se for vendedor, mostra apenas que foi registrado
                    if (userRole === 'seller') {
                        tooltipEl.textContent = `${eventType === 'print' ? 'Impressão' : 'Acabamento'} registrado em ${new Date().toLocaleString('pt-BR')}`;
                    } else {
                        this.updateTooltip(tooltipEl, orderId, itemId, eventType, userData);
                    }
                }
            }
            
            // Mostra notificação de sucesso
            ui.showNotification(`${eventType === 'print' ? 'Impressão' : 'Acabamento'} registrado com sucesso!`, 'success');
        } catch (error) {
            console.error(`Erro ao registrar ${eventType}:`, error);
            ui.showNotification(`Erro ao registrar ${eventType === 'print' ? 'impressão' : 'acabamento'}. Por favor, tente novamente.`, 'error');
        }
    }
} 