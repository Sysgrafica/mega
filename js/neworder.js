// Componente de Novo Pedido
class NewOrderComponent {
    constructor() {
        this.container = null;
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
        
        document.title = "Novo Pedido - ProjetoG";
        document.body.classList.add('new-order-page');
        
        // Variáveis para armazenar dados de pedido
        this.cliente = {};
        this.itens = [];
        this.pagamentos = [];
        this.arquivos = [];
        this.total = 0;
        this.saldo = 0;
        
        // Referência ao próximo número do item
        this.nextItemId = 1;
        
        // Configuração do tema
        this.initTheme();
    }
    
    // Inicializa o gerenciamento de temas claro/escuro
    initTheme() {
        // Verifica se há preferência salva
        const savedTheme = localStorage.getItem('theme-preference');
        // Verifica se o sistema prefere modo escuro
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Aplica o tema baseado na preferência ou no sistema
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Configura o evento para mudança de preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', e => {
                if (!localStorage.getItem('theme-preference')) {
                    document.documentElement.setAttribute('data-theme', 
                        e.matches ? 'dark' : 'light');
                }
            });
    }
    
    // Alterna entre os temas claro e escuro
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme-preference', newTheme);
        
        // Atualiza o ícone do botão de tema
        const themeIcon = document.querySelector('.theme-toggle-icon');
        if (themeIcon) {
            themeIcon.className = 'theme-toggle-icon fas ' + 
                (newTheme === 'dark' ? 'fa-sun' : 'fa-moon');
        }
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
            
            // Renderiza o formulário de novo pedido
            this.renderOrderForm();
            
        } catch (error) {
            console.error('Erro ao carregar dados para novo pedido:', error);
            this.renderError('Não foi possível carregar os dados necessários. Por favor, tente novamente.');
        }
    }
    
    // Carrega dados iniciais
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
    
    // Renderiza o loader
    renderLoader() {
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Carregando formulário de novo pedido...</p>
            </div>
        `;
    }
    
    // Renderiza mensagem de erro
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button id="retry-button" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
        
        document.getElementById('retry-button').addEventListener('click', () => {
            this.render(this.container);
        });
    }

    // Limpar recursos quando componente for desmontado
    cleanup() {
        // Remover class do body
        document.body.classList.remove('new-order-page');
        
        // Remover event listeners e outros recursos
        console.log('Limpando recursos do componente NewOrder');
    }
    
    // Renderiza o formulário de novo pedido
    renderOrderForm() {
        // Definir data atual para os campos de data
        const now = new Date();
        const today = this.formatDateForInput(now);
        const time = this.formatTimeForInput(now);
        
        // Calcular data de entrega (24 horas após data do pedido)
        const entregaDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas após a data atual
        
        // Definir valor inicial para o formulário
        this.formData = {
            client: null,
            items: [],
            payments: [],
            status: 'novo',
            deliveryType: 'retirada',
            priority: 'normal',
            orderDate: now,
            expectedDate: entregaDate
        };
        
        // Adicionar um item inicial vazio
        this.formData.items.push({
            product: null,
            description: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0
        });
        
        // Adicionar um pagamento inicial vazio
        this.formData.payments.push({
            method: 'dinheiro',
            value: 0,
            date: now,
            status: 'pendente'
        });
        
        // Incluir arquivo CSS do novo pedido
        if (!document.querySelector('link[href="css/new-order.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/new-order.css';
            document.head.appendChild(link);
        }
        
        const html = `
            <div class="order-container">
                <!-- CABEÇALHO -->
                <header class="page-header">
                    <h2><i class="fas fa-plus-circle"></i> Novo Pedido</h2>
                    <div class="header-actions">
                        <button id="cancel-order" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button id="save-order" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar Pedido
                        </button>
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
                                    <input type="search" id="client-search" class="form-control" placeholder="Pesquisar cliente..." autocomplete="off" required>
                                    <button type="button" id="new-client" class="btn-icon">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div id="client-search-results" class="dropdown-results"></div>
                            </div>
                            <div class="form-group">
                                <label for="seller" class="required">Vendedor</label>
                                <select id="seller" class="form-control" required>
                                    <option value="">Selecione um vendedor</option>
                                    ${this.renderSellerOptions()}
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
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="order-date" class="required">Data do Pedido</label>
                                <input type="date" id="order-date" class="form-control" value="${today}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="order-time">Hora</label>
                                <input type="time" id="order-time" class="form-control" value="${time}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="expected-date" class="required">Previsão de Entrega</label>
                                <input type="date" id="expected-date" class="form-control" value="${this.formatDateForInput(entregaDate)}" required>
                            </div>
                            <div class="form-group">
                                <label for="priority">Prioridade</label>
                                <select id="priority" class="form-control">
                                    <option value="normal">Normal</option>
                                    <option value="baixa">Baixa</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="delivery-type">Tipo de Entrega</label>
                                <select id="delivery-type" class="form-control">
                                    <option value="retirada">Retirada pelo cliente</option>
                                    <option value="entrega">Entrega</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="delivery-address-container" class="form-group hidden">
                            <label for="delivery-address">Endereço de Entrega</label>
                            <input type="text" id="delivery-address" class="form-control" placeholder="Endereço completo para entrega">
                        </div>
                        
                        <div class="form-group">
                            <label for="notes">Observações</label>
                            <textarea id="notes" class="form-control" rows="3" placeholder="Observações gerais sobre o pedido"></textarea>
                        </div>
                    </section>
                    
                    <!-- ITENS DO PEDIDO -->
                    <section class="form-section card">
                        <div class="card-header">
                            <h3>Itens do Pedido</h3>
                            <button type="button" id="add-item" class="btn btn-outline">
                                <i class="fas fa-plus"></i> Adicionar Item
                            </button>
                        </div>
                        
                        <div id="order-items-container">
                            <!-- Itens do pedido serão inseridos aqui -->
                        </div>
                        
                        <div class="totals-summary">
                            <div class="total-line">
                                <span class="label">Subtotal:</span>
                                <span class="value" id="order-subtotal">R$ 0,00</span>
                            </div>
                            <div class="total-line">
                                <span class="label">Desconto:</span>
                                <span class="value" id="order-discount">R$ 0,00</span>
                            </div>
                            <div class="total-line grand-total">
                                <span class="label">Total:</span>
                                <span class="value" id="order-total">R$ 0,00</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- PAGAMENTOS -->
                    <section class="form-section card">
                        <div class="card-header">
                            <h3>Pagamentos</h3>
                            <button type="button" id="add-payment" class="btn btn-outline">
                                <i class="fas fa-plus"></i> Adicionar Pagamento
                            </button>
                        </div>
                        
                        <div id="payments-container">
                            <!-- Pagamentos serão inseridos aqui -->
                        </div>
                        
                        <div class="totals-summary">
                            <div class="total-line">
                                <span class="label">Total do Pedido:</span>
                                <span class="value" id="payment-order-total">R$ 0,00</span>
                            </div>
                            <div class="total-line">
                                <span class="label">Total Pago:</span>
                                <span class="value" id="payment-paid">R$ 0,00</span>
                            </div>
                            <div class="total-line grand-total">
                                <span class="label">Saldo:</span>
                                <span class="value" id="payment-balance">R$ 0,00</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- ARQUIVOS E IMAGENS -->
                    <section class="form-section card">
                        <h3 class="card-header">Arquivos e Imagens</h3>
                        
                        <label for="file-upload" class="file-drop-area">
                            <input type="file" id="file-upload" class="file-input" multiple>
                            <p>Arraste arquivos aqui ou <strong>clique para selecionar</strong></p>
                            <p class="file-status">Nenhum arquivo escolhido</p>
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
                            <i class="fas fa-save"></i> Salvar Pedido
                        </button>
                    </footer>
                </form>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Renderizar itens do pedido
        this.renderOrderItems();
        
        // Renderizar pagamentos
        this.renderPayments();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar autocomplete para clientes
        this.setupClientAutocomplete();
        
        // Pré-definir o vendedor logado
        const vendedorSelect = document.getElementById('seller');
        const usuarioAtual = JSON.parse(localStorage.getItem('currentUser'));
        if (usuarioAtual) {
            vendedorSelect.value = usuarioAtual.id;
        }
    }
    
    // Configurar event listeners para o formulário
    setupEventListeners() {
        // Botões de salvar e cancelar (topo)
        document.getElementById('cancel-order').addEventListener('click', () => {
            window.ui.navigateTo('orders');
        });
        
        document.getElementById('save-order').addEventListener('click', () => {
            this.saveOrder();
        });
        
        // Botões de salvar e cancelar (rodapé)
        document.getElementById('cancel-order-bottom').addEventListener('click', () => {
            window.ui.navigateTo('orders');
        });
        
        document.getElementById('save-order-bottom').addEventListener('click', () => {
            this.saveOrder();
        });
        
        // Botão para adicionar novo cliente
        document.getElementById('new-client').addEventListener('click', () => {
            this.showNewClientForm();
        });
        
        // Botão para adicionar novo item
        document.getElementById('add-item').addEventListener('click', () => {
            this.addOrderItem();
        });
        
        // Botão para adicionar novo pagamento
        document.getElementById('add-payment').addEventListener('click', () => {
            this.addPayment();
        });
        
        // Mostrar/esconder endereço de entrega baseado no tipo de entrega
        const deliveryTypeSelect = document.getElementById('delivery-type');
        const deliveryAddressContainer = document.getElementById('delivery-address-container');
        
        // Verificar o valor inicial e mostrar/esconder o campo de endereço
        if (deliveryTypeSelect.value === 'entrega') {
            deliveryAddressContainer.classList.remove('hidden');
        } else {
            deliveryAddressContainer.classList.add('hidden');
        }
        
        // Adicionar event listener para alterações futuras
        deliveryTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'entrega') {
                deliveryAddressContainer.classList.remove('hidden');
            } else {
                deliveryAddressContainer.classList.add('hidden');
            }
        });
        
        // Upload de arquivos
        document.getElementById('file-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }
    
    // Configurar autocomplete para clientes
    setupClientAutocomplete() {
        // Implementação do autocomplete para clientes
        // Utilizando as mesmas funções do componente Orders
    }
    
    // Renderiza opções de vendedores
    renderSellerOptions() {
        let options = '';
        
        // Filtra apenas usuários com papel de vendedor ou admin
        const sellers = this.users.filter(user => 
            user.role === 'seller' || user.role === 'admin'
        );
        
        sellers.forEach(seller => {
            options += `<option value="${seller.id}">${seller.name}</option>`;
        });
        
        return options;
    }
    
    // Renderizar itens do pedido
    renderOrderItems() {
        // Implementação para renderizar itens do pedido
        // Utilizando as mesmas funções do componente Orders
        const container = document.getElementById('order-items-container');
        container.innerHTML = '';
        
        this.formData.items.forEach((item, index) => {
            const itemHtml = `
                <div class="order-item" data-index="${index}">
                    <div class="order-item-header">
                        <h4>Item #${index + 1}</h4>
                        <div class="order-item-actions">
                            <button type="button" class="item-remove-btn" data-index="${index}">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Produto</label>
                            <select class="form-control product-select" data-index="${index}">
                                <option value="">Selecione um produto</option>
                                <!-- Opções de produtos serão preenchidas dinamicamente -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Descrição</label>
                            <input type="text" class="form-control item-description" data-index="${index}" placeholder="Descrição do item">
                        </div>
                        <div class="form-group">
                            <label>Quantidade</label>
                            <input type="number" class="form-control item-quantity" data-index="${index}" value="1" min="1">
                        </div>
                        <div class="form-group">
                            <label>Valor Unitário</label>
                            <input type="text" class="form-control item-price" data-index="${index}" placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label>Desconto</label>
                            <input type="text" class="form-control item-discount" data-index="${index}" placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label>Total</label>
                            <input type="text" class="form-control item-total" data-index="${index}" placeholder="0,00" readonly>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += itemHtml;
        });
        
        // Adiciona event listeners para os botões de remover
        const removeButtons = document.querySelectorAll('.item-remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.closest('.item-remove-btn').dataset.index;
                this.removeOrderItem(index);
            });
        });
        
        // Adiciona outros event listeners para os campos
        this.addItemEventListeners();
    }
    
    // Adicionar item ao pedido
    addOrderItem() {
        this.formData.items.push({
            product: null,
            description: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0
        });
        
        this.renderOrderItems();
        this.updateOrderTotals();
    }
    
    // Remover item do pedido
    removeOrderItem(index) {
        if (this.formData.items.length > 1) {
            this.formData.items.splice(index, 1);
            this.renderOrderItems();
            this.updateOrderTotals();
        } else {
            window.ui.showNotification('Não é possível remover o único item do pedido', 'warning');
        }
    }
    
    // Adicionar event listeners para os campos dos itens
    addItemEventListeners() {
        // Implementação para adicionar event listeners aos campos dos itens
    }
    
    // Renderizar pagamentos
    renderPayments() {
        const container = document.getElementById('payments-container');
        container.innerHTML = '';
        
        this.formData.payments.forEach((payment, index) => {
            const paymentHtml = `
                <div class="payment-item" data-index="${index}">
                    <div class="order-item-header">
                        <h4>Pagamento #${index + 1}</h4>
                        <div class="order-item-actions">
                            <button type="button" class="item-remove-btn payment-remove-btn" data-index="${index}">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Método de Pagamento</label>
                            <select class="form-control payment-method" data-index="${index}">
                                <option value="dinheiro">Dinheiro</option>
                                <option value="cartao_credito">Cartão de Crédito</option>
                                <option value="cartao_debito">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                                <option value="transferencia">Transferência Bancária</option>
                                <option value="boleto">Boleto</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Valor</label>
                            <input type="text" class="form-control payment-value" data-index="${index}" placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label>Data</label>
                            <input type="date" class="form-control payment-date" data-index="${index}" value="${this.formatDateForInput(new Date())}">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select class="form-control payment-status" data-index="${index}">
                                <option value="pendente">Pendente</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += paymentHtml;
        });
        
        // Adiciona event listeners para os botões de remover
        const removeButtons = document.querySelectorAll('.payment-remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.closest('.payment-remove-btn').dataset.index;
                this.removePayment(index);
            });
        });
    }
    
    // Adicionar pagamento
    addPayment() {
        this.formData.payments.push({
            method: 'dinheiro',
            value: 0,
            date: new Date(),
            status: 'pendente'
        });
        
        this.renderPayments();
        this.updateOrderTotals();
    }
    
    // Remover pagamento
    removePayment(index) {
        if (this.formData.payments.length > 1) {
            this.formData.payments.splice(index, 1);
            this.renderPayments();
            this.updateOrderTotals();
        } else {
            window.ui.showNotification('Não é possível remover o único pagamento do pedido', 'warning');
        }
    }
    
    // Atualizar totais do pedido
    updateOrderTotals() {
        // Implementação para atualizar os totais do pedido
    }
    
    // Salvar pedido
    async saveOrder() {
        // Implementação para salvar pedido
        // Utilizando as mesmas funções do componente Orders
    }
    
    // Mostrar formulário para novo cliente
    showNewClientForm() {
        // Implementação para mostrar formulário de novo cliente
    }
    
    // Métodos utilitários
    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    
    formatTimeForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    
    setupPasteListener() {
        // Configuração do listener para colar imagens
        // Utilizando as mesmas funções do componente Orders
    }
    
    handleFileUpload(e) {
        // Manipulação de upload de arquivos
        // Utilizando as mesmas funções do componente Orders
    }
}

// Registra o componente globalmente
window.NewOrderComponent = NewOrderComponent;