// Componente do Dashboard
class DashboardComponent {
    constructor() {
        this.container = null;
        this.statsData = {
            dailyOrders: 0,
            pendingOrders: 0,
            monthlyOrders: 0,
            monthlyRevenue: 0,
            totalClients: 0
        };
        this.upcomingDeliveries = [];
        this.latestOrders = [];
        
        // Pontos de Controle - adicionado
        this.controlPoints = {
            orcamento: 0,
            aguardando: 0,
            impressao: 0,
            cortesEspeciais: 0,
            acabamento: 0,
            aplicacao: 0, 
            prontoNaEntrega: 0,
            entregue: 0
        };
        
        // Dados de demonstração para quando não há dados no Firestore
        this.demoData = {
            statsData: {
                dailyOrders: 12,
                pendingOrders: 28,
                monthlyRevenue: 15340,
                monthlyOrders: 45,
                totalClients: 187
            },
            upcomingDeliveries: [
                {
                    id: 'demo1',
                    orderNumber: '1234',
                    clientName: 'Empresa ABC',
                    deliveryDate: new Date(new Date().getTime() - 86400000), // Ontem (atrasado)
                    status: 'pending'
                },
                {
                    id: 'demo2',
                    orderNumber: '1235',
                    clientName: 'Empresa XYZ',
                    deliveryDate: new Date(new Date().getTime() + 86400000), // Amanhã
                    status: 'production'
                },
                {
                    id: 'demo3',
                    orderNumber: '1236',
                    clientName: 'Cliente Individual',
                    deliveryDate: new Date(new Date().getTime() + 86400000 * 5), // 5 dias
                    status: 'production'
                }
            ],
            latestOrders: [
                {
                    id: 'demo4',
                    orderNumber: '1239',
                    clientName: 'Empresa DEF',
                    totalValue: 750,
                    status: 'pending',
                    createdAt: new Date(new Date().getTime() - 86400000)
                },
                {
                    id: 'demo5',
                    orderNumber: '1238',
                    clientName: 'Cliente Individual',
                    totalValue: 120,
                    status: 'ready',
                    createdAt: new Date(new Date().getTime() - 86400000 * 2)
                },
                {
                    id: 'demo6',
                    orderNumber: '1237',
                    clientName: 'Empresa GHI',
                    totalValue: 1450,
                    status: 'production',
                    createdAt: new Date(new Date().getTime() - 86400000 * 2)
                }
            ],
            // Dados de demonstração para pontos de controle
            controlPoints: {
                orcamento: 5,
                aguardando: 8,
                impressao: 3,
                cortesEspeciais: 2,
                acabamento: 4,
                aplicacao: 3,
                prontoNaEntrega: 6,
                entregue: 10
            }
        };
        
        // Propriedades para paginação de entregas próximas
        this.lastUpcomingDeliveryDoc = null;
        this.hasMoreUpcomingDeliveries = true;
        this.loadingMoreDeliveries = false;
        this.upcomingDeliveriesLimit = 10;
        
        // Bind dos métodos
        this.loadMoreUpcomingDeliveries = this.loadMoreUpcomingDeliveries.bind(this);
        this.handleOrdersUpdate = this.handleOrdersUpdate.bind(this);
        this.handleClientsUpdate = this.handleClientsUpdate.bind(this);
        this.handleProductsUpdate = this.handleProductsUpdate.bind(this);
    }
    
    // Renderiza o dashboard na área de conteúdo
    async render(container) {
        this.container = container;
        
        // Exibe loader enquanto carrega dados
        this.container.innerHTML = `
            <div class="dashboard-loader">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando dados...</p>
            </div>
        `;
        
        // Renderiza imediatamente o esqueleto do dashboard
        this.renderDashboardSkeleton();
        
        // Retorna uma Promise para sinalizar quando o carregamento completo terminar
        return new Promise(async (resolve, reject) => {
            try {
                // Primeiro verificar se há dados em cache e usá-los para renderização rápida
                let renderizadoComCache = false;
                
                try {
                    // Verifica se há dados em cache
                    const hasStatsCache = localStorage.getItem('dashboardStats');
                    const hasOrdersCache = localStorage.getItem('latestOrders');
                    const hasControlPointsCache = localStorage.getItem('controlPoints');
                    
                    if (hasStatsCache && hasOrdersCache && hasControlPointsCache) {
                        console.log("Renderizando dashboard com dados do cache");
                        
                        // Carrega dados do cache
                        this.statsData = JSON.parse(localStorage.getItem('dashboardStats'));
                        this.latestOrders = JSON.parse(localStorage.getItem('latestOrders'));
                        this.controlPoints = JSON.parse(localStorage.getItem('controlPoints'));
                        
                        // Renderiza o dashboard com dados do cache
                        this.renderDashboard();
                        renderizadoComCache = true;
                        
                        // Configura listeners após renderizar com cache
                        this.setupClickableRows();
                    }
                } catch (cacheError) {
                    console.warn("Erro ao usar cache:", cacheError);
                }
                
                // Carrega dados críticos primeiro (estatísticas e pontos de controle)
                await this.loadStatistics();
                await this.loadControlPoints();
                
                // Carrega dados secundários em paralelo
                Promise.all([
                    this.loadLatestOrders(),
                    this.loadUpcomingDeliveries()
                ]).then(() => {
                    // Renderiza o dashboard completo após carregar todos os dados
                    this.renderDashboard();
                });
                
                // Se já renderizou com cache, não precisa renderizar novamente imediatamente
                if (!renderizadoComCache) {
                    // Renderiza o dashboard completo com o botão de Novo Pedido
                    this.renderDashboard();
                }
                
                // Configura listeners para atualização em tempo real
                this.setupRealtimeListeners();
                
                resolve();
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
                ui.showNotification("Erro ao carregar alguns dados do dashboard.", "warning");
                // Mesmo com erro, resolvemos a Promise para não bloquear a UI
                resolve();
            }
        });
    }
    
