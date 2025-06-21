// Componente de Fluxo de Trabalho
class WorkflowComponent {
    constructor() {
        this.container = null;
        this.statusBlocks = {};
        
        // Define os status que queremos exibir (em ordem)
        this.workflowStatuses = [
            "budget",      // Orçamento
            "pending",     // Aguardando
            "printing",    // Impressão
            "cutting",     // Cortes Especiais
            "finishing",   // Acabamento
            "application", // Aplicação
            "ready",       // Pronto na entrega
            "delivered"    // Entregue
        ];
    }
    
    // Renderiza o componente principal
    async render(container) {
        this.container = container;
        
        // Torna a instância disponível globalmente para que o botão "Ver mais" possa chamar o método redirectToSearchWithDeliveredFilter
        window.workflow = this;
        
        // Exibe loader
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loader"></div>
                <p>Carregando fluxo de trabalho...</p>
            </div>
        `;
        
        try {
            // Carrega os pedidos agrupados por status
            await this.loadOrdersByStatus();
            
            // Renderiza o fluxo de trabalho
            this.renderWorkflow();
            
            // Configura os listeners em tempo real
            this.setupRealtimeListeners();
        } catch (error) {
            console.error("Erro ao renderizar fluxo de trabalho:", error);
            this.container.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro ao carregar fluxo de trabalho</h2>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" id="retry-workflow">Tentar novamente</button>
                </div>
            `;
            
            // Adiciona event listener para o botão de tentar novamente
            document.getElementById('retry-workflow').addEventListener('click', () => {
                this.render(container);
            });
        }
    }
    
    // Carrega os pedidos agrupados por status
    async loadOrdersByStatus() {
        try {
            // Inicializa o objeto de blocos de status
            this.workflowStatuses.forEach(status => {
                this.statusBlocks[status] = [];
            });
            
            // Busca todos os pedidos ativos (não cancelados)
            // Consulta otimizada utilizando índices compostos
            const snapshot = await db.collection('orders')
                .where('status', 'in', this.workflowStatuses)
                .orderBy('createdAt', 'desc') // Usando índice composto status + createdAt
                .limit(200) // Limitando resultados para melhor performance
                .get();
            
            snapshot.forEach(doc => {
                const order = doc.data();
                const status = order.status;
                
                // Só adiciona se for um dos status que estamos monitorando
                if (this.statusBlocks.hasOwnProperty(status)) {
                    this.statusBlocks[status].push({
                        id: doc.id,
                        orderNumber: order.orderNumber,
                        clientName: order.clientName,
                        deliveryDate: order.deliveryDate,
                        totalValue: order.totalValue,
                        status: status,
                        createdAt: order.createdAt,
                        toArrange: order.toArrange || false,
                        delivered: order.delivered || false,
                        // Adiciona as propriedades de situação final
                        finalSituacao: order.finalSituacao || null,
                        finalSituacaoClass: order.finalSituacaoClass || null
                    });
                }
            });
            
            // Ordena cada bloco por data de entrega
            for (const status in this.statusBlocks) {
                this.statusBlocks[status].sort((a, b) => {
                    const dateA = a.deliveryDate && a.deliveryDate.toDate ? a.deliveryDate.toDate() : new Date(a.deliveryDate);
                    const dateB = b.deliveryDate && b.deliveryDate.toDate ? b.deliveryDate.toDate() : new Date(b.deliveryDate);
                    return dateA - dateB;
                });
            }
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
            throw error;
        }
    }
    
    // Renderiza a página de fluxo de trabalho
    renderWorkflow() {
        let html = `
            <div class="page-header">
                <h1><i class="fas fa-tasks"></i> Fluxo de Trabalho</h1>
            </div>
            
            <div class="workflow-container">
        `;
        
        // Adiciona cada bloco de status
        this.workflowStatuses.forEach(status => {
            const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === status);
            const statusName = statusObj ? statusObj.name : "Desconhecido";
            const statusColorClass = statusObj ? statusObj.color : "";
            
            html += `
                <div class="workflow-block ${statusColorClass}">
                    <div class="workflow-block-header">
                        <h3>${statusName}</h3>
                        <span class="order-count">${this.statusBlocks[status].length}</span>
                    </div>
                    <div class="workflow-block-content">
                        ${this.renderOrdersList(status)}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        this.container.innerHTML = html;
        
        // Adiciona event listeners aos pedidos para visualização rápida
        document.querySelectorAll('.workflow-order-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignorar cliques nos botões de ação
                if (e.target.closest('.workflow-order-actions')) {
                    return;
                }
                
                const orderId = e.currentTarget.dataset.id;
                this.showOrderDetails(orderId);
            });
        });
        
        // Adiciona event listeners para os botões de ação
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.currentTarget.getAttribute('data-id');
                this.showOrderDetails(orderId);
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
    
    // Renderiza a lista de pedidos para um status específico
    // Formata a hora de um timestamp
    formatTime(date) {
        if (!date) return '-';
        try {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error('Erro ao formatar hora:', e);
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
            return '<span class="situacao-pendente">Pendente</span>';
        }
    }
    
    renderOrdersList(status) {
        const orders = this.statusBlocks[status];
        
        if (orders.length === 0) {
            return `<div class="no-orders-message">Nenhum pedido encontrado</div>`;
        }
        
        let html = '<div class="workflow-orders-list">';
        
        // Se for o status "delivered" (entregue), limita a 10 pedidos
        const displayOrders = status === 'delivered' ? orders.slice(0, 10) : orders;
        
        displayOrders.forEach(order => {
            // Formata a data de entrega
            let deliveryDate = order.deliveryDate;
            let deliveryTimeDisplay = '-';
            
            if (deliveryDate) {
                if (deliveryDate.toDate) {
                    deliveryDate = deliveryDate.toDate();
                } else if (!(deliveryDate instanceof Date)) {
                    deliveryDate = new Date(deliveryDate);
                }
                deliveryTimeDisplay = this.formatTime(deliveryDate);
            } else {
                deliveryDate = new Date(); // Data padrão se não houver data de entrega
            }
            
            // Verifica se o pedido está atrasado
            const today = new Date();
            const isLate = deliveryDate < today;
            const isCloseToDeadline = !isLate && ((deliveryDate - today) / (1000 * 60 * 60 * 24)) <= 2; // 2 dias ou menos
            
            // Define a classe de alerta baseada no status de entrega
            let alertClass = '';
            if (isLate) {
                alertClass = 'order-late';
            } else if (isCloseToDeadline) {
                alertClass = 'order-urgent';
            }
            
            // Cria o card do pedido
            html += `
                <div class="workflow-order-item ${alertClass}" data-id="${order.id}">
                    <div class="order-client">${order.clientName}</div>
                    <div class="order-date">
                        ${isLate ? '<i class="fas fa-exclamation-triangle warning-icon"></i>' : ''}
                        ${isCloseToDeadline ? '<i class="fas fa-clock warning-icon"></i>' : ''}
                        ${ui.formatDate(deliveryDate)}
                    </div>
                    <div class="order-time">${deliveryTimeDisplay}</div>
                    <div class="order-situation">
                        ${this.getSituacaoHTML(order)}
                    </div>
                    <div class="order-status"><span class="status-tag-sm ${status}">${SYSTEM_CONFIG.orderStatus.find(s => s.id === status)?.name || 'Desconhecido'}</span></div>
                    <div class="workflow-order-actions">
                        <button class="btn-icon-sm view-order" data-id="${order.id}" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon-sm edit-order" data-id="${order.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon-sm change-status" data-id="${order.id}" title="Alterar Status">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Adiciona o botão "Ver mais" apenas para a seção "Entregue" se houver mais de 10 pedidos
        if (status === 'delivered' && orders.length > 10) {
            html += `
                <div class="see-more-container">
                    <button id="see-more-delivered" class="btn btn-secondary see-more-btn" onclick="window.workflow.redirectToSearchWithDeliveredFilter()">
                        <i class="fas fa-list"></i> Ver Todos os Pedidos Entregues
                    </button>
                </div>
            `;
        }
        
        return html;
    }
    
    // Mostra detalhes de um pedido selecionado
    async showOrderDetails(orderId) {
        await window.ui.showOrderDetails(orderId);
    }
    
    // Mostra diálogo para alterar o status do pedido
    async showChangeStatusDialog(orderId) {
        const order = this.findOrderById(orderId);
        if (order) {
            // Usa a função global do UI para consistência e passa um callback para recarregar
            await window.ui.showChangeStatusDialog(orderId, order.status, () => {
                // Recarrega os dados na página de workflow após a alteração do status
                this.render(this.container);
            });
        } else {
            window.ui.showNotification('Ocorreu um erro ao encontrar o pedido para alterar o status.', 'error');
        }
    }
    
    // Encontra um pedido pelo ID em todos os blocos de status
    findOrderById(orderId) {
        for (const status in this.statusBlocks) {
            const order = this.statusBlocks[status].find(o => o.id === orderId);
            if (order) return order;
        }
        return null;
    }
    
    // Configura listeners para atualização em tempo real
    setupRealtimeListeners() {
        // Limpa o listener anterior se existir
        if (this.ordersListener) {
            this.ordersListener();
        }
        
        // Listener para alterações em pedidos
        this.ordersListener = db.collection('orders')
            .where('status', 'in', this.workflowStatuses)
            .onSnapshot(snapshot => {
                let hasChanges = false;
                
                snapshot.docChanges().forEach(change => {
                    const order = change.doc.data();
                    const orderId = change.doc.id;
                    const status = order.status;
                    
                    // Verifica se o status está sendo monitorado
                    if (!this.statusBlocks.hasOwnProperty(status)) {
                        return;
                    }
                    
                    if (change.type === 'added') {
                        // Verifica se já existe na lista
                        const existingIndex = this.statusBlocks[status].findIndex(o => o.id === orderId);
                        if (existingIndex === -1) {
                            // Adiciona o novo pedido ao bloco correspondente
                            this.statusBlocks[status].push({
                                id: orderId,
                                orderNumber: order.orderNumber,
                                clientName: order.clientName,
                                deliveryDate: order.deliveryDate,
                                totalValue: order.totalValue,
                                status: status,
                                createdAt: order.createdAt,
                                toArrange: order.toArrange || false,
                                delivered: order.delivered || false,
                                finalSituacao: order.finalSituacao || null,
                                finalSituacaoClass: order.finalSituacaoClass || null
                            });
                            hasChanges = true;
                        }
                    } else if (change.type === 'modified') {
                        // Primeiro, verifica se o pedido existe em algum bloco e o remove
                        let found = false;
                        for (const blockStatus in this.statusBlocks) {
                            const index = this.statusBlocks[blockStatus].findIndex(o => o.id === orderId);
                            if (index !== -1) {
                                this.statusBlocks[blockStatus].splice(index, 1);
                                found = true;
                                break;
                            }
                        }
                        
                        // Adiciona o pedido atualizado ao bloco correto
                        this.statusBlocks[status].push({
                            id: orderId,
                            orderNumber: order.orderNumber,
                            clientName: order.clientName,
                            deliveryDate: order.deliveryDate,
                            totalValue: order.totalValue,
                            status: status,
                            createdAt: order.createdAt,
                            toArrange: order.toArrange || false,
                            delivered: order.delivered || false,
                            finalSituacao: order.finalSituacao || null,
                            finalSituacaoClass: order.finalSituacaoClass || null
                        });
                        
                        hasChanges = true;
                    } else if (change.type === 'removed') {
                        // Remove o pedido do bloco
                        for (const blockStatus in this.statusBlocks) {
                            const index = this.statusBlocks[blockStatus].findIndex(o => o.id === orderId);
                            if (index !== -1) {
                                this.statusBlocks[blockStatus].splice(index, 1);
                                hasChanges = true;
                                break;
                            }
                        }
                    }
                });
                
                // Reordena os blocos por data de entrega
                if (hasChanges) {
                    for (const status in this.statusBlocks) {
                        this.statusBlocks[status].sort((a, b) => {
                            const dateA = a.deliveryDate && a.deliveryDate.toDate ? a.deliveryDate.toDate() : new Date(a.deliveryDate);
                            const dateB = b.deliveryDate && b.deliveryDate.toDate ? b.deliveryDate.toDate() : new Date(b.deliveryDate);
                            return dateA - dateB;
                        });
                    }
                    
                    // Renderiza novamente o fluxo de trabalho
                    this.renderWorkflow();
                }
            }, error => {
                console.error("Erro no listener de pedidos do fluxo de trabalho:", error);
            });
    }
    
    // Limpa os listeners quando o componente é desmontado
    cleanup() {
        if (this.ordersListener) {
            this.ordersListener();
            this.ordersListener = null;
        }
        
        // Remove a referência global
        if (window.workflow === this) {
            window.workflow = null;
        }
    }
    
    // Redireciona para a página de Buscar Pedidos com o filtro pré-definido como "Entregue"
    redirectToSearchWithDeliveredFilter() {
        // Salva o filtro no localStorage para que a página de busca possa usá-lo
        localStorage.setItem('presetSearchFilter', JSON.stringify({
            status: 'delivered'
        }));
        
        // Navega para a página de busca de pedidos
        ui.navigateTo('search-orders');
    }
}

// Registra o componente globalmente
window.WorkflowComponent = WorkflowComponent; 