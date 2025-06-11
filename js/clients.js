// Componente de Gestão de Clientes
class ClientsComponent {
    constructor() {
        this.container = null;
        this.clients = [];
        this.isLoading = true;
        this.currentClientId = null;
        this.createCallback = null;
        this.isCalledFromOrder = false;
    }
    
    async render(container) {
        this.container = container;
        this.isLoading = true;
        
        // Exibe loader
        this.renderLoader();
        
        try {
            // Carrega dados
            await this.loadClients();
            
            // Renderiza a lista de clientes
            this.renderClientsList();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.renderError('Não foi possível carregar os dados de clientes. Por favor, tente novamente.');
        }
    }
    
    // Carrega os clientes do Firestore
    async loadClients() {
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
            
            this.isLoading = false;
            
            // Se não houver clientes, cria alguns de demonstração
            if (this.clients.length === 0) {
                console.log("Criando clientes de demonstração");
                await this.createDemoClients();
                await this.loadClients(); // Recarrega os clientes
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            throw error;
        }
    }
    
    // Cria clientes de demonstração
    async createDemoClients() {
        const demoClients = [
            {
                name: "Empresa ABC Ltda",
                document: "12.345.678/0001-90",
                phone: "(11) 99999-8888",
                email: "contato@empresaabc.com",
                address: "Av. Paulista, 1000, São Paulo, SP",
                contactName: "João Silva",
                type: "juridica",
                createdAt: new Date()
            },
            {
                name: "Maria Souza",
                document: "123.456.789-00",
                phone: "(11) 97777-6666",
                email: "maria.souza@email.com",
                address: "Rua das Flores, 123, São Paulo, SP",
                type: "fisica",
                createdAt: new Date()
            },
            {
                name: "Comércio XYZ Ltda",
                document: "98.765.432/0001-10",
                phone: "(11) 95555-4444",
                email: "contato@comercioxyz.com",
                address: "Rua do Comércio, 500, São Paulo, SP",
                contactName: "Pedro Oliveira",
                type: "juridica",
                createdAt: new Date()
            }
        ];
        
        try {
            for (const client of demoClients) {
                await db.collection('clients').add(client);
            }
            console.log("Clientes de demonstração criados com sucesso");
        } catch (error) {
            console.error("Erro ao criar clientes de demonstração:", error);
        }
    }
    
