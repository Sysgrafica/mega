// Componente de Gestão de Fornecedores
class SuppliersComponent {
    constructor() {
        this.container = null;
        this.suppliers = [];
        this.isLoading = true;
        this.currentSupplierId = null;
        this.categories = [
            "Papéis e Materiais Gráficos",
            "Tintas e Produtos Químicos",
            "Equipamentos e Peças",
            "Materiais de Acabamento",
            "Embalagens",
            "Outros"
        ];
    }
    
    async render(container) {
        this.container = container;
        this.isLoading = true;
        
        // Verifica se o usuário tem permissão para acessar esta funcionalidade
        if (window.auth.getUserAccessLevel() < 4) {
            this.container.innerHTML = `
                <div class="error-page">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Acesso Negado</h2>
                    <p>Você não tem permissão para acessar esta funcionalidade.</p>
                    <button class="btn btn-primary" id="go-home">Voltar ao Início</button>
                </div>
            `;
            
            document.getElementById('go-home').addEventListener('click', () => {
                ui.navigateTo('dashboard');
            });
            
            return;
        }
        
        // Exibe loader
        this.renderLoader();
        
        try {
            // Carrega dados
            await this.loadSuppliers();
            
            // Renderiza a lista de fornecedores
            this.renderSuppliersList();
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            this.renderError('Não foi possível carregar os dados de fornecedores. Por favor, tente novamente.');
        }
    }
    
