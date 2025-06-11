// Componente de Gestão de Produtos
class ProductsComponent {
    constructor() {
        this.container = null;
        this.products = [];
        this.isLoading = true;
        this.currentProductId = null;
        this.currentView = 'list'; // 'list', 'create', 'edit', 'detail'
    }
    
    async render(container) {
        this.container = container;
        this.isLoading = true;
        
        // Exibe loader
        this.renderLoader();
        
        try {
            // Carrega dados
            await this.loadProducts();
            
            // Renderiza a visualização atual
            this.renderCurrentView();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.renderError('Não foi possível carregar os dados de produtos. Por favor, tente novamente.');
        }
    }
    
    // Carrega os produtos do Firestore
    async loadProducts() {
        try {
            const snapshot = await db.collection('products').orderBy('name').get();
            
            this.products = [];
            snapshot.forEach(doc => {
                const product = doc.data();
                this.products.push({
                    id: doc.id,
                    ...product
                });
            });
            
            this.isLoading = false;
            
            // Se não houver produtos, cria alguns de demonstração
            if (this.products.length === 0) {
                console.log("Criando produtos de demonstração");
                await this.createDemoProducts();
                await this.loadProducts(); // Recarrega os produtos
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            throw error;
        }
    }
    
    // Cria produtos de demonstração
    async createDemoProducts() {
        const demoProducts = [
            {
                name: "Banner em Lona",
                description: "Banner em lona 440g com acabamento em ilhós ou bastão.",
                category: "impressao",
                pricingType: "area",
                price: 80.00, // Preço por m²
                minPrice: 50.00,
                unit: "m²",
                active: true,
                leadTime: 2, // Dias para produção
                createdAt: new Date()
            },
            {
                name: "Adesivo Vinil",
                description: "Adesivo em vinil recortado ou impresso.",
                category: "impressao",
                pricingType: "area",
                price: 100.00, // Preço por m²
                minPrice: 30.00,
                unit: "m²",
                active: true,
                leadTime: 1, // Dias para produção
                createdAt: new Date()
            },
            {
                name: "Cartão de Visita",
                description: "Cartão de visita em papel couchê 300g, 4x4 cores.",
                category: "grafica",
                pricingType: "unit",
                price: 80.00, // Preço por 1000 unidades
                minPrice: 80.00,
                unit: "1000 un",
                active: true,
                minQuantity: 1, // Mínimo de 1000 unidades
                leadTime: 3, // Dias para produção
                createdAt: new Date()
            },
            {
                name: "Criação de Arte",
                description: "Serviço de criação e diagramação de arte para materiais gráficos.",
                category: "servico",
                pricingType: "hour",
                price: 120.00, // Preço por hora
                minPrice: 120.00,
                unit: "hora",
                active: true,
                leadTime: 2, // Dias para produção
                createdAt: new Date()
            },
            {
                name: "Flyer A5",
                description: "Flyer tamanho A5 em papel couchê 115g, 4x4 cores.",
                category: "grafica",
                pricingType: "unit",
                price: 250.00, // Preço por 1000 unidades
                minPrice: 250.00,
                unit: "1000 un",
                active: true,
                minQuantity: 1, // Mínimo de 1000 unidades
                leadTime: 4, // Dias para produção
                createdAt: new Date()
            }
        ];
        
        try {
            for (const product of demoProducts) {
                await db.collection('products').add(product);
            }
            console.log("Produtos de demonstração criados com sucesso");
        } catch (error) {
            console.error("Erro ao criar produtos de demonstração:", error);
        }
    }
    
    // Renderiza a visualização atual
    renderCurrentView() {
        switch (this.currentView) {
            case 'list':
                this.renderProductsList();
                break;
            case 'create':
                this.renderProductForm();
                break;
            case 'edit':
                this.renderProductForm(this.currentProductId);
                break;
            case 'detail':
                this.renderProductDetail(this.currentProductId);
                break;
        }
    }
    
    // Renderiza a lista de produtos
    renderProductsList() {
        let html = `
            <div class="page-header">
                <h1>Gestão de Produtos e Serviços</h1>
                <button id="new-product-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Produto
                </button>
            </div>
            
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="product-search" placeholder="Buscar produto..." class="search-input">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="filter-group">
                    <select id="category-filter" class="filter-select">
                        <option value="">Todas as categorias</option>
                        <option value="impressao">Impressão Digital</option>
                        <option value="grafica">Gráfica Offset</option>
                        <option value="servico">Serviços</option>
                        <option value="outro">Outros</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select id="status-filter" class="filter-select">
                        <option value="">Todos os status</option>
                        <option value="true">Ativos</option>
                        <option value="false">Inativos</option>
                    </select>
                </div>
            </div>
        `;
        
        if (this.products.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-box-open empty-icon"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Você ainda não possui produtos cadastrados.</p>
                    <button id="empty-new-product-btn" class="btn btn-primary">Cadastrar Primeiro Produto</button>
                </div>
            `;
        } else {
            html += `
                <div class="data-table-container">
                    <table class="data-table products-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Categoria</th>
                                <th>Preço</th>
                                <th>Tipo</th>
                                <th>Unidade</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            this.products.forEach(product => {
                // Formata categoria
                let category = 'Outro';
                switch (product.category) {
                    case 'impressao':
                        category = 'Impressão Digital';
                        break;
                    case 'grafica':
                        category = 'Gráfica Offset';
                        break;
                    case 'servico':
                        category = 'Serviços';
                        break;
                }
                
                // Formata tipo de precificação
                let pricingType = 'Unitário';
                switch (product.pricingType) {
                    case 'area':
                        pricingType = 'Por Área';
                        break;
                    case 'hour':
                        pricingType = 'Por Hora';
                        break;
                }
                
                // Formata preço
                const price = ui.formatCurrency(product.price);
                
                // Status
                const statusClass = product.active ? 'status-completed' : 'status-cancelled';
                const statusText = product.active ? 'Ativo' : 'Inativo';
                
                html += `
                    <tr class="product-row" data-id="${product.id}">
                        <td>${product.name}</td>
                        <td>${category}</td>
                        <td>${price}</td>
                        <td>${pricingType}</td>
                        <td>${product.unit || '-'}</td>
                        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="btn-icon view-product" data-id="${product.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-product" data-id="${product.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-product" data-id="${product.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        this.container.innerHTML = html;
        
        // Adiciona eventos aos botões
        document.getElementById('new-product-btn').addEventListener('click', () => {
            this.currentView = 'create';
            this.renderCurrentView();
        });
        
        if (this.products.length === 0) {
            document.getElementById('empty-new-product-btn').addEventListener('click', () => {
                this.currentView = 'create';
                this.renderCurrentView();
            });
        } else {
            // Eventos para os botões de ação
            document.querySelectorAll('.view-product').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.currentTarget.getAttribute('data-id');
                    this.currentProductId = productId;
                    this.currentView = 'detail';
                    this.renderCurrentView();
                });
            });
            
            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.currentTarget.getAttribute('data-id');
                    this.currentProductId = productId;
                    this.currentView = 'edit';
                    this.renderCurrentView();
                });
            });
            
            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.currentTarget.getAttribute('data-id');
                    this.confirmDeleteProduct(productId);
                });
            });
            
            // Eventos para busca e filtros
            document.getElementById('product-search').addEventListener('input', () => this.applyFilters());
            document.getElementById('category-filter').addEventListener('change', () => this.applyFilters());
            document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());
            
            // Evento de clique na linha
            document.querySelectorAll('.product-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    // Não dispara se o clique foi em um botão de ação
                    if (!e.target.closest('.btn-icon')) {
                        const productId = row.getAttribute('data-id');
                        this.currentProductId = productId;
                        this.currentView = 'detail';
                        this.renderCurrentView();
                    }
                });
            });
        }
    }
    
    // Aplica filtros à lista de produtos
    applyFilters() {
        const searchTerm = document.getElementById('product-search').value.toLowerCase();
        const categoryFilter = document.getElementById('category-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        
        const rows = document.querySelectorAll('.product-row');
        
        rows.forEach(row => {
            const productId = row.getAttribute('data-id');
            const product = this.products.find(p => p.id === productId);
            
            if (!product) return;
            
            let visible = true;
            
            // Filtro de texto
            if (searchTerm) {
                const nameMatch = product.name.toLowerCase().includes(searchTerm);
                const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);
                
                if (!nameMatch && !descMatch) {
                    visible = false;
                }
            }
            
            // Filtro de categoria
            if (categoryFilter && product.category !== categoryFilter) {
                visible = false;
            }
            
            // Filtro de status
            if (statusFilter) {
                const isActive = product.active.toString();
                if (isActive !== statusFilter) {
                    visible = false;
                }
            }
            
            row.style.display = visible ? '' : 'none';
        });
    }
    
    // Renderiza o formulário de produto (para criação ou edição)
    renderProductForm(productId = null) {
        const isEdit = !!productId;
        const product = isEdit ? this.products.find(p => p.id === productId) : {
            active: true,
            pricingType: 'unit',
            category: 'impressao',
            productType: 'standard' // Valor padrão para tipo de produto
        };
        
        const formTitle = isEdit ? 'Editar Produto' : 'Novo Produto ou Serviço';
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${formTitle}</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-product-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Produto
                    </button>
                </div>
            </div>
            
            <form id="product-form" class="product-form">
                <div class="form-section">
                    <h3>Informações Básicas</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="product-name">Nome do Produto/Serviço</label>
                            <input type="text" id="product-name" class="form-control" value="${product.name || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-category">Categoria</label>
                            <select id="product-category" class="form-control" required>
                                <option value="impressao" ${product.category === 'impressao' ? 'selected' : ''}>Impressão Digital</option>
                                <option value="grafica" ${product.category === 'grafica' ? 'selected' : ''}>Gráfica Offset</option>
                                <option value="servico" ${product.category === 'servico' ? 'selected' : ''}>Serviços</option>
                                <option value="outro" ${product.category === 'outro' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-type">Tipo de Produto</label>
                            <select id="product-type" class="form-control" required>
                                <option value="standard" ${(product.productType === 'standard' || !product.productType) ? 'selected' : ''}>Padrão</option>
                                <option value="custom_size" ${product.productType === 'custom_size' ? 'selected' : ''}>Medida Personalizada</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-active">Status</label>
                            <select id="product-active" class="form-control">
                                <option value="true" ${product.active !== false ? 'selected' : ''}>Ativo</option>
                                <option value="false" ${product.active === false ? 'selected' : ''}>Inativo</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="product-description">Descrição</label>
                            <textarea id="product-description" class="form-control" rows="3">${product.description || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Precificação</h3>
                    
                    <div class="form-row">
                        <div class="form-group" id="pricing-type-group">
                            <label for="product-pricing-type">Tipo de Precificação</label>
                            <select id="product-pricing-type" class="form-control" required>
                                <option value="unit" ${product.pricingType === 'unit' ? 'selected' : ''}>Unitário</option>
                                <option value="area" ${product.pricingType === 'area' ? 'selected' : ''}>Por Área (m²)</option>
                                <option value="hour" ${product.pricingType === 'hour' ? 'selected' : ''}>Por Hora</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="price-group">
                            <label for="product-price" id="price-label">Preço</label>
                            <div class="input-group">
                                <span class="input-group-text">R$</span>
                                <input type="number" id="product-price" class="form-control" step="0.01" min="0" value="${product.price || 0}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-min-price">Preço Mínimo</label>
                            <div class="input-group">
                                <span class="input-group-text">R$</span>
                                <input type="number" id="product-min-price" class="form-control" step="0.01" min="0" value="${product.minPrice || 0}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-unit">Unidade</label>
                            <input type="text" id="product-unit" class="form-control" value="${product.unit || ''}" placeholder="un, m², hora, etc.">
                        </div>
                        
                        <div class="form-group">
                            <label for="product-min-quantity">Quantidade Mínima</label>
                            <input type="number" id="product-min-quantity" class="form-control" min="0" value="${product.minQuantity || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="product-lead-time">Prazo de Produção (dias)</label>
                            <input type="number" id="product-lead-time" class="form-control" min="0" value="${product.leadTime || 1}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Informações Adicionais</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="product-notes">Observações Internas</label>
                            <textarea id="product-notes" class="form-control" rows="3">${product.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.currentView = 'list';
            this.renderCurrentView();
        });
        
        document.getElementById('save-product-btn').addEventListener('click', () => this.saveProduct(isEdit));
        
        // Evento para atualizar a interface com base no tipo de produto
        const productTypeSelect = document.getElementById('product-type');
        if (productTypeSelect) {
            // Atualiza o formulário baseado no tipo de produto atual
            this.updateFormBasedOnProductType(productTypeSelect.value);
            
            // Adiciona evento para mudanças futuras
            productTypeSelect.addEventListener('change', (e) => {
                this.updateFormBasedOnProductType(e.target.value);
            });
        }
    }
    
    // Método para atualizar o formulário baseado no tipo de produto
    updateFormBasedOnProductType(productType) {
        const priceLabelElement = document.getElementById('price-label');
        
        if (productType === 'custom_size') {
            // Atualiza o label do preço para produtos com medida personalizada
            if (priceLabelElement) {
                priceLabelElement.textContent = 'Preço por Metro Quadrado (R$/m²)';
            }
            
            // Força a opção "Por Área" no tipo de precificação
            const pricingTypeSelect = document.getElementById('product-pricing-type');
            if (pricingTypeSelect) {
                pricingTypeSelect.value = 'area';
                pricingTypeSelect.disabled = true;
            }
        } else {
            // Restaura o label padrão
            if (priceLabelElement) {
                priceLabelElement.textContent = 'Preço';
            }
            
            // Habilita o tipo de precificação para produtos padrão
            const pricingTypeSelect = document.getElementById('product-pricing-type');
            if (pricingTypeSelect) {
                pricingTypeSelect.disabled = false;
            }
        }
    }
    
    // Salva o produto
    async saveProduct(isEdit) {
        try {
            // Obtém os dados do formulário
            const name = document.getElementById('product-name')?.value || '';
            
            if (!name.trim()) {
                ui.showNotification('Por favor, informe o nome do produto.', 'error');
                return;
            }
            
            const productType = document.getElementById('product-type')?.value || 'standard';
            let pricingType = document.getElementById('product-pricing-type')?.value || 'unit';
            
            // Se for um produto de medida personalizada, força o tipo de precificação como 'area'
            if (productType === 'custom_size') {
                pricingType = 'area';
            }
            
            const productData = {
                name: name.trim(),
                category: document.getElementById('product-category')?.value || 'outro',
                productType: productType,
                active: document.getElementById('product-active')?.value === 'true',
                description: document.getElementById('product-description')?.value || '',
                pricingType: pricingType,
                price: parseFloat(document.getElementById('product-price')?.value || 0),
                minPrice: parseFloat(document.getElementById('product-min-price')?.value || 0),
                unit: document.getElementById('product-unit')?.value || '',
                minQuantity: parseInt(document.getElementById('product-min-quantity')?.value || 0),
                leadTime: parseInt(document.getElementById('product-lead-time')?.value || 1),
                notes: document.getElementById('product-notes')?.value || '',
                lastUpdate: new Date()
            };
            
            // Validação adicional
            if (productData.price <= 0) {
                ui.showNotification('O preço deve ser maior que zero.', 'error');
                return;
            }
            
            // Exibe indicador de carregamento
            ui.showLoading('Salvando produto...');
            
            // Salva no Firestore
            if (isEdit) {
                await db.collection('products').doc(this.currentProductId).update(productData);
                ui.showNotification('Produto atualizado com sucesso!', 'success');
            } else {
                // Adiciona data de criação para novos produtos
                productData.createdAt = new Date();
                
                const docRef = await db.collection('products').add(productData);
                this.currentProductId = docRef.id;
                ui.showNotification('Produto criado com sucesso!', 'success');
            }
            
            // Oculta indicador de carregamento
            ui.hideLoading();
            
            // Recarrega os produtos e volta para a lista
            await this.loadProducts();
            this.currentView = 'list';
            this.renderCurrentView();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao salvar produto. Por favor, tente novamente.', 'error');
        }
    }
    
    // Renderiza os detalhes do produto
    renderProductDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            ui.showNotification('Produto não encontrado.', 'error');
            this.currentView = 'list';
            this.renderCurrentView();
            return;
        }
        
        // Formata categoria
        let category = 'Outro';
        switch (product.category) {
            case 'impressao':
                category = 'Impressão Digital';
                break;
            case 'grafica':
                category = 'Gráfica Offset';
                break;
            case 'servico':
                category = 'Serviços';
                break;
        }
        
        // Formata tipo de precificação
        let pricingType = 'Unitário';
        switch (product.pricingType) {
            case 'area':
                pricingType = 'Por Área (m²)';
                break;
            case 'hour':
                pricingType = 'Por Hora';
                break;
        }
        
        // Formata preço
        const price = ui.formatCurrency(product.price);
        const minPrice = ui.formatCurrency(product.minPrice || 0);
        
        // Formata datas
        const createdAt = product.createdAt ? ui.formatDate(product.createdAt) : '-';
        const lastUpdate = product.lastUpdate ? ui.formatDate(product.lastUpdate) : '-';
        
        // Status
        const statusClass = product.active ? 'status-completed' : 'status-cancelled';
        const statusText = product.active ? 'Ativo' : 'Inativo';
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${product.name}</h1>
                </div>
                <div class="action-buttons">
                    <button id="edit-product-btn" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button id="toggle-status-btn" class="btn ${product.active ? 'btn-danger' : 'btn-success'}">
                        <i class="fas ${product.active ? 'fa-ban' : 'fa-check'}"></i> 
                        ${product.active ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </div>
            
            <div class="product-detail-grid">
                <div class="product-info-card">
                    <h3>Informações Básicas</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Status:</div>
                        <div class="info-value">
                            <span class="status-tag ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Categoria:</div>
                        <div class="info-value">${category}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Criado em:</div>
                        <div class="info-value">${createdAt}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Última atualização:</div>
                        <div class="info-value">${lastUpdate}</div>
                    </div>
                </div>
                
                <div class="product-pricing-card">
                    <h3>Precificação</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Tipo:</div>
                        <div class="info-value">${pricingType}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Preço:</div>
                        <div class="info-value">${price}${product.unit ? ' / ' + product.unit : ''}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Preço Mínimo:</div>
                        <div class="info-value">${minPrice}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Quantidade Mínima:</div>
                        <div class="info-value">${product.minQuantity || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Prazo de Produção:</div>
                        <div class="info-value">${product.leadTime || 1} dia(s)</div>
                    </div>
                </div>
            </div>
            
            ${product.description ? `
                <div class="product-description-card">
                    <h3>Descrição</h3>
                    <p>${product.description}</p>
                </div>
            ` : ''}
            
            ${product.notes ? `
                <div class="product-notes-card">
                    <h3>Observações Internas</h3>
                    <p>${product.notes}</p>
                </div>
            ` : ''}
            
            <div class="product-usage-card">
                <h3>Uso em Pedidos</h3>
                <p class="empty-usage-message">Histórico de uso em pedidos em desenvolvimento...</p>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.currentView = 'list';
            this.renderCurrentView();
        });
        
        document.getElementById('edit-product-btn').addEventListener('click', () => {
            this.currentView = 'edit';
            this.renderCurrentView();
        });
        
        document.getElementById('toggle-status-btn').addEventListener('click', () => {
            this.toggleProductStatus(productId, !product.active);
        });
    }
    
    // Alterna o status do produto (ativo/inativo)
    async toggleProductStatus(productId, active) {
        try {
            const product = this.products.find(p => p.id === productId);
            
            if (!product) {
                ui.showNotification('Produto não encontrado.', 'error');
                return;
            }
            
            const actionText = active ? 'ativar' : 'desativar';
            const confirmed = await ui.showConfirmation(`Deseja realmente ${actionText} o produto "${product.name}"?`);
            
            if (!confirmed) {
                return;
            }
            
            ui.showLoading(`${active ? 'Ativando' : 'Desativando'} produto...`);
            
            await db.collection('products').doc(productId).update({
                active: active,
                lastUpdate: new Date()
            });
            
            ui.hideLoading();
            ui.showNotification(`Produto ${active ? 'ativado' : 'desativado'} com sucesso!`, 'success');
            
            // Recarrega os produtos e atualiza a visualização atual
            await this.loadProducts();
            this.renderCurrentView();
        } catch (error) {
            console.error('Erro ao alterar status do produto:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao alterar status do produto. Por favor, tente novamente.', 'error');
        }
    }
    
    // Confirmação para excluir produto
    async confirmDeleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            ui.showNotification('Produto não encontrado.', 'error');
            return;
        }
        
        const confirmed = await ui.showConfirmation(`Deseja realmente excluir o produto "${product.name}"?`);
        
        if (confirmed) {
            try {
                ui.showLoading('Excluindo produto...');
                
                // Verificar se o produto está sendo usado em pedidos
                const ordersSnapshot = await db.collection('orders')
                    .where('items', 'array-contains', { productId: productId })
                    .limit(1)
                    .get();
                
                if (!ordersSnapshot.empty) {
                    ui.hideLoading();
                    ui.showNotification('Este produto está sendo usado em pedidos e não pode ser excluído. Considere desativá-lo em vez de excluir.', 'error');
                    return;
                }
                
                // Exclui o produto
                await db.collection('products').doc(productId).delete();
                
                ui.hideLoading();
                ui.showNotification('Produto excluído com sucesso!', 'success');
                
                // Recarrega a lista
                await this.loadProducts();
                this.currentView = 'list';
                this.renderCurrentView();
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                ui.hideLoading();
                ui.showNotification('Erro ao excluir produto. Por favor, tente novamente.', 'error');
            }
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
                <button id="retry-button" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
        
        document.getElementById('retry-button').addEventListener('click', () => {
            this.render(this.container);
        });
    }
}

// Registra o componente globalmente
window.ProductsComponent = ProductsComponent; 