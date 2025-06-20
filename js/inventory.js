class Inventory {
    constructor() {
        this.db = firebase.firestore();
        this.materialsCollection = this.db.collection('materiais');
        this.unsubscribe = null; // Para listener em tempo real
    }

    async render(container) {
        // Verifica se o usuário atual é administrador para mostrar botões de ação
        const isAdmin = window.auth && window.auth.currentUser && window.auth.currentUser.role === 'admin';
        
        container.innerHTML = `
            <div class="inventory-container">
                <div class="header">
                    <h1>Controle de Estoque</h1>
                    ${isAdmin ? '<button id="add-material-btn" class="btn btn-primary">Adicionar Novo Material</button>' : ''}
                </div>
                <div class="inventory-list-container">
                    <table id="inventory-table">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Estoque Atual</th>
                                <th>Estoque Mínimo</th>
                                <th>Unidade</th>
                                <th>Status</th>
                                ${isAdmin ? '<th>Ações</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="inventory-list">
                            <!-- Carregando... -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (isAdmin) {
            document.getElementById('add-material-btn').addEventListener('click', () => this.openMaterialModal());
        }
        
        this.loadMaterials();
    }

    loadMaterials() {
        const inventoryList = document.getElementById('inventory-list');
        // Verifica se o usuário atual é administrador para ajustar o colspan
        const isAdmin = window.auth && window.auth.currentUser && window.auth.currentUser.role === 'admin';
        const colSpan = isAdmin ? 6 : 5; // 5 colunas para não-admin, 6 para admin
        
        inventoryList.innerHTML = `<tr><td colspan="${colSpan}">Carregando materiais...</td></tr>`;

        this.unsubscribe = this.materialsCollection.orderBy('nome').onSnapshot(snapshot => {
            if (snapshot.empty) {
                inventoryList.innerHTML = `<tr><td colspan="${colSpan}">Nenhum material cadastrado.</td></tr>`;
                return;
            }

            inventoryList.innerHTML = '';
            snapshot.forEach(doc => {
                const material = { id: doc.id, ...doc.data() };
                const row = this.createMaterialRow(material);
                inventoryList.appendChild(row);
            });
        }, error => {
            console.error("Erro ao carregar materiais: ", error);
            inventoryList.innerHTML = `<tr><td colspan="${colSpan}">Erro ao carregar materiais.</td></tr>`;
            window.ui.showNotification('Erro ao carregar os materiais do estoque.', 'error');
        });
    }

    createMaterialRow(material) {
        const tr = document.createElement('tr');
        tr.dataset.id = material.id;

        // Verifica se o usuário atual é administrador para mostrar botões de ação
        const isAdmin = window.auth && window.auth.currentUser && window.auth.currentUser.role === 'admin';

        const estoqueAtual = parseFloat(material.estoqueAtual) || 0;
        const estoqueMinimo = parseFloat(material.estoqueMinimo) || 0;
        
        let status;
        if (estoqueAtual > estoqueMinimo) {
            status = { text: 'OK', class: 'status-ok' };
        } else if (estoqueAtual > 0 && estoqueAtual <= estoqueMinimo) {
            status = { text: 'Baixo', class: 'status-low' };
        } else {
            status = { text: 'Crítico', class: 'status-critical' };
        }

        tr.innerHTML = `
            <td>${material.nome}</td>
            <td>${estoqueAtual}</td>
            <td>${estoqueMinimo}</td>
            <td>${material.unidade || 'N/A'}</td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            ${isAdmin ? `
            <td class="action-buttons">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </td>
            ` : ''}
        `;
        
        if (isAdmin) {
            tr.querySelector('.edit-btn').addEventListener('click', () => this.openMaterialModal(material));
            tr.querySelector('.delete-btn').addEventListener('click', () => this.confirmDeleteMaterial(material.id, material.nome));
        }

        return tr;
    }

    openMaterialModal(material = {}) {
        const isEditing = !!material.id;
        const modalTitle = isEditing ? `Editar Material: ${material.nome}` : 'Adicionar Novo Material';
        
        const modalContent = `
            <form id="material-form">
                <input type="hidden" id="material-id" value="${material.id || ''}">
                
                <div class="input-group">
                    <label for="material-name">Nome do Material</label>
                    <input type="text" id="material-name" value="${material.nome || ''}" required>
                </div>
                
                <div class="input-group">
                    <label for="material-stock">Estoque Atual</label>
                    <input type="number" id="material-stock" step="0.01" value="${material.estoqueAtual || 0}" required>
                </div>
                
                <div class="input-group">
                    <label for="material-min-stock">Estoque Mínimo</label>
                    <input type="number" id="material-min-stock" step="0.01" value="${material.estoqueMinimo || 0}" required>
                </div>

                <div class="input-group">
                    <label for="material-unit">Unidade (ex: kg, m², un)</label>
                    <input type="text" id="material-unit" value="${material.unidade || ''}">
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-material-save">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEditing ? 'Salvar Alterações' : 'Adicionar Material'}</button>
                </div>
            </form>
        `;

        window.ui.openModal(modalTitle, modalContent, '500px');
        
        document.getElementById('material-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMaterial();
        });
        document.getElementById('cancel-material-save').addEventListener('click', () => window.ui.closeModal());
    }

    async saveMaterial() {
        const id = document.getElementById('material-id').value;
        const materialData = {
            nome: document.getElementById('material-name').value.trim(),
            estoqueAtual: parseFloat(document.getElementById('material-stock').value),
            estoqueMinimo: parseFloat(document.getElementById('material-min-stock').value),
            unidade: document.getElementById('material-unit').value.trim()
        };

        if (!materialData.nome) {
            window.ui.showNotification('O nome do material é obrigatório.', 'error');
            return;
        }

        try {
            if (id) {
                await this.materialsCollection.doc(id).update(materialData);
                window.ui.showNotification('Material atualizado com sucesso!', 'success');
            } else {
                await this.materialsCollection.add(materialData);
                window.ui.showNotification('Material adicionado com sucesso!', 'success');
            }
            window.ui.closeModal();
        } catch (error) {
            console.error("Erro ao salvar material: ", error);
            window.ui.showNotification('Erro ao salvar o material.', 'error');
        }
    }

    async confirmDeleteMaterial(id, name) {
        window.ui.confirmModal(
            'Confirmar Exclusão',
            `Você tem certeza que deseja excluir o material "<strong>${name}</strong>"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    await this.materialsCollection.doc(id).delete();
                    window.ui.showNotification(`Material "${name}" excluído com sucesso.`, 'success');
                    // A lista se atualizará automaticamente devido ao listener onSnapshot
                } catch (error) {
                    console.error("Erro ao excluir material: ", error);
                    window.ui.showNotification('Erro ao excluir o material.', 'error');
                }
            }
        );
    }
    
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// Garante que o componente esteja acessível globalmente
window.Inventory = Inventory; 