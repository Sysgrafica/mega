// Componente do Dashboard
class DashboardComponent {
    constructor() {
        this.container = null;
        this.statsData = {
            dailyOrders: 0,
            pendingOrders: 0,
            monthlyRevenue: 0,
            monthlyOrders: 0,
            totalClients: 0
        };
        this.upcomingDeliveries = [];
        this.latestOrders = [];
        this.deliveryOrders = []; // Pedidos para entregar
        
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
            },
            // Dados de demonstração para pedidos de entrega
            deliveryOrders: [
                {
                    id: 'demo7',
                    orderNumber: '1240',
                    clientName: 'Empresa JKL',
                    clientAddress: 'Rua das Oliveiras, 789, São Paulo - SP',
                    deliveryDate: new Date(new Date().getTime() + 86400000), // Amanhã
                    status: 'ready',
                    deliveryCost: 25.00
                },
                {
                    id: 'demo8',
                    orderNumber: '1241',
                    clientName: 'Loja de Roupas MNO',
                    clientAddress: 'Av. Brasil, 456, São Paulo - SP', 
                    deliveryDate: new Date(new Date().getTime() + 86400000 * 2), // Em 2 dias
                    status: 'ready',
                    deliveryCost: 35.00
                },
                {
                    id: 'demo9',
                    orderNumber: '1242',
                    clientName: 'Restaurante PQR',
                    clientAddress: 'Rua Augusta, 123, São Paulo - SP',
                    deliveryDate: new Date(new Date().getTime() + 86400000 * 3), // Em 3 dias
                    status: 'finishing',
                    deliveryCost: 30.00
                }
            ]
        };
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
                // Carrega dados do Firestore em segundo plano
                await this.loadDataAsync();
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
            
            <div class="table-card">
                <h3><i class="fas fa-truck"></i> Pedidos para Entregar</h3>
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Carregando pedidos...</p>
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
                const ordersSection = document.querySelector('.table-card .fa-clipboard-list').closest('.table-card');
                if (ordersSection) {
                    const header = ordersSection.querySelector('h3');
                    if (header) {
                        ordersSection.innerHTML = '';
                        ordersSection.appendChild(header);
                        ordersSection.insertAdjacentHTML('beforeend', this.renderLatestOrders());
                    }
                }
                ui.updateLoadingToast('Pedidos carregados. Carregando pontos de controle...');
            }).catch(error => {
                console.error("Erro ao carregar últimos pedidos:", error);
                // Usa dados de demonstração em caso de erro
                this.latestOrders = this.demoData.latestOrders;
                const ordersSection = document.querySelector('.table-card .fa-clipboard-list').closest('.table-card');
                if (ordersSection) {
                    const header = ordersSection.querySelector('h3');
                    if (header) {
                        ordersSection.innerHTML = '';
                        ordersSection.appendChild(header);
                        ordersSection.insertAdjacentHTML('beforeend', this.renderLatestOrders());
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
                ui.updateLoadingToast('Pontos de controle carregados. Carregando pedidos para entrega...');
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
            });
            
            // Carrega os pedidos para entregar e atualiza a seção correspondente
            this.loadDeliveryOrders().then(() => {
                const deliverySection = document.querySelector('.table-card .fa-truck').closest('.table-card');
                if (deliverySection) {
                    const header = deliverySection.querySelector('h3');
                    if (header) {
                        deliverySection.innerHTML = '';
                        deliverySection.appendChild(header);
                        deliverySection.insertAdjacentHTML('beforeend', this.renderDeliveryOrders());
                        
                        // Reativa os event listeners para os pedidos clicáveis
                        this.setupClickableRows();
                    }
                }
                
                // Oculta o toast quando todos os dados estiverem carregados
                ui.hideLoadingToast();
                ui.showNotification('Dashboard atualizado com sucesso!', 'success');
            }).catch(error => {
                console.error("Erro ao carregar pedidos para entregar:", error);
                // Usa dados de demonstração em caso de erro
                this.deliveryOrders = this.demoData.deliveryOrders;
                const deliverySection = document.querySelector('.table-card .fa-truck').closest('.table-card');
                if (deliverySection) {
                    const header = deliverySection.querySelector('h3');
                    if (header) {
                        deliverySection.innerHTML = '';
                        deliverySection.appendChild(header);
                        deliverySection.insertAdjacentHTML('beforeend', this.renderDeliveryOrders());
                        
                        // Reativa os event listeners para os pedidos clicáveis
                        this.setupClickableRows();
                    }
                }
                
                // Oculta o toast mesmo em caso de erro
                ui.hideLoadingToast();
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
            
            // Carrega estatísticas gerais
            await this.loadStatistics();
            
            // Carrega dados de entregas próximas
            await this.loadUpcomingDeliveries();
            
            // Carrega os últimos pedidos
            await this.loadLatestOrders();
            
            // Carrega os pontos de controle
            await this.loadControlPoints();
            
            // Carrega os pedidos para entregar
            await this.loadDeliveryOrders();
            
            this.isLoading = false;
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            this.isLoading = false;
            throw error;
        }
    }
    
    // Carrega estatísticas gerais
    async loadStatistics() {
        // Obtém a data atual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtém o primeiro dia do mês atual
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Pedidos do dia
        const dailyOrdersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', today)
            .get();
        
        this.statsData.dailyOrders = dailyOrdersSnapshot.size;
        
        // Pedidos pendentes
        const pendingOrdersSnapshot = await db.collection('orders')
            .where('status', 'in', ['pending', 'approved', 'production'])
            .get();
        
        this.statsData.pendingOrders = pendingOrdersSnapshot.size;
        
        // Pedidos e faturamento do mês
        const monthlyOrdersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', firstDayOfMonth)
            .get();
        
        // Total de pedidos do mês
        this.statsData.monthlyOrders = monthlyOrdersSnapshot.size;
        
        // Faturamento do mês
        let monthlyRevenue = 0;
        monthlyOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            monthlyRevenue += order.totalValue || 0;
        });
        
        this.statsData.monthlyRevenue = monthlyRevenue;
        
        // Total de clientes
        const clientsSnapshot = await db.collection('clients').get();
        this.statsData.totalClients = clientsSnapshot.size;
    }
    
    // Carrega entregas próximas
    async loadUpcomingDeliveries() {
        try {
            const today = new Date();
            
            // Data limite (7 dias a partir de hoje)
            const limitDate = new Date();
            limitDate.setDate(today.getDate() + 7);
            
            // Simplificando a consulta para evitar a necessidade de um índice composto
            // Primeiro, obtenha todos os pedidos com status pendentes
            const snapshot = await db.collection('orders')
                .where('status', 'in', ['pending', 'approved', 'production'])
                .get();
            
            this.upcomingDeliveries = [];
            
            // Depois, filtre manualmente por data de entrega e ordene
            snapshot.forEach(doc => {
                const order = doc.data();
                const deliveryDate = order.deliveryDate && order.deliveryDate.toDate ? 
                    order.deliveryDate.toDate() : 
                    new Date(order.deliveryDate);
                
                // Verifica se a data de entrega está dentro do intervalo desejado
                if (deliveryDate >= today && deliveryDate <= limitDate) {
                    this.upcomingDeliveries.push({
                        id: doc.id,
                        orderNumber: order.orderNumber,
                        clientName: order.clientName,
                        deliveryDate: order.deliveryDate,
                        status: order.status
                    });
                }
            });
            
            // Ordena manualmente por data de entrega
            this.upcomingDeliveries.sort((a, b) => {
                const dateA = a.deliveryDate && a.deliveryDate.toDate ? 
                    a.deliveryDate.toDate() : 
                    new Date(a.deliveryDate);
                
                const dateB = b.deliveryDate && b.deliveryDate.toDate ? 
                    b.deliveryDate.toDate() : 
                    new Date(b.deliveryDate);
                
                return dateA - dateB;
            });
            
            // Limita a 10 resultados
            this.upcomingDeliveries = this.upcomingDeliveries.slice(0, 10);
        } catch (error) {
            console.error("Erro ao carregar entregas próximas:", error);
            this.upcomingDeliveries = [];
        }
    }
    
    // Carrega pedidos recentes
    async loadLatestOrders() {
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        this.latestOrders = [];
        
        snapshot.forEach(doc => {
            const order = doc.data();
            this.latestOrders.push({
                id: doc.id,
                orderNumber: order.orderNumber,
                clientName: order.clientName,
                totalValue: order.totalValue,
                status: order.status,
                createdAt: order.createdAt
            });
        });
    }
    
    // Carrega os dados para os pontos de controle
    async loadControlPoints() {
        try {
            // Consulta para cada status dos pontos de controle
            try {
                // Busca todos os pedidos por status, sem filtrar por usuário
                const queryOrcamento = await db.collection('orders')
                    .where('status', '==', 'budget')
                    .get();
                    
                const queryAguardando = await db.collection('orders')
                    .where('status', '==', 'pending')
                    .get();
                    
                const queryImpressao = await db.collection('orders')
                    .where('status', '==', 'printing')
                    .get();
                    
                const queryCortesEspeciais = await db.collection('orders')
                    .where('status', '==', 'cutting')
                    .get();
                    
                const queryAcabamento = await db.collection('orders')
                    .where('status', '==', 'finishing')
                    .get();
                    
                const queryAplicacao = await db.collection('orders')
                    .where('status', '==', 'application')
                    .get();
                    
                const queryProntoNaEntrega = await db.collection('orders')
                    .where('status', '==', 'ready')
                    .get();
                    
                const queryEntregue = await db.collection('orders')
                    .where('status', '==', 'delivered')
                    .get();
                    
                // Atualiza os contadores de pontos de controle
                this.controlPoints = {
                    orcamento: queryOrcamento.size,
                    aguardando: queryAguardando.size,
                    impressao: queryImpressao.size,
                    cortesEspeciais: queryCortesEspeciais.size,
                    acabamento: queryAcabamento.size,
                    aplicacao: queryAplicacao.size,
                    prontoNaEntrega: queryProntoNaEntrega.size,
                    entregue: queryEntregue.size
                };
                
                console.log("Contagem de pedidos por status:", this.controlPoints);
            } catch (queryError) {
                console.error("Erro nas consultas dos pontos de controle:", queryError);
                this.controlPoints = this.demoData.controlPoints;
            }
        } catch (error) {
            console.error("Erro ao carregar dados dos pontos de controle:", error);
            // Em caso de erro, use os dados de demonstração
            this.controlPoints = this.demoData.controlPoints;
        }
    }
    
    // Carrega os pedidos para entregar
    async loadDeliveryOrders() {
        try {
            // Busca pedidos marcados como "needsDelivery" e não entregues ainda
            const query = await db.collection('orders')
                .where('needsDelivery', '==', true)
                .where('status', 'in', ['ready', 'finishing', 'printing', 'cutting', 'application'])
                .orderBy('deliveryDate', 'asc')
                .limit(10)
                .get();
                
            this.deliveryOrders = [];
            
            if (!query.empty) {
                query.forEach(doc => {
                    const order = doc.data();
                    
                    this.deliveryOrders.push({
                        id: doc.id,
                        orderNumber: order.orderNumber || 'S/N',
                        clientName: order.clientName || 'Cliente não identificado',
                        clientAddress: order.clientAddress || 'Endereço não informado',
                        deliveryDate: order.deliveryDate ? order.deliveryDate.toDate() : null,
                        toArrange: order.toArrange || false,
                        status: order.status,
                        deliveryCost: order.deliveryCost || 0
                    });
                });
                
                // Ordena por data de entrega (os com data não definida ficam no final)
                this.deliveryOrders.sort((a, b) => {
                    if (a.toArrange && !b.toArrange) return 1;
                    if (!a.toArrange && b.toArrange) return -1;
                    if (!a.deliveryDate && !b.deliveryDate) return 0;
                    if (!a.deliveryDate) return 1;
                    if (!b.deliveryDate) return -1;
                    return a.deliveryDate - b.deliveryDate;
                });
                
                console.log("Pedidos para entregar carregados:", this.deliveryOrders.length);
            } else {
                console.log("Nenhum pedido para entregar encontrado");
                
                // Se não houver dados reais, use os dados de demonstração
                if (!window.PRODUCTION_MODE) {
                    this.deliveryOrders = this.demoData.deliveryOrders;
                }
            }
        } catch (error) {
            console.error("Erro ao carregar pedidos para entregar:", error);
            
            // Em caso de erro, use dados de demonstração
            if (!window.PRODUCTION_MODE) {
                this.deliveryOrders = this.demoData.deliveryOrders;
            }
        }
    }
    
    // Configura listeners para atualização em tempo real
    setupRealtimeListeners() {
        // Verifica se já existem listeners ativos e remove
        this.cleanup();
        
        // Flag para controlar se o componente está ativo
        this.isActive = true;
        
        console.log("Configurando listeners do dashboard");
        
        // Listener para novos pedidos com menos frequência de atualização
        this.ordersListener = db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                // Verifica se o componente ainda está montado
                if (!this.isActive) {
                    console.log("Dashboard já não está mais ativo, ignorando atualização");
                    return;
                }
                
                let newOrders = false;
                
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' || change.type === 'modified') {
                        newOrders = true;
                    }
                });
                
                if (newOrders) {
                    // Usa debounce para evitar múltiplas atualizações em sequência
                    if (this.updateTimeout) {
                        clearTimeout(this.updateTimeout);
                    }
                    
                    this.updateTimeout = setTimeout(() => {
                        // Verifica novamente se o componente ainda está ativo
                        if (this.isActive) {
                            // Recarrega os dados e atualiza a UI
                            this.loadData().then(() => this.renderDashboard());
                        }
                    }, 2000); // Espera 2 segundos antes de atualizar
                }
            }, error => {
                console.error("Erro no listener de pedidos:", error);
            });
            
        // Listener para atualizações nos pontos de controle
        try {
            // Listener para todos os pedidos sem filtrar por usuário - com throttling
            this.controlPointsListener = db.collection('orders')
                .onSnapshot(() => {
                    // Verifica se o componente ainda está montado
                    if (!this.isActive) {
                        console.log("Dashboard já não está mais ativo, ignorando atualização de pontos de controle");
                        return;
                    }
                    
                    // Usa throttle para limitar frequência de atualizações
                    if (this.controlPointsTimeout) {
                        clearTimeout(this.controlPointsTimeout);
                    }
                    
                    this.controlPointsTimeout = setTimeout(() => {
                        if (!this.isActive) return;
                        
                        // Recarrega apenas os dados de pontos de controle e atualiza o bloco
                        this.loadControlPoints().then(() => {
                            if (!this.isActive) return;
                            
                            const controlPointsSection = document.querySelector('.control-points-card');
                            if (controlPointsSection) {
                                const titleElement = controlPointsSection.querySelector('h3');
                                if (titleElement) {
                                    titleElement.insertAdjacentHTML('afterend', this.renderControlPoints());
                                    // Remove o conteúdo anterior
                                    const oldPoints = controlPointsSection.querySelector('.control-points');
                                    if (oldPoints) {
                                        oldPoints.remove();
                                    }
                                }
                            }
                        });
                        
                        // Atualiza também os pedidos para entregar
                        this.loadDeliveryOrders().then(() => {
                            if (!this.isActive) return;
                            
                            const truckIcon = document.querySelector('.table-card h3 i.fa-truck');
                            if (truckIcon) {
                                const deliverySection = truckIcon.closest('.table-card');
                                if (deliverySection) {
                                    // Mantém o cabeçalho e substitui o conteúdo
                                    const header = deliverySection.querySelector('h3');
                                    if (header) {
                                        deliverySection.innerHTML = '';
                                        deliverySection.appendChild(header);
                                        deliverySection.insertAdjacentHTML('beforeend', this.renderDeliveryOrders());
                                        
                                        // Reativa os event listeners para os pedidos clicáveis
                                        this.setupClickableRows();
                                    }
                                }
                            }
                        });
                    }, 3000); // Espera 3 segundos antes de atualizar
                }, error => {
                    console.error("Erro no listener de pontos de controle:", error);
                });
        } catch (error) {
            console.error("Erro ao configurar listener de pontos de controle:", error);
        }
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
            
            <div class="dashboard-stats">
                ${this.renderStatsCards()}
            </div>
            
            <div class="table-card control-points-card">
                <h3><i class="fas fa-tasks"></i> Ponto de Controle</h3>
                ${this.renderControlPoints()}
            </div>
            
            <div class="table-card">
                <h3><i class="fas fa-truck"></i> Pedidos para Entregar</h3>
                ${this.renderDeliveryOrders()}
            </div>
            
            <div class="dashboard-tables">
                <div class="table-card">
                    <h3><i class="fas fa-exclamation-circle"></i> Entregas Próximas</h3>
                    ${this.renderUpcomingDeliveries()}
                </div>
                
                <div class="table-card">
                    <h3><i class="fas fa-clipboard-list"></i> Últimos Pedidos</h3>
                    ${this.renderLatestOrders()}
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
        }
        
        html += `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-title">Total de Clientes</div>
                <div class="stat-value">${this.statsData.totalClients}</div>
            </div>
        `;
        
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
                        <th>Nº Pedido</th>
                        <th>Cliente</th>
                        <th>Entrega</th>
                        <th>Status</th>
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
            
            const alertIcon = isLate ? '<i class="fas fa-exclamation-triangle alert-icon"></i>' : 
                             isCloseToDue ? '<i class="fas fa-hourglass-half alert-icon"></i>' : '';
            
            // Encontra o objeto de status
            const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === delivery.status) || 
                             { name: 'Desconhecido', color: '' };
            
            html += `
                <tr data-id="${delivery.id}" class="clickable-row">
                    <td>${alertIcon} ${delivery.orderNumber}</td>
                    <td>${delivery.clientName}</td>
                    <td>${ui.formatDate(delivery.deliveryDate)}</td>
                    <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
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
                        <th>Nº Pedido</th>
                        <th>Cliente</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Data</th>
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
                    <td>${order.orderNumber}</td>
                    <td>${order.clientName}</td>
                    <td>${ui.formatCurrency(order.totalValue)}</td>
                    <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                    <td>${ui.formatDate(order.createdAt)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
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
    
    // Renderiza os pedidos para entregar
    renderDeliveryOrders() {
        if (this.deliveryOrders.length === 0) {
            return '<p class="no-data-message">Não há pedidos para entrega no momento.</p>';
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nº Pedido</th>
                        <th>Cliente</th>
                        <th>Endereço</th>
                        <th>Data de Entrega</th>
                        <th>Valor da Entrega</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.deliveryOrders.forEach(order => {
            // Obtém informações do status
            const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || {
                name: 'Status Desconhecido',
                color: '#999'
            };
            
            // Formata data de entrega
            let deliveryDateDisplay = '-';
            if (order.toArrange) {
                deliveryDateDisplay = 'A combinar';
            } else if (order.deliveryDate) {
                const dateObj = order.deliveryDate instanceof Date ? order.deliveryDate : new Date(order.deliveryDate.seconds * 1000);
                deliveryDateDisplay = dateObj.toLocaleDateString('pt-BR');
            }
            
            html += `
                <tr data-id="${order.id}" class="clickable-row">
                    <td>${order.orderNumber}</td>
                    <td>${order.clientName}</td>
                    <td>${order.clientAddress}</td>
                    <td>${deliveryDateDisplay}</td>
                    <td>R$ ${order.deliveryCost.toFixed(2)}</td>
                    <td><span class="status-tag ${statusObj.color}">${statusObj.name}</span></td>
                    <td>
                        <button class="btn-icon view-order" data-id="${order.id}" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit-order" data-id="${order.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
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
        `;
        
        return html;
    }
    
    // Configura os eventos para as linhas de tabelas clicáveis
    setupClickableRows() {
        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Ignora se o clique foi em um botão
                if (e.target.closest('.btn-icon')) return;
                
                const orderId = row.getAttribute('data-id');
                if (orderId) {
                    // Salva o ID do pedido para a página de pedidos poder abri-lo
                    localStorage.setItem('viewOrderId', orderId);
                    
                    // Navega para a página de pedidos
                    ui.navigateTo('orders');
                }
            });
        });
        
        // Adiciona event listeners para os botões de ação
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
                localStorage.setItem('viewOrderId', orderId);
                ui.navigateTo('orders');
            });
        });
        
        document.querySelectorAll('.edit-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
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
        
        // Desativa os listeners do Firestore
        if (this.ordersListener) {
            this.ordersListener();
            this.ordersListener = null;
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
                        
                        // Se o status for 'cancelled', pergunta o motivo
                        if (newStatus === 'cancelled') {
                            const reason = await this.askCancellationReason();
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
            ui.showNotification('Erro ao buscar informações do pedido.', 'error');
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
}

// Registra o componente globalmente
window.DashboardComponent = DashboardComponent; 