    // Renderiza a lista de clientes
    renderClientsList() {
        let html = `
            <div class="page-header">
                <h1>Gestão de Clientes</h1>
                <button id="new-client-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Cliente
                </button>
            </div>
            
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="client-search" placeholder="Buscar cliente..." class="search-input">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="filter-group">
                    <select id="type-filter" class="filter-select">
                        <option value="">Todos os tipos</option>
                        <option value="fisica">Pessoa Física</option>
                        <option value="juridica">Pessoa Jurídica</option>
                    </select>
                </div>
            </div>
        `;
        
        if (this.clients.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-users empty-icon"></i>
                    <h3>Nenhum cliente encontrado</h3>
                    <p>Você ainda não possui clientes cadastrados.</p>
                    <button id="empty-new-client-btn" class="btn btn-primary">Cadastrar Primeiro Cliente</button>
                </div>
            `;
        } else {
            html += `
                <div class="data-table-container">
                    <table class="data-table clients-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Documento</th>
                                <th>Telefone</th>
                                <th>E-mail</th>
                                <th>Tipo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            this.clients.forEach(client => {
                const clientType = client.type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física';
                
                html += `
                    <tr class="client-row" data-id="${client.id}">
                        <td>${client.name}</td>
                        <td>${client.document || '-'}</td>
                        <td>${client.phone || '-'}</td>
                        <td>${client.email || '-'}</td>
                        <td>${clientType}</td>
                        <td>
                            <button class="btn-icon view-client" data-id="${client.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-client" data-id="${client.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-client" data-id="${client.id}" title="Excluir">
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
        document.getElementById('new-client-btn').addEventListener('click', () => this.showCreateForm());
        
        if (this.clients.length === 0) {
            document.getElementById('empty-new-client-btn').addEventListener('click', () => this.showCreateForm());
        } else {
            // Eventos para os botões de ação
            document.querySelectorAll('.view-client').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const clientId = e.currentTarget.getAttribute('data-id');
                    this.showClientDetails(clientId);
                });
            });
            
            document.querySelectorAll('.edit-client').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const clientId = e.currentTarget.getAttribute('data-id');
                    this.showEditForm(clientId);
                });
            });
            
            document.querySelectorAll('.delete-client').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const clientId = e.currentTarget.getAttribute('data-id');
                    this.confirmDeleteClient(clientId);
                });
            });
            
            // Eventos para busca e filtros
            document.getElementById('client-search').addEventListener('input', () => this.applyFilters());
            document.getElementById('type-filter').addEventListener('change', () => this.applyFilters());
        }
    }
    
    // Aplica filtros à lista de clientes
    applyFilters() {
        const searchTerm = document.getElementById('client-search').value.toLowerCase();
        const typeFilter = document.getElementById('type-filter').value;
        
        const rows = document.querySelectorAll('.client-row');
        
        rows.forEach(row => {
            const clientId = row.getAttribute('data-id');
            const client = this.clients.find(c => c.id === clientId);
            
            if (!client) return;
            
            let visible = true;
            
            // Filtro de texto
            if (searchTerm) {
                const nameMatch = client.name.toLowerCase().includes(searchTerm);
                const documentMatch = client.document && client.document.toLowerCase().includes(searchTerm);
                const emailMatch = client.email && client.email.toLowerCase().includes(searchTerm);
                
                if (!nameMatch && !documentMatch && !emailMatch) {
                    visible = false;
                }
            }
            
            // Filtro de tipo
            if (typeFilter && client.type !== typeFilter) {
                visible = false;
            }
            
            row.style.display = visible ? '' : 'none';
        });
    }
    
    // Exibe o formulário de criação de cliente
    showCreateForm(callback = null) {
        this.currentClientId = null;
        this.createCallback = callback;
        
        // Se o componente estiver sendo usado dentro de um modal
        if (callback) {
            // Define que está sendo chamado a partir do formulário de pedido
            this.isCalledFromOrder = true;
            
            const formHtml = this.getClientFormHtml({}, false);
            
            ui.openModal('Novo Cliente', formHtml, '700px');
            
            // Adiciona botão de salvar no modal
            const modalBody = document.getElementById('modal-body');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'form-actions';
            actionsDiv.innerHTML = `
                <button id="save-client-btn" class="btn btn-primary">
                    <i class="fas fa-save"></i> Salvar Cliente
                </button>
            `;
            modalBody.appendChild(actionsDiv);
            
            // Adiciona os eventos após o modal ser aberto
            this.setupClientFormEvents(false);
            
            return;
        }
        
        // Se estiver sendo usado na página de clientes
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Novo Cliente</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-client-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Cliente
                    </button>
                </div>
            </div>
            
            ${this.getClientFormHtml({}, false)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderClientsList();
        });
        
        this.setupClientFormEvents(false);
    }
    
    // Exibe o formulário de edição de cliente
    showEditForm(clientId) {
        this.currentClientId = clientId;
        const client = this.clients.find(c => c.id === clientId);
        
        if (!client) {
            ui.showNotification('Cliente não encontrado.', 'error');
            return;
        }
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Editar Cliente</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-client-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Cliente
                    </button>
                </div>
            </div>
            
            ${this.getClientFormHtml(client, true)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderClientsList();
        });
        
        this.setupClientFormEvents(true);
    }
    
    // Retorna o HTML do formulário de cliente
    getClientFormHtml(client = {}, isEdit = false) {
        return `
            <form id="client-form" class="client-form">
                <div class="form-section">
                    <h3>Informações Básicas</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="client-type">Tipo de Cliente</label>
                            <select id="client-type" class="form-control" required>
                                <option value="fisica" ${(client.type === 'fisica' || !client.type) ? 'selected' : ''}>Pessoa Física</option>
                                <option value="juridica" ${client.type === 'juridica' ? 'selected' : ''}>Pessoa Jurídica</option>
                            </select>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="client-name">Nome / Razão Social</label>
                            <input type="text" id="client-name" class="form-control" value="${client.name || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="client-document">CPF / CNPJ</label>
                            <input type="text" id="client-document" class="form-control" value="${client.document || ''}">
                        </div>
                        
                        <div id="contact-name-container" class="form-group" style="display: ${client.type === 'juridica' ? 'block' : 'none'}">
                            <label for="client-contact-name">Nome do Contato</label>
                            <input type="text" id="client-contact-name" class="form-control" value="${client.contactName || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Contato</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="client-phone">Telefone</label>
                            <input type="text" id="client-phone" class="form-control" value="${client.phone || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="client-email">E-mail</label>
                            <input type="email" id="client-email" class="form-control" value="${client.email || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Endereço</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="client-address">Endereço Completo</label>
                            <textarea id="client-address" class="form-control" rows="2">${client.address || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Observações</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="client-notes">Observações</label>
                            <textarea id="client-notes" class="form-control" rows="3">${client.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    }
    
    // Configura os eventos do formulário de cliente
    setupClientFormEvents(isEdit) {
        // Botão de salvar já deve existir na página
        document.getElementById('save-client-btn').addEventListener('click', () => this.saveClient(isEdit));
        
        // Evento para o tipo de cliente
        document.getElementById('client-type').addEventListener('change', (e) => {
            const isJuridica = e.target.value === 'juridica';
            document.getElementById('contact-name-container').style.display = isJuridica ? 'block' : 'none';
        });
    }
    
    // Salva o cliente
    async saveClient(isEdit) {
        try {
            // Obtém os dados do formulário
            const clientType = document.getElementById('client-type')?.value || 'fisica';
            const clientName = document.getElementById('client-name')?.value || '';
            const clientDocument = document.getElementById('client-document')?.value || '';
            const clientPhone = document.getElementById('client-phone')?.value || '';
            const clientEmail = document.getElementById('client-email')?.value || '';
            const clientAddress = document.getElementById('client-address')?.value || '';
            const clientNotes = document.getElementById('client-notes')?.value || '';
            
            // Verifica se todos os campos obrigatórios estão preenchidos
            if (!clientName.trim()) {
                ui.showNotification('Por favor, insira o nome do cliente.', 'error');
                return;
            }
            
            // Exibe indicador de carregamento
            ui.showLoading('Salvando cliente...');
            
            // Prepara os dados do cliente (certifica-se de que todos os campos estão definidos)
            const clientData = {
                type: clientType,
                name: clientName.trim(),
                document: clientDocument.trim(),
                phone: clientPhone.trim(),
                email: clientEmail.trim(),
                address: clientAddress.trim(),
                notes: clientNotes.trim(),
                lastUpdate: new Date()
            };
            
            // Adiciona o nome do contato para pessoas jurídicas
            if (clientData.type === 'juridica') {
                const contactName = document.getElementById('client-contact-name')?.value || '';
                clientData.contactName = contactName.trim();
            }
            
            // Log para debug
            console.log('Dados do cliente a serem salvos:', clientData);
            
            // Salva no Firestore
            if (isEdit) {
                await db.collection('clients').doc(this.currentClientId).update(clientData);
                ui.showNotification('Cliente atualizado com sucesso!', 'success');
                ui.hideLoading(); // Certifica-se de esconder o loading após atualizar
            } else {
                // Adiciona data de criação para novos clientes
                clientData.createdAt = new Date();
                
                // Salva no Firestore e obtém a referência
                const docRef = await db.collection('clients').add(clientData);
                this.currentClientId = docRef.id;
                
                // Log para debug
                console.log('Cliente criado com ID:', this.currentClientId);
                
                ui.showNotification('Cliente criado com sucesso!', 'success');
                
                // Se tiver um callback (chamado da página de pedidos)
                if (this.createCallback) {
                    // Importante: garantir que o cliente foi totalmente salvo antes de prosseguir
                    // Aguardar a transação do Firestore ser concluída
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Oculta indicador de carregamento antes de executar o callback
                    ui.hideLoading();
                    
                    // Executa o callback e fecha o modal
                    this.createCallback();
                    ui.closeModal();
                    return;
                }
                
                // Oculta indicador de carregamento
                ui.hideLoading();
            }
            
            // Recarrega os clientes e volta para a lista (apenas na página de clientes)
            if (!this.isCalledFromOrder) {
                await this.loadClients();
                this.renderClientsList();
            }
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao salvar cliente. Por favor, tente novamente.', 'error');
        }
    }
    
    // Exibe os detalhes de um cliente
    showClientDetails(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        
        if (!client) {
            ui.showNotification('Cliente não encontrado.', 'error');
            return;
        }
        
        const clientType = client.type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física';
        const createdDate = client.createdAt ? ui.formatDate(client.createdAt) : '-';
        
        const html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${client.name}</h1>
                </div>
                <div class="action-buttons">
                    <button id="edit-client-btn" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
            
            <div class="client-detail-grid">
                <div class="client-info-card">
                    <h3>Informações Básicas</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Tipo:</div>
                        <div class="info-value">${clientType}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">CPF/CNPJ:</div>
                        <div class="info-value">${client.document || '-'}</div>
                    </div>
                    
                    ${client.type === 'juridica' ? `
                        <div class="info-group">
                            <div class="info-label">Contato:</div>
                            <div class="info-value">${client.contactName || '-'}</div>
                        </div>
                    ` : ''}
                    
                    <div class="info-group">
                        <div class="info-label">Cliente desde:</div>
                        <div class="info-value">${createdDate}</div>
                    </div>
                </div>
                
                <div class="client-contact-card">
                    <h3>Contato</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Telefone:</div>
                        <div class="info-value">${client.phone || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">E-mail:</div>
                        <div class="info-value">${client.email || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Endereço:</div>
                        <div class="info-value">${client.address || '-'}</div>
                    </div>
                </div>
            </div>
            
            ${client.notes ? `
                <div class="client-notes-card">
                    <h3>Observações</h3>
                    <p>${client.notes}</p>
                </div>
            ` : ''}
            
            <div class="client-history-card">
                <h3>Histórico de Pedidos</h3>
                <p class="empty-history-message">Histórico de pedidos em desenvolvimento...</p>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderClientsList();
        });
        
        document.getElementById('edit-client-btn').addEventListener('click', () => {
            this.showEditForm(clientId);
        });
    }
    
    // Confirmação para excluir cliente
    async confirmDeleteClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        
        if (!client) {
            ui.showNotification('Cliente não encontrado.', 'error');
            return;
        }
        
        const confirmed = await ui.showConfirmation(`Deseja realmente excluir o cliente "${client.name}"?`);
        
        if (confirmed) {
            try {
                ui.showLoading('Excluindo cliente...');
                
                // Verificar se o cliente possui pedidos
                const ordersSnapshot = await db.collection('orders').where('clientId', '==', clientId).limit(1).get();
                
                if (!ordersSnapshot.empty) {
                    ui.hideLoading();
                    ui.showNotification('Este cliente possui pedidos e não pode ser excluído.', 'error');
                    return;
                }
                
                // Exclui o cliente
                await db.collection('clients').doc(clientId).delete();
                
                ui.hideLoading();
                ui.showNotification('Cliente excluído com sucesso!', 'success');
                
                // Recarrega a lista
                await this.loadClients();
                this.renderClientsList();
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                ui.hideLoading();
                ui.showNotification('Erro ao excluir cliente. Por favor, tente novamente.', 'error');
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
    
    // Método para obter um cliente completo do Firestore
    async getClientFromFirestore(clientId) {
        if (!clientId) return null;
        
        try {
            const docSnap = await db.collection('clients').doc(clientId).get();
            if (!docSnap.exists) return null;
            
            // Retorna um objeto cliente completo com todos os campos
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } catch (error) {
            console.error('Erro ao buscar cliente do Firestore:', error);
            return null;
        }
    }
}

// Registra o componente globalmente
window.ClientsComponent = ClientsComponent; 