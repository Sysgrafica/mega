// Componente do Dashboard
class DashboardComponent {
    constructor() {
        this.container = null;
        this.statsData = {
            dailyOrders: 0,
            pendingOrders: 0,
            monthlyRevenue: 0,
            totalClients: 0
        };
        this.upcomingDeliveries = [];
        this.latestOrders = [];
        
        // Dados de demonstração para quando não há dados no Firestore
        this.demoData = {
            statsData: {
                dailyOrders: 12,
                pendingOrders: 28,
                monthlyRevenue: 15340,
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
        
        try {
            // Carrega dados do Firestore
            await this.loadData();
            
            // Verifica se há dados e, se não houver, usa os dados de demonstração
            if (this.statsData.dailyOrders === 0 && 
                this.statsData.pendingOrders === 0 && 
                this.upcomingDeliveries.length === 0 && 
                this.latestOrders.length === 0) {
                
                console.log("Usando dados de demonstração para o dashboard");
                
                // Usa dados de demonstração
                this.statsData = this.demoData.statsData;
                this.upcomingDeliveries = this.demoData.upcomingDeliveries;
                this.latestOrders = this.demoData.latestOrders;
                
                // Cria alguns dados de demonstração no Firestore
                this.createDemoData();
            }
            
            // Renderiza o conteúdo do dashboard
            this.renderDashboard();
            
            // Configura listeners para atualização em tempo real
            this.setupRealtimeListeners();
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            ui.showNotification("Erro ao carregar dados do dashboard. Usando dados de demonstração.", "warning");
            
            // Usa dados de demonstração em caso de erro
            this.statsData = this.demoData.statsData;
            this.upcomingDeliveries = this.demoData.upcomingDeliveries;
            this.latestOrders = this.demoData.latestOrders;
            
            // Renderiza o dashboard com dados de demonstração
            this.renderDashboard();
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
            // Carrega estatísticas
            await this.loadStatistics();
            
            // Carrega entregas próximas
            await this.loadUpcomingDeliveries();
            
            // Carrega pedidos recentes
            await this.loadLatestOrders();
            
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            throw error; // Propaga o erro para ser tratado no método render
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
        
        // Faturamento do mês
        const monthlyOrdersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', firstDayOfMonth)
            .get();
        
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
    
    // Configura listeners para atualização em tempo real
    setupRealtimeListeners() {
        // Listener para novos pedidos
        this.ordersListener = db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                let newOrders = false;
                
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' || change.type === 'modified') {
                        newOrders = true;
                    }
                });
                
                if (newOrders) {
                    // Recarrega os dados e atualiza a UI
                    this.loadData().then(() => this.renderDashboard());
                }
            }, error => {
                console.error("Erro no listener de pedidos:", error);
            });
    }
    
    // Renderiza o conteúdo do dashboard
    renderDashboard() {
        this.container.innerHTML = `
            <h1>Dashboard</h1>
            
            <div class="dashboard-stats">
                ${this.renderStatsCards()}
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
    }
    
    // Renderiza os cards de estatísticas
    renderStatsCards() {
        return `
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
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="stat-title">Faturamento do Mês</div>
                <div class="stat-value">${ui.formatCurrency(this.statsData.monthlyRevenue)}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-title">Total de Clientes</div>
                <div class="stat-value">${this.statsData.totalClients}</div>
            </div>
        `;
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
    
    // Limpa os listeners quando o componente é desmontado
    cleanup() {
        if (this.ordersListener) {
            this.ordersListener();
        }
    }
}

// Registra o componente globalmente
window.DashboardComponent = DashboardComponent; 