    // Renderiza o esqueleto do dashboard enquanto os dados são carregados
    renderDashboardSkeleton() {
        // Obtém o nome do usuário atual
        let userName = '';
        if (window.auth && window.auth.currentUser) {
            userName = window.auth.currentUser.name || '';
        }
        
        this.container.innerHTML = `
            <h1>Dashboard</h1>
            
            <div class="dashboard-stats">
                <div class="stat-card skeleton">
                    <div class="stat-icon"><i class="fas fa-spinner fa-spin"></i></div>
                    <div class="stat-title">Carregando...</div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card skeleton">
                    <div class="stat-icon"><i class="fas fa-spinner fa-spin"></i></div>
                    <div class="stat-title">Carregando...</div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card skeleton">
                    <div class="stat-icon"><i class="fas fa-spinner fa-spin"></i></div>
                    <div class="stat-title">Carregando...</div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card skeleton">
                    <div class="stat-icon"><i class="fas fa-spinner fa-spin"></i></div>
                    <div class="stat-title">Carregando...</div>
                    <div class="stat-value">...</div>
                </div>
            </div>
            
            <div class="table-card control-points-card">
                <h3><i class="fas fa-tasks"></i> Ponto de Controle</h3>
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Carregando pontos de controle...</p>
                </div>
            </div>
            
            <div class="dashboard-tables">
                <div class="table-card">
                    <h3><i class="fas fa-exclamation-circle"></i> Entregas Próximas</h3>
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Carregando entregas...</p>
                    </div>
                </div>
                
                <div class="table-card">
                    <h3><i class="fas fa-clipboard-list"></i> Últimos Pedidos</h3>
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Carregando pedidos...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Carrega dados de forma assíncrona e atualiza a UI gradualmente
    async loadDataAsync() {
        try {
            this.isLoading = true;
            
            // Mostra o toast de carregamento
            ui.showLoadingToast('Carregando dados do dashboard...');
            
            // Carrega estatísticas gerais e atualiza a seção correspondente
            this.loadStatistics().then(() => {
                const statsSection = document.querySelector('.dashboard-stats');
                if (statsSection) {
                    statsSection.innerHTML = this.renderStatsCards();
                }
                ui.updateLoadingToast('Estatísticas carregadas. Carregando entregas...');
            }).catch(error => {
                console.error("Erro ao carregar estatísticas:", error);
                // Usa dados de demonstração em caso de erro
                this.statsData = this.demoData.statsData;
                const statsSection = document.querySelector('.dashboard-stats');
                if (statsSection) {
                    statsSection.innerHTML = this.renderStatsCards();
                }
            });
            
            // Carrega dados de entregas próximas e atualiza a seção correspondente
            this.loadUpcomingDeliveries().then(() => {
                const deliveriesSection = document.querySelector('.table-card .fa-exclamation-circle').closest('.table-card');
                if (deliveriesSection) {
                    const header = deliveriesSection.querySelector('h3');
                    if (header) {
                        deliveriesSection.innerHTML = '';
                        deliveriesSection.appendChild(header);
                        deliveriesSection.insertAdjacentHTML('beforeend', this.renderUpcomingDeliveries());
                    }
                }
                ui.updateLoadingToast('Entregas carregadas. Carregando pedidos...');
            }).catch(error => {
                console.error("Erro ao carregar entregas próximas:", error);
                // Usa dados de demonstração em caso de erro
                this.upcomingDeliveries = this.demoData.upcomingDeliveries;
                const deliveriesSection = document.querySelector('.table-card .fa-exclamation-circle').closest('.table-card');
                if (deliveriesSection) {
                    const header = deliveriesSection.querySelector('h3');
                    if (header) {
                        deliveriesSection.innerHTML = '';
                        deliveriesSection.appendChild(header);
                        deliveriesSection.insertAdjacentHTML('beforeend', this.renderUpcomingDeliveries());
                    }
                }
            });
            
            // Carrega os últimos pedidos e atualiza a seção correspondente
            this.loadLatestOrders().then(() => {
                const clipboardListEl = document.querySelector('.table-card .fa-clipboard-list');
                // Verificar se o elemento existe antes de chamar closest()
                if (clipboardListEl) {
                    const ordersSection = clipboardListEl.closest('.table-card');
                    if (ordersSection) {
                        const header = ordersSection.querySelector('h3');
                        if (header) {
                            ordersSection.innerHTML = '';
                            ordersSection.appendChild(header);
                            ordersSection.insertAdjacentHTML('beforeend', this.renderLatestOrders());
                        }
                    }
                }
                ui.updateLoadingToast('Pedidos carregados. Carregando pontos de controle...');
            }).catch(error => {
                console.error("Erro ao carregar últimos pedidos:", error);
                // Usa dados de demonstração em caso de erro
                this.latestOrders = this.demoData.latestOrders;
                const clipboardListEl = document.querySelector('.table-card .fa-clipboard-list');
                if (clipboardListEl) {
                    const ordersSection = clipboardListEl.closest('.table-card');
                    if (ordersSection) {
                        const header = ordersSection.querySelector('h3');
                        if (header) {
                            ordersSection.innerHTML = '';
                            ordersSection.appendChild(header);
                            ordersSection.insertAdjacentHTML('beforeend', this.renderLatestOrders());
                        }
                    }
                }
            });
            
            // Carrega os pontos de controle e atualiza a seção correspondente
            this.loadControlPoints().then(() => {
                const controlPointsSection = document.querySelector('.control-points-card');
                if (controlPointsSection) {
                    const header = controlPointsSection.querySelector('h3');
                    if (header) {
                        controlPointsSection.innerHTML = '';
                        controlPointsSection.appendChild(header);
                        controlPointsSection.insertAdjacentHTML('beforeend', this.renderControlPoints());
                    }
                }
                
                // Oculta o toast quando todos os dados estiverem carregados
                ui.hideLoadingToast();
                ui.showNotification('Dashboard atualizado com sucesso!', 'success');
                
                // Configura listeners para atualização em tempo real
                this.setupRealtimeListeners();
                
                // Reativa os event listeners para os pedidos clicáveis
                this.setupClickableRows();
                
                this.isLoading = false;
            }).catch(error => {
                console.error("Erro ao carregar pontos de controle:", error);
                // Usa dados de demonstração em caso de erro
                this.controlPoints = this.demoData.controlPoints;
                const controlPointsSection = document.querySelector('.control-points-card');
                if (controlPointsSection) {
                    const header = controlPointsSection.querySelector('h3');
                    if (header) {
                        controlPointsSection.innerHTML = '';
                        controlPointsSection.appendChild(header);
                        controlPointsSection.insertAdjacentHTML('beforeend', this.renderControlPoints());
                    }
                }
                
                // Oculta o toast mesmo em caso de erro
                ui.hideLoadingToast();
                
                // Configura listeners para atualização em tempo real
                this.setupRealtimeListeners();
                
                // Reativa os event listeners para os pedidos clicáveis
                this.setupClickableRows();
                
                this.isLoading = false;
            });
            
            // Configura listeners para atualização em tempo real
            this.setupRealtimeListeners();
            
            this.isLoading = false;
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            this.isLoading = false;
            
            // Oculta o toast em caso de erro
            ui.hideLoadingToast();
            ui.showNotification('Erro ao carregar alguns dados do dashboard.', 'error');
            
            throw error;
        }
    }
    
    // Cria dados de demonstração no Firestore
    async createDemoData() {
        try {
            // Verifica se já existem dados
            const ordersCount = await db.collection('orders').get().then(snap => snap.size);
            const clientsCount = await db.collection('clients').get().then(snap => snap.size);
            
            if (ordersCount === 0 && clientsCount === 0) {
                console.log("Criando dados de demonstração no Firestore");
                
                // Cria alguns clientes de demonstração
                const clientsRef = db.collection('clients');
                const demoClients = [
                    {
                        id: 'client1',
                        name: 'Empresa ABC',
                        type: 'juridica',
                        document: '12.345.678/0001-90',
                        email: 'contato@empresaabc.com',
                        phone: '(11) 1234-5678',
                        address: 'Av. Paulista, 1000, São Paulo - SP',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    {
                        id: 'client2',
                        name: 'Empresa XYZ',
                        type: 'juridica',
                        document: '98.765.432/0001-10',
                        email: 'contato@empresaxyz.com',
                        phone: '(11) 9876-5432',
                        address: 'Rua Augusta, 500, São Paulo - SP',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    {
                        id: 'client3',
                        name: 'Cliente Individual',
                        type: 'fisica',
                        document: '123.456.789-00',
                        email: 'cliente@exemplo.com',
                        phone: '(11) 91234-5678',
                        address: 'Rua das Flores, 123, São Paulo - SP',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                ];
                
                // Cria os clientes
                for (const client of demoClients) {
                    await clientsRef.doc(client.id).set(client);
                }
                
                // Cria alguns produtos de demonstração
                const productsRef = db.collection('products');
                const demoProducts = [
                    {
                        id: 'prod1',
                        name: 'Banner em Lona',
                        description: 'Banner em lona 440g com acabamento em ilhós',
                        category: 'Comunicação Visual',
                        price: 50,
                        pricingType: 'area', // Preço por m²
                        active: true
                    },
                    {
                        id: 'prod2',
                        name: 'Cartão de Visita',
                        description: 'Cartão de visita 9x5cm em couchê 300g',
                        category: 'Impressos',
                        price: 90,
                        pricingType: 'unit', // Preço por cento
                        active: true
                    },
                    {
                        id: 'prod3',
                        name: 'Adesivo Vinil',
                        description: 'Adesivo em vinil com recorte eletrônico',
                        category: 'Comunicação Visual',
                        price: 70,
                        pricingType: 'area', // Preço por m²
                        active: true
                    }
                ];
                
                // Cria os produtos
                for (const product of demoProducts) {
                    await productsRef.doc(product.id).set(product);
                }
                
                // Cria alguns pedidos de demonstração
                const ordersRef = db.collection('orders');
                
                // Define alguns pedidos de demonstração fixos em vez de usar os dados existentes
                const demoOrders = [
                    {
                        id: 'demo1',
                        orderNumber: '1234',
                        clientId: 'client1',
                        clientName: 'Empresa ABC',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_1',
                                productId: 'prod1',
                                productName: 'Banner em Lona',
                                quantity: 1,
                                width: 2,
                                height: 1,
                                squareMeters: 2,
                                unitPrice: 50,
                                totalPrice: 100,
                                completed: false
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_1',
                                method: 'pix',
                                amount: 50,
                                date: new Date(new Date().getTime() - 86400000),
                                reference: 'Entrada'
                            }
                        ],
                        totalValue: 100,
                        totalPaid: 50,
                        status: 'pending',
                        createdAt: new Date(new Date().getTime() - 86400000),
                        deliveryDate: new Date(new Date().getTime() - 86400000),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    },
                    {
                        id: 'demo2',
                        orderNumber: '1235',
                        clientId: 'client2',
                        clientName: 'Empresa XYZ',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_2',
                                productId: 'prod1',
                                productName: 'Banner em Lona',
                                quantity: 1,
                                width: 3,
                                height: 2,
                                squareMeters: 6,
                                unitPrice: 50,
                                totalPrice: 300,
                                completed: false
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_2',
                                method: 'pix',
                                amount: 150,
                                date: new Date(new Date().getTime() - 86400000),
                                reference: 'Entrada'
                            }
                        ],
                        totalValue: 300,
                        totalPaid: 150,
                        status: 'production',
                        createdAt: new Date(new Date().getTime() - 86400000 * 2),
                        deliveryDate: new Date(new Date().getTime() + 86400000),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    },
                    {
                        id: 'demo3',
                        orderNumber: '1236',
                        clientId: 'client3',
                        clientName: 'Cliente Individual',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_3',
                                productId: 'prod2',
                                productName: 'Cartão de Visita',
                                quantity: 1,
                                unitPrice: 90,
                                totalPrice: 90,
                                completed: false
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_3',
                                method: 'pix',
                                amount: 45,
                                date: new Date(new Date().getTime() - 86400000 * 3),
                                reference: 'Entrada'
                            }
                        ],
                        totalValue: 90,
                        totalPaid: 45,
                        status: 'production',
                        createdAt: new Date(new Date().getTime() - 86400000 * 3),
                        deliveryDate: new Date(new Date().getTime() + 86400000 * 5),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    },
                    {
                        id: 'demo4',
                        orderNumber: '1239',
                        clientId: 'client1',
                        clientName: 'Empresa DEF',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_4',
                                productId: 'prod1',
                                productName: 'Banner em Lona',
                                quantity: 1,
                                width: 2,
                                height: 1,
                                squareMeters: 2,
                                unitPrice: 50,
                                totalPrice: 100,
                                completed: false
                            },
                            {
                                id: 'item_5',
                                productId: 'prod3',
                                productName: 'Adesivo Vinil',
                                quantity: 1,
                                width: 3,
                                height: 2,
                                squareMeters: 6,
                                unitPrice: 70,
                                totalPrice: 650,
                                completed: false
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_4',
                                method: 'pix',
                                amount: 375,
                                date: new Date(new Date().getTime() - 86400000),
                                reference: 'Entrada'
                            }
                        ],
                        totalValue: 750,
                        totalPaid: 375,
                        status: 'pending',
                        createdAt: new Date(new Date().getTime() - 86400000),
                        deliveryDate: new Date(new Date().getTime() + 86400000 * 7),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    },
                    {
                        id: 'demo5',
                        orderNumber: '1238',
                        clientId: 'client3',
                        clientName: 'Cliente Individual',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_6',
                                productId: 'prod2',
                                productName: 'Cartão de Visita',
                                quantity: 1,
                                unitPrice: 120,
                                totalPrice: 120,
                                completed: true
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_5a',
                                method: 'pix',
                                amount: 60,
                                date: new Date(new Date().getTime() - 86400000 * 3),
                                reference: 'Entrada'
                            },
                            {
                                id: 'payment_5b',
                                method: 'credit',
                                amount: 60,
                                date: new Date(new Date().getTime() - 86400000),
                                reference: 'Pagamento final'
                            }
                        ],
                        totalValue: 120,
                        totalPaid: 120,
                        status: 'ready',
                        createdAt: new Date(new Date().getTime() - 86400000 * 2),
                        deliveryDate: new Date(new Date().getTime() - 86400000),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    },
                    {
                        id: 'demo6',
                        orderNumber: '1237',
                        clientId: 'client1',
                        clientName: 'Empresa GHI',
                        sellerId: 'seller1',
                        sellerName: 'Vendedor',
                        items: [
                            {
                                id: 'item_7',
                                productId: 'prod1',
                                productName: 'Banner em Lona',
                                quantity: 1,
                                width: 4,
                                height: 3,
                                squareMeters: 12,
                                unitPrice: 50,
                                totalPrice: 600,
                                completed: false
                            },
                            {
                                id: 'item_8',
                                productId: 'prod3',
                                productName: 'Adesivo Vinil',
                                quantity: 1,
                                width: 4,
                                height: 3,
                                squareMeters: 12,
                                unitPrice: 70,
                                totalPrice: 850,
                                completed: false
                            }
                        ],
                        payments: [
                            {
                                id: 'payment_6',
                                method: 'transfer',
                                amount: 725,
                                date: new Date(new Date().getTime() - 86400000 * 2),
                                reference: 'Entrada'
                            }
                        ],
                        totalValue: 1450,
                        totalPaid: 725,
                        status: 'production',
                        createdAt: new Date(new Date().getTime() - 86400000 * 2),
                        deliveryDate: new Date(new Date().getTime() + 86400000 * 3),
                        notes: 'Pedido de demonstração criado automaticamente.'
                    }
                ];
                
                // Cria os pedidos de demonstração
                for (const order of demoOrders) {
                    await ordersRef.doc(order.id).set(order);
                }
                
                console.log("Dados de demonstração criados com sucesso");
            }
        } catch (error) {
            console.error("Erro ao criar dados de demonstração:", error);
        }
    }
    
    // Carrega dados iniciais do Firestore
    async loadData() {
        try {
            this.isLoading = true;
            
            // Limpa o cache para garantir dados atualizados
            localStorage.removeItem('latestOrders');
            localStorage.removeItem('latestOrdersTime');
            localStorage.removeItem('dashboardStats');
            localStorage.removeItem('dashboardStatsTime');
            localStorage.removeItem('controlPoints');
            localStorage.removeItem('controlPointsTime');
            
            // Carrega estatísticas gerais
            await this.loadStatistics();
            
            // Carrega dados de entregas próximas
            await this.loadUpcomingDeliveries();
            
            // Carrega os últimos pedidos
            await this.loadLatestOrders();
            
            // Carrega os pontos de controle
            await this.loadControlPoints();
            
            this.isLoading = false;
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            this.isLoading = false;
            throw error;
        }
    }
    
    // Carrega estatísticas gerais
    async loadStatistics() {
        console.log("Carregando estatísticas...");
        
        // Verificar cache primeiro
        const cachedStats = localStorage.getItem('dashboardStats');
        const cacheTime = localStorage.getItem('dashboardStatsTime');
        
        // Usar cache se tiver menos de 3 minutos
        if (cachedStats && cacheTime) {
            const agora = new Date().getTime();
            if (agora - parseInt(cacheTime) < 3 * 60 * 1000) {
                console.log("Usando cache para estatísticas do dashboard");
                this.statsData = JSON.parse(cachedStats);
                return;
            }
        }
        
        // Obtém a data atual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtém o primeiro dia do mês atual
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Executar consultas em paralelo para melhorar o desempenho
        const [dailyOrdersSnapshot, pendingOrdersSnapshot, monthlyOrdersSnapshot, clientsSnapshot] = 
            await Promise.all([
                // Pedidos do dia
                db.collection('orders')
                    .where('createdAt', '>=', today)
                    .get(),
                
                // Pedidos pendentes
                db.collection('orders')
                    .where('status', 'in', ['pending', 'approved', 'production'])
                    .get(),
                
                // Pedidos e faturamento do mês
                db.collection('orders')
                    .where('createdAt', '>=', firstDayOfMonth)
                    .get(),
                
                // Total de clientes
                db.collection('clients').get()
            ]);
        
        // Processa os resultados
        this.statsData.dailyOrders = dailyOrdersSnapshot.size;
        this.statsData.pendingOrders = pendingOrdersSnapshot.size;
        this.statsData.monthlyOrders = monthlyOrdersSnapshot.size;
        this.statsData.totalClients = clientsSnapshot.size;
        
        // Faturamento do mês
        let monthlyRevenue = 0;
        monthlyOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            monthlyRevenue += order.totalValue || 0;
        });
        
        this.statsData.monthlyRevenue = monthlyRevenue;
        
        // Salvar no cache
        try {
            localStorage.setItem('dashboardStats', JSON.stringify(this.statsData));
            localStorage.setItem('dashboardStatsTime', new Date().getTime().toString());
        } catch (cacheError) {
            console.warn("Erro ao salvar cache das estatísticas:", cacheError);
        }
    }
    
    // Carrega entregas próximas
    async loadUpcomingDeliveries(isInitialLoad = true) {
        try {
            console.log("Carregando entregas próximas...");
            const today = new Date();
            
            // Data limite (7 dias a partir de hoje)
            const limitDate = new Date();
            limitDate.setDate(today.getDate() + 7);
            
            // Consulta base
            let query = db.collection('orders')
                .where('deliveryType', '==', 'entrega')
                .where('status', 'in', ['pending', 'approved', 'production', 'ready', 'printing', 'cutting', 'finishing', 'application'])
                .where('deliveryDate', '>=', today)
                .where('deliveryDate', '<=', limitDate)
                .orderBy('deliveryDate', 'asc')
                .limit(this.upcomingDeliveriesLimit);
            
            // Se não for o carregamento inicial, use o último documento como ponto de partida
            if (!isInitialLoad && this.lastUpcomingDeliveryDoc) {
                query = query.startAfter(this.lastUpcomingDeliveryDoc);
            } else if (isInitialLoad) {
                // Resetar as propriedades de paginação em um carregamento inicial
                this.lastUpcomingDeliveryDoc = null;
                this.hasMoreUpcomingDeliveries = true;
                this.upcomingDeliveries = [];
            }
            
            const snapshot = await query.get();
            
            console.log(`Entregas próximas encontradas: ${snapshot.size}`);
            
            // Verificar se há mais resultados
            this.hasMoreUpcomingDeliveries = snapshot.size === this.upcomingDeliveriesLimit;
            
            // Se não houver documentos, não há mais para carregar
            if (snapshot.empty) {
                this.hasMoreUpcomingDeliveries = false;
                return;
            }
            
            // Guardar o último documento para paginação
            this.lastUpcomingDeliveryDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Processar os documentos
            const newDeliveries = [];
            snapshot.forEach(doc => {
                const order = doc.data();
                newDeliveries.push({
                    id: doc.id,
                    clientName: order.clientName,
                    deliveryDate: order.deliveryDate,
                    toArrange: order.toArrange || false,
                    delivered: order.delivered || false,
                    status: order.status,
                    // Adiciona as propriedades de situação final
                    finalSituacao: order.finalSituacao || null,
                    finalSituacaoClass: order.finalSituacaoClass || null
                });
            });
            
            // Adicionar os novos resultados ao array existente ou substituir se for carregamento inicial
            if (isInitialLoad) {
                this.upcomingDeliveries = newDeliveries;
            } else {
                this.upcomingDeliveries = [...this.upcomingDeliveries, ...newDeliveries];
            }
            
        } catch (error) {
            console.error("Erro ao carregar entregas próximas:", error);
            if (isInitialLoad) {
                this.upcomingDeliveries = [];
            }
            this.hasMoreUpcomingDeliveries = false;
        }
    }
    
    // Carrega pedidos recentes
    async loadLatestOrders() {
        try {
            // Verificar cache primeiro
            const cachedOrders = localStorage.getItem('latestOrders');
            const cacheTime = localStorage.getItem('latestOrdersTime');
            
            // Usar cache se tiver menos de 2 minutos
            if (cachedOrders && cacheTime) {
                const agora = new Date().getTime();
                if (agora - parseInt(cacheTime) < 2 * 60 * 1000) {
                    console.log("Usando cache para últimos pedidos");
                    this.latestOrders = JSON.parse(cachedOrders);
                    return;
                }
            }
            
            // Se não houver cache válido, buscar do Firestore
            console.log("Buscando últimos pedidos do Firestore");
            
            // Usando o índice simples de ordenação por createdAt
            const snapshot = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            
            console.log(`Últimos pedidos encontrados: ${snapshot.size}`);
            this.latestOrders = [];
            
            snapshot.forEach(doc => {
                const order = doc.data();
                
                // Processa a data de entrega corretamente
                let processedDeliveryDate = null;
                
                if (order.deliveryDate) {
                    try {
                        if (order.deliveryDate.toDate && typeof order.deliveryDate.toDate === 'function') {
                            processedDeliveryDate = order.deliveryDate.toDate();
                        } else if (order.deliveryDate instanceof Date) {
                            processedDeliveryDate = order.deliveryDate;
                        } else if (order.deliveryDate.seconds) {
                            processedDeliveryDate = new Date(order.deliveryDate.seconds * 1000);
                        } else {
                            processedDeliveryDate = new Date(order.deliveryDate);
                            
                            // Verifica se a data é válida
                            if (isNaN(processedDeliveryDate.getTime())) {
                                console.error('Data de entrega inválida ao processar últimos pedidos:', order.deliveryDate);
                                processedDeliveryDate = null;
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao processar data de entrega nos últimos pedidos:', e, order.deliveryDate);
                        processedDeliveryDate = null;
                    }
                }
                
                this.latestOrders.push({
                    id: doc.id,
                    clientName: order.clientName,
                    deliveryDate: processedDeliveryDate,
                    toArrange: order.toArrange || false,
                    delivered: order.delivered || false,
                    status: order.status,
                    createdAt: order.createdAt,
                    // Adiciona as propriedades de situação final
                    finalSituacao: order.finalSituacao || null,
                    finalSituacaoClass: order.finalSituacaoClass || null
                });
            });
            
            // Melhorar cache com TTL mais longo (5 minutos)
            try {
                localStorage.setItem('latestOrders', JSON.stringify(this.latestOrders));
                localStorage.setItem('latestOrdersTime', new Date().getTime().toString());
            } catch (cacheError) {
                console.warn("Erro ao salvar cache dos últimos pedidos:", cacheError);
            }
        } catch (error) {
            console.error("Erro ao carregar últimos pedidos:", error);
            this.latestOrders = [];
        }
    }
    
    // Carrega os dados dos pontos de controle
    async loadControlPoints() {
        try {
            console.log("Carregando pontos de controle...");
            
            // Use cache se disponível e recente
            const cachedData = localStorage.getItem('controlPoints');
            const cacheTime = localStorage.getItem('controlPointsTime');
            
            // Usar cache se tiver menos de 5 minutos
            if (cachedData && cacheTime) {
                const agora = new Date().getTime();
                if (agora - parseInt(cacheTime) < 5 * 60 * 1000) {
                    console.log("Usando cache para pontos de controle");
                    this.controlPoints = JSON.parse(cachedData);
                    return;
                }
            }
            
            // Inicializa contagem
            const contagem = {
                orcamento: 0,
                aguardando: 0,
                impressao: 0,
                cortesEspeciais: 0,
                acabamento: 0,
                aplicacao: 0, 
                prontoNaEntrega: 0,
                entregue: 0
            };
            
            // Usar uma única consulta com contador em vez de múltiplas consultas
            const snapshot = await db.collection('orders').get();
            
            // Conta os documentos por status
            snapshot.forEach(doc => {
                const order = doc.data();
                switch (order.status) {
                    case 'budget': 
                        contagem.orcamento++; 
                        break;
                    case 'pending': 
                        contagem.aguardando++; 
                        break;
                    case 'printing': 
                        contagem.impressao++; 
                        break;
                    case 'cutting': 
                        contagem.cortesEspeciais++; 
                        break;
                    case 'finishing': 
                        contagem.acabamento++; 
                        break;
                    case 'application': 
                        contagem.aplicacao++; 
                        break;
                    case 'ready': 
                        contagem.prontoNaEntrega++; 
                        break;
                    case 'delivered': 
                        contagem.entregue++; 
                        break;
                }
            });
            
            this.controlPoints = contagem;
            console.log("Contagem de pedidos por status:", this.controlPoints);
            
            // Salvar no cache
            try {
                localStorage.setItem('controlPoints', JSON.stringify(this.controlPoints));
                localStorage.setItem('controlPointsTime', new Date().getTime().toString());
            } catch (cacheError) {
                console.warn("Erro ao salvar cache dos pontos de controle:", cacheError);
            }
        } catch (error) {
            console.error("Erro ao carregar dados dos pontos de controle:", error);
            // Em caso de erro, use os dados de demonstração
            this.controlPoints = this.demoData.controlPoints;
        }
    }
    
    // Configurar listeners para atualizações em tempo real com debounce
    setupRealtimeListeners() {
        console.log('Configurando listeners do dashboard (otimizado)');

        // Debounce para evitar atualizações excessivas
        const debouncedUpdate = this.debounce(() => {
            this.loadStatistics();
            this.loadControlPoints();
        }, 1000);

        // Bind dos métodos para garantir que o contexto seja mantido
        const handleOrdersUpdate = this.handleOrdersUpdate.bind(this);
        const handleClientsUpdate = this.handleClientsUpdate.bind(this);
        const handleProductsUpdate = this.handleProductsUpdate.bind(this);

        // Escuta mudanças em pedidos
        this.ordersListener = db.collection('orders')
            .onSnapshot((snapshot) => {
                console.log('Mudanças detectadas em pedidos');
                try {
                    handleOrdersUpdate(snapshot);
                    debouncedUpdate();
                } catch (error) {
                    console.error('Erro ao processar mudanças em pedidos:', error);
                }
            }, (error) => {
                console.error('Erro no listener de pedidos:', error);
            });

        // Escuta mudanças em clientes com limite
        this.clientsListener = db.collection('clients')
            .limit(100) // Limita para melhorar performance
            .onSnapshot((snapshot) => {
                console.log('Mudanças detectadas em clientes');
                try {
                    handleClientsUpdate(snapshot);
                } catch (error) {
                    console.error('Erro ao processar mudanças em clientes:', error);
                }
            }, (error) => {
                console.error('Erro no listener de clientes:', error);
            });

        // Escuta mudanças em produtos com limite
        this.productsListener = db.collection('products')
            .limit(100) // Limita para melhorar performance
            .onSnapshot((snapshot) => {
                console.log('Mudanças detectadas em produtos');
                try {
                    handleProductsUpdate(snapshot);
                } catch (error) {
                    console.error('Erro ao processar mudanças em produtos:', error);
                }
            }, (error) => {
                console.error('Erro no listener de produtos:', error);
            });
    }

    // Função debounce para limitar execuções
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Handler para mudanças em pedidos
    handleOrdersUpdate(snapshot) {
        console.log('Processando mudanças em pedidos no dashboard');
        
        // Invalida o cache para forçar atualização
        localStorage.removeItem('latestOrders');
        localStorage.removeItem('latestOrdersTime');
        localStorage.removeItem('dashboardStats');
        localStorage.removeItem('dashboardStatsTime');
        
        // Agenda uma atualização suave dos dados
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            if (this.container && this.container.querySelector) {
                // Atualiza apenas se o dashboard ainda estiver visível
                this.loadLatestOrders().then(() => {
                    const ordersSection = this.container.querySelector('.table-card .fa-clipboard-list');
                    if (ordersSection) {
                        const tableCard = ordersSection.closest('.table-card');
                        if (tableCard) {
                            const contentDiv = tableCard.querySelector('.table-card-content');
                            if (contentDiv) {
                                contentDiv.innerHTML = this.renderLatestOrders();
                                this.setupClickableRows();
                            }
                        }
                    }
                }).catch(error => {
                    console.error('Erro ao atualizar últimos pedidos:', error);
                });
            }
        }, 2000);
    }
    
    // Handler para mudanças em clientes
    handleClientsUpdate(snapshot) {
        console.log('Processando mudanças em clientes no dashboard');
        
        // Invalida o cache de estatísticas
        localStorage.removeItem('dashboardStats');
        localStorage.removeItem('dashboardStatsTime');
        
        // Agenda uma atualização das estatísticas
        if (this.clientsTimeout) {
            clearTimeout(this.clientsTimeout);
        }
        
        this.clientsTimeout = setTimeout(() => {
            if (this.container && this.container.querySelector) {
                this.loadStatistics().then(() => {
                    const statsSection = this.container.querySelector('.dashboard-stats');
                    if (statsSection) {
                        statsSection.innerHTML = this.renderStatsCards();
                    }
                }).catch(error => {
                    console.error('Erro ao atualizar estatísticas após mudança de clientes:', error);
                });
            }
        }, 3000);
    }
    
    // Handler para mudanças em produtos
    handleProductsUpdate(snapshot) {
        console.log('Processando mudanças em produtos no dashboard');
        // Para produtos, não precisamos atualizar nada no dashboard no momento
        // Mas o método precisa existir para evitar erros
    }
    
    // Renderiza o conteúdo do dashboard
    renderDashboard() {
        // Obtém o nome do usuário atual
        let userName = '';
        if (window.auth && window.auth.currentUser) {
            userName = window.auth.currentUser.name || '';
        }
        
        this.container.innerHTML = `
            <h1>Dashboard</h1>
            <!-- Botão de Novo Pedido -->
            <div class="new-order-button-container">
                <button id="new-order-btn" class="btn-dashboard-new-order" onclick="localStorage.setItem('createNewOrder', 'true'); ui.navigateTo('orders')">
                    <i class="fas fa-plus-circle"></i> Novo Pedido
                </button>
            </div>
            <div class="dashboard-stats">
                ${this.renderStatsCards()}
            </div>
            
            <div class="table-card control-points-card">
                <h3><i class="fas fa-tasks"></i> Ponto de Controle</h3>
                ${this.renderControlPoints()}
            </div>
            
            <div class="dashboard-tables">
                <div class="table-card">
                    <h3><i class="fas fa-exclamation-circle"></i> Entregas Próximas</h3>
                    <div class="table-card-content">
                        ${this.renderUpcomingDeliveries()}
                    </div>
                </div>
                
                <div class="table-card">
                    <h3><i class="fas fa-clipboard-list"></i> Últimos Pedidos</h3>
                    <div class="table-card-content">
                        ${this.renderLatestOrders()}
                    </div>
                </div>
            </div>
        `;
        
        // Adiciona evento para linhas clicáveis
        this.setupClickableRows();
    }
    
    // Renderiza os cards de estatísticas
    renderStatsCards() {
        // Verifica se o usuário é administrador
        const isAdmin = window.auth && window.auth.getUserAccessLevel && window.auth.getUserAccessLevel() >= 4;
        
        let html = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
                <div class="stat-title">Pedidos do Dia</div>
                <div class="stat-value">${this.statsData.dailyOrders}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-title">Pedidos Pendentes</div>
                <div class="stat-value">${this.statsData.pendingOrders}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
                <div class="stat-title">Pedidos do Mês</div>
                <div class="stat-value">${this.statsData.monthlyOrders}</div>
            </div>`;
        
        // Mostra faturamento apenas para administradores
        if (isAdmin) {
            html += `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="stat-title">Faturamento do Mês</div>
                <div class="stat-value">${ui.formatCurrency(this.statsData.monthlyRevenue)}</div>
            </div>`;
            
            // Mostra total de clientes apenas para administradores
            html += `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-title">Total de Clientes</div>
                <div class="stat-value">${this.statsData.totalClients}</div>
            </div>`;
        }
        
        return html;
    }
    
