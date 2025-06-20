//
Implementação
da
funcionalidade
de
marcação
de
itens
//
Métodos
a
adicionar
na
classe
OrdersComponent

class OrdersComponent {
    // Verifica se o usuário atual tem permissão para marcar itens
    checkMarkItemPermission() {
        // Obtém o usuário atual do sistema de autenticação
        const currentUser = window.auth.getCurrentUser();
        
        // Verifica se o usuário existe e tem uma função atribuída
        if (!currentUser || !currentUser.role) {
            return false;
        }
        
        // Apenas administradores e impressores podem marcar itens
        return currentUser.role === 'admin' || currentUser.role === 'impressor';
    }

    // Verifica se o usuário atual tem permissão para marcar itens de impressão
    checkMarkPrintItemPermission() {
        // Obtém o usuário atual do sistema de autenticação
        const currentUser = window.auth.getCurrentUser();
        
        // Verifica se o usuário existe e tem uma função atribuída
        if (!currentUser || !currentUser.role) {
            return false;
        }
        
        // Apenas administradores e impressores podem marcar itens
        return currentUser.role === 'admin' || currentUser.role === 'impressor';
    }

    // Verifica se o usuário atual tem permissão para marcar itens de acabamento
    checkMarkFinishingItemPermission() {
        // Obtém o usuário atual do sistema de autenticação
        const currentUser = window.auth.getCurrentUser();
        
        // Verifica se o usuário existe e tem uma função atribuída
        if (!currentUser || !currentUser.role) {
            return false;
        }
        
        // Apenas administradores e funcionários do acabamento podem marcar itens
        return currentUser.role === 'admin' || currentUser.role === 'acabamento';
    }

