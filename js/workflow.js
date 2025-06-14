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
    
    // Renderiza o componente
    async render(container) {
        this.container = container;
        
        // Exibe carregando
        this.container.innerHTML = `
            <div class="dashboard-loader">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando fluxo de trabalho...</p>
            </div>
        `;
        
        try {
            // Carrega os pedidos para cada status
            await this.loadOrdersByStatus();
            
            // Renderiza o layout da página
            this.renderWorkflow();
        } catch (error) {
            console.error("Erro ao carregar fluxo de trabalho:", error);
            this.container.innerHTML = `
                <div class="error-page">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro ao carregar</h2>
                    <p>Ocorreu um erro ao carregar os dados do fluxo de trabalho.</p>
                    <button class="btn btn-primary" id="retry-button">Tentar Novamente</button>
                </div>
            `;
            
            document.getElementById('retry-button').addEventListener('click', () => {
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
            const snapshot = await db.collection('orders')
                .where('status', 'in', this.workflowStatuses)
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
                        createdAt: order.createdAt
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
    
    renderOrdersList(status) {
        const orders = this.statusBlocks[status];
        
        if (orders.length === 0) {
            return `<div class="no-orders-message">Nenhum pedido encontrado</div>`;
        }
        
        let html = '<div class="workflow-orders-list">';
        
        orders.forEach(order => {
            // Formata a data de entrega
            let deliveryDate = order.deliveryDate;
            let deliveryTimeDisplay = '-';
            let deliverySituation = 'Pendente';
            
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
            
            // Define a situação
            if (order.toArrange) {
                deliverySituation = 'A combinar';
            } else if (order.delivered) {
                deliverySituation = 'Entregue';
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
        return html;
    }
    
    // Mostra detalhes de um pedido selecionado
    showOrderDetails(orderId) {
        console.log(`Abrindo pedido do fluxo de trabalho: ${orderId}`);
        
        // Navega para a página de pedidos e abre o pedido diretamente
        ui.navigateTo('orders', () => {
            // Callback executado após carregar o componente de pedidos
            if (window.currentComponent && window.currentComponent instanceof OrdersComponent) {
                // Usa o método showDetailView diretamente no componente de pedidos
                window.currentComponent.showDetailView(orderId);
            }
        });
    }
    
    // Mostra diálogo para alterar o status do pedido
    showChangeStatusDialog(orderId) {
        // Encontra o pedido pelo ID
        const order = this.findOrderById(orderId);
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
                    await this.loadOrdersByStatus();
                    this.renderWorkflow();
                    
                    ui.hideLoading();
                } catch (error) {
                    console.error('Erro ao atualizar status do pedido:', error);
                    ui.hideLoading();
                    ui.showNotification('Erro ao atualizar status do pedido.', 'error');
                }
            }
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
    
    // Encontra um pedido pelo ID em todos os blocos de status
    findOrderById(orderId) {
        for (const status in this.statusBlocks) {
            const order = this.statusBlocks[status].find(o => o.id === orderId);
            if (order) return order;
        }
        return null;
    }
}

// Registra o componente globalmente
window.WorkflowComponent = WorkflowComponent; 