    // Carrega os fornecedores do Firestore
    async loadSuppliers() {
        try {
            const snapshot = await db.collection('suppliers').orderBy('name').get();
            
            this.suppliers = [];
            snapshot.forEach(doc => {
                const supplier = doc.data();
                this.suppliers.push({
                    id: doc.id,
                    ...supplier
                });
            });
            
            this.isLoading = false;
            
            // Se não houver fornecedores, cria alguns de demonstração
            if (this.suppliers.length === 0) {
                console.log("Criando fornecedores de demonstração");
                await this.createDemoSuppliers();
                await this.loadSuppliers(); // Recarrega os fornecedores
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            throw error;
        }
    }
    
    // Cria fornecedores de demonstração
    async createDemoSuppliers() {
        const demoSuppliers = [
            {
                name: "Papel & Cia Distribuidora",
                document: "12.345.678/0001-90",
                phone: "(11) 99999-8888",
                email: "contato@papelecia.com",
                address: "Av. Industrial, 1000, São Paulo, SP",
                contactName: "João Silva",
                category: "Papéis e Materiais Gráficos",
                createdAt: new Date()
            },
            {
                name: "Tintas Gráficas Nacional",
                document: "98.765.432/0001-10",
                phone: "(11) 97777-6666",
                email: "vendas@tintasgraficas.com",
                address: "Rua dos Gráficos, 123, São Paulo, SP",
                contactName: "Maria Oliveira",
                category: "Tintas e Produtos Químicos",
                createdAt: new Date()
            },
            {
                name: "Máquinas Impressoras Ltda",
                document: "45.678.901/0001-23",
                phone: "(11) 95555-4444",
                email: "suporte@maquinasimpressoras.com",
                address: "Av. dos Impressores, 500, São Paulo, SP",
                contactName: "Pedro Santos",
                category: "Equipamentos e Peças",
                createdAt: new Date()
            }
        ];
        
        try {
            for (const supplier of demoSuppliers) {
                await db.collection('suppliers').add(supplier);
            }
            console.log("Fornecedores de demonstração criados com sucesso");
        } catch (error) {
            console.error("Erro ao criar fornecedores de demonstração:", error);
        }
    }
    
    // Renderiza a lista de fornecedores
    renderSuppliersList() {
        let html = `
            <div class="page-header">
                <h1>Gestão de Fornecedores</h1>
                <button id="new-supplier-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Fornecedor
                </button>
            </div>
            
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="supplier-search" placeholder="Buscar fornecedor..." class="search-input">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="filter-group">
                    <select id="category-filter" class="filter-select">
                        <option value="">Todas as categorias</option>
                        ${this.categories.map(category => 
                            `<option value="${category}">${category}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;
        
        if (this.suppliers.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-boxes empty-icon"></i>
                    <h3>Nenhum fornecedor encontrado</h3>
                    <p>Você ainda não possui fornecedores cadastrados.</p>
                    <button id="empty-new-supplier-btn" class="btn btn-primary">Cadastrar Primeiro Fornecedor</button>
                </div>
            `;
        } else {
            html += `
                <div class="data-table-container">
                    <table class="data-table suppliers-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Categoria</th>
                                <th>Contato</th>
                                <th>Telefone</th>
                                <th>E-mail</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            this.suppliers.forEach(supplier => {
                html += `
                    <tr class="supplier-row" data-id="${supplier.id}">
                        <td>${supplier.name}</td>
                        <td>${supplier.category || '-'}</td>
                        <td>${supplier.contactName || '-'}</td>
                        <td>${supplier.phone || '-'}</td>
                        <td>${supplier.email || '-'}</td>
                        <td>
                            <button class="btn-icon view-supplier" data-id="${supplier.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-supplier" data-id="${supplier.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-supplier" data-id="${supplier.id}" title="Excluir">
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
        document.getElementById('new-supplier-btn').addEventListener('click', () => this.showCreateForm());
        
        if (this.suppliers.length === 0) {
            document.getElementById('empty-new-supplier-btn').addEventListener('click', () => this.showCreateForm());
        } else {
            // Eventos para os botões de ação
            document.querySelectorAll('.view-supplier').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const supplierId = e.currentTarget.getAttribute('data-id');
                    this.showSupplierDetails(supplierId);
                });
            });
            
            document.querySelectorAll('.edit-supplier').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const supplierId = e.currentTarget.getAttribute('data-id');
                    this.showEditForm(supplierId);
                });
            });
            
            document.querySelectorAll('.delete-supplier').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const supplierId = e.currentTarget.getAttribute('data-id');
                    this.confirmDeleteSupplier(supplierId);
                });
            });
            
            // Adiciona evento para o campo de busca
            document.getElementById('supplier-search').addEventListener('input', () => this.applyFilters());
            
            // Adiciona evento para o filtro de categoria
            document.getElementById('category-filter').addEventListener('change', () => this.applyFilters());
        }
    }
    
    // Aplica os filtros na lista de fornecedores
    applyFilters() {
        const searchTerm = document.getElementById('supplier-search')?.value?.toLowerCase();
        const categoryFilter = document.getElementById('category-filter')?.value;
        
        document.querySelectorAll('.supplier-row').forEach(row => {
            const supplierId = row.getAttribute('data-id');
            const supplier = this.suppliers.find(s => s.id === supplierId);
            
            if (!supplier) return;
            
            let visible = true;
            
            // Filtro de texto
            if (searchTerm) {
                const nameMatch = supplier.name.toLowerCase().includes(searchTerm);
                const contactMatch = supplier.contactName && supplier.contactName.toLowerCase().includes(searchTerm);
                const emailMatch = supplier.email && supplier.email.toLowerCase().includes(searchTerm);
                
                if (!nameMatch && !contactMatch && !emailMatch) {
                    visible = false;
                }
            }
            
            // Filtro de categoria
            if (categoryFilter && supplier.category !== categoryFilter) {
                visible = false;
            }
            
            row.style.display = visible ? '' : 'none';
        });
    }
    
    // Exibe o formulário de criação de fornecedor
    showCreateForm() {
        this.currentSupplierId = null;
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Novo Fornecedor</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-supplier-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Fornecedor
                    </button>
                </div>
            </div>
            
            ${this.getSupplierFormHtml({}, false)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderSuppliersList();
        });
        
        this.setupSupplierFormEvents(false);
    }
    
    // Exibe o formulário de edição de fornecedor
    showEditForm(supplierId) {
        this.currentSupplierId = supplierId;
        const supplier = this.suppliers.find(s => s.id === supplierId);
        
        if (!supplier) {
            ui.showNotification('Fornecedor não encontrado.', 'error');
            return;
        }
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Editar Fornecedor</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-supplier-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Fornecedor
                    </button>
                </div>
            </div>
            
            ${this.getSupplierFormHtml(supplier, true)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderSuppliersList();
        });
        
        this.setupSupplierFormEvents(true);
    }
    
    // Retorna o HTML do formulário de fornecedor
    getSupplierFormHtml(supplier = {}, isEdit = false) {
        return `
            <form id="supplier-form" class="supplier-form">
                <div class="form-section">
                    <h3>Informações Básicas</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="supplier-name">Nome / Razão Social</label>
                            <input type="text" id="supplier-name" class="form-control" value="${supplier.name || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="supplier-document">CNPJ</label>
                            <input type="text" id="supplier-document" class="form-control" value="${supplier.document || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="supplier-category">Categoria</label>
                            <select id="supplier-category" class="form-control">
                                <option value="">-- Selecione uma categoria --</option>
                                ${this.categories.map(category => 
                                    `<option value="${category}" ${supplier.category === category ? 'selected' : ''}>
                                        ${category}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Contato</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="supplier-contact-name">Nome do Contato</label>
                            <input type="text" id="supplier-contact-name" class="form-control" value="${supplier.contactName || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="supplier-phone">Telefone</label>
                            <input type="text" id="supplier-phone" class="form-control" value="${supplier.phone || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="supplier-email">E-mail</label>
                            <input type="email" id="supplier-email" class="form-control" value="${supplier.email || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Endereço</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="supplier-address">Endereço Completo</label>
                            <textarea id="supplier-address" class="form-control" rows="2">${supplier.address || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Produtos Fornecidos</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="supplier-products">Descrição dos Produtos</label>
                            <textarea id="supplier-products" class="form-control" rows="3">${supplier.products || ''}</textarea>
                            <small class="form-text">Liste os principais produtos/materiais fornecidos.</small>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Observações</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="supplier-notes">Observações</label>
                            <textarea id="supplier-notes" class="form-control" rows="3">${supplier.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    }
    
    // Configura os eventos do formulário de fornecedor
    setupSupplierFormEvents(isEdit) {
        document.getElementById('save-supplier-btn').addEventListener('click', () => this.saveSupplier(isEdit));
    }
    
    // Salva o fornecedor
    async saveSupplier(isEdit) {
        try {
            // Obtém os dados do formulário
            const supplierName = document.getElementById('supplier-name')?.value || '';
            const supplierDocument = document.getElementById('supplier-document')?.value || '';
            const supplierCategory = document.getElementById('supplier-category')?.value || '';
            const supplierContactName = document.getElementById('supplier-contact-name')?.value || '';
            const supplierPhone = document.getElementById('supplier-phone')?.value || '';
            const supplierEmail = document.getElementById('supplier-email')?.value || '';
            const supplierAddress = document.getElementById('supplier-address')?.value || '';
            const supplierProducts = document.getElementById('supplier-products')?.value || '';
            const supplierNotes = document.getElementById('supplier-notes')?.value || '';
            
            // Verifica se todos os campos obrigatórios estão preenchidos
            if (!supplierName.trim()) {
                ui.showNotification('Por favor, insira o nome do fornecedor.', 'error');
                return;
            }
            
            // Exibe indicador de carregamento
            ui.showLoading('Salvando fornecedor...');
            
            // Prepara os dados do fornecedor
            const supplierData = {
                name: supplierName.trim(),
                document: supplierDocument.trim(),
                category: supplierCategory,
                contactName: supplierContactName.trim(),
                phone: supplierPhone.trim(),
                email: supplierEmail.trim(),
                address: supplierAddress.trim(),
                products: supplierProducts.trim(),
                notes: supplierNotes.trim(),
                lastUpdate: new Date()
            };
            
            // Salva no Firestore
            if (isEdit) {
                await db.collection('suppliers').doc(this.currentSupplierId).update(supplierData);
                ui.showNotification('Fornecedor atualizado com sucesso!', 'success');
            } else {
                // Adiciona data de criação para novos fornecedores
                supplierData.createdAt = new Date();
                
                await db.collection('suppliers').add(supplierData);
                ui.showNotification('Fornecedor criado com sucesso!', 'success');
            }
            
            // Recarrega os fornecedores e volta para a lista
            await this.loadSuppliers();
            this.renderSuppliersList();
            
            // Oculta indicador de carregamento
            ui.hideLoading();
        } catch (error) {
            console.error('Erro ao salvar fornecedor:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao salvar fornecedor. Por favor, tente novamente.', 'error');
        }
    }
    
    // Exibe os detalhes de um fornecedor
    showSupplierDetails(supplierId) {
        const supplier = this.suppliers.find(s => s.id === supplierId);
        
        if (!supplier) {
            ui.showNotification('Fornecedor não encontrado.', 'error');
            return;
        }
        
        const createdDate = supplier.createdAt ? ui.formatDate(supplier.createdAt) : '-';
        
        const html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${supplier.name}</h1>
                </div>
                <div class="action-buttons">
                    <button id="edit-supplier-btn" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
            
            <div class="supplier-detail-grid">
                <div class="supplier-info-card">
                    <h3>Informações Básicas</h3>
                    
                    <div class="info-group">
                        <div class="info-label">CNPJ:</div>
                        <div class="info-value">${supplier.document || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Categoria:</div>
                        <div class="info-value">${supplier.category || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Fornecedor desde:</div>
                        <div class="info-value">${createdDate}</div>
                    </div>
                </div>
                
                <div class="supplier-contact-card">
                    <h3>Contato</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Nome do Contato:</div>
                        <div class="info-value">${supplier.contactName || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Telefone:</div>
                        <div class="info-value">${supplier.phone || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">E-mail:</div>
                        <div class="info-value">${supplier.email || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Endereço:</div>
                        <div class="info-value">${supplier.address || '-'}</div>
                    </div>
                </div>
            </div>
            
            ${supplier.products ? `
                <div class="supplier-products-card">
                    <h3>Produtos Fornecidos</h3>
                    <p>${supplier.products}</p>
                </div>
            ` : ''}
            
            ${supplier.notes ? `
                <div class="supplier-notes-card">
                    <h3>Observações</h3>
                    <p>${supplier.notes}</p>
                </div>
            ` : ''}
            
            <div class="form-actions">
                <button id="delete-supplier-btn" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Excluir Fornecedor
                </button>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderSuppliersList();
        });
        
        document.getElementById('edit-supplier-btn').addEventListener('click', () => {
            this.showEditForm(supplierId);
        });
        
        document.getElementById('delete-supplier-btn').addEventListener('click', () => {
            this.confirmDeleteSupplier(supplierId);
        });
    }
    
    // Confirmação para excluir fornecedor
    async confirmDeleteSupplier(supplierId) {
        const supplier = this.suppliers.find(s => s.id === supplierId);
        
        if (!supplier) {
            ui.showNotification('Fornecedor não encontrado.', 'error');
            return;
        }
        
        const confirmed = await ui.showConfirmation(`Deseja realmente excluir o fornecedor "${supplier.name}"?`);
        
        if (confirmed) {
            try {
                ui.showLoading('Excluindo fornecedor...');
                
                await db.collection('suppliers').doc(supplierId).delete();
                
                // Remove o fornecedor da lista local
                this.suppliers = this.suppliers.filter(s => s.id !== supplierId);
                
                ui.showNotification('Fornecedor excluído com sucesso!', 'success');
                
                // Volta para a lista
                this.renderSuppliersList();
                
                ui.hideLoading();
            } catch (error) {
                console.error('Erro ao excluir fornecedor:', error);
                ui.hideLoading();
                ui.showNotification('Erro ao excluir fornecedor. Por favor, tente novamente.', 'error');
            }
        }
    }
    
    // Renderiza o loader
    renderLoader() {
        this.container.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Carregando fornecedores...</p>
            </div>
        `;
    }
    
    // Renderiza mensagem de erro
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Ocorreu um erro</h3>
                <p>${message}</p>
                <button id="retry-btn" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
        
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.render(this.container);
        });
    }
}

// Registra o componente globalmente
window.SuppliersComponent = SuppliersComponent; 