    // Configura os listeners para os checkboxes de marcação de itens
    setupPrintCheckboxListeners(orderId) {
        try {
            const checkboxes = document.querySelectorAll(`.print-checkbox[data-order-id="${orderId}"]`);
            console.log(`Configurando ${checkboxes.length} checkboxes para o pedido ${orderId}`);
            
            // Obter o usuário atual para verificar permissões
            const currentUser = window.auth.getCurrentUser();
            const userRole = currentUser ? currentUser.role : null;
            
            // Verifica se o usuário tem permissão para marcar os checkboxes (apenas admin ou impressor)
            const canMarkCheckbox = userRole === 'admin' || userRole === 'impressor';
            
            // Remover listeners antigos primeiro para evitar duplicação
            checkboxes.forEach(checkbox => {
                const clonedCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(clonedCheckbox, checkbox);
            });
            
            // Buscar novamente os checkboxes após a clonagem
            const refreshedCheckboxes = document.querySelectorAll(`.print-checkbox[data-order-id="${orderId}"]`);
            
            refreshedCheckboxes.forEach(checkbox => {
                // Desabilitar checkbox se o usuário não tiver permissão
                if (!canMarkCheckbox) {
                    checkbox.disabled = true;
                    checkbox.title = "Apenas impressores e administradores podem marcar itens";
                }
                
                checkbox.addEventListener('change', async (e) => {
                    // Verificar novamente a permissão (segurança adicional)
                    if (!canMarkCheckbox) {
                        e.preventDefault();
                        ui.showNotification('Apenas impressores e administradores podem marcar itens.', 'warning');
                        e.target.checked = !e.target.checked; // Reverte a alteração
                        return;
                    }
                    
                    const checked = e.target.checked;
                    const itemIndex = parseInt(e.target.dataset.itemIndex);
                    const orderId = e.target.dataset.orderId;
                    
                    // Desabilita o checkbox durante o processamento
                    e.target.disabled = true;
                    
                    try {
                        // Busca o pedido atual
                        const orderRef = db.collection('orders').doc(orderId);
                        const orderDoc = await orderRef.get();
                        
                        if (!orderDoc.exists) {
                            console.error('Pedido não encontrado:', orderId);
                            e.target.disabled = false;
                            return;
                        }
                        
                        const orderData = orderDoc.data();
                        const items = orderData.items || [];
                        
                        // Verifica se o índice é válido
                        if (itemIndex >= items.length || itemIndex < 0) {
                            console.error('Índice de item inválido:', itemIndex);
                            e.target.disabled = false;
                            return;
                        }
                        
                        // Obtém informações do usuário atual
                        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
                        
                        // Atualiza o item no array
                        items[itemIndex] = {
                            ...items[itemIndex],
                            printChecked: checked,
                            printCheckedBy: checked ? userName : null,
                            printCheckedAt: checked ? new Date() : null
                        };
                        
                        // Atualiza o documento no Firestore
                        await orderRef.update({
                            items: items,
                            lastUpdate: new Date()
                        });
                        
                        // Atualiza o tooltip com as informações de quem marcou
                        const tooltip = document.getElementById(`info-tooltip-${orderId}-${itemIndex}`);
                        if (tooltip) {
                            if (checked) {
                                tooltip.innerHTML = `Impresso por: ${userName}<br>Em: ${this.formatDateTime(new Date())}`;
                            } else {
                                tooltip.innerHTML = 'Aguardando impressão';
                            }
                        }
                        
                        // Mostra notificação de sucesso
                        ui.showNotification(`Item ${checked ? 'marcado' : 'desmarcado'} com sucesso!`, 'success');
                        
                    } catch (error) {
                        console.error('Erro ao atualizar status de impressão:', error);
                        ui.showNotification('Erro ao atualizar status de impressão.', 'error');
                        
                        // Reverte o estado do checkbox em caso de erro
                        e.target.checked = !checked;
                    }
                    
                    // Reabilita o checkbox após o processamento se o usuário tiver permissão
                    if (canMarkCheckbox) {
                        e.target.disabled = false;
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao configurar checkboxes de impressão:', error);
        }
    }

    // Configura os listeners para os checkboxes de marcação de itens de acabamento
    setupFinishingCheckboxListeners(orderId) {
        try {
            const checkboxes = document.querySelectorAll(`.finishing-checkbox[data-order-id="${orderId}"]`);
            console.log(`Configurando ${checkboxes.length} checkboxes de acabamento para o pedido ${orderId}`);
            
            // Obter o usuário atual para verificar permissões
            const currentUser = window.auth.getCurrentUser();
            const userRole = currentUser ? currentUser.role : null;
            
            // Verifica se o usuário tem permissão para marcar os checkboxes (apenas admin ou acabamento)
            const canMarkCheckbox = userRole === 'admin' || userRole === 'acabamento';
            
            // Remover listeners antigos primeiro para evitar duplicação
            checkboxes.forEach(checkbox => {
                const clonedCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(clonedCheckbox, checkbox);
            });
            
            // Buscar novamente os checkboxes após a clonagem
            const refreshedCheckboxes = document.querySelectorAll(`.finishing-checkbox[data-order-id="${orderId}"]`);
            
            refreshedCheckboxes.forEach(checkbox => {
                // Desabilitar checkbox se o usuário não tiver permissão
                if (!canMarkCheckbox) {
                    checkbox.disabled = true;
                    checkbox.title = "Apenas funcionários do acabamento e administradores podem marcar itens";
                }
                
                checkbox.addEventListener('change', async (e) => {
                    // Verificar novamente a permissão (segurança adicional)
                    if (!canMarkCheckbox) {
                        e.preventDefault();
                        ui.showNotification('Apenas funcionários do acabamento e administradores podem marcar itens.', 'warning');
                        e.target.checked = !e.target.checked; // Reverte a alteração
                        return;
                    }
                    
                    const checked = e.target.checked;
                    const itemIndex = parseInt(e.target.dataset.itemIndex);
                    const orderId = e.target.dataset.orderId;
                    
                    // Desabilita o checkbox durante o processamento
                    e.target.disabled = true;
                    
                    try {
                        // Busca o pedido atual
                        const orderRef = db.collection('orders').doc(orderId);
                        const orderDoc = await orderRef.get();
                        
                        if (!orderDoc.exists) {
                            console.error('Pedido não encontrado:', orderId);
                            e.target.disabled = false;
                            return;
                        }
                        
                        const orderData = orderDoc.data();
                        const items = orderData.items || [];
                        
                        // Verifica se o índice é válido
                        if (itemIndex >= items.length || itemIndex < 0) {
                            console.error('Índice de item inválido:', itemIndex);
                            e.target.disabled = false;
                            return;
                        }
                        
                        // Obtém informações do usuário atual
                        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
                        
                        // Atualiza o item no array
                        items[itemIndex] = {
                            ...items[itemIndex],
                            finishingChecked: checked,
                            finishingCheckedBy: checked ? userName : null,
                            finishingCheckedAt: checked ? new Date() : null
                        };
                        
                        // Atualiza o documento no Firestore
                        await orderRef.update({
                            items: items,
                            lastUpdate: new Date()
                        });
                        
                        // Atualiza o tooltip com as informações de quem marcou
                        const tooltip = document.getElementById(`finishing-tooltip-${orderId}-${itemIndex}`);
                        if (tooltip) {
                            if (checked) {
                                tooltip.innerHTML = `Acabado por: ${userName}<br>Em: ${this.formatDateTime(new Date())}`;
                            } else {
                                tooltip.innerHTML = 'Aguardando acabamento';
                            }
                        }
                        
                        // Mostra notificação de sucesso
                        ui.showNotification(`Item ${checked ? 'marcado' : 'desmarcado'} como finalizado!`, 'success');
                        
                    } catch (error) {
                        console.error('Erro ao atualizar status de acabamento:', error);
                        ui.showNotification('Erro ao atualizar status de acabamento.', 'error');
                        
                        // Reverte o estado do checkbox em caso de erro
                        e.target.checked = !checked;
                    }
                    
                    // Reabilita o checkbox após o processamento se o usuário tiver permissão
                    if (canMarkCheckbox) {
                        e.target.disabled = false;
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao configurar checkboxes de acabamento:', error);
        }
    }

    // Método auxiliar para formatar data e hora
    formatDateTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('pt-BR') + ' ' + new Date(date).toLocaleTimeString('pt-BR');
    }
}

// Exporta a classe para uso em outros arquivos
export { OrdersComponent };
