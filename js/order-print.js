// Componente para impressão de pedidos em formato A4
class OrderPrintComponent {
    constructor() {
        this.container = null;
    }
    
    // Renderiza o componente
    async render(container, orderId) {
        this.container = container;
        
        try {
            // Exibe o loader enquanto carrega os dados
            this.renderLoader();
            
            // Carrega o pedido
            const orderDoc = await db.collection('orders').doc(orderId).get();
            
            if (!orderDoc.exists) {
                this.renderError('Pedido não encontrado.');
                return;
            }
            
            const order = {
                id: orderDoc.id,
                ...orderDoc.data()
            };
            
            // Renderiza o layout de impressão
            this.renderOrderPrint(order);
            
        } catch (error) {
            console.error('Erro ao renderizar impressão do pedido:', error);
            this.renderError('Não foi possível carregar os dados do pedido. Por favor, tente novamente.');
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
                <button id="back-button" class="btn btn-primary">Voltar</button>
            </div>
        `;
        
        document.getElementById('back-button').addEventListener('click', () => {
            window.history.back();
        });
    }
    
    // Formata data para exibição
    formatDate(date) {
        if (!date) return '-';
        
        try {
            // Converte para Date se for timestamp
            let dateObj;
            if (date.toDate) {
                dateObj = date.toDate();
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                dateObj = new Date(date);
            }
            
            // Formatação de data
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '-';
        }
    }
    
    // Formata hora para exibição
    formatTime(date) {
        if (!date) return '-';
        
        try {
            // Converte para Date se for timestamp
            let dateObj;
            if (date.toDate) {
                dateObj = date.toDate();
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                dateObj = new Date(date);
            }
            
            // Formatação de hora
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error('Erro ao formatar hora:', error);
            return '-';
        }
    }
    
    // Formata valor monetário
    formatCurrency(value) {
        const numValue = parseFloat(value) || 0;
        return numValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    // Renderiza o layout de impressão
    renderOrderPrint(order) {
        // Encontra o objeto de status
        const statusObj = SYSTEM_CONFIG.orderStatus.find(s => s.id === order.status) || 
                          { name: 'Desconhecido', color: '' };
        
        // Formata as datas
        const createdDate = this.formatDate(order.createdAt);
        const createdTime = this.formatTime(order.createdAt);
        const deliveryDate = order.deliveryDate ? this.formatDate(order.deliveryDate) : 'A combinar';
        const deliveryTime = order.deliveryDate ? this.formatTime(order.deliveryDate) : '-';
        
        // Calcula o valor total do pedido
        const subtotal = order.items ? order.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) : 0;
        
        // Aplica desconto e serviços extras
        const discount = parseFloat(order.discount) || 0;
        const extraServices = parseFloat(order.extraServices) || 0;
        const deliveryCost = parseFloat(order.deliveryCost) || 0;
        
        // Calcula o total final
        const totalValue = subtotal + extraServices - discount;
        
        // Calcula o valor pago
        const paidValue = order.payments ? order.payments.reduce((sum, payment) => sum + (parseFloat(payment.value || payment.amount) || 0), 0) : 0;
        
        // Calcula o saldo
        const balance = totalValue - paidValue;
        
        // Adiciona estilos específicos para impressão em formato A4
        const printStyles = `
            <style>
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .order-print-container, .order-print-container * {
                        visibility: visible;
                    }
                    .order-print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 10mm;
                        box-sizing: border-box;
                        page-break-after: always;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                
                .order-print-container {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 10mm;
                    margin: 0 auto;
                    background-color: white;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;
                    font-family: Arial, sans-serif;
                    color: #333;
                    position: relative;
                }
                
                .order-header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .company-info {
                    flex: 1;
                }
                
                .company-info h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }
                
                .company-info p {
                    margin: 5px 0;
                    font-size: 12px;
                    color: #666;
                }
                
                .order-info {
                    text-align: right;
                }
                
                .order-info h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #333;
                }
                
