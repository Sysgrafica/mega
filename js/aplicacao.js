class AplicacaoComponent {
    constructor() {
        this.container = null;
        this.orders = [];
        this.allOrders = []; // Armazena todos os pedidos carregados
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-loader">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando pedidos para aplicação...</p>
            </div>
        `;

        try {
            await this.loadAplicacaoOrders();
            this.renderAplicacaoPage();
        } catch (error) {
            console.error("Erro ao carregar página de aplicação:", error);
            this.container.innerHTML = `
                <div class="error-page">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro ao carregar</h2>
                    <p>Ocorreu um erro ao carregar os pedidos para aplicação.</p>
                    <button class="btn btn-primary" id="retry-aplicacao-button">Tentar Novamente</button>
                </div>
            `;
            document.getElementById('retry-aplicacao-button').addEventListener('click', () => {
                this.render(container);
            });
        }
    }

    async loadAplicacaoOrders() {
        try {
            const snapshot = await db.collection('orders')
                .where('status', '==', 'application') // Assumindo que o status no DB é 'application'
                .orderBy('deliveryDate', 'asc')
                .get();

            this.allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.orders = [...this.allOrders]; // Inicializa a lista de pedidos a ser exibida
        } catch (error) {
            console.error("Erro ao carregar pedidos de aplicação:", error);
            throw error;
        }
    }

    renderAplicacaoPage() {
        let html = `
            <div class="page-header">
                <h1><i class="fas fa-spray-can"></i> Aplicação</h1>
            </div>
            
            <div class="filters-bar">
                <div class="filter-group">
                    <label for="product-search-aplicacao">Produto/Serviço:</label>
                    <input type="text" id="product-search-aplicacao" class="search-input" placeholder="Digite o nome do produto...">
                </div>
            </div>

            <div class="aplicacao-container">
                <div id="aplicacao-orders-container">
                    ${this.renderOrdersList(this.orders)}
                </div>
            </div>
        `;
        this.container.innerHTML = html;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('product-search-aplicacao').addEventListener('input', () => this.applyFiltersAndRender());

        // Ações dos pedidos
        const ordersContainer = document.getElementById('aplicacao-orders-container');
        if (!ordersContainer) return;

        ordersContainer.addEventListener('click', (e) => {
            const target = e.target;
            const orderItem = target.closest('.search-order-card');
            if (!orderItem) return;

            const orderId = orderItem.dataset.id;
            const actionButton = target.closest('button');

            if (actionButton) {
                e.stopPropagation();
                if (actionButton.classList.contains('view-order')) {
                    this.showOrderDetails(orderId);
                } else if (actionButton.classList.contains('change-status')) {
                    this.showChangeStatusDialog(orderId);
                }
            } else {
                // Click on the card itself, not a button
                this.showOrderDetails(orderId);
            }
        });
    }

    applyFiltersAndRender() {
        const productSearch = document.getElementById('product-search-aplicacao').value.toLowerCase();

        let filteredOrders = this.allOrders.filter(order => {
            if (!productSearch) {
                return true; // Se a busca estiver vazia, mostra todos os pedidos
            }

            return order.items.some(item => {
                let productName = '';
                if (item.product) {
                    if (typeof item.product === 'string') {
                        productName = item.product;
                    } else if (typeof item.product === 'object' && item.product.name) {
                        productName = item.product.name;
                    }
                }
                return productName.toLowerCase().includes(productSearch);
            });
        });

        this.orders = filteredOrders;
        const container = document.getElementById('aplicacao-orders-container');
        container.innerHTML = this.renderOrdersList(this.orders);
    }

    renderOrdersList(ordersToRender) {
        if (!ordersToRender || ordersToRender.length === 0) {
            return `<div class="no-orders-message">Nenhum pedido encontrado com os filtros aplicados.</div>`;
        }

        let ordersHtml = '<div class="aplicacao-orders-grid">';
        ordersToRender.forEach(order => {
            const situacao = this.getSituacao(order);
            const statusInfo = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || { name: order.status, color: 'status-pending' };

            ordersHtml += `
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
                        <div class="aplicacao-order-actions">
                             <button class="btn btn-sm view-order" data-id="${order.id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                             <button class="btn btn-sm change-status" data-id="${order.id}" title="Alterar Status"><i class="fas fa-check-square"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        ordersHtml += '</div>';
        return ordersHtml;
    }

    getDeliveryText(order) {
        if (order.toArrange) {
            return 'Entrega: A combinar';
        }
        if (order.deliveryDate) {
            const date = order.deliveryDate.toDate();
            return `Entrega: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return 'Entrega: Não definida';
    }

    getSituacao(order) {
        if (order.toArrange) return { text: 'A combinar', class: 'situacao-combinar' };
        if (!order.deliveryDate) return { text: 'Pendente', class: 'situacao-pendente' };
        
        const diffMinutes = (order.deliveryDate.toDate().getTime() - new Date().getTime()) / (1000 * 60);

        if (diffMinutes < 0) {
            return { text: 'Atrasado', class: 'situacao-atrasado' };
        }
        if (diffMinutes <= 60) {
            return { text: 'Apresse', class: 'situacao-apresse' };
        }
        return { text: 'No prazo', class: 'situacao-no-prazo' };
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

    // Mostra detalhes do pedido em um modal
    async showOrderDetails(orderId) {
        // Usa a função global do UI
        await window.ui.showOrderDetails(orderId);
    }

    // Mostra o diálogo para alterar o status do pedido
    async showChangeStatusDialog(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            // Usa a função global do UI e passa um callback para recarregar
            await window.ui.showChangeStatusDialog(orderId, order.status, () => {
                this.render(this.container); // Recarrega os dados na página
            });
        } else {
            console.error(`Pedido com ID ${orderId} não encontrado.`);
            window.ui.showNotification('Ocorreu um erro ao encontrar o pedido.', 'error');
        }
    }
}

// Attach to the global window object
window.AplicacaoComponent = AplicacaoComponent; 