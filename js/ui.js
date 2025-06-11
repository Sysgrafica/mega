// Sistema de interface do usuário
class UI {
    constructor() {
        // Elementos do DOM
        this.mainMenu = document.getElementById('main-menu');
        this.mainContent = document.getElementById('main-content');
        this.notificationArea = document.getElementById('notification-area');
        this.quickActionModal = document.getElementById('quick-action-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.closeModalBtn = document.getElementById('close-modal');
        
        // Estados
        this.currentPage = null;
        this.notificationTimeout = null;
        this.menuItems = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie', component: 'DashboardComponent' },
            { id: 'orders', label: 'Pedidos', icon: 'fa-clipboard-list', component: 'OrdersComponent' },
            { id: 'clients', label: 'Clientes', icon: 'fa-users', component: 'ClientsComponent' },
            { id: 'products', label: 'Produtos', icon: 'fa-boxes', component: 'ProductsComponent' },
            { id: 'employees', label: 'Funcionários', icon: 'fa-id-card', component: 'EmployeesComponent' },
            { id: 'suppliers', label: 'Fornecedores', icon: 'fa-truck', component: 'SuppliersComponent' },
            { id: 'reports', label: 'Relatórios', icon: 'fa-chart-bar', component: 'ReportsComponent' }
        ];
        
        this.init();
    }
    
    // Inicialização
    init() {
        this.setupEventListeners();
    }
    
