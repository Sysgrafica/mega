// Componente para criação de novos pedidos
class NewOrderComponent {
    constructor() {
        this.container = null;
        this.formData = {
            client: null,
            items: [],
            payments: [],
            notes: '',
            status: 'pending',
            title: '',
            imageUrl: '',
            discount: 0,
            deliveryCost: null,
            extraServices: 0
        };
        this.clients = [];
        this.products = [];
        this.employees = [];
        
        // Data e hora do pedido (sempre a atual)
        this.orderDateTime = new Date();
        
        // Inicializa o listener de colagem para Ctrl+V
        this.setupPasteListener();
    }
    
    // Renderiza o componente
    async render(container, orderData = null) {
        try {
            this.container = container;
            
            // Se orderData foi fornecido, estamos editando um pedido existente
            const isEditing = orderData !== null;
            
            // Log para debug
            console.log("NewOrderComponent.render - isEditing:", isEditing);
            if (isEditing) {
                console.log("Dados do pedido para edição:", orderData);
                
                // Garante que items e payments sejam arrays antes de usar o spread operator
                const itemsArray = Array.isArray(orderData.items) ? orderData.items : [];
                const paymentsArray = Array.isArray(orderData.payments) ? orderData.payments : [];
                
                // Preenche os dados do formulário com os dados do pedido existente
                this.formData = {
                    client: orderData.client,
                    items: [...itemsArray],
                    payments: [...paymentsArray],
                    notes: orderData.notes || '',
                    deliveryDate: null, // Será definido abaixo após validação
                    status: orderData.status || 'pending',
                    deliveryType: orderData.deliveryType || 'retirada',
                    deliveryAddress: orderData.deliveryAddress || '',
                    title: orderData.title || '',
                    imageUrl: orderData.imageUrl || '',
                    imageTitle: orderData.imageTitle || '',
                    sellerName: orderData.sellerName || 'Sistema',
                    sellerId: orderData.sellerId || '',
                    discount: orderData.discount || 0,
                    deliveryCost: orderData.deliveryCost || null,
                    extraServices: orderData.extraServices || 0,
                    clientId: orderData.clientId,
                    orderNumber: orderData.orderNumber,
                    id: orderData.id
                };
                
                // Verifica e define a data de entrega
                if (orderData.deliveryDate) {
                    try {
                        // Tenta converter para um objeto Date válido
                        let deliveryDate;
                        
                        if (typeof orderData.deliveryDate === 'object' && 'seconds' in orderData.deliveryDate) {
                            // Timestamp do Firestore
                            deliveryDate = new Date(orderData.deliveryDate.seconds * 1000);
                        } else if (orderData.deliveryDate instanceof Date) {
                            deliveryDate = orderData.deliveryDate;
                        } else {
                            deliveryDate = new Date(orderData.deliveryDate);
                        }
                        
                        // Verifica se a data é válida
                        if (!isNaN(deliveryDate.getTime())) {
                            this.formData.deliveryDate = deliveryDate;
                        } else {
                            console.warn("Data de entrega inválida:", orderData.deliveryDate);
                            this.formData.deliveryDate = new Date(); // Usa a data atual como fallback
                            this.formData.deliveryDate.setDate(this.formData.deliveryDate.getDate() + 1); // Adiciona 1 dia
                        }
                    } catch (error) {
                        console.error("Erro ao processar data de entrega:", error);
                        this.formData.deliveryDate = new Date();
                        this.formData.deliveryDate.setDate(this.formData.deliveryDate.getDate() + 1); // Adiciona 1 dia
                    }
                } else {
                    // Se não tiver data de entrega, define para o dia seguinte
                    this.formData.deliveryDate = new Date();
                    this.formData.deliveryDate.setDate(this.formData.deliveryDate.getDate() + 1); // Adiciona 1 dia
                }
                
                console.log("Data de entrega definida:", this.formData.deliveryDate);
            }
            
            // Adiciona estilos específicos para os pagamentos
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                
                .payment-item {
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                }
                .payment-item:last-child {
                    border-bottom: none;
                }
                .payment-details {
                    display: flex;
                    align-items: flex-end;
                    gap: 10px;
                }
                .payment-details .form-group {
                    margin-bottom: 10px;
                }
                .payment-details .btn-icon {
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 27px;
                    margin-bottom: 10px;
                }
            
            `;
            document.head.appendChild(styleElement);
            
            // Exibe o loader enquanto carrega os dados
            this.renderLoader();
            
            // Carrega dados iniciais necessários para o formulário
            await this.loadInitialData();
            
            // Renderiza o formulário
            this.renderOrderForm(isEditing);
            
            // Se estiver editando, assegura que os detalhes do cliente serão exibidos
            if (isEditing && orderData.clientId) {
                // Garante que os dados completos do cliente estão disponíveis
                if (!this.formData.client || !this.formData.client.name) {
                    const clienteObj = this.clients.find(c => c.id === orderData.clientId);
                    if (clienteObj) {
                        console.log("Atualizando dados do cliente para:", clienteObj.name);
                        this.formData.client = clienteObj;
                        this.formData.clientId = clienteObj.id;
                        this.formData.clientName = clienteObj.name;
                        
                        // Atualiza a interface com os dados do cliente
                        setTimeout(() => {
                            const searchInput = document.getElementById('client-search');
                            const clientIdInput = document.getElementById('client-id');
                            
                            if (searchInput) searchInput.value = clienteObj.name || '';
                            if (clientIdInput) clientIdInput.value = clienteObj.id || '';
                            
                            this.updateClientDetails(clienteObj);
                        }, 500);
                    }
                }
                
                // Garante que o status do pedido seja corretamente selecionado
                if (orderData.status) {
                    setTimeout(() => {
                        const statusSelect = document.getElementById('order-status');
                        if (statusSelect) {
                            // Define o status atual do pedido no select
                            statusSelect.value = orderData.status;
                            console.log("Status do pedido atualizado para:", orderData.status);
                        }
                    }, 500);
                }
                
                // Garante que o tipo de entrega seja corretamente selecionado
                if (orderData.deliveryType) {
                    setTimeout(() => {
                        const deliveryTypeSelect = document.getElementById('delivery-type');
                        if (deliveryTypeSelect) {
                            // Define o tipo de entrega atual do pedido no select
                            deliveryTypeSelect.value = orderData.deliveryType;
                            console.log("Tipo de entrega atualizado para:", orderData.deliveryType);
                            
                            // Dispara o evento de change para atualizar a visibilidade dos campos relacionados
                            const event = new Event('change');
                            deliveryTypeSelect.dispatchEvent(event);
                            
                            // Se for entrega, preenche o endereço de entrega
                            if (orderData.deliveryType === 'entrega' && orderData.deliveryAddress) {
                                const deliveryAddressInput = document.getElementById('delivery-address');
                                if (deliveryAddressInput) {
                                    deliveryAddressInput.value = orderData.deliveryAddress;
                                    console.log("Endereço de entrega preenchido:", orderData.deliveryAddress);
                                }
                            }
                        }
                    }, 500);
                }
                
                // Garante que as informações da imagem sejam corretamente preenchidas
                if (orderData.imageTitle) {
                    setTimeout(() => {
                        const imageTitleInput = document.getElementById('image-title');
                        if (imageTitleInput) {
                            imageTitleInput.value = orderData.imageTitle;
                            console.log("Informações da imagem preenchidas:", orderData.imageTitle);
                        }
                    }, 500);
                }
            }
            
        } catch (error) {
            console.error('Erro ao renderizar formulário de pedido:', error);
            this.renderError('Não foi possível carregar o formulário. Por favor, tente novamente.');
        }
    }
    
    // Carrega dados iniciais necessários para o formulário
    async loadInitialData() {
        try {
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
            this.users = [];
            
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
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            throw error;
        }
    }
    
    // Renderiza o formulário de pedido
    async renderOrderForm(isEditing = false) {
        // Data e hora atual no fuso horário de São Paulo
        const now = new Date();
        
        // Formata para obter a data e hora em São Paulo
        const formatterDate = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const formatterTime = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const dateParts = formatterDate.formatToParts(now);
        const timeParts = formatterTime.formatToParts(now);
        
        const year = parseInt(dateParts.find(part => part.type === 'year').value);
        const month = parseInt(dateParts.find(part => part.type === 'month').value) - 1;
        const day = parseInt(dateParts.find(part => part.type === 'day').value);
        const hour = parseInt(timeParts.find(part => part.type === 'hour').value);
        const minute = parseInt(timeParts.find(part => part.type === 'minute').value);
        
        // Cria Data de São Paulo
        const spDate = new Date();
        spDate.setFullYear(year);
        spDate.setMonth(month);
        spDate.setDate(day);
        spDate.setHours(hour, minute, 0, 0);
        
        // Se não estiver editando, define valores padrão
        if (!isEditing) {
            // Data de entrega (24 horas depois)
            const entregaDate = new Date(spDate);
            entregaDate.setDate(entregaDate.getDate() + 1); // Adiciona 1 dia
            
            // Atualiza os dados do formulário
            this.formData.orderDate = now;
            this.formData.deliveryDate = entregaDate;
            
            // Busca o próximo número de pedido
            const nextOrderNumber = await this.getNextOrderNumber();
            this.formData.orderNumber = nextOrderNumber;
        }
        
        const headerText = isEditing ? 'Editar Pedido' : 'Novo Pedido';
        
        // Template com o layout correto usando as classes do CSS específico
        const html = `
            <div class="order-container">
                <!-- CABEÇALHO -->
                <header class="page-header">
                   
                    <div class="header-actions">
                        <button id="cancel-order-btn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button id="save-order-btn" class="btn btn-primary">
                            <i class="fas fa-save"></i> ${isEditing ? 'Atualizar' : 'Salvar'} Pedido
                        </button>
                        ${isEditing ? `
                        <button id="delete-order-btn" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        ` : ''}
                    </div>
                </header>

                <form id="order-form" class="order-form">
                    <!-- INFORMAÇÕES DO CLIENTE -->
                    <section class="form-section card">
                        <h3 class="card-header">Informações do Cliente</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="client-search" class="required">Cliente</label>
                                <div class="input-with-button">
                                    <input type="search" id="client-search" class="form-control" placeholder="Pesquisar cliente..." autocomplete="off" required value="${this.formData.client ? this.formData.client.name || '' : ''}">
                                    <input type="hidden" id="client-id" value="${this.formData.client ? this.formData.client.id || '' : ''}">
                                    <button type="button" id="new-client-btn" class="btn-icon">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div id="client-suggestions" class="dropdown-results"></div>
                            </div>
                            <div class="form-group">
                                <label for="seller" class="required">Vendedor</label>
                                <select id="seller" class="form-control" required>
                                    <option value="">Selecione um vendedor</option>
                                    ${this.renderSellerOptions ? this.renderSellerOptions() : ''}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="order-status">Status do Pedido</label>
                                <select id="order-status" class="form-control">
                                    ${this.renderOrderStatusOptions()}
                                </select>
                            </div>
                        </div>
                        
                        <div id="client-details" class="client-details hidden">
                            <!-- Detalhes do cliente serão inseridos aqui -->
                        </div>
                    </section>
                    
                    <!-- DETALHES DO PEDIDO -->
                    <section class="form-section card">
                        <h3 class="card-header">Detalhes do Pedido</h3>
                        <div class="row mb-3">
                            <!-- Número do Pedido -->
                            <div class="col-md-3">
                                <label for="order-number" class="form-label required">Nº do Pedido</label>
                                <input type="text" id="order-number" class="form-control" value="${this.formData.orderNumber}" readonly>
                            </div>
                            <div class="col-md-3">
                                <label for="order-date" class="form-label required">Data do Pedido</label>
                                <div class="d-flex">
                                    <input type="date" id="order-date" class="form-control" value="${this.formatDateForInput(now)}" readonly style="width: 65%;">
                                    <input type="time" id="order-time" class="form-control ms-1" value="${this.formatTimeForInput(now)}" readonly style="width: 35%;">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <label for="expected-date" class="form-label required">Previsão de Entrega</label>
                                <div class="d-flex">
                                    <input type="date" id="expected-date" class="form-control" value="${this.formatDateForInput(this.formData.deliveryDate)}" required style="width: 65%;">
                                    <input type="time" id="expected-time" class="form-control ms-1" value="${this.formatTimeForInput(this.formData.deliveryDate)}" style="width: 35%;">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <label for="delivery-type" class="form-label">Tipo de Entrega</label>
                                <select id="delivery-type" class="form-control">
                                    <option value="retirada">Retirada pelo cliente</option>
                                    <option value="entrega">Entrega</option>
                                </select>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div id="delivery-cost-container" class="col-md-3" style="display: none;">
                                <label for="delivery-cost" class="form-label">Custo de Entrega</label>
                                <div class="input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">R$</span>
                                    </div>
                                    <input type="text" id="delivery-cost" class="form-control" placeholder="0,00" value="${this.formData.deliveryCost || '0,00'}">
                                </div>
                            </div>
                            <div id="delivery-address-container" class="col-md-6" style="display: none;">
                                <label for="delivery-address" class="form-label">Endereço de Entrega</label>
                                <input type="text" id="delivery-address" class="form-control" placeholder="Endereço completo para entrega">
                            </div>
                        </div>
                        <div class="row mb-3">
                            
                        </div>
                    </section>
                    
                    <!-- ITENS DO PEDIDO -->
                    <section class="form-section card">
                        <div class="card-header">
                            <h3>Itens do Pedido</h3>
                            <button type="button" id="add-item-btn" class="btn btn-outline">
                                <i class="fas fa-plus"></i> Adicionar Item
                            </button>
                        </div>
                        
                        <div id="items-container" class="order-items-container">
                            <!-- Itens do pedido serão inseridos aqui -->
                        </div>
                        
                        <div class="totals-summary">
                            <div class="total-line">
                                <span class="label">Subtotal:</span>
                                <span class="value" id="order-subtotal">R$ 0,00</span>
                            </div>
                            <div class="total-line">
                                <span class="label">Desconto:</span>
                                <div class="discount-wrapper">
                                    <span>R$</span>
                                    <input type="number" class="form-control ms-1" id="order-discount" value="${this.formData.discount || 0}" min="0" class="form-input">
                                </div>
                            </div>
                            <div class="total-line">
                                <span class="label">Serviços Extras:</span>
                                <div class="discount-wrapper">
                                    <span>R$</span>
                                    <input type="number" class="form-control ms-1" id="order-extras" value="${this.formData.extraServices || 0}" min="0" class="form-input">
                                </div>
                            </div>
                            <div class="total-line grand-total">
                                <span class="label">Total:</span>
                                <span class="value" id="order-total">${window.ui ? window.ui.formatCurrency(this.calculateOrderTotal()) : 'R$ 0,00'}</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- PAGAMENTOS -->
                    <section class="form-section card">
                        <div class="card-header">
                            <h3>Pagamentos</h3>
                            <button type="button" id="add-payment-btn" class="btn btn-outline" data-action="add-payment">
                                <i class="fas fa-plus"></i> Adicionar Pagamento
                            </button>
                        </div>
                        
                        <div id="payments-container" class="payments-container">
                            <!-- Pagamentos serão inseridos aqui -->
                        </div>
                        
                        <div class="totals-summary">
                            <div class="total-line">
                                <span class="label">Total do Pedido:</span>
                                <span class="value" id="payment-order-total">${window.ui ? window.ui.formatCurrency(this.calculateOrderTotal()) : 'R$ 0,00'}</span>
                            </div>
                            <div class="total-line">
                                <span class="label">Total Pago:</span>
                                <span class="value" id="payment-paid">${window.ui ? window.ui.formatCurrency(this.calculatePaymentsTotal()) : 'R$ 0,00'}</span>
                            </div>
                            <div class="total-line">
                                <span class="label">Valor Restante:</span>
                                <span class="value" id="payment-remaining">${window.ui ? window.ui.formatCurrency(Math.max(0, this.calculateOrderTotal() - this.calculatePaymentsTotal())) : 'R$ 0,00'}</span>
                            </div>
                            <div class="total-line grand-total">
                                <span class="label">Saldo:</span>
                                <span class="value" id="payment-balance">${window.ui ? window.ui.formatCurrency(Math.max(0, this.calculateOrderTotal() - this.calculatePaymentsTotal())) : 'R$ 0,00'}</span>
                            </div>
                            <div class="col-md-6" id="notes-container-normal">
                                <label for="notes" class="form-label">Observações</label>
                                <textarea id="notes" class="form-control" rows="1" placeholder="Observações gerais sobre o pedido">${this.formData.notes || ''}</textarea>
                            </div>
                        </div>
                    </section>
                    
                    <!-- IMAGENS -->
                    <section class="form-section card">
                        <h3 class="card-header">Upload de Imagens</h3>
                        
                        <div class="form-group">
                            <label for="image-title">Informações da Imagem</label>
                            <input type="text" id="image-title" class="form-control" 
                                   placeholder="Digite informações sobre a imagem (ex: foto do local, desenho do cliente, etc)"
                                   value="${this.formData.imageTitle || ''}" />
                        </div>
                        
                        <label for="file-upload" class="file-drop-area">
                            <input type="file" id="file-upload" class="file-input" accept="image/*">
                            <p>Arraste imagens aqui ou <strong>clique para selecionar</strong></p>
                            <p class="file-status">Nenhuma imagem escolhida</p>
                            <p><small>(Você também pode colar imagens da área de transferência com Ctrl+V)</small></p>
                        </label>
                        
                        <div id="images-preview" class="images-preview">
                            <!-- Prévia de imagens será inserida aqui -->
                        </div>
                    </section>
                    
                    <!-- AÇÕES DO RODAPÉ -->
                    <footer class="footer-actions">
                        <button type="button" id="cancel-order-bottom" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="button" id="save-order-bottom" class="btn btn-primary">
                            <i class="fas fa-save"></i> ${isEditing ? 'Atualizar' : 'Salvar'} Pedido
                        </button>
                        ${isEditing ? `
                        <button type="button" id="delete-order-bottom" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        ` : ''}
                    </footer>
                </form>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Inicializa os containers
        const itemsContainer = document.getElementById('items-container');
        const paymentsContainer = document.getElementById('payments-container');
        
        // Renderiza itens do pedido
        if (itemsContainer) {
            itemsContainer.innerHTML = this.renderOrderItems();
            this.addItemEventListeners();
        }
        
        // Renderiza pagamentos
        if (paymentsContainer) {
            paymentsContainer.innerHTML = this.renderPayments();
        }
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar autocomplete para clientes
        this.setupClientAutocomplete();
        
        // Configura o tratamento do tipo de entrega
        this.setupDeliveryTypeHandler();
        
        // Pré-define o vendedor logado
        const vendedorSelect = document.getElementById('seller');
        if (vendedorSelect) {
            const usuarioAtual = JSON.parse(localStorage.getItem('currentUser'));
            if (usuarioAtual && usuarioAtual.id) {
                vendedorSelect.value = usuarioAtual.id;
            }
        }
    }
    
    // Renderiza as opções de vendedor no select
    renderSellerOptions() {
        let options = '<option value="">Selecione um vendedor</option>';
        
        // Verifica se temos usuários carregados
        if (this.users && Array.isArray(this.users) && this.users.length > 0) {
            // Filtra apenas vendedores se tivermos essa informação
            const sellers = this.users.filter(user => 
                user.role === 'seller' || 
                user.role === 'vendedor' || 
                (user.role && user.role.toLowerCase().includes('vend'))
            );
            
            // Se não encontramos vendedores, usamos todos os usuários
            const usersToShow = sellers.length > 0 ? sellers : this.users;
            
            // Ordena por nome
            usersToShow.sort((a, b) => {
                const nameA = a.name ? a.name.toLowerCase() : '';
                const nameB = b.name ? b.name.toLowerCase() : '';
                return nameA.localeCompare(nameB);
            });
            
            // Adiciona cada vendedor como uma opção
            usersToShow.forEach(user => {
                const selected = user.id === this.formData.sellerId ? 'selected' : '';
                options += `<option value="${user.id}" ${selected}>${user.name || 'Usuário sem nome'}</option>`;
            });
        } else {
            // Opção padrão se não tivermos vendedores
            options += `<option value="sistema">Sistema</option>`;
        }
        
        return options;
    }
    
    // Renderiza as opções de status do pedido
    renderOrderStatusOptions() {
        if (!SYSTEM_CONFIG || !SYSTEM_CONFIG.orderStatus) {
            return '<option value="pending">Aguardando</option>';
        }
        
        let html = '';
        
        // Adiciona opções para cada status disponível
        SYSTEM_CONFIG.orderStatus.forEach(status => {
            // Verifica se o status atual do pedido corresponde a este status
            // Se sim, marca como selecionado; caso contrário, usa 'pending' como padrão para novos pedidos
            let selected = '';
            
            if (this.formData && this.formData.status) {
                selected = status.id === this.formData.status ? 'selected' : '';
            } else {
                selected = status.id === 'pending' ? 'selected' : '';
            }
            
            html += `<option value="${status.id}" ${selected}>${status.name}</option>`;
        });
        
        return html;
    }
    
    // Renderiza os itens do pedido
    renderOrderItems() {
        let html = '';
        
        if (!this.formData.items || this.formData.items.length === 0) {
            return `<div class="empty-state">
                <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
            </div>`;
        }
        
        this.formData.items.forEach((item, index) => {
            // Gera as opções de produtos
            let productOptions = '<option value="">Selecione um produto</option>';
            if (this.products && Array.isArray(this.products)) {
                this.products.forEach(product => {
                    const isSelected = item.product && item.product.id === product.id;
                    productOptions += `<option value="${product.id}" ${isSelected ? 'selected' : ''}>${product.name}</option>`;
                });
            }
            
            // Verifica se o produto tem medida personalizada
            const isCustomSize = item.product && item.product.productType === 'custom_size';
            
            // Formata valores para exibição com formato brasileiro
            const formatBrazilianNumber = (num) => {
                return (parseFloat(num) || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).replace('.', ',');
            };
            
            // Assegura que o item tenha os valores de dimensão definidos
            if (isCustomSize) {
                if (!item.width) item.width = 1;
                if (!item.height) item.height = 1;
                
                // Calcula a área
                item.area = item.width * item.height;
                
                // Recalcula o total baseado na área
                const basePrice = item.unitPrice || 0;
                const quantity = item.quantity || 1;
                item.total = quantity * basePrice * item.area;
            }
            
            // Formata valores para os campos
            const width = item.width || 1;
            const height = item.height || 1;
            const area = isCustomSize ? (width * height) : 0;
            const formattedArea = area.toFixed(4).replace('.', ',');
            
            // Assegura que os preços e totais sejam calculados corretamente
            if (item.unitPrice && item.quantity) {
                if (isCustomSize && item.area) {
                    item.total = item.unitPrice * item.quantity * item.area;
                } else {
                    item.total = item.unitPrice * item.quantity;
                }
            }
            
            // Verifica se a descrição já contém "Com aplicação"
            const hasAplicacao = item.description && item.description.includes("Com aplicação");
            
            html += `
                <div class="order-item" data-index="${index}">
                    <div class="order-item-header">
                        <div class="order-item-actions">
                            <button type="button" class="item-remove-btn" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="item-details">
                        <div class="inline-item-fields">
                            <div class="form-group">
                                <label>Produto</label>
                                <select class="form-control item-product" data-index="${index}">
                                    ${productOptions}
                                </select>
                            </div>
                            ${isCustomSize ? `
                            <div class="form-group">
                                <label>Largura (m)</label>
                                <input type="text" class="form-control item-width" value="${width.toString().replace('.', ',')}" min="0.01" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Altura (m)</label>
                                <input type="text" class="form-control item-height" value="${height.toString().replace('.', ',')}" min="0.01" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Área (m²)</label>
                                <input type="text" class="form-control item-area" style="background-color: #f0f8ff; font-weight: bold;" value="${formattedArea}" readonly>
                            </div>
                            ` : `
                            <div class="form-group" style="display: none">
                                <label>Largura (m)</label>
                                <input type="hidden" class="form-control item-width" value="0">
                            </div>
                            <div class="form-group" style="display: none">
                                <label>Altura (m)</label>
                                <input type="hidden" class="form-control item-height" value="0">
                            </div>
                            <div class="form-group" style="display: none">
                                <label>Área (m²)</label>
                                <input type="hidden" class="form-control item-area" value="0">
                            </div>
                            `}
                            <div class="form-group">
                                <label>Quantidade</label>
                                <input type="text" class="form-control item-quantity" value="${item.quantity || 1}" min="1">
                            </div>
                            <div class="form-group">
                                <label>Preço Unitário <span class="text-info"><i class="fas fa-edit" title="Este valor pode ser editado"></i></span></label>
                                <input type="text" class="form-control item-price" value="${formatBrazilianNumber(item.unitPrice)}" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Total</label>
                                <input type="text" class="form-control item-total" value="${formatBrazilianNumber(item.total)}" readonly>
                            </div>
                        </div>
                        <div class="form-row mt-3">
                            <div class="form-group col-md-10 d-flex align-items-center">
                                <label>Descrição</label>
                                <input type="text" class="form-control item-description mx-2" value="${item.description || ''}" placeholder="Descrição do item">
                                <div class="custom-control custom-checkbox ml-2">
                                    <input type="checkbox" class="custom-control-input item-com-aplicacao" id="com-aplicacao-0" data-index="${index}" ${hasAplicacao ? 'checked' : ''}>
                                    <label class="custom-control-label" for="com-aplicacao-0">Com aplicação</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    // Renderiza os pagamentos
    renderPayments() {
        let html = '';
        
        if (!this.formData.payments || this.formData.payments.length === 0) {
            return `<div class="empty-state">
                <p>Nenhum pagamento adicionado. Clique em "Adicionar Pagamento" para registrar.</p>
            </div>`;
        }
        
        this.formData.payments.forEach((payment, index) => {
            // Obtém o nome do método de pagamento
            let methodName = payment.method || 'pendente';
            
            // Se temos uma lista de métodos de pagamento configurada, usa o nome correspondente
            if (window.SYSTEM_CONFIG && window.SYSTEM_CONFIG.paymentMethods) {
                const method = window.SYSTEM_CONFIG.paymentMethods.find(m => m.id === payment.method);
                if (method) {
                    methodName = method.name;
                }
            }
            
            // Usa amount se disponível, caso contrário usa value (para compatibilidade)
            const paymentValue = payment.amount !== undefined ? payment.amount : (payment.value || 0);
            
            html += `
                <div class="payment-item" data-index="${index}">
                    <div class="payment-details">
                        <div class="form-group" style="flex: 2;">
                            <label>Método</label>
                            <select class="form-control payment-method">
                                <option value="dinheiro" ${payment.method === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                                <option value="pix" ${payment.method === 'pix' ? 'selected' : ''}>PIX</option>
                                <option value="cartao_credito" ${payment.method === 'cartao_credito' ? 'selected' : ''}>Cartão de Crédito</option>
                                <option value="cartao_debito" ${payment.method === 'cartao_debito' ? 'selected' : ''}>Cartão de Débito</option>
                                <option value="boleto" ${payment.method === 'boleto' ? 'selected' : ''}>Boleto Bancário</option>
                                <option value="transferencia" ${payment.method === 'transferencia' ? 'selected' : ''}>Transferência Bancária</option>
                                <option value="link_pagamento" ${payment.method === 'link_pagamento' ? 'selected' : ''}>Link de Pagamento</option>
                                <option value="pendente" ${payment.method === 'pendente' ? 'selected' : ''}>Pendente</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Valor</label>
                            <input type="number" class="form-control payment-value" value="${paymentValue}" min="0" step="0.01">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Data</label>
                            <input type="date" class="form-control payment-date" value="${this.formatDateForInput(payment.date || new Date())}">
                        </div>
                        <div class="form-group" style="align-self: flex-end; margin-bottom: 8px;">
                            <button type="button" class="btn-icon remove-payment" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    // Funções necessárias para o cálculo de totais
    
    // Calcula o total do pedido
    calculateOrderTotal() {
        let total = 0;
        
        // Soma o valor de todos os itens
        if (this.formData.items && Array.isArray(this.formData.items)) {
            total = this.formData.items.reduce((sum, item) => {
                return sum + (parseFloat(item.total) || 0);
            }, 0);
        }
        
        // Adiciona o valor de serviços extras, se existir
        if (this.formData.extraServices) {
            total += parseFloat(this.formData.extraServices);
        }
        
        // Adiciona o custo de entrega, se existir
        if (this.formData.deliveryCost) {
            total += parseFloat(this.formData.deliveryCost);
        }
        
        return total;
    }
    
    // Calcula o total dos pagamentos
    calculatePaymentsTotal() {
        let total = 0;
        
        // Soma o valor de todos os pagamentos
        if (this.formData.payments && Array.isArray(this.formData.payments)) {
            total = this.formData.payments.reduce((sum, payment) => {
                // Verifica primeiro amount, depois value para retrocompatibilidade
                const paymentAmount = payment.amount !== undefined ? payment.amount : payment.value;
                return sum + (parseFloat(paymentAmount) || 0);
            }, 0);
        }
        
        return total;
    }
    
    // Formata data para input tipo date (YYYY-MM-DD)
    formatDateForInput(date) {
        if (!date) return '';
        
        try {
            // Verifica se a data é válida antes de formatar
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
                console.warn('Data inválida recebida em formatDateForInput:', date);
                // Retorna data atual em caso de data inválida
                dateObj = new Date();
            }
            
            // Formata a data manualmente para evitar problemas com o DateTimeFormat
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Erro ao formatar data para input:', error);
            // Retorna data atual em caso de erro
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
    }
    
    // Formata hora para input tipo time (HH:MM)
    formatTimeForInput(date) {
        if (!date) return '';
        
        try {
            // Verifica se a data é válida antes de formatar
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
                console.warn('Data inválida recebida em formatTimeForInput:', date);
                // Retorna hora atual em caso de data inválida
                dateObj = new Date();
            }
            
            // Formata a hora manualmente para evitar problemas com o DateTimeFormat
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error('Erro ao formatar hora para input:', error);
            // Retorna hora atual em caso de erro
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            return `${hours}:${minutes}`;
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
                }
            });
        }
    }
    
    // Configurar o handler para tipo de entrega
    setupDeliveryTypeHandler() {
        const deliveryTypeSelect = document.getElementById('delivery-type');
        const deliveryAddressContainer = document.getElementById('delivery-address-container');
        const deliveryCostContainer = document.getElementById('delivery-cost-container');
        const deliveryAddressInput = document.getElementById('delivery-address');
        
        if (deliveryTypeSelect) {
            // Handler para alternar entre retirada e entrega
            const handleDeliveryTypeChange = () => {
                const isDelivery = deliveryTypeSelect.value === 'entrega';
                this.formData.needsDelivery = isDelivery;
                this.formData.deliveryType = deliveryTypeSelect.value;
                
                // Atualiza a visualização do campo de endereço de entrega
                if (deliveryAddressContainer) {
                    deliveryAddressContainer.style.display = isDelivery ? 'block' : 'none';
                }
                
                // Atualiza a visualização do campo de custo de entrega
                if (deliveryCostContainer) {
                    deliveryCostContainer.style.display = isDelivery ? 'block' : 'none';
                }
                
                // Se for entrega e já temos um endereço salvo, garantimos que ele apareça
                if (isDelivery && this.formData.deliveryAddress && deliveryAddressInput) {
                    deliveryAddressInput.value = this.formData.deliveryAddress;
                }
                
                console.log("Tipo de entrega alterado para:", this.formData.deliveryType);
            };
            
            // Adiciona o event listener
            deliveryTypeSelect.addEventListener('change', handleDeliveryTypeChange);
            
            // Executa o handler uma vez para configurar o estado inicial
            handleDeliveryTypeChange();
        }
    }
    
    // Configurar eventos para o formulário
    setupEventListeners() {
        // Adicionar item
        const addItemBtn = document.getElementById('add-item-btn');
        if (addItemBtn) {
            // Remover todos os event listeners existentes
            const newAddItemBtn = addItemBtn.cloneNode(true);
            addItemBtn.parentNode.replaceChild(newAddItemBtn, addItemBtn);
            
            // Adicionar novo event listener
            newAddItemBtn.addEventListener('click', () => {
                this.showProductSelectionModal();
            });
        }
        
        // Botão de excluir pedido (cabeçalho)
        const deleteOrderBtn = document.getElementById('delete-order-btn');
        if (deleteOrderBtn) {
            // Remover todos os event listeners existentes
            const newDeleteOrderBtn = deleteOrderBtn.cloneNode(true);
            deleteOrderBtn.parentNode.replaceChild(newDeleteOrderBtn, deleteOrderBtn);
            
            // Adicionar novo event listener
            newDeleteOrderBtn.addEventListener('click', () => {
                this.deleteOrder();
            });
        }
        
        // Botão de excluir pedido (rodapé)
        const deleteOrderBottomBtn = document.getElementById('delete-order-bottom');
        if (deleteOrderBottomBtn) {
            // Remover todos os event listeners existentes
            const newDeleteOrderBottomBtn = deleteOrderBottomBtn.cloneNode(true);
            deleteOrderBottomBtn.parentNode.replaceChild(newDeleteOrderBottomBtn, deleteOrderBottomBtn);
            
            // Adicionar novo event listener
            newDeleteOrderBottomBtn.addEventListener('click', () => {
                this.deleteOrder();
            });
        }
        
        // Configurar event listeners para data e hora de entrega
        const expectedDateInput = document.getElementById('expected-date');
        const expectedTimeInput = document.getElementById('expected-time');
        
        if (expectedDateInput) {
            expectedDateInput.addEventListener('change', () => {
                this.updateDeliveryDateTime();
            });
        }
        
        if (expectedTimeInput) {
            expectedTimeInput.addEventListener('change', () => {
                this.updateDeliveryDateTime();
            });
        }
        
        // Configurar event listeners para data e hora do pedido
        const orderDateInput = document.getElementById('order-date');
        const orderTimeInput = document.getElementById('order-time');
        
        if (orderDateInput) {
            orderDateInput.addEventListener('change', () => {
                this.updateOrderDateTime();
            });
        }
        
        if (orderTimeInput) {
            orderTimeInput.addEventListener('change', () => {
                this.updateOrderDateTime();
            });
        }
        
        // Event listener para o campo de desconto
        const discountInput = document.getElementById('order-discount');
        if (discountInput) {
            discountInput.addEventListener('input', () => {
                this.updateOrderTotals();
            });
        }
        
        // Event listener para o campo de serviços extras
        const extrasInput = document.getElementById('order-extras');
        if (extrasInput) {
            extrasInput.addEventListener('input', () => {
                this.updateOrderTotals();
            });
        }
        
        // Event listener para o campo de custo de entrega
        const deliveryCostInput = document.getElementById('delivery-cost');
        if (deliveryCostInput) {
            deliveryCostInput.addEventListener('input', () => {
                const costValue = deliveryCostInput.value.replace(',', '.').trim();
                this.formData.deliveryCost = costValue ? parseFloat(costValue) : null;
                this.updateOrderTotals();
            });
        }
        
        // Event listener para o campo de tipo de entrega
        const deliveryTypeSelect = document.getElementById('delivery-type');
        if (deliveryTypeSelect) {
            deliveryTypeSelect.addEventListener('change', () => {
                this.updateOrderTotals();
            });
        }
        
        // Event listener para o campo de endereço de entrega
        const deliveryAddressInput = document.getElementById('delivery-address');
        if (deliveryAddressInput) {
            deliveryAddressInput.addEventListener('input', () => {
                this.formData.deliveryAddress = deliveryAddressInput.value;
                console.log("Endereço de entrega atualizado:", this.formData.deliveryAddress);
            });
        }
        
        // Event listener para o campo de informações da imagem
        const imageTitleInput = document.getElementById('image-title');
        if (imageTitleInput) {
            imageTitleInput.addEventListener('input', () => {
                this.formData.imageTitle = imageTitleInput.value;
                console.log("Informações da imagem atualizadas:", this.formData.imageTitle);
            });
        }
        
        // Adicionar pagamento
        const addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) {
            // Remover todos os event listeners existentes e criar um novo botão
            const newAddPaymentBtn = document.createElement('button');
            newAddPaymentBtn.id = 'add-payment-btn';
            newAddPaymentBtn.className = 'btn btn-outline';
            newAddPaymentBtn.dataset.action = 'add-payment';
            newAddPaymentBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Pagamento';
            
            // Substituir o botão antigo pelo novo
            addPaymentBtn.parentNode.replaceChild(newAddPaymentBtn, addPaymentBtn);
            
            // Adicionar um único event listener ao novo botão
            newAddPaymentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("Botão de adicionar pagamento clicado");
                // Chamada explícita ao método addPayment
                this.addPayment();
            });
        }
        
        // Botões de cancelar
        const cancelOrderBtn = document.getElementById('cancel-order-btn');
        if (cancelOrderBtn) {
            // Remover todos os event listeners existentes
            const newCancelOrderBtn = cancelOrderBtn.cloneNode(true);
            cancelOrderBtn.parentNode.replaceChild(newCancelOrderBtn, cancelOrderBtn);
            
            // Adicionar novo event listener
            newCancelOrderBtn.addEventListener('click', () => {
                if (confirm('Deseja realmente cancelar este pedido? As alterações não salvas serão perdidas.')) {
                    window.location.hash = '#orders';
                }
            });
        }
        
        const cancelOrderBottomBtn = document.getElementById('cancel-order-bottom');
        if (cancelOrderBottomBtn) {
            // Remover todos os event listeners existentes
            const newCancelOrderBottomBtn = cancelOrderBottomBtn.cloneNode(true);
            cancelOrderBottomBtn.parentNode.replaceChild(newCancelOrderBottomBtn, cancelOrderBottomBtn);
            
            // Adicionar novo event listener
            newCancelOrderBottomBtn.addEventListener('click', () => {
                if (confirm('Deseja realmente cancelar este pedido? As alterações não salvas serão perdidas.')) {
                    window.location.hash = '#orders';
                }
            });
        }
        
        // Botões de salvar
        const saveOrderBtn = document.getElementById('save-order-btn');
        if (saveOrderBtn) {
            // Remover todos os event listeners existentes
            const newSaveOrderBtn = saveOrderBtn.cloneNode(true);
            saveOrderBtn.parentNode.replaceChild(newSaveOrderBtn, saveOrderBtn);
            
            // Adicionar novo event listener
            newSaveOrderBtn.addEventListener('click', () => {
                this.saveOrder();
            });
        }
        
        const saveOrderBottomBtn = document.getElementById('save-order-bottom');
        if (saveOrderBottomBtn) {
            // Remover todos os event listeners existentes
            const newSaveOrderBottomBtn = saveOrderBottomBtn.cloneNode(true);
            saveOrderBottomBtn.parentNode.replaceChild(newSaveOrderBottomBtn, saveOrderBottomBtn);
            
            // Adicionar novo event listener
            newSaveOrderBottomBtn.addEventListener('click', () => {
                this.saveOrder();
            });
        }
        
        // Novo cliente
        const newClientBtn = document.getElementById('new-client-btn');
        if (newClientBtn) {
            // Remover todos os event listeners existentes
            const newNewClientBtn = newClientBtn.cloneNode(true);
            newClientBtn.parentNode.replaceChild(newNewClientBtn, newClientBtn);
            
            // Adicionar novo event listener
            newNewClientBtn.addEventListener('click', () => {
                this.showNewClientForm();
            });
        }
        
        // Eventos para manipulação de imagens
        this.setupImageHandlers();
        
        // Atualiza a visualização de imagens
        this.updateImagePreview();
        
        // Adiciona listeners para itens
        this.addItemEventListeners();
    }
    
    // Adiciona event listeners aos itens do pedido
    addItemEventListeners() {
        console.log('[addItemEventListeners] Configurando listeners para itens...');
        
        document.querySelectorAll('.order-item').forEach((itemElement, index) => {
            // Referência para os campos relevantes
            const widthInput = itemElement.querySelector('.item-width');
            const heightInput = itemElement.querySelector('.item-height');
            const areaInput = itemElement.querySelector('.item-area');
            const quantityInput = itemElement.querySelector('.item-quantity');
            const priceInput = itemElement.querySelector('.item-price');
            const productSelect = itemElement.querySelector('.item-product');
            const removeButton = itemElement.querySelector('.item-remove-btn');
            const descriptionInput = itemElement.querySelector('.item-description');
            const comAplicacaoCheckbox = itemElement.querySelector('.item-com-aplicacao');
            
            // EVENT LISTENER PARA O CHECKBOX "COM APLICAÇÃO"
            if (comAplicacaoCheckbox && descriptionInput) {
                comAplicacaoCheckbox.addEventListener('change', () => {
                    console.log(`[addItemEventListeners] Checkbox "Com aplicação" alterado para item ${index}`);
                    
                    // Verifica se o checkbox foi marcado
                    if (comAplicacaoCheckbox.checked) {
                        // Se a descrição já contém "Com aplicação", não faz nada
                        if (!descriptionInput.value.includes("Com aplicação")) {
                            // Se a descrição já tem algum texto, adiciona "Com aplicação" no início
                            if (descriptionInput.value.trim()) {
                                descriptionInput.value = "Com aplicação. " + descriptionInput.value;
                            } else {
                                // Se não tem texto, só adiciona "Com aplicação"
                                descriptionInput.value = "Com aplicação";
                            }
                        }
                    } else {
                        // Se o checkbox foi desmarcado, removemos "Com aplicação" da descrição
                        descriptionInput.value = descriptionInput.value.replace(/Com aplicação\.?\s*/i, '');
                    }
                    
                    // Atualiza os dados do formulário
                    this.formData.items[index].description = descriptionInput.value;
                });
            }
            
            // EVENT LISTENER PARA O CAMPO DE DESCRIÇÃO
            if (descriptionInput) {
                descriptionInput.addEventListener('input', () => {
                    // Verifica se o texto contém "Com aplicação" e atualiza o checkbox
                    if (comAplicacaoCheckbox) {
                        comAplicacaoCheckbox.checked = descriptionInput.value.includes("Com aplicação");
                    }
                    
                    // Atualiza os dados do formulário
                    this.formData.items[index].description = descriptionInput.value;
                });
            }
            
            // EVENT LISTENERS PARA PRODUTOS
            if (productSelect) {
                productSelect.addEventListener('change', () => {
                    console.log(`[addItemEventListeners] Produto alterado para item ${index}`);
                    
                    const selectedProductId = productSelect.value;
                    const selectedProduct = this.products.find(p => p.id === selectedProductId);
                    
                    // Verificar se o produto foi encontrado
                    if (selectedProduct) {
                        // Atualizar os dados do produto no formData
                        this.formData.items[index].product = selectedProduct;
                        
                        // Atualizar inputs de acordo com o tipo de produto
                        if (selectedProduct.productType === 'custom_size') {
                            // Atualizar interface para produto com medidas personalizadas
                            this.updateItemInterface(index);
                        } else {
                            // Para produtos regulares, ocultar campos de dimensão
                            const widthGroup = itemElement.querySelector('.width-group');
                            const heightGroup = itemElement.querySelector('.height-group');
                            const areaGroup = itemElement.querySelector('.area-group');
                            
                            if (widthGroup) widthGroup.style.display = 'none';
                            if (heightGroup) heightGroup.style.display = 'none';
                            if (areaGroup) areaGroup.style.display = 'none';
                            
                            // Definir preço baseado na categoria do cliente
                            let price = selectedProduct.price;
                            if (this.formData.client && this.formData.client.category === 'reseller') {
                                price = selectedProduct.priceReseller || (selectedProduct.price * 0.8);
                            }
                            
                            if (priceInput) priceInput.value = price.toFixed(2).replace('.', ',');
                            
                            // Atualizar dados do item
                            this.formData.items[index].unitPrice = price;
                            this.formData.items[index].width = 0;
                            this.formData.items[index].height = 0;
                            this.formData.items[index].area = 0;
                        }
                        
                        // Recalcular o total do item
                        this.updateItemTotal(itemElement, index);
                    }
                });
            }
            
            // EVENT LISTENERS PARA QUANTIDADE E PREÇO
            if (quantityInput) {
                quantityInput.addEventListener('input', () => {
                    console.log(`[addItemEventListeners] Quantidade alterada para item ${index}`);
                    this.formData.items[index].quantity = parseFloat(quantityInput.value.replace(',', '.')) || 0;
                    this.updateItemTotal(itemElement, index);
                });
                
                // Garantir que eventos de teclado também atualizem os valores
                quantityInput.addEventListener('keyup', () => {
                    this.updateItemTotal(itemElement, index);
                });
            }
            
            if (priceInput) {
                priceInput.addEventListener('input', () => {
                    console.log(`[addItemEventListeners] Preço alterado para item ${index}`);
                    this.formData.items[index].unitPrice = parseFloat(priceInput.value.replace(',', '.')) || 0;
                    this.updateItemTotal(itemElement, index);
                });
                
                // Garantir que eventos de teclado também atualizem os valores
                priceInput.addEventListener('keyup', () => {
                    this.updateItemTotal(itemElement, index);
                });
            }
            
            // LISTENER PARA BOTÃO DE REMOVER
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    this.removeOrderItem(index);
                });
            }
            
            // EVENT LISTENERS PARA LARGURA E ALTURA (somente para produtos de tamanho personalizado)
            if (widthInput && heightInput && areaInput && 
                this.formData.items[index].product?.productType === 'custom_size') {
                
                console.log(`[addItemEventListeners] Configurando listeners para campos de dimensão do item ${index}`);
                
                // Criar novos elementos para substituir os existentes (remove event listeners antigos)
                const novoWidthInput = document.createElement('input');
                const novoHeightInput = document.createElement('input');
                
                // Copiar atributos
                novoWidthInput.type = 'text';
                novoWidthInput.className = widthInput.className;
                novoWidthInput.value = widthInput.value;
                novoWidthInput.placeholder = 'Largura';
                
                novoHeightInput.type = 'text';
                novoHeightInput.className = heightInput.className;
                novoHeightInput.value = heightInput.value;
                novoHeightInput.placeholder = 'Altura';
                
                // Substituir os elementos
                widthInput.parentNode.replaceChild(novoWidthInput, widthInput);
                heightInput.parentNode.replaceChild(novoHeightInput, heightInput);
                
                // Função para calcular a área com os novos elementos de entrada
                const atualizarAreaEPreco = function() {
                    try {
                        // Obter as referências atualizadas dos campos
                        const currentWidthInput = itemElement.querySelector('.item-width');
                        const currentHeightInput = itemElement.querySelector('.item-height');
                        
                        if (!currentWidthInput || !currentHeightInput) {
                            console.error('Campos de dimensão não encontrados');
                            return;
                        }
                        
                        // Calcular a área
                        const largura = parseFloat(currentWidthInput.value.replace(',', '.')) || 0;
                        const altura = parseFloat(currentHeightInput.value.replace(',', '.')) || 0;
                        const novaArea = largura * altura;
                        
                        // Exibir valores no console para debug
                        console.log(`[updateItemInterface] Item ${index}: ${largura}m × ${altura}m = ${novaArea}m²`);
                        
                        // Atualizar o campo de área
                        areaInput.value = novaArea.toFixed(4).replace('.', ',');
                        
                        // Destacar campo visualmente
                        areaInput.style.backgroundColor = '#ffff99';
                        setTimeout(() => areaInput.style.backgroundColor = '#f0f8ff', 800);
                        
                        // Atualizar o objeto de dados
                        this.formData.items[index].width = largura;
                        this.formData.items[index].height = altura;
                        this.formData.items[index].area = novaArea;
                        
                        // Recalcular o preço
                        this.updateItemTotal(itemElement, index);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao atualizar área em updateItemInterface: ${error.message}`);
                    }
                }
                
                // Adicionar event listeners diretamente aos novos elementos
                // Usar addEventListener com 'input' para capturar todas as alterações (digitação, colar, autocomplete)
                novoWidthInput.oninput = function(e) {
                    console.log(`[DIRETO] Alteração no campo de largura: ${this.value}`);
                    // Forçar recálculo imediato
                    atualizarAreaEPreco.call(this);
                }.bind(this);
                
                novoHeightInput.oninput = function(e) {
                    console.log(`[DIRETO] Alteração no campo de altura: ${this.value}`);
                    // Forçar recálculo imediato
                    atualizarAreaEPreco.call(this);
                }.bind(this);
                
                // Forçar recálculos ao mudar o foco
                novoWidthInput.onblur = atualizarAreaEPreco.bind(this);
                novoHeightInput.onblur = atualizarAreaEPreco.bind(this);
                
                // Garantir que capturemos todas as formas de alteração
                ['keyup', 'keydown', 'change', 'paste', 'blur'].forEach(eventType => {
                    novoWidthInput.addEventListener(eventType, function() {
                        console.log(`[EVENTO] ${eventType} no campo de largura`);
                        atualizarAreaEPreco.call(this);
                    }.bind(this));
                    
                    novoHeightInput.addEventListener(eventType, function() {
                        console.log(`[EVENTO] ${eventType} no campo de altura`);
                        atualizarAreaEPreco.call(this);
                    }.bind(this));
                });
                
                // Executar o cálculo inicial com um delay maior
                setTimeout(() => {
                    console.log(`[updateItemInterface] Calculando área inicial para item ${index}`);
                    atualizarAreaEPreco.call(this);
                }, 500);
            }
        });
    }
    
    // Atualiza o total de um item específico
    updateItemTotal(itemElement, index) {
        console.log(`[updateItemTotal] Atualizando item ${index}`);
        
        try {
            // Buscar campos necessários
            const quantityInput = itemElement.querySelector('.item-quantity');
            const priceInput = itemElement.querySelector('.item-price');
            const totalInput = itemElement.querySelector('.item-total');
            const areaInput = itemElement.querySelector('.item-area');
            
            // Verificar se os campos existem
            if (!quantityInput || !priceInput || !totalInput) {
                console.error('Campos obrigatórios não encontrados');
                return;
            }
            
            // Verificar se é um produto de medida personalizada
            const item = this.formData.items[index];
            const isCustomSize = item?.product?.productType === 'custom_size';
            
            if (isCustomSize && areaInput) {
                // ---- PRODUTO COM MEDIDA PERSONALIZADA ----
                console.log(`[updateItemTotal] Produto com medida personalizada`);
                
                // Obter o preço base do produto
                const product = item.product;
                let basePrice = 0;
                
                // Verificar se o preço foi editado manualmente pelo vendedor
                const manuallyEditedPrice = parseFloat(priceInput.value.replace(',', '.')) || 0;
                
                // Verificar se o preço foi alterado manualmente
                const isManuallyEdited = product && 
                    manuallyEditedPrice > 0 && 
                    Math.abs(manuallyEditedPrice - (product.priceFinal || product.price)) > 0.01;
                
                // Aplicar estilo visual se o preço foi alterado manualmente
                if (isManuallyEdited) {
                    priceInput.style.color = '#1e88e5';  // Azul para indicar que foi alterado
                    priceInput.style.fontWeight = 'bold';
                } else {
                    priceInput.style.color = '';
                    priceInput.style.fontWeight = '';
                }
                
                // Determinar o preço base conforme o tipo de cliente ou usar o valor editado manualmente
                if (manuallyEditedPrice > 0) {
                    // Usar o preço editado manualmente pelo vendedor
                    basePrice = manuallyEditedPrice;
                    console.log(`[updateItemTotal] Usando preço editado manualmente: ${basePrice}/m²`);
                } else if (product) {
                    // Usar o preço padrão do produto conforme a categoria do cliente
                    if (this.formData.client?.category === 'reseller') {
                        basePrice = product.priceReseller || (product.price * 0.8);
                    } else {
                        basePrice = product.priceFinal || product.price;
                    }
                }
                
                // Obter e converter os valores necessários
                // Certifique-se de obter o valor mais recente do campo de área
                const area = parseFloat(areaInput.value.replace(',', '.')) || 0;
                const quantity = parseFloat(quantityInput.value.replace(',', '.')) || 0;
                
                // Logs para debug
                console.log(`[updateItemTotal] Preço base: ${basePrice}/m²`);
                console.log(`[updateItemTotal] Área: ${area}m²`);
                console.log(`[updateItemTotal] Quantidade: ${quantity}`);
                
                // Atualizar o preço unitário na interface somente se não tiver sido editado manualmente
                if (!manuallyEditedPrice) {
                    priceInput.value = basePrice.toFixed(2).replace('.', ',');
                }
                
                // Calcular o total: quantidade * preço * área
                const total = quantity * basePrice * area;
                
                // Atenção: Garantir que a área seja atualizada nos dados
                this.formData.items[index].area = area;
                
                console.log(`[updateItemTotal] Total calculado: ${total} (${quantity} × ${basePrice} × ${area})`);
                
                // Atualizar o total na interface com formato brasileiro
                totalInput.value = total.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).replace('.', ',');
                
                // Destacar campos visualmente
                areaInput.style.backgroundColor = '#ffff99';
                priceInput.style.backgroundColor = '#ffff99';
                totalInput.style.backgroundColor = '#ffff99';
                
                // Remover destaque visual após um tempo
                setTimeout(() => {
                    areaInput.style.backgroundColor = '';
                    priceInput.style.backgroundColor = '';
                    totalInput.style.backgroundColor = '';
                }, 800);
                
                // Atualizar os dados no objeto formData
                item.quantity = quantity;
                item.unitPrice = basePrice;  // Usar o valor calculado ou editado manualmente
                item.area = area;  // Certifique-se de que a área está sendo atualizada corretamente
                item.total = total;
            } else {
                // ---- PRODUTO NORMAL (SEM MEDIDA PERSONALIZADA) ----
                const quantity = parseFloat(quantityInput.value.replace(',', '.')) || 0;
                const price = parseFloat(priceInput.value.replace(',', '.')) || 0;
                const total = quantity * price;
                
                console.log(`[updateItemTotal] Produto normal - Qtd: ${quantity} × Preço: ${price} = ${total}`);
                
                // Atualizar o total na interface
                totalInput.value = total.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).replace('.', ',');
                
                // Destaque visual
                totalInput.style.backgroundColor = '#ffff99';
                setTimeout(() => {
                    totalInput.style.backgroundColor = '';
                }, 800);
                
                // Atualizar os dados
                item.quantity = quantity;
                item.unitPrice = price;
                item.total = total;
            }
            
            // Atualiza os totais do pedido
            this.updateOrderTotals();
            
        } catch (error) {
            console.error('Erro ao atualizar totais do item:', error, error.stack);
        }
    }
    
    // Adiciona um novo item ao pedido
    addOrderItem(productId = null) {
        // Cria o novo item com os valores padrão
        const newItem = {
            product: null,
            quantity: 1,
            unitPrice: 0,
            total: 0,
            width: 1,
            height: 1,
            area: 1,
            description: '',
            hasAplicacao: false
        };
        
        // Se um produto foi especificado, busca os detalhes do produto
        if (productId && this.products) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                newItem.product = product;
                
                // Define o preço baseado no tipo de cliente (se existir)
                if (this.formData.client && this.formData.client.category === 'reseller') {
                    newItem.unitPrice = product.priceReseller || (product.price * 0.8);
                } else {
                    newItem.unitPrice = product.price;
                }
                
                // Calcula o total inicial
                newItem.total = newItem.unitPrice * newItem.quantity;
                
                // Copia a descrição do produto
                newItem.description = product.description || '';
            }
        }
        
        // Adiciona o novo item ao array de itens
        if (!this.formData.items) this.formData.items = [];
        this.formData.items.push(newItem);
        
        // Recarrega os itens no DOM
        this.updateOrderItems();
        
        // Recalcula os totais do pedido
        this.updateOrderTotals();
        
        return newItem;
    }
    
    // Remove um item do pedido
    removeOrderItem(index) {
        if (!this.formData.items) {
            this.formData.items = [];
            return;
        }
        
        if (index >= 0 && index < this.formData.items.length) {
            // Confirma a remoção
            if (confirm('Deseja realmente remover este item?')) {
                // Remove o item do array
                this.formData.items.splice(index, 1);
                
                // Atualiza a interface
                const itemsContainer = document.getElementById('items-container');
                if (itemsContainer) {
                    if (this.formData.items.length === 0) {
                        // Se não há mais itens, mostra mensagem vazia
                        itemsContainer.innerHTML = `<div class="empty-state">
                            <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
                        </div>`;
                    } else {
                        // Renderiza os itens restantes
                        itemsContainer.innerHTML = this.renderOrderItems();
                    }
                    
                    // Adiciona os event listeners para os elementos restantes
                    this.addItemEventListeners();
                    
                    // Atualiza os cálculos de totais
                    this.updateOrderTotals();
                }
            }
        }
    }
    
    // Adiciona um novo pagamento
    addPayment() {
        console.log("Método addPayment chamado");
        
        // Garante que o botão não pode ser clicado durante a operação
        const addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) {
            if (addPaymentBtn.disabled) {
                console.log("Botão já está desabilitado, ignorando clique");
                return; // Evita múltiplos cliques
            }
            
            // Desabilita o botão temporariamente
            addPaymentBtn.disabled = true;
        }
        
        try {
            // Cria um novo pagamento vazio
            const newPayment = {
                method: 'pendente',
                amount: 0,
                value: 0, // Para compatibilidade
                date: new Date(),
                status: 'pendente'
            };
            
            // Adiciona ao array de pagamentos
            if (!this.formData.payments) {
                this.formData.payments = [];
            }
            
            this.formData.payments.push(newPayment);
            console.log(`Pagamento adicionado. Total: ${this.formData.payments.length}`);
            
            // Atualiza a interface
            const paymentsContainer = document.getElementById('payments-container');
            if (paymentsContainer) {
                // Renderiza todos os pagamentos
                paymentsContainer.innerHTML = this.renderPayments();
                
                // Adiciona event listeners para cada pagamento
                this.setupPaymentEventListeners();
                
                // Atualiza os cálculos de totais
                this.updateOrderTotals();
                
                // Rola para o novo pagamento
                const newPaymentElement = paymentsContainer.querySelector(`.payment-item[data-index="${this.formData.payments.length - 1}"]`);
                if (newPaymentElement) {
                    newPaymentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Foca no campo de valor do novo pagamento
                    const valueInput = newPaymentElement.querySelector('.payment-value');
                    if (valueInput) {
                        valueInput.focus();
                        valueInput.select();
                    }
                }
            }
        } finally {
            // Reabilita o botão após 500ms (evita cliques múltiplos acidentais)
            setTimeout(() => {
                if (addPaymentBtn) {
                    addPaymentBtn.disabled = false;
                }
            }, 500);
        }
    }
    
    // Exibe um modal para seleção rápida de produtos
    showProductSelectionModal() {
        // Verifica se temos produtos para mostrar
        if (!this.products || this.products.length === 0) {
            if (window.ui) {
                window.ui.showNotification('Não há produtos cadastrados. Adicione produtos primeiro.', 'warning');
            } else {
                alert('Não há produtos cadastrados. Adicione produtos primeiro.');
            }
            // Adiciona um item vazio mesmo assim
            this.addOrderItem();
            return;
        }
        
        // Cria o modal
        const modalHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Selecionar Produto</h3>
                    <button type="button" class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" id="product-search" class="form-control" placeholder="Pesquisar produto...">
                    </div>
                    <div class="products-list">
                        ${this.renderProductsList()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal-btn">Cancelar</button>
                    <button type="button" class="btn btn-primary add-empty-item-btn">Adicionar Item Vazio</button>
                </div>
            </div>
        `;
        
        // Cria o elemento do modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.innerHTML = modalHTML;
        
        // Adiciona ao DOM
        document.body.appendChild(modalContainer);
        
        // Adiciona os event listeners
        const closeButtons = modalContainer.querySelectorAll('.close-modal, .close-modal-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modalContainer);
            });
        });
        
        // Botão para adicionar item vazio
        const addEmptyItemBtn = modalContainer.querySelector('.add-empty-item-btn');
        if (addEmptyItemBtn) {
            addEmptyItemBtn.addEventListener('click', () => {
                this.addOrderItem();
                document.body.removeChild(modalContainer);
            });
        }
        
        // Event listeners para os itens da lista
        const productItems = modalContainer.querySelectorAll('.product-item');
        productItems.forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.getAttribute('data-id');
                if (productId) {
                    this.addOrderItem(productId);
                    document.body.removeChild(modalContainer);
                }
            });
        });
        
        // Pesquisa de produtos
        const searchInput = modalContainer.querySelector('#product-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchText = searchInput.value.toLowerCase();
                const productsList = modalContainer.querySelector('.products-list');
                
                if (productsList) {
                    if (searchText.length > 0) {
                        const filteredProducts = this.products.filter(product => 
                            product.name.toLowerCase().includes(searchText) || 
                            (product.description && product.description.toLowerCase().includes(searchText))
                        );
                        
                        productsList.innerHTML = this.renderProductsList(filteredProducts);
                    } else {
                        productsList.innerHTML = this.renderProductsList();
                    }
                    
                    // Reaplica os event listeners
                    const newProductItems = productsList.querySelectorAll('.product-item');
                    newProductItems.forEach(item => {
                        item.addEventListener('click', () => {
                            const productId = item.getAttribute('data-id');
                            if (productId) {
                                this.addOrderItem(productId);
                                document.body.removeChild(modalContainer);
                            }
                        });
                    });
                }
            });
            
            // Foca no campo de pesquisa
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        }
    }
    
    // Renderiza a lista de produtos para o modal
    renderProductsList(products = null) {
        const productsToRender = products || this.products;
        
        if (!productsToRender || productsToRender.length === 0) {
            return `<div class="empty-state">Nenhum produto encontrado.</div>`;
        }
        
        let html = '<div class="products-grid">';
        
        // Determina a categoria do cliente atual
        const clientCategory = this.formData.client && this.formData.client.category === 'reseller' ? 'reseller' : 'final';
        
        productsToRender.forEach(product => {
            // Adiciona uma classe especial para produtos com medida personalizada
            const customSizeClass = product.productType === 'custom_size' ? 'custom-size-product' : '';
            
            // Adiciona um indicador para produtos com medida personalizada
            const customSizeIndicator = product.productType === 'custom_size' 
                ? `<div class="custom-size-indicator"><i class="fas fa-ruler"></i> Medida personalizada</div>` 
                : '';
            
            // Determina o preço a ser exibido com base na categoria do cliente
            let displayPrice;
            if (clientCategory === 'reseller') {
                // Para revendedores, mostra o preço de revenda
                displayPrice = product.priceReseller || (product.price * 0.8);
            } else {
                // Para clientes finais, mostra o preço normal
                displayPrice = product.priceFinal || product.price;
            }
            
            // Formata o preço para exibição
            const formattedPrice = window.ui ? window.ui.formatCurrency(displayPrice) : `R$ ${displayPrice.toFixed(2)}`;
            
            // Adiciona indicador de categoria de preço
            const priceIndicator = clientCategory === 'reseller' 
                ? '<span class="price-category reseller">Preço Revenda</span>' 
                : '<span class="price-category final">Preço Final</span>';
            
            html += `
                <div class="product-item ${customSizeClass}" data-id="${product.id}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price-container">
                        <div class="product-price">${formattedPrice}</div>
                        ${priceIndicator}
                    </div>
                    <div class="product-description">${product.description || ''}</div>
                    ${customSizeIndicator}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    // Configurar handlers para imagens
    setupImageHandlers() {
        // Upload de arquivo
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Verificar se é uma imagem válida
                if (!file.type.match('image.*')) {
                    window.ui.showNotification('Apenas arquivos de imagem são permitidos', 'error');
                    return;
                }
                
                // Tamanho máximo (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    window.ui.showNotification('A imagem deve ter no máximo 5MB', 'error');
                    return;
                }
                
                const ordersComponent = new OrdersComponent();
                ordersComponent.handleImageUpload.call(this, e);
            });
        }
        
        // Botão de screenshot
        const screenshotBtn = document.getElementById('screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                const ordersComponent = new OrdersComponent();
                ordersComponent.captureScreenshot.call(this);
            });
        }
        
        // Botão de ajuda
        const helpBtn = document.getElementById('screenshot-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const ui = window.ui;
                ui.showScreenshotHelp();
            });
        }
        
        // Remover imagem
        const removeImageBtn = document.getElementById('remove-image');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => {
                const ordersComponent = new OrdersComponent();
                ordersComponent.removeImage.call(this);
            });
        }
    }
    
    // Setup para autocomplete de clientes
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
                client.name && client.name.toLowerCase().includes(searchText)
            );
            
            if (filteredClients.length > 0) {
                suggestionsContainer.style.display = 'block';
                
                filteredClients.forEach(client => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.innerHTML = `
                        <div class="client-name">${client.name}</div>
                        <div class="client-details">${client.document || ''} ${client.phone ? '| ' + client.phone : ''}</div>
                    `;
                    
                    item.addEventListener('click', () => {
                        searchInput.value = client.name;
                        if (clientIdInput) clientIdInput.value = client.id;
                        suggestionsContainer.style.display = 'none';
                        
                        // Atualiza os detalhes do cliente
                        this.formData.client = client;
                        this.formData.clientId = client.id;
                        this.formData.clientName = client.name;
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
            if (clientIdInput) clientIdInput.value = this.formData.client.id;
            
            // Atualiza os detalhes do cliente também para exibi-los
            setTimeout(() => {
                this.updateClientDetails(this.formData.client);
            }, 300);
        }
    }
    
    // Atualiza os detalhes do cliente na interface
    updateClientDetails(client) {
        const clientDetails = document.getElementById('client-details');
        if (!clientDetails) return;
        
        if (client) {
            // Determina a categoria do cliente (final ou revenda)
            const clientCategory = client.category || 'final';
            
            // Atualiza os preços dos produtos no pedido com base na categoria do cliente
            this.updateProductPricesBasedOnClientCategory(clientCategory);
            
            // Exibe os detalhes do cliente na interface
            clientDetails.classList.remove('hidden');
            
            // Adiciona um indicador visual da categoria do cliente
            const categoryBadge = clientCategory === 'reseller' 
                ? '<span class="client-category reseller">Revenda</span>' 
                : '<span class="client-category final">Cliente Final</span>';
            
            clientDetails.innerHTML = `
                <div class="client-info-grid">
                    <div class="client-info-item">
                        <span class="info-label">Documento:</span>
                        <span class="info-value">${client.document || '-'}</span>
                    </div>
                    <div class="client-info-item">
                        <span class="info-label">Telefone:</span>
                        <span class="info-value">${client.phone || '-'}</span>
                    </div>
                    <div class="client-info-item">
                        <span class="info-label">E-mail:</span>
                        <span class="info-value">${client.email || '-'}</span>
                    </div>
                    <div class="client-info-item">
                        <span class="info-label">Categoria:</span>
                        <span class="info-value">${categoryBadge}</span>
                    </div>
                    <div class="client-info-item full-width">
                        <span class="info-label">Endereço:</span>
                        <span class="info-value">${client.address || '-'}</span>
                    </div>
                </div>
            `;
        } else {
            clientDetails.classList.add('hidden');
        }
    }
    
    // Atualiza os preços dos produtos com base na categoria do cliente
    updateProductPricesBasedOnClientCategory(clientCategory) {
        // Se não houver itens no pedido, não há nada para atualizar
        if (!this.formData.items || this.formData.items.length === 0) return;
        
        // Verifica se algum preço foi editado manualmente
        const hasEditedPrices = this.formData.items.some(item => {
            if (!item.product) return false;
            
            // Determina o preço padrão do produto (com base na categoria atual)
            const defaultPrice = clientCategory === 'reseller' 
                ? (item.product.priceReseller || (item.product.price * 0.8))
                : (item.product.priceFinal || item.product.price);
            
            // Verifica se o preço atual é diferente do padrão
            return Math.abs(item.unitPrice - defaultPrice) > 0.01;
        });
        
        // Se houver preços editados manualmente, pede confirmação
        if (hasEditedPrices) {
            const confirmUpdate = confirm(
                `Alguns preços foram editados manualmente. Deseja substituí-los pelos preços padrão da categoria "${clientCategory === 'reseller' ? 'Revenda' : 'Cliente Final'}"?`
            );
            
            if (!confirmUpdate) {
                // Se o usuário não confirmar, notifica e não atualiza os preços
                if (window.ui) {
                    window.ui.showNotification('Atualização de preços cancelada pelo usuário.', 'info');
                }
                return;
            }
        }
        
        // Percorre todos os itens do pedido
        this.formData.items.forEach((item, index) => {
            if (!item.product) return;
            
            // Determina o preço correto com base na categoria do cliente
            let newPrice;
            if (clientCategory === 'reseller') {
                // Para revendedores, usa o preço de revenda (ou calcula como 80% do preço final)
                newPrice = item.product.priceReseller || (item.product.price * 0.8);
            } else {
                // Para clientes finais, usa o preço normal
                newPrice = item.product.priceFinal || item.product.price;
            }
            
            // Atualiza o preço unitário do item
            item.unitPrice = newPrice;
            
            // Atualiza a interface para o item atual
            const itemRow = document.querySelector(`.order-item[data-index="${index}"]`);
            if (itemRow) {
                const priceInput = itemRow.querySelector('.item-price');
                if (priceInput) {
                    priceInput.value = newPrice;
                }
            }
        });
        
        // Recalcula os totais
        this.updateOrderTotals();
        
        // Notifica o usuário sobre a atualização dos preços
        if (window.ui && this.formData.items.length > 0) {
            window.ui.showNotification(`Preços atualizados para ${clientCategory === 'reseller' ? 'Revenda' : 'Cliente Final'}.`, 'info');
        }
    }
    
    // Configurar listener para colagem de imagens
    setupPasteListener() {
        // Adiciona um evento global para detectar Ctrl+V
        document.addEventListener('paste', (e) => {
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
                    window.ui.showNotification('A imagem deve ter no máximo 5MB', 'error');
                    return;
                }
                
                // Lê a imagem como URL de dados
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.formData.imageUrl = event.target.result;
                    this.updateImagePreview();
                    window.ui.showNotification('Imagem colada com sucesso!', 'success');
                };
                
                reader.readAsDataURL(blob);
            }
        });
    }
    
    // Salva o pedido no banco de dados
    async saveOrder() {
        try {
            // Captura os dados do formulário
            const formData = this.captureFormData();
            
            // Verifica se temos um ID de pedido (edição)
            const isEditing = this.formData.id !== undefined;
            console.log("Salvando pedido - isEditing:", isEditing, "ID:", this.formData.id);
            
            // Validação básica
            if (!formData.client || !formData.client.id) {
                if (window.ui) {
                    window.ui.showNotification('Selecione um cliente para o pedido', 'error');
                } else {
                    alert('Selecione um cliente para o pedido');
                }
                return;
            }
            
            if (formData.items.length === 0) {
                if (window.ui) {
                    window.ui.showNotification('Adicione pelo menos um item ao pedido', 'error');
                } else {
                    alert('Adicione pelo menos um item ao pedido');
                }
                return;
            }
            
            // Mostra loader
            if (window.ui) {
                window.ui.showLoading('Salvando pedido...');
            }
            
            // Prepara os dados para salvar
            const orderData = {
                clientId: formData.client.id,
                clientName: formData.client.name,
                clientDocument: formData.client.document,
                clientPhone: formData.client.phone,
                clientEmail: formData.client.email,
                clientAddress: formData.client.address,
                clientCategory: formData.client.category,
                items: formData.items,
                payments: formData.payments,
                notes: formData.notes,
                status: formData.status,
                orderNumber: formData.orderNumber,
                createdAt: isEditing && this.formData.createdAt ? this.formData.createdAt : new Date(),
                updatedAt: new Date(),
                deliveryDate: formData.deliveryDate,
                deliveryType: formData.deliveryType,
                deliveryAddress: formData.deliveryAddress,
                deliveryCost: formData.deliveryCost,
                totalValue: formData.totalValue,
                sellerName: formData.sellerName,
                sellerId: formData.sellerId,
                discount: formData.discount,
                extraServices: formData.extraServices,
                imageUrl: formData.imageUrl,
                imageTitle: formData.imageTitle || ''
            };
            
            // Referência para a coleção de pedidos
            const ordersRef = db.collection('orders');
            
            let result;
            
            if (isEditing) {
                // Verifica se o pedido existe e obtém dados atuais se necessário
                try {
                    const orderDoc = await ordersRef.doc(this.formData.id).get();
                    if (orderDoc.exists && !orderData.createdAt) {
                        const existingData = orderDoc.data();
                        // Usa o createdAt existente se o nosso estiver undefined
                        orderData.createdAt = existingData.createdAt || new Date();
                    }
                } catch (error) {
                    console.warn("Erro ao verificar pedido existente:", error);
                    // Garante que createdAt tenha um valor válido
                    orderData.createdAt = orderData.createdAt || new Date();
                }
                
                // Atualiza o pedido existente
                await ordersRef.doc(this.formData.id).update(orderData);
                result = { id: this.formData.id };
                console.log(`Pedido atualizado com sucesso: ${this.formData.id}`);
                if (window.ui) {
                    window.ui.showNotification('Pedido atualizado com sucesso!', 'success');
                } else {
                    alert('Pedido atualizado com sucesso!');
                }
            } else {
                // Cria um novo pedido
                result = await ordersRef.add(orderData);
                console.log(`Novo pedido criado com sucesso: ${result.id}`);
                if (window.ui) {
                    window.ui.showNotification('Pedido criado com sucesso!', 'success');
                } else {
                    alert('Pedido criado com sucesso!');
                }
            }
            
            // Esconde o loader
            if (window.ui) {
                window.ui.hideLoading();
            }
            
            // Redireciona para a lista de pedidos ou para os detalhes do pedido
            // Verifica se existe um componente de pedidos global
            if (window.ordersComponent) {
                if (isEditing) {
                    // Volta para a visualização de detalhes do pedido
                    window.ordersComponent.showDetailView(this.formData.id);
                } else {
                    // Volta para a lista de pedidos
                    window.ordersComponent.showListView();
                }
            } else {
                // Recarrega a página se não houver componente de pedidos
                location.reload();
            }
            
            return result.id;
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            if (window.ui) {
                window.ui.hideLoading();
                window.ui.showNotification('Erro ao salvar pedido. Por favor, tente novamente.', 'error');
            } else {
                alert('Erro ao salvar pedido. Por favor, tente novamente.');
            }
            return null;
        }
    }
    
    // Captura os dados do formulário garantindo as datas corretas
    captureFormData() {
        // Recupera dados do cliente
        const clientSearch = document.getElementById('client-search');
        const clientIdInput = document.getElementById('client-id');
        
        // Verifica se temos um cliente selecionado
        if (clientIdInput && clientIdInput.value) {
            const clientId = clientIdInput.value;
            // Busca o cliente pelo ID
            const client = this.clients.find(c => c.id === clientId);
            
            if (client) {
                this.formData.client = client;
                this.formData.clientId = clientId;
            } else {
                console.warn('Cliente não encontrado com ID:', clientId);
            }
        } else if (clientSearch && clientSearch.dataset.clientId) {
            const clientId = clientSearch.dataset.clientId;
            // Busca o cliente pelo ID
            const client = this.clients.find(c => c.id === clientId);
            
            if (client) {
                this.formData.client = client;
                this.formData.clientId = clientId;
            } else {
                console.warn('Cliente não encontrado com ID:', clientId);
            }
        } else {
            console.warn('Nenhum cliente selecionado');
        }
        
        // Garante que o cliente exista no formData
        if (!this.formData.client) {
            this.formData.client = null;
        }
        
        // Recupera número do pedido
        const orderNumberInput = document.getElementById('order-number');
        if (orderNumberInput && orderNumberInput.value) {
            this.formData.orderNumber = orderNumberInput.value;
        }
        
        // Captura valores dos pagamentos diretamente dos inputs
        document.querySelectorAll('.payment-item').forEach((item, index) => {
            if (index < this.formData.payments.length) {
                const valueInput = item.querySelector('.payment-value');
                if (valueInput) {
                    const value = parseFloat(valueInput.value.replace(',', '.')) || 0;
                    this.formData.payments[index].amount = value;
                    this.formData.payments[index].value = value; // Para compatibilidade
                }
                
                const methodSelect = item.querySelector('.payment-method');
                if (methodSelect) {
                    this.formData.payments[index].method = methodSelect.value;
                }
                
                const dateInput = item.querySelector('.payment-date');
                if (dateInput && dateInput.value) {
                    this.formData.payments[index].date = new Date(dateInput.value);
                }
            }
        });
        
        // Recupera observações
        const notesInput = document.getElementById('notes');
        if (notesInput) {
            this.formData.notes = notesInput.value;
        }
        
        // Recupera status
        const statusSelect = document.getElementById('order-status');
        if (statusSelect) {
            this.formData.status = statusSelect.value;
        }
        
        // Recupera vendedor
        const sellerSelect = document.getElementById('seller');
        if (sellerSelect) {
            this.formData.sellerId = sellerSelect.value;
            
            if (sellerSelect.selectedOptions && sellerSelect.selectedOptions[0]) {
                this.formData.sellerName = sellerSelect.selectedOptions[0].dataset.name || sellerSelect.selectedOptions[0].textContent;
            }
        }
        
        // Recupera tipo de entrega
        const deliveryTypeSelect = document.getElementById('delivery-type');
        if (deliveryTypeSelect) {
            this.formData.deliveryType = deliveryTypeSelect.value;
        }
        
        // Recupera endereço de entrega
        const deliveryAddressInput = document.getElementById('delivery-address');
        if (deliveryAddressInput) {
            this.formData.deliveryAddress = deliveryAddressInput.value;
        }
        
        // Recupera custo de entrega
        const deliveryCostInput = document.getElementById('delivery-cost');
        if (deliveryCostInput) {
            const costValue = deliveryCostInput.value.replace(',', '.').trim();
            this.formData.deliveryCost = costValue ? parseFloat(costValue) : null;
        }
        
        // Recupera desconto
        const discountInput = document.getElementById('order-discount');
        if (discountInput) {
            const discountValue = discountInput.value.replace(',', '.').trim();
            this.formData.discount = discountValue ? parseFloat(discountValue) : 0;
        }
        
        // Recupera serviços extras
        const extrasInput = document.getElementById('order-extras');
        if (extrasInput) {
            const extrasValue = extrasInput.value.replace(',', '.').trim();
            this.formData.extraServices = extrasValue ? parseFloat(extrasValue) : 0;
        }
        
        // Recupera data de entrega
        const deliveryDateInput = document.getElementById('expected-date');
        const deliveryTimeInput = document.getElementById('expected-time');
        
        if (deliveryDateInput && deliveryDateInput.value) {
            try {
                // Cria uma nova data com a data escolhida pelo usuário
                const [year, month, day] = deliveryDateInput.value.split('-').map(Number);
                let hours = 0, minutes = 0;
                
                // Adiciona hora se disponível
                if (deliveryTimeInput && deliveryTimeInput.value) {
                    [hours, minutes] = deliveryTimeInput.value.split(':').map(Number);
                }
                
                // Cria uma data diretamente sem usar string de fuso horário
                const deliveryDate = new Date();
                deliveryDate.setFullYear(year);
                deliveryDate.setMonth(month - 1); // Mês em JavaScript é baseado em zero (0-11)
                deliveryDate.setDate(day);
                deliveryDate.setHours(hours, minutes, 0, 0);
                
                this.formData.deliveryDate = deliveryDate;
                console.log('Data de entrega capturada:', deliveryDate);
            } catch (error) {
                console.error('Erro ao processar data de entrega:', error);
                // Usa a data atual como fallback
                this.formData.deliveryDate = new Date();
            }
        }
        
        // Recupera informações da imagem
        const imageTitleInput = document.getElementById('image-title');
        if (imageTitleInput) {
            this.formData.imageTitle = imageTitleInput.value;
        }
        
        // Calcula o valor total do pedido
        this.formData.totalValue = this.calculateOrderTotal();
        
        // Log dos dados capturados
        console.log('Dados do formulário capturados:', JSON.stringify(this.formData));
        
        return this.formData;
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
    
    // Limpa recursos quando o componente é desmontado
    cleanup() {
        console.log("Limpando componente NewOrderComponent");
        
        // Limpa outros recursos se necessário
    }
    
    // Atualiza a interface de um item quando o produto é alterado
    updateItemInterface(index) {
        if (!this.formData.items || index >= this.formData.items.length) return;
        
        const item = this.formData.items[index];
        if (!item || !item.product) return;
        
        const isCustomSize = item.product.productType === 'custom_size';
        console.log(`[updateItemInterface] Item ${index} é de medida personalizada: ${isCustomSize}`);
        
        // Encontra o elemento do item
        const itemElement = document.querySelector(`.order-item[data-index="${index}"]`);
        if (!itemElement) {
            console.error(`Elemento do item ${index} não encontrado`);
            return;
        }

        // Encontrar a linha com os campos inline
        const inlineFields = itemElement.querySelector('.inline-item-fields');
        if (!inlineFields) {
            console.error(`Campos inline do item ${index} não encontrados`);
            return;
        }
        
        // Encontrar campos de dimensões
        const widthGroup = inlineFields.querySelector('.form-group:nth-child(2)');
        const heightGroup = inlineFields.querySelector('.form-group:nth-child(3)');
        const areaGroup = inlineFields.querySelector('.form-group:nth-child(4)');
        
        if (!widthGroup || !heightGroup || !areaGroup) {
            console.error(`Campos de dimensão do item ${index} não encontrados`);
            return;
        }
        
        // Encontrar campos de preço
        const priceInput = itemElement.querySelector('.item-price');
        const totalInput = itemElement.querySelector('.item-total');
        
        if (isCustomSize) {
            console.log(`[updateItemInterface] Configurando campos de medida personalizada para item ${index}`);
            
            // Mostrar campos e atualizar para inputs normais
            widthGroup.style.display = 'block';
            heightGroup.style.display = 'block';
            areaGroup.style.display = 'block';
            
            // Atualizar os campos para inputs number
            const widthInput = widthGroup.querySelector('input');
            const heightInput = heightGroup.querySelector('input');
            const areaInput = areaGroup.querySelector('input');
            
            if (widthInput && heightInput && areaInput) {
                // Atualizar para type text
                widthInput.type = 'text';
                heightInput.type = 'text';
                areaInput.type = 'text';
                
                // Definir valores iniciais se ainda não existirem
                if (!item.width) item.width = 1;
                if (!item.height) item.height = 1;
                
                // Definir valores nos campos com formato brasileiro
                widthInput.value = item.width.toString().replace('.', ',');
                heightInput.value = item.height.toString().replace('.', ',');
                
                // Calcular área inicial
                const area = item.width * item.height;
                
                // Atualizar o campo de área
                areaInput.value = area.toFixed(4).replace('.', ',');
                areaInput.readOnly = true;
                
                // Destacar visualmente o campo de área
                areaInput.style.backgroundColor = '#f0f8ff'; // Azul claro
                areaInput.style.fontWeight = 'bold';
                
                // Atualizar dados do item
                this.formData.items[index].area = area;
                
                // Função simplificada para atualizar a área
                function atualizarAreaEPreco() {
                    try {
                        // Obter as referências atualizadas dos campos
                        const currentWidthInput = itemElement.querySelector('.item-width');
                        const currentHeightInput = itemElement.querySelector('.item-height');
                        
                        if (!currentWidthInput || !currentHeightInput) {
                            console.error('Campos de dimensão não encontrados');
                            return;
                        }
                        
                        // Calcular a área
                        const largura = parseFloat(currentWidthInput.value.replace(',', '.')) || 0;
                        const altura = parseFloat(currentHeightInput.value.replace(',', '.')) || 0;
                        const novaArea = largura * altura;
                        
                        // Exibir valores no console para debug
                        console.log(`[updateItemInterface] Item ${index}: ${largura}m × ${altura}m = ${novaArea}m²`);
                        
                        // Atualizar o campo de área
                        areaInput.value = novaArea.toFixed(4).replace('.', ',');
                        
                        // Destacar campo visualmente
                        areaInput.style.backgroundColor = '#ffff99';
                        setTimeout(() => areaInput.style.backgroundColor = '#f0f8ff', 800);
                        
                        // Atualizar o objeto de dados
                        this.formData.items[index].width = largura;
                        this.formData.items[index].height = altura;
                        this.formData.items[index].area = novaArea;
                        
                        // Recalcular o preço
                        this.updateItemTotal(itemElement, index);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao atualizar área em updateItemInterface: ${error.message}`);
                    }
                }
                
                // Criar novos elementos para substituir os existentes
                const novoWidthInput = document.createElement('input');
                const novoHeightInput = document.createElement('input');
                
                // Copiar atributos
                novoWidthInput.type = 'text';
                novoWidthInput.className = widthInput.className;
                novoWidthInput.value = item.width.toString().replace('.', ',');
                novoWidthInput.placeholder = 'Largura';
                
                novoHeightInput.type = 'text';
                novoHeightInput.className = heightInput.className;
                novoHeightInput.value = item.height.toString().replace('.', ',');
                novoHeightInput.placeholder = 'Altura';
                
                // Substituir os elementos
                widthInput.parentNode.replaceChild(novoWidthInput, widthInput);
                heightInput.parentNode.replaceChild(novoHeightInput, heightInput);
                
                // Adicionar event listeners diretamente aos novos elementos
                // Usar addEventListener com 'input' para capturar todas as alterações (digitação, colar, autocomplete)
                novoWidthInput.oninput = function(e) {
                    console.log(`[DIRETO] Alteração no campo de largura: ${this.value}`);
                    // Forçar recálculo imediato
                    atualizarAreaEPreco.call(this);
                }.bind(this);
                
                novoHeightInput.oninput = function(e) {
                    console.log(`[DIRETO] Alteração no campo de altura: ${this.value}`);
                    // Forçar recálculo imediato
                    atualizarAreaEPreco.call(this);
                }.bind(this);
                
                // Forçar recálculos ao mudar o foco
                novoWidthInput.onblur = atualizarAreaEPreco.bind(this);
                novoHeightInput.onblur = atualizarAreaEPreco.bind(this);
                
                // Garantir que capturemos todas as formas de alteração
                ['keyup', 'keydown', 'change', 'paste', 'blur'].forEach(eventType => {
                    novoWidthInput.addEventListener(eventType, function() {
                        console.log(`[EVENTO] ${eventType} no campo de largura`);
                        atualizarAreaEPreco.call(this);
                    }.bind(this));
                    
                    novoHeightInput.addEventListener(eventType, function() {
                        console.log(`[EVENTO] ${eventType} no campo de altura`);
                        atualizarAreaEPreco.call(this);
                    }.bind(this));
                });
                
                // Eventos adicionais para garantir que a atualização ocorra
                novoWidthInput.addEventListener('change', atualizarAreaEPreco.bind(this));
                novoHeightInput.addEventListener('change', atualizarAreaEPreco.bind(this));
                novoWidthInput.addEventListener('blur', atualizarAreaEPreco.bind(this));
                novoHeightInput.addEventListener('blur', atualizarAreaEPreco.bind(this));
                novoWidthInput.addEventListener('keyup', atualizarAreaEPreco.bind(this));
                novoHeightInput.addEventListener('keyup', atualizarAreaEPreco.bind(this));
                novoWidthInput.addEventListener('keydown', function(e) {
                    // Capturar também teclas de seta (cima/baixo) e números do teclado numérico
                    if (e.key.startsWith('Arrow') || e.key.startsWith('Numpad')) {
                        setTimeout(() => atualizarAreaEPreco.call(this), 0);
                    }
                }.bind(this));
                novoHeightInput.addEventListener('keydown', function(e) {
                    if (e.key.startsWith('Arrow') || e.key.startsWith('Numpad')) {
                        setTimeout(() => atualizarAreaEPreco.call(this), 0);
                    }
                }.bind(this));
                
                // Executar o cálculo inicial
                setTimeout(() => {
                    console.log(`[updateItemInterface] Calculando área inicial para item ${index}`);
                    atualizarAreaEPreco.call(this);
                }, 200);
            } else {
                console.error(`Inputs de dimensão do item ${index} não encontrados`);
            }
        } else {
            console.log(`[updateItemInterface] Ocultando campos de medida personalizada para item ${index}`);
            
            // Esconder campos de dimensões
            widthGroup.style.display = 'none';
            heightGroup.style.display = 'none';
            areaGroup.style.display = 'none';
            
            // Reajustar o cálculo para usar o preço simples, sem área
            this.formData.items[index].width = 0;
            this.formData.items[index].height = 0;
            this.formData.items[index].area = 0;
            
            // Atualiza o total baseado apenas em quantidade e preço unitário
            this.updateItemTotal(itemElement, index);
        }
    }
    
    // Configura event listeners para pagamentos
    setupPaymentEventListeners() {
        // Event listeners para itens de pagamento
        document.querySelectorAll('.payment-item').forEach((item, index) => {
            const methodSelect = item.querySelector('.payment-method');
            const valueInput = item.querySelector('.payment-value');
            const dateInput = item.querySelector('.payment-date');
            const removeButton = item.querySelector('.remove-payment');
            
            // Listener para botão de remover pagamento
            if (removeButton) {
                // Clonar o botão para remover event listeners existentes
                const oldRemoveButton = removeButton;
                const newRemoveButton = oldRemoveButton.cloneNode(true);
                oldRemoveButton.parentNode.replaceChild(newRemoveButton, oldRemoveButton);
                
                // Adicionar novo event listener
                newRemoveButton.addEventListener('click', () => {
                    this.removePayment(index);
                });
            }
            
            // Listener para mudanças no valor do pagamento
            if (valueInput) {
                valueInput.addEventListener('input', () => {
                    // Atualiza o valor no objeto do pagamento
                    if (index < this.formData.payments.length) {
                        // Converte para número e garante que seja um valor válido
                        const value = parseFloat(valueInput.value) || 0;
                        this.formData.payments[index].amount = value;
                        this.formData.payments[index].value = value; // Para compatibilidade
                    }
                    this.updateOrderTotals();
                });
            }
            
            // Listener para mudanças no método de pagamento
            if (methodSelect) {
                methodSelect.addEventListener('change', () => {
                    if (index < this.formData.payments.length) {
                        this.formData.payments[index].method = methodSelect.value;
                    }
                });
            }
            
            // Listener para mudanças na data de pagamento
            if (dateInput) {
                dateInput.addEventListener('change', () => {
                    if (index < this.formData.payments.length) {
                        this.formData.payments[index].date = new Date(dateInput.value);
                    }
                });
            }
        });
    }
    
    // Remove um pagamento
    removePayment(index) {
        if (!this.formData.payments) {
            this.formData.payments = [];
            return;
        }
        
        if (index >= 0 && index < this.formData.payments.length) {
            // Confirma a remoção
            if (confirm('Deseja realmente remover este pagamento?')) {
                // Remove o pagamento do array
                this.formData.payments.splice(index, 1);
                
                // Atualiza a interface
                const paymentsContainer = document.getElementById('payments-container');
                if (paymentsContainer) {
                    if (this.formData.payments.length === 0) {
                        // Se não há mais pagamentos, mostra mensagem vazia
                        paymentsContainer.innerHTML = `<div class="empty-state">
                            <p>Nenhum pagamento adicionado. Clique em "Adicionar Pagamento" para registrar.</p>
                        </div>`;
                    } else {
                        // Renderiza os pagamentos restantes
                        paymentsContainer.innerHTML = this.renderPayments();
                    }
                    
                    // Adiciona os event listeners para os elementos restantes
                    this.setupPaymentEventListeners();
                    
                    // Atualiza os cálculos de totais
                    this.updateOrderTotals();
                }
            }
        }
    }
    
    // Atualiza os totais do pedido na interface
    updateOrderTotals() {
        console.log(`[updateOrderTotals] Atualizando totais do pedido`);
        
        // Verifica se temos o formData inicializado
        if (!this.formData) {
            this.formData = {
                items: [],
                payments: []
            };
        }
        
        // Garante que temos arrays de itens e pagamentos
        if (!this.formData.items) this.formData.items = [];
        if (!this.formData.payments) this.formData.payments = [];
        
        // Atualiza os totais dos itens
        const itemRows = document.querySelectorAll('.order-item');
        itemRows.forEach((row, index) => {
            const productSelect = row.querySelector('.item-product');
            const quantityInput = row.querySelector('.item-quantity');
            const priceInput = row.querySelector('.item-price');
            const totalInput = row.querySelector('.item-total');
            const descriptionInput = row.querySelector('.item-description');
            
            // Campos específicos para produtos com medida personalizada
            const widthInput = row.querySelector('.item-width');
            const heightInput = row.querySelector('.item-height');
            const areaInput = row.querySelector('.item-area');
            
            if (quantityInput && priceInput && totalInput) {
                // Atualiza o objeto de dados
                if (index < this.formData.items.length) {
                    // Atualiza o produto selecionado se houver mudança
                    if (productSelect && productSelect.value) {
                        const productId = productSelect.value;
                        const currentProductId = this.formData.items[index].product ? this.formData.items[index].product.id : null;
                        
                        // Se o produto mudou, atualiza os dados
                        if (productId !== currentProductId) {
                            const selectedProduct = this.products.find(p => p.id === productId);
                            if (selectedProduct) {
                                this.formData.items[index].product = selectedProduct;
                                
                                console.log(`[updateOrderTotals] Produto alterado para ${selectedProduct.name}`);
                                
                                // Determina o preço correto com base na categoria do cliente
                                let basePrice = 0;
                                if (this.formData.client && this.formData.client.category === 'reseller') {
                                    // Para revendedores, usa o preço de revenda
                                    basePrice = selectedProduct.priceReseller || (selectedProduct.price * 0.8);
                                } else {
                                    // Para clientes finais, usa o preço normal
                                    basePrice = selectedProduct.priceFinal || selectedProduct.price;
                                }
                                
                                // Atualiza o preço unitário no formData e na interface
                                this.formData.items[index].unitPrice = basePrice;
                                priceInput.value = basePrice.toFixed(2);
                                
                                // Se o novo produto for de medida personalizada, inicializa os valores
                                if (selectedProduct.productType === 'custom_size') {
                                    this.formData.items[index].width = 1;
                                    this.formData.items[index].height = 1;
                                    this.formData.items[index].area = 1;
                                }
                                
                                // Atualiza a interface para mostrar/ocultar campos de dimensões
                                this.updateItemInterface(index);
                            }
                        }
                    }
                    
                    // Se for um produto com medida personalizada, verifica se precisamos recalcular
                    if (this.formData.items[index].product && 
                        this.formData.items[index].product.productType === 'custom_size' &&
                        areaInput) {
                        
                        // Garante que estamos usando o valor mais atualizado da área
                        const area = parseFloat(areaInput.value.replace(',', '.')) || 0;
                        const quantity = parseFloat(quantityInput.value.replace(',', '.')) || 0;
                        const price = parseFloat(priceInput.value.replace(',', '.')) || 0;
                        
                        // Atualiza também o formData para manter consistência
                        this.formData.items[index].area = area;
                        this.formData.items[index].quantity = quantity;
                        
                        // Recalcula o total considerando a área
                        const total = quantity * price * area;
                        
                        // Atualiza o total no formData e na interface
                        this.formData.items[index].total = total;
                        
                        // Formatar o valor para exibição
                        totalInput.value = total.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }).replace('.', ',');
                        
                        console.log(`[updateOrderTotals] Recalculando produto com área: 
                            Quantidade: ${quantity} 
                            Preço: ${price} 
                            Área: ${area} 
                            Total: ${total}`);
                    } else {
                        // Para produtos normais, recalcula o total
                        const quantity = parseFloat(quantityInput.value.replace(',', '.')) || 0;
                        const price = parseFloat(priceInput.value.replace(',', '.')) || 0;
                        const total = quantity * price;
                        
                        // Atualiza o formData e a interface
                        this.formData.items[index].quantity = quantity;
                        this.formData.items[index].unitPrice = price;
                        this.formData.items[index].total = total;
                        
                        // Formatar o valor para exibição
                        totalInput.value = total.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }).replace('.', ',');
                    }
                    
                    // Atualiza a descrição se ela existir
                    if (descriptionInput) {
                        this.formData.items[index].description = descriptionInput.value;
                    }
                    
                    // Atualiza os campos de dimensões se existirem
                    if (widthInput && heightInput && areaInput) {
                        this.formData.items[index].width = parseFloat(widthInput.value.replace(',', '.')) || 0;
                        this.formData.items[index].height = parseFloat(heightInput.value.replace(',', '.')) || 0;
                        this.formData.items[index].area = parseFloat(areaInput.value.replace(',', '.')) || 0;
                    }
                }
            }
        });
        
        // Atualiza os valores dos pagamentos
        const paymentRows = document.querySelectorAll('.payment-item');
        paymentRows.forEach((row, index) => {
            const methodSelect = row.querySelector('.payment-method');
            const valueInput = row.querySelector('.payment-value');
            const dateInput = row.querySelector('.payment-date');
            
            if (methodSelect && valueInput) {
                const method = methodSelect.value;
                const value = parseFloat(valueInput.value) || 0;
                
                // Atualiza o objeto de dados
                if (index < this.formData.payments.length) {
                    this.formData.payments[index].method = method;
                    this.formData.payments[index].value = value;
                    
                    if (dateInput) {
                        this.formData.payments[index].date = new Date(dateInput.value);
                    }
                }
            }
        });
        
        // Calcula e exibe os totais
        const orderTotal = this.calculateOrderTotal();
        const paymentsTotal = this.calculatePaymentsTotal();
        const discountInput = document.getElementById('order-discount');
        const extrasInput = document.getElementById('order-extras');
        const deliveryCostInput = document.getElementById('delivery-cost');
        const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
        const extras = extrasInput ? parseFloat(extrasInput.value) || 0 : 0;
        const deliveryCost = deliveryCostInput ? parseFloat(deliveryCostInput.value.replace(',', '.')) || 0 : 0;
        
        // Atualiza o desconto, serviços extras e custo de entrega no objeto de dados
        this.formData.discount = discount;
        this.formData.extraServices = extras;
        this.formData.deliveryCost = deliveryCost;
        
        // Atualiza os elementos na interface
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = window.ui ? window.ui.formatCurrency(value) : `R$ ${value.toFixed(2)}`;
            }
        };
        
        // Calcula o subtotal (apenas itens)
        const subtotal = this.formData.items && Array.isArray(this.formData.items) ? this.formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) : 0;
        
        // Calcula o total final (subtotal + extras + custo de entrega - desconto)
        const finalTotal = subtotal + extras + deliveryCost - discount;
        
        updateElement('order-subtotal', subtotal);
        updateElement('order-total', finalTotal);
        updateElement('payment-order-total', finalTotal);
        updateElement('payment-paid', paymentsTotal);
        updateElement('payment-remaining', Math.max(0, finalTotal - paymentsTotal));
        updateElement('payment-balance', Math.max(0, finalTotal - paymentsTotal));
    }
    
    // Mostra o formulário para criar um novo cliente
    showNewClientForm() {
        // Verifica se o componente de clientes existe
        if (window.ClientsComponent) {
            try {
                // Cria uma instância do componente de clientes
                const clientsComponent = new ClientsComponent();
                
                // Função de callback para quando o cliente for criado
                const onClientCreated = async (newClient) => {
                    if (newClient) {
                        console.log('Cliente criado:', newClient);
                        
                        // Recarrega a lista de clientes para garantir que o novo cliente esteja disponível
                        await this.reloadClients();
                        
                        // Adiciona o novo cliente à lista de clientes disponíveis caso não tenha sido adicionado pelo reloadClients
                        if (!this.clients.some(c => c.id === newClient.id)) {
                            this.clients.push(newClient);
                        }
                        
                        // Atualiza a referência do cliente no formData
                        this.formData.client = newClient;
                        
                        // Atualiza o campo de busca de cliente
                        const searchInput = document.getElementById('client-search');
                        if (searchInput) {
                            searchInput.value = newClient.name;
                            
                            // Adiciona o ID do cliente como atributo de dados
                            searchInput.dataset.clientId = newClient.id;
                        }
                        
                        // Atualiza os dados do cliente no formulário
                        this.updateClientDetails(newClient);
                        
                        // Atualiza os preços dos produtos com base na categoria do cliente
                        if (newClient.category) {
                            this.updateProductPricesBasedOnClientCategory(newClient.category);
                        }
                        
                        // Exibe mensagem de sucesso
                        if (window.ui) {
                            window.ui.showNotification('Cliente cadastrado com sucesso!', 'success');
                        }
                    }
                };
                
                // Chama o método para exibir o formulário de criação de cliente
                clientsComponent.showCreateForm(onClientCreated);
                
            } catch (error) {
                console.error('Erro ao abrir formulário de novo cliente:', error);
                if (window.ui) {
                    window.ui.showNotification('Erro ao abrir formulário de cliente. Tente novamente.', 'error');
                } else {
                    alert('Erro ao abrir formulário de cliente. Tente novamente.');
                }
            }
        } else {
            // Fallback caso o componente não esteja disponível
            if (window.ui) {
                window.ui.showNotification('Funcionalidade de novo cliente em desenvolvimento.', 'info');
            } else {
                alert('Funcionalidade de novo cliente em desenvolvimento.');
            }
        }
    }
    
    // Atualiza a data e hora de entrega quando os campos são alterados
    updateDeliveryDateTime() {
        const expectedDateInput = document.getElementById('expected-date');
        const expectedTimeInput = document.getElementById('expected-time');
        
        if (expectedDateInput && expectedDateInput.value) {
            try {
                // Cria uma nova data com a data escolhida pelo usuário
                const [year, month, day] = expectedDateInput.value.split('-').map(Number);
                let hours = 0, minutes = 0;
                
                // Se temos hora definida, adiciona à data
                if (expectedTimeInput && expectedTimeInput.value) {
                    [hours, minutes] = expectedTimeInput.value.split(':').map(Number);
                } else {
                    // Mantém a hora atual se não foi especificada
                    const currentTime = new Date();
                    hours = currentTime.getHours();
                    minutes = currentTime.getMinutes();
                }
                
                // Cria uma data diretamente sem usar string de fuso horário
                // Isso evita o problema de ajuste de fuso horário que pode reduzir um dia
                const expectedDate = new Date();
                expectedDate.setFullYear(year);
                expectedDate.setMonth(month - 1); // Mês em JavaScript é baseado em zero (0-11)
                expectedDate.setDate(day);
                expectedDate.setHours(hours, minutes, 0, 0);
                
                // Verifica se a data é válida antes de armazenar
                if (!isNaN(expectedDate.getTime())) {
                    // Atualiza a data de entrega no objeto de dados
                    this.formData.deliveryDate = expectedDate;
                    console.log('Data/hora de entrega atualizada:', expectedDate);
                    console.log('Formato ISO:', expectedDate.toISOString());
                    console.log('Formato local:', expectedDate.toString());
                } else {
                    console.error('Data de entrega inválida', expectedDateInput.value);
                }
            } catch (error) {
                console.error('Erro ao processar data de entrega:', error);
            }
        }
    }
    
    // Atualiza a visualização da imagem
    updateImagePreview() {
        const imagePreview = document.getElementById('images-preview');
        if (!imagePreview) return;
        
        if (this.formData.imageUrl) {
            imagePreview.innerHTML = `
                <div class="image-container">
                    <img src="${this.formData.imageUrl}" alt="Imagem do pedido">
                    <button type="button" id="remove-image" class="btn-icon remove-image">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Adiciona evento para remover imagem
            document.getElementById('remove-image').addEventListener('click', () => {
                this.formData.imageUrl = '';
                this.updateImagePreview();
            });
        } else {
            imagePreview.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Nenhuma imagem</p>
                </div>
            `;
        }
    }
    
    // Atualiza a exibição dos itens do pedido
    updateOrderItems() {
        // Atualiza a interface
        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) {
            // Renderiza todos os itens
            itemsContainer.innerHTML = this.renderOrderItems();
            
            // Adiciona os event listeners para os novos elementos
            this.addItemEventListeners();
            
            // Rola para o novo item
            const lastIndex = this.formData.items.length - 1;
            const newItemElement = itemsContainer.querySelector(`.order-item[data-index="${lastIndex}"]`);
            if (newItemElement) {
                newItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Verifica se o último item tem produto selecionado
                const product = this.formData.items[lastIndex].product;
                if (!product) {
                    // Foca no select de produtos se não houver produto selecionado
                    const productSelect = newItemElement.querySelector('.item-product');
                    if (productSelect) {
                        productSelect.focus();
                    }
                } else {
                    // Verifica se o produto tem medida personalizada
                    if (product.productType === 'custom_size') {
                        // Se for um produto com medida personalizada, foca no campo de largura
                        const widthInput = newItemElement.querySelector('.item-width');
                        if (widthInput) {
                            widthInput.focus();
                            widthInput.select();
                        }
                    } else {
                        // Para produtos normais, foca no campo de quantidade
                        const quantityInput = newItemElement.querySelector('.item-quantity');
                        if (quantityInput) {
                            quantityInput.focus();
                            quantityInput.select();
                        }
                    }
                }
            }
        }
    }
    
    // Atualiza a data e hora do pedido quando os campos são alterados
    updateOrderDateTime() {
        const orderDateInput = document.getElementById('order-date');
        const orderTimeInput = document.getElementById('order-time');
        
        if (orderDateInput && orderDateInput.value) {
            // Cria uma nova data com a data escolhida pelo usuário
            const orderDate = new Date(orderDateInput.value);
            
            // Se temos hora definida, adiciona à data
            if (orderTimeInput && orderTimeInput.value) {
                const [hours, minutes] = orderTimeInput.value.split(':').map(Number);
                orderDate.setHours(hours, minutes);
            } else {
                // Mantém a hora atual se não foi especificada
                const currentTime = new Date();
                orderDate.setHours(currentTime.getHours(), currentTime.getMinutes());
            }
            
            // Atualiza a data do pedido no objeto de dados
            this.formData.orderDate = orderDate;
            console.log('Data/hora do pedido atualizada:', this.formData.orderDate);
        }
    }
    
    // Recarrega a lista de clientes
    async reloadClients() {
        try {
            const snapshot = await db.collection('clients').orderBy('name').get();
            
            this.clients = [];
            snapshot.forEach(doc => {
                const client = doc.data();
                this.clients.push({
                    id: doc.id,
                    ...client
                });
            });
            
            console.log(`[reloadClients] ${this.clients.length} clientes carregados`);
            return true;
        } catch (error) {
            console.error('Erro ao recarregar clientes:', error);
            return false;
        }
    }
    
    // Busca o próximo número de pedido
    async getNextOrderNumber() {
        try {
            // Gera um número de pedido no formato OS + data atual + número aleatório
            const now = new Date();
            
            // Formato: OS + AAMMDD + número aleatório
            const year = now.getFullYear().toString().substring(2); // Últimos 2 dígitos do ano
            const month = String(now.getMonth() + 1).padStart(2, '0'); // Mês com 2 dígitos
            const day = String(now.getDate()).padStart(2, '0'); // Dia com 2 dígitos
            
            // Gera um número aleatório de 3 dígitos
            const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            
            // Formato final: OS + AAMMDD + "-" + 3 dígitos
            const orderNumber = `OS${year}${month}${day}-${randomNumber}`;
            
            console.log("Número de pedido gerado:", orderNumber);
            return orderNumber;
        } catch (error) {
            console.error("Erro ao gerar número de pedido:", error);
            // Em caso de erro, gera um número baseado no timestamp atual
            const timestamp = Math.floor(Date.now() / 1000) % 10000;
            return `OS-${timestamp}`;
        }
    }
    
    // Exclui o pedido atual
    async deleteOrder() {
        if (!this.formData || !this.formData.id) {
            console.error('Não é possível excluir: ID do pedido não encontrado');
            if (window.ui) {
                window.ui.showNotification('Erro: Pedido não encontrado', 'error');
            } else {
                alert('Erro: Pedido não encontrado');
            }
            return;
        }
        
        const confirmMessage = `Tem certeza que deseja excluir o pedido #${this.formData.orderNumber}? Esta ação não pode ser desfeita.`;
        
        // Verifica se temos o ui.confirmModal disponível
        if (window.ui && window.ui.confirmModal) {
            window.ui.confirmModal(
                'Excluir Pedido', 
                confirmMessage,
                async () => {
                    await this.performDeleteOrder();
                }
            );
        } else {
            // Fallback para confirm padrão
            if (confirm(confirmMessage)) {
                await this.performDeleteOrder();
            }
        }
    }
    
    // Executa a exclusão do pedido
    async performDeleteOrder() {
        try {
            if (window.ui) {
                window.ui.showLoading('Excluindo pedido...');
            }
            
            // Exclui o pedido do banco de dados
            const db = firebase.firestore();
            await db.collection('orders').doc(this.formData.id).delete();
            
            if (window.ui) {
                window.ui.hideLoading();
                // Aguarda um pequeno intervalo antes de mostrar a notificação
                setTimeout(() => {
                    window.ui.showNotification('Pedido excluído com sucesso!', 'success');
                }, 100);
            } else {
                alert('Pedido excluído com sucesso!');
            }
            
            // Redireciona para a lista de pedidos
            window.location.hash = '#orders';
        } catch (error) {
            console.error('Erro ao excluir pedido:', error);
            if (window.ui) {
                window.ui.hideLoading();
                window.ui.showNotification('Erro ao excluir pedido.', 'error');
            } else {
                alert('Erro ao excluir pedido.');
            }
        }
    }
}

// Registra o componente globalmente para que o sistema possa encontrá-lo
window.NewOrderComponent = NewOrderComponent; 