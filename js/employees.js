// Componente de Gestão de Funcionários
class EmployeesComponent {
    constructor() {
        this.container = null;
        this.employees = [];
        this.isLoading = true;
        this.currentEmployeeId = null;
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
            await this.loadEmployees();
            
            // Renderiza a lista de funcionários
            this.renderEmployeesList();
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            this.renderError('Não foi possível carregar os dados de funcionários. Por favor, tente novamente.');
        }
    }
    
    // Carrega os funcionários do Firestore
    async loadEmployees() {
        try {
            const snapshot = await db.collection('employees').orderBy('name').get();
            
            this.employees = [];
            snapshot.forEach(doc => {
                const employee = doc.data();
                this.employees.push({
                    id: doc.id,
                    ...employee
                });
            });
            
            this.isLoading = false;
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            throw error;
        }
    }
    
    // Renderiza a lista de funcionários
    renderEmployeesList() {
        let html = `
            <div class="page-header">
                <h1>Gestão de Funcionários</h1>
                <button id="new-employee-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Novo Funcionário
                </button>
            </div>
            
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="employee-search" placeholder="Buscar funcionário..." class="search-input">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div class="filter-group">
                    <select id="role-filter" class="filter-select">
                        <option value="">Todos os níveis</option>
                        <option value="admin">Administrador</option>
                        <option value="seller">Vendedor</option>
                        <option value="designer">Designer</option>
                        <option value="production">Produção</option>
                    </select>
                </div>
            </div>
        `;
        
        if (this.employees.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-users empty-icon"></i>
                    <h3>Nenhum funcionário encontrado</h3>
                    <p>Você ainda não possui funcionários cadastrados além da sua conta.</p>
                    <button id="empty-new-employee-btn" class="btn btn-primary">Cadastrar Primeiro Funcionário</button>
                </div>
            `;
        } else {
            html += `
                <div class="data-table-container">
                    <table class="data-table employees-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Cargo</th>
                                <th>E-mail</th>
                                <th>Telefone</th>
                                <th>Código de Acesso</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            this.employees.forEach(employee => {
                const roleInfo = SYSTEM_CONFIG.roles[employee.role] || { name: 'Desconhecido' };
                
                html += `
                    <tr class="employee-row ${!employee.active ? 'inactive-row' : ''}" data-id="${employee.id}">
                        <td>${employee.name}</td>
                        <td>${roleInfo.name}</td>
                        <td>${employee.email || '-'}</td>
                        <td>${employee.phone || '-'}</td>
                        <td>${employee.accessCode ? '••••••' : '-'}</td>
                        <td><span class="status-badge ${employee.active ? 'status-active' : 'status-inactive'}">${employee.active ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                            <button class="btn-icon view-employee" data-id="${employee.id}" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-employee" data-id="${employee.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${employee.active ? 'deactivate-employee' : 'activate-employee'}" data-id="${employee.id}" title="${employee.active ? 'Desativar' : 'Ativar'}">
                                <i class="fas ${employee.active ? 'fa-user-slash' : 'fa-user-check'}"></i>
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
        document.getElementById('new-employee-btn').addEventListener('click', () => this.showCreateForm());
        
        if (this.employees.length === 0) {
            document.getElementById('empty-new-employee-btn').addEventListener('click', () => this.showCreateForm());
        } else {
            // Eventos para os botões de ação
            document.querySelectorAll('.view-employee').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const employeeId = e.currentTarget.getAttribute('data-id');
                    this.showEmployeeDetails(employeeId);
                });
            });
            
            document.querySelectorAll('.edit-employee').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const employeeId = e.currentTarget.getAttribute('data-id');
                    this.showEditForm(employeeId);
                });
            });
            
            document.querySelectorAll('.deactivate-employee').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const employeeId = e.currentTarget.getAttribute('data-id');
                    this.confirmToggleEmployeeStatus(employeeId, false);
                });
            });
            
            document.querySelectorAll('.activate-employee').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const employeeId = e.currentTarget.getAttribute('data-id');
                    this.confirmToggleEmployeeStatus(employeeId, true);
                });
            });
            
            // Adiciona evento para o campo de busca
            document.getElementById('employee-search').addEventListener('input', () => this.applyFilters());
            
            // Adiciona evento para o filtro de cargo
            document.getElementById('role-filter').addEventListener('change', () => this.applyFilters());
        }
    }
    
    // Aplica os filtros na lista de funcionários
    applyFilters() {
        const searchTerm = document.getElementById('employee-search')?.value?.toLowerCase();
        const roleFilter = document.getElementById('role-filter')?.value;
        
        document.querySelectorAll('.employee-row').forEach(row => {
            const employeeId = row.getAttribute('data-id');
            const employee = this.employees.find(e => e.id === employeeId);
            
            if (!employee) return;
            
            let visible = true;
            
            // Filtro de texto
            if (searchTerm) {
                const nameMatch = employee.name.toLowerCase().includes(searchTerm);
                const emailMatch = employee.email && employee.email.toLowerCase().includes(searchTerm);
                
                if (!nameMatch && !emailMatch) {
                    visible = false;
                }
            }
            
            // Filtro de cargo
            if (roleFilter && employee.role !== roleFilter) {
                visible = false;
            }
            
            row.style.display = visible ? '' : 'none';
        });
    }
    
    // Exibe o formulário de criação de funcionário
    showCreateForm() {
        this.currentEmployeeId = null;
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Novo Funcionário</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-employee-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Funcionário
                    </button>
                </div>
            </div>
            
            ${this.getEmployeeFormHtml({}, false)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderEmployeesList();
        });
        
        this.setupEmployeeFormEvents(false);
    }
    
    // Exibe o formulário de edição de funcionário
    showEditForm(employeeId) {
        this.currentEmployeeId = employeeId;
        const employee = this.employees.find(e => e.id === employeeId);
        
        if (!employee) {
            ui.showNotification('Funcionário não encontrado.', 'error');
            return;
        }
        
        let html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>Editar Funcionário</h1>
                </div>
                <div class="action-buttons">
                    <button id="save-employee-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Funcionário
                    </button>
                </div>
            </div>
            
            ${this.getEmployeeFormHtml(employee, true)}
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona os eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderEmployeesList();
        });
        
        this.setupEmployeeFormEvents(true);
    }
    
    // Retorna o HTML do formulário de funcionário
    getEmployeeFormHtml(employee = {}, isEdit = false) {
        return `
            <form id="employee-form" class="employee-form">
                <div class="form-section">
                    <h3>Informações Básicas</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="employee-name">Nome Completo</label>
                            <input type="text" id="employee-name" class="form-control" value="${employee.name || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="employee-role">Cargo / Nível de Acesso</label>
                            <select id="employee-role" class="form-control" required>
                                <option value="">-- Selecione --</option>
                                ${Object.entries(SYSTEM_CONFIG.roles).map(([key, role]) => 
                                    `<option value="${key}" ${employee.role === key ? 'selected' : ''}>
                                        ${role.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="employee-status">Status</label>
                            <select id="employee-status" class="form-control" required>
                                <option value="true" ${(employee.active === undefined || employee.active) ? 'selected' : ''}>Ativo</option>
                                <option value="false" ${employee.active === false ? 'selected' : ''}>Inativo</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Contato</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="employee-phone">Telefone</label>
                            <input type="text" id="employee-phone" class="form-control" value="${employee.phone || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="employee-email">E-mail</label>
                            <input type="email" id="employee-email" class="form-control" value="${employee.email || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Acesso ao Sistema</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="employee-access-code">Código de Acesso</label>
                            <div class="input-group">
                                <input type="text" id="employee-access-code" class="form-control" value="${employee.accessCode || ''}" 
                                    placeholder="${isEdit ? '••••••' : 'Digite um código de 6 dígitos'}" 
                                    ${isEdit ? 'readonly' : ''}>
                                ${isEdit ? `
                                    <button type="button" id="reset-access-code" class="btn btn-secondary input-group-btn">
                                        <i class="fas fa-key"></i> Redefinir
                                    </button>
                                ` : ''}
                            </div>
                            ${isEdit ? '<small class="form-text">Para alterar o código de acesso, clique em "Redefinir".</small>' : ''}
                        </div>
                        
                        <div class="form-group">
                            <label for="employee-auto-generate">Gerar Código</label>
                            <button type="button" id="auto-generate-code" class="btn btn-secondary full-width">
                                <i class="fas fa-random"></i> Gerar Código Automático
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Observações</h3>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="employee-notes">Observações</label>
                            <textarea id="employee-notes" class="form-control" rows="3">${employee.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;
    }
    
    // Configura os eventos do formulário de funcionário
    setupEmployeeFormEvents(isEdit) {
        document.getElementById('save-employee-btn').addEventListener('click', () => this.saveEmployee(isEdit));
        
        // Botão para gerar código de acesso automaticamente
        document.getElementById('auto-generate-code').addEventListener('click', () => {
            const accessCode = this.generateRandomAccessCode();
            document.getElementById('employee-access-code').value = accessCode;
        });
        
        // Botão para redefinir código de acesso (apenas em edição)
        if (isEdit) {
            document.getElementById('reset-access-code').addEventListener('click', () => {
                document.getElementById('employee-access-code').readOnly = false;
                document.getElementById('employee-access-code').value = '';
                document.getElementById('employee-access-code').placeholder = 'Digite um novo código de 6 dígitos';
                document.getElementById('employee-access-code').focus();
            });
        }
    }
    
    // Gera um código de acesso aleatório
    generateRandomAccessCode() {
        // Gera um código de 6 dígitos
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Salva o funcionário
    async saveEmployee(isEdit) {
        try {
            // Obtém os dados do formulário
            const employeeName = document.getElementById('employee-name')?.value || '';
            const employeeRole = document.getElementById('employee-role')?.value || '';
            const employeeStatus = document.getElementById('employee-status')?.value === 'true';
            const employeePhone = document.getElementById('employee-phone')?.value || '';
            const employeeEmail = document.getElementById('employee-email')?.value || '';
            const employeeAccessCode = document.getElementById('employee-access-code')?.value || '';
            const employeeNotes = document.getElementById('employee-notes')?.value || '';
            
            // Validação dos campos obrigatórios
            if (!employeeName.trim()) {
                ui.showNotification('Por favor, insira o nome do funcionário.', 'error');
                return;
            }
            
            if (!employeeRole) {
                ui.showNotification('Por favor, selecione o cargo/nível de acesso.', 'error');
                return;
            }
            
            // Em caso de criação, exige código de acesso
            if (!isEdit && !employeeAccessCode) {
                ui.showNotification('Por favor, defina um código de acesso para o funcionário.', 'error');
                return;
            }
            
            // Verifica se o código tem 6 dígitos (se não estiver em branco)
            if (employeeAccessCode && !/^\d{6}$/.test(employeeAccessCode)) {
                ui.showNotification('O código de acesso deve conter exatamente 6 dígitos.', 'error');
                return;
            }
            
            // Verifica se o código já está em uso (apenas em criação ou se foi alterado)
            if (employeeAccessCode) {
                const existingEmployee = this.employees.find(e => 
                    e.accessCode === employeeAccessCode && 
                    e.id !== this.currentEmployeeId
                );
                
                if (existingEmployee) {
                    ui.showNotification('Este código de acesso já está em uso. Por favor, escolha outro.', 'error');
                    return;
                }
            }
            
            // Exibe indicador de carregamento
            ui.showLoading('Salvando funcionário...');
            
            // Prepara os dados do funcionário
            const employeeData = {
                name: employeeName.trim(),
                role: employeeRole,
                active: employeeStatus,
                phone: employeePhone.trim(),
                email: employeeEmail.trim(),
                notes: employeeNotes.trim(),
                lastUpdate: new Date()
            };
            
            // Adiciona código de acesso se foi fornecido
            if (employeeAccessCode) {
                employeeData.accessCode = employeeAccessCode;
            }
            
            // Salva no Firestore
            if (isEdit) {
                await db.collection('employees').doc(this.currentEmployeeId).update(employeeData);
                ui.showNotification('Funcionário atualizado com sucesso!', 'success');
            } else {
                // Adiciona data de criação para novos funcionários
                employeeData.createdAt = new Date();
                
                await db.collection('employees').add(employeeData);
                ui.showNotification('Funcionário criado com sucesso!', 'success');
            }
            
            // Recarrega os funcionários e volta para a lista
            await this.loadEmployees();
            this.renderEmployeesList();
            
            // Oculta indicador de carregamento
            ui.hideLoading();
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            ui.hideLoading();
            ui.showNotification('Erro ao salvar funcionário. Por favor, tente novamente.', 'error');
        }
    }
    
    // Exibe os detalhes de um funcionário
    showEmployeeDetails(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        
        if (!employee) {
            ui.showNotification('Funcionário não encontrado.', 'error');
            return;
        }
        
        const roleInfo = SYSTEM_CONFIG.roles[employee.role] || { name: 'Desconhecido' };
        const createdDate = employee.createdAt ? ui.formatDate(employee.createdAt) : '-';
        
        const html = `
            <div class="page-header">
                <div class="back-button-wrapper">
                    <button id="back-to-list" class="btn-icon"><i class="fas fa-arrow-left"></i></button>
                    <h1>${employee.name}</h1>
                </div>
                <div class="action-buttons">
                    <button id="edit-employee-btn" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
            
            <div class="employee-detail-grid">
                <div class="employee-info-card">
                    <h3>Informações Básicas</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Cargo:</div>
                        <div class="info-value">${roleInfo.name}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Status:</div>
                        <div class="info-value">
                            <span class="status-badge ${employee.active ? 'status-active' : 'status-inactive'}">
                                ${employee.active ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Nível de Acesso:</div>
                        <div class="info-value">${roleInfo.level || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Funcionário desde:</div>
                        <div class="info-value">${createdDate}</div>
                    </div>
                </div>
                
                <div class="employee-contact-card">
                    <h3>Contato</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Telefone:</div>
                        <div class="info-value">${employee.phone || '-'}</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">E-mail:</div>
                        <div class="info-value">${employee.email || '-'}</div>
                    </div>
                </div>
                
                <div class="employee-access-card">
                    <h3>Acesso ao Sistema</h3>
                    
                    <div class="info-group">
                        <div class="info-label">Código de Acesso:</div>
                        <div class="info-value">••••••</div>
                    </div>
                    
                    <div class="info-group">
                        <div class="info-label">Último Acesso:</div>
                        <div class="info-value">${employee.lastLogin ? ui.formatDate(employee.lastLogin) : 'Nunca acessou'}</div>
                    </div>
                    
                    <div class="form-row" style="margin-top: 15px;">
                        <button id="reset-password-btn" class="btn btn-secondary">
                            <i class="fas fa-key"></i> Redefinir Código de Acesso
                        </button>
                    </div>
                </div>
            </div>
            
            ${employee.notes ? `
                <div class="employee-notes-card">
                    <h3>Observações</h3>
                    <p>${employee.notes}</p>
                </div>
            ` : ''}
            
            <div class="form-actions">
                <button id="toggle-status-btn" class="btn ${employee.active ? 'btn-danger' : 'btn-success'}">
                    <i class="fas ${employee.active ? 'fa-user-slash' : 'fa-user-check'}"></i> 
                    ${employee.active ? 'Desativar Funcionário' : 'Ativar Funcionário'}
                </button>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Adiciona eventos
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.renderEmployeesList();
        });
        
        document.getElementById('edit-employee-btn').addEventListener('click', () => {
            this.showEditForm(employeeId);
        });
        
        document.getElementById('toggle-status-btn').addEventListener('click', () => {
            this.confirmToggleEmployeeStatus(employeeId, !employee.active);
        });
        
        document.getElementById('reset-password-btn').addEventListener('click', () => {
            this.confirmResetAccessCode(employeeId);
        });
    }
    
    // Confirmação para alterar status do funcionário
    async confirmToggleEmployeeStatus(employeeId, newStatus) {
        const employee = this.employees.find(e => e.id === employeeId);
        
        if (!employee) {
            ui.showNotification('Funcionário não encontrado.', 'error');
            return;
        }
        
        const action = newStatus ? 'ativar' : 'desativar';
        const confirmed = await ui.showConfirmation(`Deseja realmente ${action} o funcionário "${employee.name}"?`);
        
        if (confirmed) {
            try {
                ui.showLoading(`${newStatus ? 'Ativando' : 'Desativando'} funcionário...`);
                
                await db.collection('employees').doc(employeeId).update({
                    active: newStatus,
                    lastUpdate: new Date()
                });
                
                // Atualiza o funcionário na lista local
                employee.active = newStatus;
                
                ui.showNotification(`Funcionário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                
                // Verifica se estamos na visão de detalhes ou na lista
                const backBtn = document.getElementById('back-to-list');
                if (backBtn) {
                    // Estamos na visão de detalhes, atualiza a interface
                    this.showEmployeeDetails(employeeId);
                } else {
                    // Estamos na lista, atualiza a lista
                    this.renderEmployeesList();
                }
                
                ui.hideLoading();
            } catch (error) {
                console.error(`Erro ao ${action} funcionário:`, error);
                ui.hideLoading();
                ui.showNotification(`Erro ao ${action} funcionário. Por favor, tente novamente.`, 'error');
            }
        }
    }
    
    // Confirmação para resetar código de acesso
    async confirmResetAccessCode(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        
        if (!employee) {
            ui.showNotification('Funcionário não encontrado.', 'error');
            return;
        }
        
        const confirmed = await ui.showConfirmation(`Deseja realmente redefinir o código de acesso de "${employee.name}"? Um novo código será gerado automaticamente.`);
        
        if (confirmed) {
            try {
                ui.showLoading('Redefinindo código de acesso...');
                
                // Gera um novo código de acesso
                const newAccessCode = this.generateRandomAccessCode();
                
                await db.collection('employees').doc(employeeId).update({
                    accessCode: newAccessCode,
                    lastUpdate: new Date()
                });
                
                // Atualiza o funcionário na lista local
                employee.accessCode = newAccessCode;
                
                // Mostra o novo código para o administrador
                ui.hideLoading();
                await ui.showAlert(`O código de acesso foi redefinido com sucesso!\n\nNovo código: ${newAccessCode}\n\nCertifique-se de informar este código ao funcionário.`);
                
                // Atualiza a interface
                this.showEmployeeDetails(employeeId);
            } catch (error) {
                console.error('Erro ao redefinir código de acesso:', error);
                ui.hideLoading();
                ui.showNotification('Erro ao redefinir código de acesso. Por favor, tente novamente.', 'error');
            }
        }
    }
    
    // Renderiza o loader
    renderLoader() {
        this.container.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Carregando funcionários...</p>
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
window.EmployeesComponent = EmployeesComponent; 