    // Configura event listeners
    setupEventListeners() {
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        
        // Fechar modal ao clicar fora dele
        this.quickActionModal.addEventListener('click', (e) => {
            if (e.target === this.quickActionModal) {
                this.closeModal();
            }
        });
        
        // Fechar modal com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.quickActionModal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }
    
    // Gera o menu principal com base nas permissões do usuário
    generateMenu() {
        this.mainMenu.innerHTML = '';
        
        this.menuItems.forEach(item => {
            // Verifica se o usuário tem permissão para este item
            if (window.auth.hasPermission(item.id)) {
                const menuItem = document.createElement('a');
                menuItem.href = '#';
                menuItem.dataset.page = item.id;
                menuItem.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
                
                // Marca como ativo se for a página atual
                if (this.currentPage === item.id) {
                    menuItem.classList.add('active');
                }
                
                // Adiciona evento de clique
                menuItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(item.id);
                });
                
                this.mainMenu.appendChild(menuItem);
            }
        });
    }
    
    // Navega para uma página específica
    navigateTo(pageId) {
        // Atualiza o estado atual
        this.currentPage = pageId;
        
        // Atualiza o menu
        this.updateActiveMenuItem();
        
        // Renderiza o componente correspondente
        this.renderComponent(pageId);
        
        // Atualiza a URL sem recarregar a página
        window.history.pushState({}, '', `#${pageId}`);
    }
    
    // Atualiza o item de menu ativo
    updateActiveMenuItem() {
        const menuLinks = this.mainMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            if (link.dataset.page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // Renderiza um componente na área de conteúdo principal
    renderComponent(componentId) {
        // Limpa o conteúdo anterior
        this.mainContent.innerHTML = '';
        
        // Encontra o componente correspondente
        const menuItem = this.menuItems.find(item => item.id === componentId);
        
        if (menuItem && window[menuItem.component]) {
            const component = new window[menuItem.component]();
            component.render(this.mainContent);
        } else {
            this.showErrorPage();
        }
    }
    
    // Exibe página de erro
    showErrorPage() {
        this.mainContent.innerHTML = `
            <div class="error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Página não encontrada</h2>
                <p>A página solicitada não existe ou você não tem permissão para acessá-la.</p>
                <button class="btn btn-primary" id="go-home">Voltar ao Início</button>
            </div>
        `;
        
        document.getElementById('go-home').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });
    }
    
    // Exibe uma notificação temporária
    showNotification(message, type = 'success') {
        // Limpa timeout anterior, se existir
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Cria elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Adiciona à área de notificações
        this.notificationArea.appendChild(notification);
        
        // Configura a remoção automática após 5 segundos
        this.notificationTimeout = setTimeout(() => {
            notification.style.opacity = '0';
            
            // Remove do DOM após a animação de fade out
            setTimeout(() => {
                this.notificationArea.removeChild(notification);
            }, 300);
        }, 5000);
    }
    
    // Abre o modal de ação rápida
    openModal(title, content, width = '600px') {
        this.modalTitle.textContent = title;
        this.modalBody.innerHTML = '';
        
        // Se o conteúdo for um elemento HTML
        if (content instanceof HTMLElement) {
            this.modalBody.appendChild(content);
        } else {
            // Se for uma string HTML
            this.modalBody.innerHTML = content;
        }
        
        // Define largura personalizada
        this.quickActionModal.querySelector('.modal-content').style.maxWidth = width;
        
        // Exibe o modal
        this.quickActionModal.classList.add('active');
    }
    
    // Fecha o modal
    closeModal() {
        this.quickActionModal.classList.remove('active');
    }
    
    // Cria um formulário dinâmico
    createForm(fields, submitCallback, initialValues = {}) {
        const form = document.createElement('form');
        form.className = 'dynamic-form';
        
        // Cria os campos do formulário
        fields.forEach(field => {
            const formGroup = document.createElement('div');
            formGroup.className = 'input-group';
            
            // Label
            const label = document.createElement('label');
            label.setAttribute('for', field.id);
            label.textContent = field.label;
            formGroup.appendChild(label);
            
            // Campo
            let input;
            
            switch (field.type) {
                case 'select':
                    input = document.createElement('select');
                    
                    // Adiciona as opções
                    field.options.forEach(option => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option.value;
                        optionEl.textContent = option.label;
                        input.appendChild(optionEl);
                    });
                    break;
                    
                case 'textarea':
                    input = document.createElement('textarea');
                    input.rows = field.rows || 4;
                    break;
                    
                case 'checkbox':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = initialValues[field.id] || false;
                    break;
                    
                default:
                    input = document.createElement('input');
                    input.type = field.type || 'text';
                    break;
            }
            
            // Atributos comuns
            input.id = field.id;
            input.name = field.id;
            
            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            
            if (field.required) {
                input.required = true;
            }
            
            // Define valor inicial, se existir
            if (initialValues[field.id] !== undefined && field.type !== 'checkbox') {
                input.value = initialValues[field.id];
            }
            
            formGroup.appendChild(input);
            
            // Mensagem de erro
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.id = `${field.id}-error`;
            formGroup.appendChild(errorMsg);
            
            form.appendChild(formGroup);
        });
        
        // Botões de ação
        const actions = document.createElement('div');
        actions.className = 'form-actions';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => this.closeModal());
        actions.appendChild(cancelBtn);
        
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Salvar';
        actions.appendChild(submitBtn);
        
        form.appendChild(actions);
        
        // Event listener de submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Coleta os valores do formulário
            const formData = {};
            fields.forEach(field => {
                const input = document.getElementById(field.id);
                
                if (field.type === 'checkbox') {
                    formData[field.id] = input.checked;
                } else {
                    formData[field.id] = input.value;
                }
            });
            
            // Chama o callback de submit
            submitCallback(formData, form);
        });
        
        return form;
    }
    
    // Cria uma tabela de dados
    createDataTable(headers, data, options = {}) {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-card';
        
        // Título da tabela
        if (options.title) {
            const title = document.createElement('h3');
            title.textContent = options.title;
            tableContainer.appendChild(title);
        }
        
        // Barra de pesquisa
        if (options.searchable) {
            const searchBar = document.createElement('div');
            searchBar.className = 'search-input';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search';
            searchBar.appendChild(searchIcon);
            
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Pesquisar...';
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                
                // Filtra as linhas
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(term)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
            
            searchBar.appendChild(searchInput);
            tableContainer.appendChild(searchBar);
        }
        
        // Tabela
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Cabeçalho
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.label;
            
            if (header.width) {
                th.style.width = header.width;
            }
            
            headerRow.appendChild(th);
        });
        
        // Adiciona coluna de ações, se necessário
        if (options.actions) {
            const actionsHeader = document.createElement('th');
            actionsHeader.textContent = 'Ações';
            actionsHeader.style.width = '120px';
            headerRow.appendChild(actionsHeader);
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Corpo da tabela
        const tbody = document.createElement('tbody');
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            headers.forEach(header => {
                const td = document.createElement('td');
                
                // Se houver um renderizador personalizado
                if (header.render) {
                    td.innerHTML = header.render(item[header.field], item);
                } else {
                    td.textContent = item[header.field] || '';
                }
                
                row.appendChild(td);
            });
            
            // Botões de ação
            if (options.actions) {
                const actionsTd = document.createElement('td');
                actionsTd.className = 'table-actions';
                
                options.actions.forEach(action => {
                    if (action.condition && !action.condition(item)) {
                        return; // Pula esta ação se a condição não for atendida
                    }
                    
                    const button = document.createElement('button');
                    button.className = `btn btn-sm ${action.class || 'btn-primary'}`;
                    button.innerHTML = `<i class="fas ${action.icon}"></i>`;
                    button.title = action.label;
                    
                    button.addEventListener('click', () => {
                        action.onClick(item);
                    });
                    
                    actionsTd.appendChild(button);
                });
                
                row.appendChild(actionsTd);
            }
            
            // Evento de clique na linha, se definido
            if (options.onRowClick) {
                row.style.cursor = 'pointer';
                row.addEventListener('click', (e) => {
                    // Não dispara se o clique foi em um botão de ação
                    if (!e.target.closest('.table-actions')) {
                        options.onRowClick(item);
                    }
                });
            }
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Mensagem de "nenhum dado"
        if (data.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data-message';
            noData.textContent = options.noDataMessage || 'Nenhum dado encontrado.';
            tableContainer.appendChild(noData);
        }
        
        return tableContainer;
    }
    
    // Formata um valor monetário
    formatCurrency(value) {
        return SYSTEM_CONFIG.currency + ' ' + parseFloat(value).toFixed(2).replace('.', ',');
    }
    
    // Formata uma data
    formatDate(date) {
        if (!date) return '';
        
        if (date instanceof Date) {
            // Se já for um objeto Date
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } else if (date.seconds) {
            // Se for um timestamp do Firestore
            const jsDate = new Date(date.seconds * 1000);
            const day = jsDate.getDate().toString().padStart(2, '0');
            const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
            const year = jsDate.getFullYear();
            
            return `${day}/${month}/${year}`;
        }
        
        return date;
    }
    
    // Cria notificação tipo "desfazer"
    createUndoNotification(message, undoCallback) {
        const notification = document.createElement('div');
        notification.className = 'undo-notification';
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        notification.appendChild(messageSpan);
        
        const undoBtn = document.createElement('span');
        undoBtn.className = 'undo-btn';
        undoBtn.textContent = 'DESFAZER';
        undoBtn.addEventListener('click', () => {
            document.body.removeChild(notification);
            if (undoCallback) undoCallback();
        });
        
        notification.appendChild(undoBtn);
        document.body.appendChild(notification);
        
        // Remove após a animação terminar
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    // Exibe indicador de carregamento
    showLoading(message = 'Carregando...') {
        // Remove qualquer loader existente
        this.hideLoading();
        
        // Cria o elemento de loader
        const loaderContainer = document.createElement('div');
        loaderContainer.id = 'global-loader';
        loaderContainer.className = 'global-loader';
        
        loaderContainer.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        // Adiciona ao body
        document.body.appendChild(loaderContainer);
        
        // Impede rolagem da página
        document.body.style.overflow = 'hidden';
    }
    
    // Oculta indicador de carregamento
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            document.body.removeChild(loader);
        }
        
        // Restaura rolagem da página
        document.body.style.overflow = '';
    }
    
    // Exibe diálogo de confirmação
    showConfirmation(message) {
        return new Promise(resolve => {
            // Cria o modal de confirmação
            const confirmModal = document.createElement('div');
            confirmModal.className = 'confirmation-modal';
            
            confirmModal.innerHTML = `
                <div class="confirmation-content">
                    <p>${message}</p>
                    <div class="confirmation-buttons">
                        <button id="confirm-yes" class="btn btn-primary">Sim</button>
                        <button id="confirm-no" class="btn btn-secondary">Não</button>
                    </div>
                </div>
            `;
            
            // Adiciona ao body
            document.body.appendChild(confirmModal);
            
            // Adiciona eventos aos botões
            document.getElementById('confirm-yes').addEventListener('click', () => {
                document.body.removeChild(confirmModal);
                resolve(true);
            });
            
            document.getElementById('confirm-no').addEventListener('click', () => {
                document.body.removeChild(confirmModal);
                resolve(false);
            });
        });
    }
    
    // Exibe prompt para entrada de texto
    showPrompt(message, defaultValue = '') {
        return new Promise(resolve => {
            // Cria o modal de prompt
            const promptModal = document.createElement('div');
            promptModal.className = 'prompt-modal';
            
            promptModal.innerHTML = `
                <div class="prompt-content">
                    <p>${message}</p>
                    <input type="text" id="prompt-input" value="${defaultValue}" class="form-control">
                    <div class="prompt-buttons">
                        <button id="prompt-ok" class="btn btn-primary">OK</button>
                        <button id="prompt-cancel" class="btn btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            
            // Adiciona ao body
            document.body.appendChild(promptModal);
            
            // Foca no input
            const input = document.getElementById('prompt-input');
            input.focus();
            input.select();
            
            // Função para confirmar
            const confirm = () => {
                const value = input.value;
                document.body.removeChild(promptModal);
                resolve(value);
            };
            
            // Função para cancelar
            const cancel = () => {
                document.body.removeChild(promptModal);
                resolve(null);
            };
            
            // Adiciona eventos aos botões
            document.getElementById('prompt-ok').addEventListener('click', confirm);
            document.getElementById('prompt-cancel').addEventListener('click', cancel);
            
            // Pressionar Enter confirma
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    confirm();
                } else if (e.key === 'Escape') {
                    cancel();
                }
            });
        });
    }
}

// Será inicializado após carregar a página