    // Renderiza a tabela de entregas próximas
    renderUpcomingDeliveries() {
        if (this.upcomingDeliveries.length === 0) {
            return '<p class="no-data-message">Não há entregas programadas para os próximos 7 dias.</p>';
        }
        
        let html = `
            <table class="data-table">
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
        
        this.upcomingDeliveries.forEach(delivery => {
            // Verifica se a entrega está atrasada
            const deliveryDate = delivery.deliveryDate.toDate ? delivery.deliveryDate.toDate() : new Date(delivery.deliveryDate);
            const today = new Date();
            const isLate = deliveryDate < today;
            const isCloseToDue = !isLate && (deliveryDate - today) / (1000 * 60 * 60 * 24) <= 2; // 2 dias ou menos
            
            // Define a situação
            let situacao = '';
            let situacaoClass = '';
            
            if (delivery.toArrange) {
                situacao = 'A combinar';
            } else if (delivery.delivered) {
                situacao = 'Entregue';
            } else {
                // Calcula a diferença em minutos entre agora e a data de entrega
                const minutesToDelivery = Math.floor((deliveryDate - today) / (1000 * 60));
                
                if (minutesToDelivery < 0) {
                    // Atrasado - vermelho
                    situacao = 'Atrasado';
                    situacaoClass = 'situacao-atrasado';
                } else if (minutesToDelivery <= 60) {
                    // Menos de 60 minutos - amarelo
                    situacao = 'Apresse';
                    situacaoClass = 'situacao-apresse';
                } else {
                    // Mais de 60 minutos - azul
                    situacao = 'No prazo';
                    situacaoClass = 'situacao-no-prazo';
                }
            }
            
            // Encontra o objeto de status
            const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === delivery.status) || 
                             { name: 'Desconhecido', color: '' };
            
            html += `
                <tr data-id="${delivery.id}" class="clickable-row ${isLate ? 'late-delivery' : (isCloseToDue ? 'urgent-delivery' : '')}">
                    <td>${delivery.clientName}</td>
                    <td>${ui.formatDate(delivery.deliveryDate)}</td>
                    <td>${this.formatTime(deliveryDate)}</td>
                    <td>${this.getSituacaoHTML(delivery)}</td>
                    <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                    <td>
                        <button class="btn-icon view-order" data-id="${delivery.id}" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit-order" data-id="${delivery.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        // Adiciona o botão "Ver mais" apenas se houver mais entregas para carregar
        if (this.hasMoreUpcomingDeliveries) {
            html += `
                <div class="see-more-container">
                    <button id="load-more-deliveries" class="btn btn-secondary see-more-btn">
                        <i class="fas fa-plus"></i> Ver Mais
                    </button>
                </div>
            `;
        }
        
        return html;
    }
    
    // Renderiza a tabela de pedidos recentes
    renderLatestOrders() {
        if (this.latestOrders.length === 0) {
            return '<p class="no-data-message">Não há pedidos registrados.</p>';
        }
        
        let html = `
            <table class="data-table">
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
        
        this.latestOrders.forEach(order => {
            // Encontra o objeto de status
            const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                             { name: 'Desconhecido', color: '' };
            
            html += `
                <tr data-id="${order.id}" class="clickable-row">
                    <td>${order.clientName}</td>
                    <td>${order.toArrange ? 'A combinar' : (order.deliveryDate ? ui.formatDate(order.deliveryDate) : '-')}</td>
                    <td>${order.toArrange ? '-' : (order.deliveryDate ? this.formatTime(order.deliveryDate) : '-')}</td>
                    <td>
                        ${this.getSituacaoHTML(order)}
                    </td>
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
        
        html += `
                </tbody>
            </table>
            
            <!-- Botão Ver Mais -->
            <div class="see-more-container">
                <button id="see-more-orders" class="btn btn-secondary see-more-btn" onclick="ui.navigateTo('orders')">
                    <i class="fas fa-list"></i> Ver Todos os Pedidos
                </button>
            </div>
        `;
        
        return html;
    }
    
    // Renderiza os pontos de controle
    renderControlPoints() {
        return `
            <div class="control-points">
                <div class="control-point-item">
                    <div class="control-point-title">Orçamento</div>
                    <div class="control-point-value">${this.controlPoints.orcamento}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Aguardando</div>
                    <div class="control-point-value">${this.controlPoints.aguardando}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Impressão</div>
                    <div class="control-point-value">${this.controlPoints.impressao}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Cortes Especiais</div>
                    <div class="control-point-value">${this.controlPoints.cortesEspeciais}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Acabamento</div>
                    <div class="control-point-value">${this.controlPoints.acabamento}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Aplicação</div>
                    <div class="control-point-value">${this.controlPoints.aplicacao}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Pronto na entrega</div>
                    <div class="control-point-value">${this.controlPoints.prontoNaEntrega}</div>
                </div>
                
                <div class="control-point-item">
                    <div class="control-point-title">Entregue</div>
                    <div class="control-point-value">${this.controlPoints.entregue}</div>
                </div>
            </div>
        `;
    }
    
    // Formata a hora de um timestamp
    formatTime(date) {
        if (!date) return '-';
        try {
            let jsDate;
            
            if (date instanceof Date) {
                // Se já for um objeto Date
                jsDate = date;
            } else if (date.seconds) {
                // Se for um timestamp do Firestore
                jsDate = new Date(date.seconds * 1000);
            } else if (date.toDate && typeof date.toDate === 'function') {
                // Se for um Timestamp do Firestore
                jsDate = date.toDate();
            } else if (typeof date === 'string' || typeof date === 'number') {
                // Se for uma string ou número
                jsDate = new Date(date);
            } else {
                // Formato desconhecido
                return '-';
            }
            
            // Verifica se a data é válida
            if (isNaN(jsDate.getTime())) {
                console.error('Data inválida em formatTime:', date);
                return '-';
            }
            
            return jsDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error('Erro ao formatar hora:', e, date);
            return '-';
        }
    }
    
    // Calcula e formata a situação do pedido
    getSituacaoHTML(order) {
        // Se a situação final já foi definida (travada), retorna ela
        if (order.finalSituacao) {
            // Usa a classe salva ou determina com base no texto
            let situacaoClass = order.finalSituacaoClass || '';
            if (!situacaoClass) {
                switch (order.finalSituacao) {
                    case 'Atrasado': situacaoClass = 'situacao-atrasado'; break;
                    case 'Apresse': situacaoClass = 'situacao-apresse'; break;
                    case 'No prazo': situacaoClass = 'situacao-no-prazo'; break;
                    case 'A combinar': situacaoClass = 'situacao-combinar'; break;
                    case 'Pendente': situacaoClass = 'situacao-pendente'; break;
                }
            }
            return `<span class="${situacaoClass}">${order.finalSituacao}</span>`;
        }

        if (order.toArrange) {
            return '<span class="situacao-combinar">A combinar</span>';
        } else if (order.delivered) {
            return '<span>Entregue</span>';
        } else if (order.deliveryDate) {
            try {
                const today = new Date();
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
                
                // Verifica se a data é válida
                if (isNaN(deliveryDate.getTime())) {
                    console.error('Data de entrega inválida:', order.deliveryDate);
                    return '<span>Data inválida</span>';
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
            } catch (e) {
                console.error('Erro ao calcular situação:', e, order.deliveryDate);
                return '<span>Erro na data</span>';
            }
        } else {
            return '<span class="situacao-pendente">Pendente</span>';
        }
    }
    
    // Configura os eventos para as linhas de tabelas clicáveis
    setupClickableRows() {
        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Ignora se o clique foi em um botão
                if (e.target.closest('.btn-icon')) return;
                
                const orderId = row.getAttribute('data-id');
                if (orderId) {
                    console.log('Dashboard: Clique em pedido detectado, ID:', orderId);
                    
                    // Salva o ID do pedido para a página de pedidos poder abri-lo
                    localStorage.setItem('viewOrderId', orderId);
                    console.log('Dashboard: ID do pedido salvo no localStorage:', orderId);
                    
                    // Navega para a página de pedidos
                    console.log('Dashboard: Navegando para a página de pedidos...');
                    ui.navigateTo('orders');
                }
            });
        });
        
        // Adiciona event listeners para os botões de ação
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
                console.log('Dashboard: Clique no botão de visualizar pedido, ID:', orderId);
                localStorage.setItem('viewOrderId', orderId);
                ui.navigateTo('orders');
            });
        });
        
        document.querySelectorAll('.edit-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
                console.log('Dashboard: Clique no botão de editar pedido, ID:', orderId);
                localStorage.setItem('editOrderId', orderId);
                ui.navigateTo('orders');
            });
        });
        
        document.querySelectorAll('.change-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
                this.showChangeStatusDialog(orderId);
            });
        });
        
        // Adiciona event listener para o botão "Ver mais" das entregas próximas
        const loadMoreBtn = document.getElementById('load-more-deliveries');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreUpcomingDeliveries());
        }
    }
    
    // Limpa os listeners quando o componente é desmontado
    cleanup() {
        // Marca que o componente não está mais ativo
        this.isActive = false;
        
        console.log("Limpando listeners do Dashboard");
        
        // Limpa todos os timeouts
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        
        if (this.controlPointsTimeout) {
            clearTimeout(this.controlPointsTimeout);
            this.controlPointsTimeout = null;
        }
        
        if (this.clientsTimeout) {
            clearTimeout(this.clientsTimeout);
            this.clientsTimeout = null;
        }
        
        // Desativa os listeners do Firestore
        if (this.ordersListener) {
            this.ordersListener();
            this.ordersListener = null;
        }
        
        if (this.clientsListener) {
            this.clientsListener();
            this.clientsListener = null;
        }
        
        if (this.productsListener) {
            this.productsListener();
            this.productsListener = null;
        }
        
        if (this.controlPointsListener) {
            this.controlPointsListener();
            this.controlPointsListener = null;
        }
        
        console.log("Listeners do Dashboard removidos com sucesso");
    }
    
    // Mostra diálogo para alterar o status do pedido
    showChangeStatusDialog(orderId) {
        // Busca o pedido no Firestore
        db.collection('orders').doc(orderId).get().then(doc => {
            if (!doc.exists) {
                ui.showNotification('Pedido não encontrado.', 'error');
                return;
            }
            
            const order = doc.data();
            const currentStatus = order.status;
            
            // Cria um modal para seleção do status
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
                    try {
                        ui.showLoading('Atualizando status do pedido...');
                        
                        // Obtém informações do usuário atual
                        let userName = 'Usuário desconhecido';
                        if (window.auth && window.auth.currentUser) {
                            userName = window.auth.currentUser.name || 'Usuário desconhecido';
                        }
                        
                        // Prepara os dados para atualização
                        const updateData = {
                            status: newStatus,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            statusUpdatedBy: userName,
                            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        // Se o status for 'delivered' ou 'cancelled', trava a situação
                        if (newStatus === 'delivered' || newStatus === 'cancelled') {
                            // Calcula a situação atual do pedido
                            const situacaoHTML = this.getSituacaoHTML(order);
                            // Extrai o texto da situação do HTML
                            const situacaoText = situacaoHTML.match(/>([^<]+)<\/span>/)?.[1] || 'Desconhecida';
                            // Extrai a classe da situação do HTML
                            const situacaoClass = situacaoHTML.match(/class="([^"]+)"/)?.[1] || '';
                            
                            // Salva a situação final
                            updateData.finalSituacao = situacaoText;
                            updateData.finalSituacaoClass = situacaoClass;
                            
                            console.log("Travando situação do pedido:", {
                                situacao: situacaoText,
                                classe: situacaoClass
                            });
                        }
                        
                        // Se o status for 'cancelled', pergunta o motivo
                        if (newStatus === 'cancelled') {
                            const reason = await this.askCancellationReason();
                            if (reason === null) {
                                ui.hideLoading();
                                return; // Cancelou a operação
                            }
                            updateData.cancellationReason = reason;
                        }
                        
                        // Atualiza o documento no Firestore
                        await db.collection('orders').doc(orderId).update(updateData);
                        
                        ui.showNotification('Status do pedido atualizado com sucesso!', 'success');
                        
                        // Recarrega os dados e atualiza a visualização
                        await this.loadData();
                        this.renderDashboard();
                        
                        ui.hideLoading();
                    } catch (error) {
                        console.error('Erro ao atualizar status do pedido:', error);
                        ui.hideLoading();
                        ui.showNotification('Erro ao atualizar status do pedido.', 'error');
                    }
                }
            });
        }).catch(error => {
            console.error('Erro ao buscar pedido:', error);
            ui.showNotification('Erro ao buscar dados do pedido.', 'error');
        });
    }
    
    // Pergunta o motivo do cancelamento
    async askCancellationReason() {
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
    
    // Método para carregar mais entregas próximas
    async loadMoreUpcomingDeliveries() {
        if (this.loadingMoreDeliveries || !this.hasMoreUpcomingDeliveries) return;
        
        try {
            this.loadingMoreDeliveries = true;
            
            // Atualiza o botão para mostrar carregamento
            const loadMoreBtn = document.getElementById('load-more-deliveries');
            if (loadMoreBtn) {
                loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
                loadMoreBtn.disabled = true;
            }
            
            // Carrega mais entregas
            await this.loadUpcomingDeliveries(false);
            
            // Atualiza apenas a tabela de entregas próximas
            const upcomingDeliveriesContainer = document.querySelector('.table-card:nth-child(1) .table-card-content');
            if (upcomingDeliveriesContainer) {
                upcomingDeliveriesContainer.innerHTML = this.renderUpcomingDeliveries();
                this.setupClickableRows();
            }
        } catch (error) {
            console.error("Erro ao carregar mais entregas:", error);
            ui.showNotification("Erro ao carregar mais entregas", "error");
            
            // Restaura o botão em caso de erro
            const loadMoreBtn = document.getElementById('load-more-deliveries');
            if (loadMoreBtn) {
                loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Ver Mais';
                loadMoreBtn.disabled = false;
            }
        } finally {
            this.loadingMoreDeliveries = false;
        }
    }
}

// Registra o componente globalmente
window.DashboardComponent = DashboardComponent;