                .order-info p {
                    margin: 5px 0;
                    font-size: 12px;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                
                .client-section {
                    display: flex;
                    margin-bottom: 20px;
                }
                
                .client-info {
                    flex: 1;
                    padding-right: 20px;
                }
                
                .delivery-info {
                    flex: 1;
                    padding-left: 20px;
                    border-left: 1px solid #ddd;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                
                .info-row {
                    display: flex;
                    margin-bottom: 5px;
                    font-size: 12px;
                }
                
                .info-label {
                    font-weight: bold;
                    width: 120px;
                    color: #666;
                }
                
                .info-value {
                    flex: 1;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    font-size: 12px;
                }
                
                .items-table th {
                    background-color: #f5f5f5;
                    text-align: left;
                    padding: 8px;
                    border-bottom: 2px solid #ddd;
                }
                
                .items-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                    vertical-align: top;
                }
                
                .item-specs {
                    font-size: 11px;
                    color: #666;
                    margin-top: 3px;
                }
                
                .item-description {
                    font-style: italic;
                    color: #666;
                }
                
                .payment-section {
                    margin-bottom: 20px;
                }
                
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                
                .payment-table th {
                    background-color: #f5f5f5;
                    text-align: left;
                    padding: 8px;
                    border-bottom: 2px solid #ddd;
                }
                
                .payment-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .totals-section {
                    width: 100%;
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 20px;
                    margin-bottom: 20px;
                }
                
                .totals-table {
                    width: 300px;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                
                .totals-table td {
                    padding: 5px;
                }
                
                .totals-table .total-label {
                    text-align: right;
                    font-weight: bold;
                    color: #666;
                }
                
                .totals-table .total-value {
                    text-align: right;
                    width: 100px;
                }
                
                .totals-table .grand-total {
                    font-weight: bold;
                    font-size: 14px;
                    border-top: 1px solid #ddd;
                }
                
                .notes-section {
                    margin-top: 20px;
                    padding: 10px;
                    background-color: #f9f9f9;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .image-section {
                    margin-top: 20px;
                    text-align: center;
                }
                
                .image-section img {
                    max-width: 100%;
                    max-height: 200px;
                    border: 1px solid #ddd;
                }
                
                .footer {
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                    font-size: 10px;
                    color: #999;
                    text-align: center;
                    position: absolute;
                    bottom: 10mm;
                    left: 10mm;
                    right: 10mm;
                }
                
                .signature-section {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                }
                
                .signature-box {
                    width: 45%;
                    text-align: center;
                }
                
                .signature-line {
                    margin-top: 25px;
                    border-top: 1px solid #333;
                    padding-top: 5px;
                    font-size: 12px;
                }
                
                /* Status colors */
                .status-pending { background-color: #f0ad4e; color: white; }
                .status-progress { background-color: #5bc0de; color: white; }
                .status-completed { background-color: #5cb85c; color: white; }
                .status-cancelled { background-color: #d9534f; color: white; }
                
                /* Print button */
                .print-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    padding: 10px 20px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                @media screen {
                    body {
                        background-color: #f0f0f0;
                        padding: 20px;
                    }
                }
            </style>
        `;
        
        // Monta o HTML da página
        let html = `
            ${printStyles}
            
            <button class="print-button no-print" onclick="window.print()">
                <i class="fas fa-print"></i> Imprimir
            </button>
            
            <div class="page-header no-print">
                <button class="btn btn-outline-secondary back-button" id="back-button">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <h1>Detalhes do Pedido</h1>
            </div>
            
            <div class="order-print-container">
                <!-- Cabeçalho com informações da empresa e do pedido -->
                <div class="order-header">
                    <div class="company-info">
                        <h1>GRAFSYS</h1>
                        <p>Soluções Gráficas Profissionais</p>
                        <p>Tel: (xx) xxxx-xxxx | Email: contato@grafsys.com.br</p>
                        <p>CNPJ: XX.XXX.XXX/0001-XX</p>
                    </div>
                    <div class="order-info">
                        <h2>ORDEM DE SERVIÇO</h2>
                        <p><strong>Nº:</strong> ${order.orderNumber || 'Sem número'}</p>
                        <p><strong>Data:</strong> ${createdDate} às ${createdTime}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${statusObj.id || 'pending'}">${statusObj.name}</span></p>
                    </div>
                </div>
                
                <!-- Informações do cliente e entrega -->
                <div class="client-section">
                    <div class="client-info">
                        <div class="section-title">DADOS DO CLIENTE</div>
                        <div class="info-row">
                            <div class="info-label">Nome:</div>
                            <div class="info-value">${order.clientName || '-'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Documento:</div>
                            <div class="info-value">${order.clientDocument || '-'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Telefone:</div>
                            <div class="info-value">${order.clientPhone || '-'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Email:</div>
                            <div class="info-value">${order.clientEmail || '-'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Endereço:</div>
                            <div class="info-value">${order.clientAddress || '-'}</div>
                        </div>
                    </div>
                    <div class="delivery-info">
                        <div class="section-title">DADOS DA ENTREGA</div>
                        <div class="info-row">
                            <div class="info-label">Previsão:</div>
                            <div class="info-value">${deliveryDate} ${deliveryTime !== '-' ? `às ${deliveryTime}` : ''}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Tipo de Entrega:</div>
                            <div class="info-value">${order.needsDelivery ? 'Entrega' : 'Retirada pelo cliente'}</div>
                        </div>
                        ${order.needsDelivery ? `
                        <div class="info-row">
                            <div class="info-label">Endereço:</div>
                            <div class="info-value">${order.deliveryAddress || order.clientAddress || '-'}</div>
                        </div>
                        ${order.deliveryCost ? `
                        <div class="info-row">
                            <div class="info-label">Custo de Entrega:</div>
                            <div class="info-value">${this.formatCurrency(order.deliveryCost)}</div>
                        </div>` : ''}` : ''}
                        <div class="info-row">
                            <div class="info-label">Prioridade:</div>
                            <div class="info-value">${order.priority || 'Normal'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Vendedor:</div>
                            <div class="info-value">${order.sellerName || '-'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Itens do pedido -->
                <div class="section-title">ITENS DO PEDIDO</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 40%">Produto/Descrição</th>
                            <th style="width: 20%">Especificações</th>
                            <th style="width: 10%">Quantidade</th>
                            <th style="width: 15%">Preço Unit.</th>
                            <th style="width: 15%">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items && order.items.length > 0 ? order.items.map((item, index) => `
                            <tr>
                                <td>
                                    <strong>${item.product || `Item ${index + 1}`}</strong>
                                    ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                                </td>
                                <td>
                                    <div class="item-specs">
                                        ${item.width ? `Largura: ${item.width} ${item.unit || 'cm'}<br>` : ''}
                                        ${item.height ? `Altura: ${item.height} ${item.unit || 'cm'}<br>` : ''}
                                        ${item.area ? `Área: ${item.area} ${item.areaUnit || 'm²'}<br>` : ''}
                                        ${item.material ? `Material: ${item.material}<br>` : ''}
                                        ${item.finish ? `Acabamento: ${item.finish}<br>` : ''}
                                        ${item.installation ? `Instalação: Sim<br>` : ''}
                                        ${item.withApplication ? `Com aplicação<br>` : ''}
                                    </div>
                                </td>
                                <td>${item.quantity || 1}</td>
                                <td>${this.formatCurrency(item.price || item.unitPrice || 0)}</td>
                                <td>${this.formatCurrency(item.total || 0)}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center;">Nenhum item registrado neste pedido.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
                
                <!-- Pagamentos -->
                <div class="payment-section">
                    <div class="section-title">PAGAMENTOS</div>
                    <table class="payment-table">
                        <thead>
                            <tr>
                                <th style="width: 40%">Método</th>
                                <th style="width: 30%">Data</th>
                                <th style="width: 30%">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.payments && order.payments.length > 0 ? order.payments.map(payment => `
                                <tr>
                                    <td>${payment.method || 'Não especificado'}</td>
                                    <td>${payment.date ? this.formatDate(payment.date) : '-'}</td>
                                    <td>${this.formatCurrency(payment.value || payment.amount || 0)}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3" style="text-align: center;">Nenhum pagamento registrado.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                
                <!-- Totais -->
                <div class="totals-section">
                    <table class="totals-table">
                        <tr>
                            <td class="total-label">Subtotal:</td>
                            <td class="total-value">${this.formatCurrency(subtotal)}</td>
                        </tr>
                        ${discount > 0 ? `
                        <tr>
                            <td class="total-label">Desconto:</td>
                            <td class="total-value">- ${this.formatCurrency(discount)}</td>
                        </tr>` : ''}
                        ${extraServices > 0 ? `
                        <tr>
                            <td class="total-label">Serviços Extras:</td>
                            <td class="total-value">${this.formatCurrency(extraServices)}</td>
                        </tr>` : ''}
                        ${deliveryCost > 0 ? `
                        <tr>
                            <td class="total-label">Custo de Entrega:</td>
                            <td class="total-value">${this.formatCurrency(deliveryCost)}</td>
                        </tr>` : ''}
                        <tr>
                            <td class="total-label">Total:</td>
                            <td class="total-value">${this.formatCurrency(totalValue)}</td>
                        </tr>
                        <tr>
                            <td class="total-label">Pago:</td>
                            <td class="total-value">${this.formatCurrency(paidValue)}</td>
                        </tr>
                        <tr class="grand-total">
                            <td class="total-label">Saldo:</td>
                            <td class="total-value">${this.formatCurrency(balance)}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Observações -->
                ${order.notes ? `
                <div class="notes-section">
                    <div class="section-title">OBSERVAÇÕES</div>
                    <p>${order.notes}</p>
                </div>` : ''}
                
                <!-- Imagem -->
                ${order.imageUrl ? `
                <div class="image-section">
                    <div class="section-title">IMAGEM DE REFERÊNCIA</div>
                    ${order.imageTitle ? `<p>${order.imageTitle}</p>` : ''}
                    <img src="${order.imageUrl}" alt="Imagem do pedido">
                </div>` : ''}
                
                <!-- Assinaturas -->
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line">Assinatura do Cliente</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">Assinatura da Empresa</div>
                    </div>
                </div>
                
                <!-- Rodapé -->
                <div class="footer">
                    <p>Documento gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</p>
                    <p>GRAFSYS - Sistema de Gestão para Gráficas</p>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona o evento de voltar
        document.getElementById('back-button').addEventListener('click', () => {
            window.history.back();
        });
    }
}

// Registra o componente globalmente para que o sistema possa encontrá-lo
window.OrderPrintComponent = OrderPrintComponent; 