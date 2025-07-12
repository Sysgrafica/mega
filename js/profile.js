// js/profile.js

window.Profile = class Profile {
    constructor() {
        const userJSON = localStorage.getItem('currentUser');
        this.user = userJSON ? JSON.parse(userJSON) : null;
        this.userName = this.user ? this.user.name : 'Usuário';
    }

    async render() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('Elemento main-content não encontrado.');
            return;
        }

        let sellerStatsHTML = '';
        if (this.user && this.user.role === 'seller') {
            const stats = await this.getSellerOrderStats(this.user.id);
            
            // Gerar HTML para metas de categoria
            let categoryGoalsHTML = Object.entries(stats.categoryTotals).map(([categoryId, total]) => {
                const categoryName = stats.categoryNames[categoryId] || 'Categoria Desconhecida';
                const percentage = Math.min((total / 10000) * 100, 100);
                return `
                    <div class="goal-bar-container">
                        <label>${categoryName} (Meta: R$ 10.000)</label>
                        <div class="goal-bar">
                            <div class="goal-bar-progress" style="width: ${percentage}%;"></div>
                        </div>
                        <span>R$ ${total.toFixed(2)}</span>
                    </div>
                `;
            }).join('');

            // Adicionar barra de meta específica para Impressão Digital
            const digitalPrintingTotal = stats.categoryTotals['impressao-digital'] || 0;
            const digitalPrintingPercentage = Math.min((digitalPrintingTotal / 10000) * 100, 100);
            const digitalPrintingHTML = `
                <div class="goal-bar-container">
                    <label>Impressão Digital (Meta: R$ 10.000)</label>
                    <div class="goal-bar">
                        <div class="goal-bar-progress" style="width: ${digitalPrintingPercentage}%;"></div>
                    </div>
                    <span>R$ ${digitalPrintingTotal.toFixed(2)}</span>
                </div>
            `;

            // Gerar HTML para meta geral
            const totalGoalPercentage = Math.min((stats.totalMonthValue / 20000) * 100, 100);
            const totalGoalHTML = `
                <div class="goal-bar-container">
                    <label>Meta Mensal Geral (Meta: R$ 20.000)</label>
                    <div class="goal-bar">
                        <div class="goal-bar-progress" style="width: ${totalGoalPercentage}%;"></div>
                    </div>
                    <span>R$ ${stats.totalMonthValue.toFixed(2)}</span>
                </div>
            `;

            sellerStatsHTML = `
                <div class="profile-stats">
                    <h3>Estatísticas de Pedidos</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Hoje</h4>
                            <p>${stats.today}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Esta Semana</h4>
                            <p>${stats.thisWeek}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Este Mês</h4>
                            <p>${stats.thisMonth}</p>
                        </div>
                    </div>
                </div>
                <div class="profile-goals">
                    <h3>Metas de Vendas (Mês Atual)</h3>
                    ${totalGoalHTML}
                    <h4>Meta de Impressão Digital</h4>
                    ${digitalPrintingHTML}
                    <h4>Metas por Categoria</h4>
                    ${categoryGoalsHTML}
                </div>
            `;
        }

        mainContent.innerHTML = `
            <div class="profile-page">
                <div class="content-header">
                    <h2><i class="fas fa-user-circle"></i> Perfil de Usuário</h2>
                </div>
                <div class="content-body">
                    <p class="welcome-message">Olá, seja bem-vindo(a) à sua página, ${this.userName}!</p>
                    ${sellerStatsHTML}
                    <p>Em breve, mais funcionalidades estarão disponíveis aqui.</p>
                </div>
            </div>
        `;
        this.addEventListeners();
    }

    async getSellerOrderStats(sellerId) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            totalMonthValue: 0,
            categoryTotals: {},
            categoryNames: {}
        };

        try {
            // Definir ID e nome da categoria de Impressão Digital
            const IMPRESSAO_DIGITAL_ID = 'impressao-digital';
            const IMPRESSAO_DIGITAL_NAME = 'Impressão Digital';
            
            // Inicializar a categoria de Impressão Digital
            stats.categoryTotals[IMPRESSAO_DIGITAL_ID] = 0;
            stats.categoryNames[IMPRESSAO_DIGITAL_ID] = IMPRESSAO_DIGITAL_NAME;
            
            // Primeiro, buscamos todas as categorias para ter seus nomes e IDs
            const categoriesSnapshot = await db.collection('categories').get();
            const categoriesMap = {};
            
            categoriesSnapshot.forEach(doc => {
                const category = doc.data();
                const categoryId = doc.id;
                const categoryName = category.name;
                
                // Armazenar no mapa para uso posterior
                categoriesMap[categoryId] = categoryName;
                
                // Inicializar todas as categorias no objeto de estatísticas
                stats.categoryNames[categoryId] = categoryName;
                stats.categoryTotals[categoryId] = 0;
                
                // Verificar se é a categoria de Impressão Digital (comparação case-insensitive)
                if (categoryName.toLowerCase() === IMPRESSAO_DIGITAL_NAME.toLowerCase()) {
                    stats.categoryNames[IMPRESSAO_DIGITAL_ID] = categoryName;
                }
            });
            
            console.log("Categorias carregadas:", categoriesMap);

            // Depois, buscamos todos os produtos para mapear produto -> categoria
            const productCategoryMap = {};
            const productsSnapshot = await db.collection('products').get();
            
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                const productId = doc.id;
                
                if (product.category) {
                    const categoryId = product.category.id;
                    const categoryName = product.category.name || categoriesMap[categoryId] || 'Categoria Desconhecida';
                    
                    // Armazenar mapeamento de produto para categoria
                    productCategoryMap[productId] = {
                        categoryId: categoryId,
                        categoryName: categoryName
                    };
                    
                    // Garantir que o nome da categoria esteja no mapa de nomes
                    stats.categoryNames[categoryId] = categoryName;
                    
                    // Verificar se este produto pertence à categoria de Impressão Digital
                    if (categoryName.toLowerCase().includes('impressão digital') || 
                        categoryName.toLowerCase().includes('impressao digital')) {
                        // Associar este ID de categoria ao ID padrão de Impressão Digital
                        console.log(`Produto ${productId} identificado como Impressão Digital`);
                    }
                }
            });
            
            console.log("Mapeamento de produtos para categorias:", productCategoryMap);

            // Agora buscamos os pedidos do vendedor
            const ordersRef = db.collection('orders').where('sellerId', '==', sellerId);
            const snapshot = await ordersRef.get();

            snapshot.forEach(doc => {
                const order = doc.data();
                const createdAt = order.createdAt.toDate();

                // Não contabilizar pedidos cancelados nas estatísticas
                if (order.status === 'cancelled') {
                    return;
                }

                if (createdAt >= startOfToday) {
                    stats.today++;
                }
                if (createdAt >= startOfWeek) {
                    stats.thisWeek++;
                }
                if (createdAt >= startOfMonth) {
                    stats.thisMonth++;
                    
                    // Apenas pedidos com status 'delivered' contam para as metas de valor
                    if (order.status === 'delivered') {
                        // Calculamos o valor total de produtos e serviços, excluindo entrega
                        let orderProductsValue = 0;
                        
                        // Processamos cada item do pedido individualmente
                        if (order.items && Array.isArray(order.items)) {
                            order.items.forEach(item => {
                                // Verificamos se o item tem um produto associado
                                const itemValue = parseFloat(item.total) || 0;
                                orderProductsValue += itemValue; // Somamos ao valor total de produtos
                                
                                // Log para debug
                                console.log(`Processando item: ${JSON.stringify(item)}`);
                                
                                let categoryId = null;
                                let isImpressaoDigital = false;
                                
                                // Verificar se o item tem productId
                                if (item.productId) {
                                    const productInfo = productCategoryMap[item.productId];
                                    if (productInfo) {
                                        categoryId = productInfo.categoryId;
                                        
                                        // Verificar se o nome da categoria inclui "Impressão Digital"
                                        if (productInfo.categoryName.toLowerCase().includes('impressão digital') || 
                                            productInfo.categoryName.toLowerCase().includes('impressao digital')) {
                                            isImpressaoDigital = true;
                                        }
                                    }
                                }
                                // Verificar se o item tem produto embutido
                                else if (item.product && item.product.category) {
                                    categoryId = item.product.category.id;
                                    const categoryName = item.product.category.name || '';
                                    
                                    // Verificar se o nome da categoria inclui "Impressão Digital"
                                    if (categoryName.toLowerCase().includes('impressão digital') || 
                                        categoryName.toLowerCase().includes('impressao digital')) {
                                        isImpressaoDigital = true;
                                    }
                                }
                                
                                // Se o item pertence a uma categoria
                                if (categoryId) {
                                    // Inicializar contador se necessário
                                    if (!stats.categoryTotals[categoryId]) {
                                        stats.categoryTotals[categoryId] = 0;
                                    }
                                    
                                    // Adicionar valor à categoria
                                    stats.categoryTotals[categoryId] += itemValue;
                                    
                                    console.log(`Adicionando ${itemValue} à categoria ${categoryId}`);
                                }
                                
                                // Se for Impressão Digital, adicionar também à categoria específica
                                if (isImpressaoDigital) {
                                    stats.categoryTotals[IMPRESSAO_DIGITAL_ID] += itemValue;
                                    console.log(`Adicionando ${itemValue} à Impressão Digital`);
                                }
                            });
                        }
                        
                        // Contabilizar serviços extras (se houver)
                        if (order.extraServices && Array.isArray(order.extraServices)) {
                            order.extraServices.forEach(service => {
                                const serviceValue = parseFloat(service.price) || 0;
                                orderProductsValue += serviceValue;
                                
                                // Se o serviço tiver uma categoria associada, adicionar à categoria correspondente
                                if (service.categoryId) {
                                    if (!stats.categoryTotals[service.categoryId]) {
                                        stats.categoryTotals[service.categoryId] = 0;
                                    }
                                    stats.categoryTotals[service.categoryId] += serviceValue;
                                    
                                    // Se for serviço de Impressão Digital, adicionar à categoria específica
                                    const categoryName = service.categoryName || categoriesMap[service.categoryId] || '';
                                    if (categoryName.toLowerCase().includes('impressão digital') || 
                                        categoryName.toLowerCase().includes('impressao digital')) {
                                        stats.categoryTotals[IMPRESSAO_DIGITAL_ID] += serviceValue;
                                    }
                                }
                                // Se não tiver categoria, adicionar a uma categoria genérica "Serviços"
                                else {
                                    const serviceCategoryId = 'servicos';
                                    if (!stats.categoryTotals[serviceCategoryId]) {
                                        stats.categoryTotals[serviceCategoryId] = 0;
                                        stats.categoryNames[serviceCategoryId] = 'Serviços';
                                    }
                                    stats.categoryTotals[serviceCategoryId] += serviceValue;
                                }
                            });
                        }
                        
                        // Contabilizar descontos (subtraindo do total)
                        if (order.discount) {
                            const discountValue = parseFloat(order.discount) || 0;
                            orderProductsValue -= discountValue;
                            
                            // Distribuir o desconto proporcionalmente entre as categorias
                            if (discountValue > 0) {
                                const totalBeforeDiscount = orderProductsValue + discountValue;
                                if (totalBeforeDiscount > 0) {
                                    const discountRatio = discountValue / totalBeforeDiscount;
                                    
                                    // Aplicar o desconto proporcionalmente a cada categoria
                                    Object.keys(stats.categoryTotals).forEach(categoryId => {
                                        const categoryDiscount = stats.categoryTotals[categoryId] * discountRatio;
                                        stats.categoryTotals[categoryId] -= categoryDiscount;
                                    });
                                }
                            }
                        }
                        
                        // Usamos o valor final (produtos + serviços extras - descontos) para a meta total
                        stats.totalMonthValue += orderProductsValue;
                    }
                }
            });
            
            console.log("Estatísticas finais:", stats);
        } catch (error) {
            console.error("Erro ao buscar estatísticas de pedidos:", error);
        }

        return stats;
    }

    addEventListeners() {
        // Futuros listeners podem ser adicionados aqui
    }

    init() {
        // Adiciona o evento de clique ao nome do usuário na barra superior
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.style.cursor = 'pointer';
            userNameElement.style.textDecoration = 'underline';
            userNameElement.addEventListener('click', () => {
                // Utiliza o sistema de navegação existente
                if (window.ui && typeof window.ui.navigateTo === 'function') {
                    window.ui.navigateTo('profile');
                } else {
                    this.render();
                }
            });
        }
    }
} 