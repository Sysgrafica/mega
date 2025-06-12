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
            { id: 'workflow', label: 'Fluxo de Trabalho', icon: 'fa-tasks', component: 'WorkflowComponent' },
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
    navigateTo(pageId, isInitialLoad = false) {
        // Se o componente atual for o mesmo que o solicitado, e não for carregamento inicial, ignore
        if (this.currentPage === pageId && !isInitialLoad) {
            console.log(`Já estamos na página ${pageId}, ignorando navegação`);
            return;
        }
        
        // Limpa o componente anterior, se existir
        if (this.currentComponent && this.currentComponent.cleanup && typeof this.currentComponent.cleanup === 'function') {
            console.log(`Limpando componente anterior: ${this.currentPage}`);
            this.currentComponent.cleanup();
            this.currentComponent = null;
        }
        
        // Atualiza o estado atual
        this.currentPage = pageId;
        
        // Atualiza o menu
        this.updateActiveMenuItem();
        
        // Verifica se é o Dashboard e se não é o carregamento inicial
        if (pageId === 'dashboard' && !isInitialLoad) {
            // Mostra um indicador de carregamento pequeno na área de conteúdo
            this.mainContent.innerHTML = `
                <div class="loading-indicator-small">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Carregando dashboard...</p>
                </div>
            `;
        }
        
        // Renderiza o componente correspondente de forma assíncrona
        setTimeout(() => {
            this.renderComponent(pageId, isInitialLoad);
            
            // Atualiza a URL sem recarregar a página
            window.history.pushState({}, '', `#${pageId}`);
        }, 50); // Pequeno delay para permitir que a UI atualize
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
    renderComponent(componentId, isInitialLoad = false) {
        console.log(`Renderizando componente: ${componentId}`);
        // Encontra o componente correspondente
        const menuItem = this.menuItems.find(item => item.id === componentId);
        
        if (menuItem && window[menuItem.component]) {
            try {
                // Se for dashboard e não for carregamento inicial, mostra indicador de carregamento
                if (componentId === 'dashboard' && !isInitialLoad) {
                    // Já mostrado na função navigateTo
                } else if (componentId !== 'dashboard') {
                    // Para outros componentes, limpa o conteúdo anterior
                    this.mainContent.innerHTML = '';
                }
                
                // Cria e renderiza o componente
                const component = new window[menuItem.component]();
                
                // Armazena referência ao componente atual
                this.currentComponent = component;
                
                // Se for dashboard, define a flag global de carregamento
                if (componentId === 'dashboard') {
                    window.isLoadingData = true;
                }
                
                // Renderiza o componente
                component.render(this.mainContent)
                    .then(() => {
                        // Após renderização completa, reseta a flag de carregamento
                        if (componentId === 'dashboard') {
                            window.isLoadingData = false;
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao renderizar componente ${componentId}:`, error);
                        window.isLoadingData = false;
                        this.showErrorPage(error.message);
                    });
            } catch (error) {
                console.error(`Erro ao criar o componente ${menuItem.component}:`, error);
                this.showErrorPage(`Erro ao criar o componente: ${error.message}`);
            }
        } else {
            this.showErrorPage();
        }
    }
    
    // Exibe página de erro
    showErrorPage(message = 'Página não encontrada') {
        this.mainContent.innerHTML = `
            <div class="error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Erro</h2>
                <p>${message}</p>
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
    
    // Mostra um modal com opções de confirmar e cancelar
    showModal(title, content, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        // Se recebemos um objeto de opções, use a versão antiga do método
        if (typeof title === 'object') {
            return this.showModal(title.title, title.content, title.onConfirm, title.confirmText, title.cancelText);
        }
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-confirm-content';
        
        // Adiciona o conteúdo
        modalContent.innerHTML = content;
        
        // Adiciona botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'modal-buttons';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.marginTop = '20px';
        buttonsContainer.style.gap = '10px';
        
        // Botão cancelar
        if (cancelText) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = cancelText;
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
            buttonsContainer.appendChild(cancelBtn);
        }
        
        // Botão confirmar
        if (confirmText) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.textContent = confirmText;
            confirmBtn.addEventListener('click', () => {
                this.closeModal();
                if (onConfirm && typeof onConfirm === 'function') {
                    onConfirm();
                }
            });
            buttonsContainer.appendChild(confirmBtn);
        }
        
        modalContent.appendChild(buttonsContainer);
        
        // Abre o modal
        this.openModal(title || 'Confirmar', modalContent);
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
    
    // Exibe um toast de carregamento que não bloqueia a interface
    showLoadingToast(message = 'Carregando dados...') {
        // Remove qualquer toast existente
        this.hideLoadingToast();
        
        // Cria o elemento de toast
        const toastContainer = document.createElement('div');
        toastContainer.id = 'loading-toast';
        toastContainer.className = 'loading-toast';
        
        toastContainer.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adiciona ao body
        document.body.appendChild(toastContainer);
        
        // Mostra o toast com animação
        setTimeout(() => {
            toastContainer.classList.add('visible');
        }, 10);
        
        // Retorna o ID para que possa ser usado para atualizar ou remover o toast
        return 'loading-toast';
    }
    
    // Atualiza a mensagem de um toast existente
    updateLoadingToast(message) {
        const toast = document.getElementById('loading-toast');
        if (toast) {
            const messageSpan = toast.querySelector('span');
            if (messageSpan) {
                messageSpan.textContent = message;
            }
        }
    }
    
    // Oculta o toast de carregamento
    hideLoadingToast() {
        const toast = document.getElementById('loading-toast');
        if (toast) {
            // Primeiro remove a classe visible para iniciar a animação de saída
            toast.classList.remove('visible');
            
            // Depois de um tempo, remove o elemento do DOM
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
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
    
    // Exibe dicas sobre captura de tela do Windows
    showScreenshotHelp() {
        const modal = document.getElementById('quick-action-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;
        
        modalTitle.textContent = 'Captura de Tela Simplificada';
        
        modalBody.innerHTML = `
            <div class="screenshot-help">
                <div class="help-method highlighted">
                    <h3>Método Recomendado: Ctrl+V</h3>
                    <div class="help-item">
                        <p><strong>1.</strong> Capture a tela usando as ferramentas do Windows:</p>
                        <ul>
                            <li>Use <kbd>Windows</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> para capturar uma área específica</li>
                            <li>Ou use <kbd>PrtScn</kbd> para capturar toda a tela</li>
                        </ul>
                        <p><strong>2.</strong> Cole diretamente no sistema com <kbd>Ctrl</kbd> + <kbd>V</kbd></p>
                        <p class="help-note-success">Este método é o mais rápido e funciona perfeitamente no Windows 11!</p>
                    </div>
                </div>
                
                <h3>Outros Métodos</h3>
                
                <div class="help-method">
                    <h4>Usar o botão "Capturar Tela"</h4>
                    <div class="help-item">
                        <p>Clique no botão "Capturar Tela" e escolha a área que deseja capturar.</p>
                    </div>
                </div>
                
                <div class="help-method">
                    <h4>Enviar Arquivo</h4>
                    <div class="help-item">
                        <p>Use o botão "Enviar Arquivo" para fazer upload de uma imagem do seu computador.</p>
                    </div>
                </div>
                
                <h3>Problemas conhecidos com Windows 11</h3>
                <div class="help-item">
                    <p>O Windows 11 tem um problema conhecido com a ferramenta de captura nativa que pode ser resolvido temporariamente com estas soluções:</p>
                    <ol>
                        <li>Altere a data do sistema para antes de 31/10/2021</li>
                        <li>Repare o aplicativo de Captura nas configurações do Windows</li>
                    </ol>
                    <p>Para mais detalhes, <a href="https://www.techtudo.com.br/dicas-e-tutoriais/2021/11/ferramenta-de-captura-de-tela-do-windows-11-nao-funciona-veja-solucoes-para-o-problema.ghtml" target="_blank">consulte este artigo</a>.</p>
                    <p><strong>Nota:</strong> O método Ctrl+V funciona independentemente deste problema!</p>
                </div>
                
                <div class="modal-buttons">
                    <button id="close-help" class="btn btn-primary">Entendi</button>
                </div>
            </div>
        `;
        
        // Mostra o modal
        modal.classList.add('active');
        
        // Adiciona evento para fechar
        document.getElementById('close-help').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Verifica problemas com captura de tela
    detectScreenshotIssues() {
        // Verifica se html2canvas está disponível
        if (typeof html2canvas !== 'function') {
            return false;
        }
        
        // Detecta o sistema operacional
        const userAgent = window.navigator.userAgent;
        const isWindows11 = userAgent.indexOf("Windows NT 10.0") !== -1 && 
                           (userAgent.indexOf("Windows 11") !== -1 || 
                            parseInt(userAgent.split("NT ")[1]) >= 10.0);
        
        // Se for Windows 11, mostrar aviso sobre problemas conhecidos
        if (isWindows11) {
            this.showNotification(
                'O Windows 11 pode ter problemas com captura de tela. Clique para ver alternativas.', 
                'warning',
                6000,
                () => this.showScreenshotHelp()
            );
        }
        
        return true;
    }
    
    // Exibe um modal de confirmação com botões Sim/Não
    confirmModal(title, message, onConfirm) {
        this.showModal(title, `<p>${message}</p>`, onConfirm, 'Sim', 'Não');
    }
    
    // Exibe um modal para entrada de texto
    promptModal(title, message, onConfirm, onCancel) {
        const content = `
            <p>${message}</p>
            <div class="form-group">
                <input type="text" id="prompt-input" class="form-control">
            </div>
        `;
        
        this.showModal(title, content, () => {
            const value = document.getElementById('prompt-input').value;
            if (onConfirm) {
                onConfirm(value);
            }
        }, 'Confirmar', 'Cancelar');
        
        // Configura o botão cancelar
        const cancelButton = document.querySelector('#quick-action-modal .btn-secondary');
        if (cancelButton) {
            const originalClick = cancelButton.onclick;
            cancelButton.onclick = (e) => {
                if (originalClick) originalClick(e);
                if (onCancel) onCancel();
            };
        }
        
        // Foca no input
        setTimeout(() => {
            const input = document.getElementById('prompt-input');
            if (input) {
                input.focus();
            }
        }, 100);
    }
}

// Será inicializado após carregar a página
