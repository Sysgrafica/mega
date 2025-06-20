// Métodos para verificar e atualizar o status de marcação dos itens

/**
 * Verifica se o usuário atual tem permissão para marcar itens
 * Apenas administradores e impressores podem marcar itens
 * 
 * @returns {boolean} Verdadeiro se o usuário tem permissão, falso caso contrário
 */
function verificarPermissaoMarcacao() {
    // Obtém o usuário atual do sistema de autenticação
    const currentUser = window.auth.getCurrentUser();
    
    // Verifica se o usuário existe e tem uma função atribuída
    if (!currentUser || !currentUser.role) {
        return false;
    }
    
    // Apenas administradores e impressores podem marcar itens
    return currentUser.role === 'admin' || currentUser.role === 'impressor';
}

/**
 * Verifica se o usuário atual tem permissão para marcar itens de impressão
 * Apenas administradores e impressores podem marcar itens
 * 
 * @returns {boolean} Verdadeiro se o usuário tem permissão, falso caso contrário
 */
function verificarPermissaoMarcacaoImpressao() {
    // Obtém o usuário atual do sistema de autenticação
    const currentUser = window.auth.getCurrentUser();
    
    // Verifica se o usuário existe e tem uma função atribuída
    if (!currentUser || !currentUser.role) {
        return false;
    }
    
    // Apenas administradores e impressores podem marcar itens
    return currentUser.role === 'admin' || currentUser.role === 'impressor';
}

/**
 * Verifica se o usuário atual tem permissão para marcar itens de acabamento
 * Apenas administradores e funcionários do acabamento podem marcar itens
 * 
 * @returns {boolean} Verdadeiro se o usuário tem permissão, falso caso contrário
 */
function verificarPermissaoMarcacaoAcabamento() {
    // Obtém o usuário atual do sistema de autenticação
    const currentUser = window.auth.getCurrentUser();
    
    // Verifica se o usuário existe e tem uma função atribuída
    if (!currentUser || !currentUser.role) {
        return false;
    }
    
    // Apenas administradores e funcionários do acabamento podem marcar itens
    return currentUser.role === 'admin' || currentUser.role === 'acabamento';
}

/**
 * Atualiza o status de marcação de um item de pedido
 * 
 * @param {string} orderId - ID do pedido
 * @param {number} itemIndex - Índice do item no array de itens do pedido
 * @param {boolean} marcado - Novo status de marcação
 * @returns {Promise<boolean>} Promessa que resolve para verdadeiro se a atualização for bem-sucedida
 */
async function atualizarStatusMarcacao(orderId, itemIndex, marcado) {
    try {
        // Verifica permissão
        if (!verificarPermissaoMarcacao()) {
            ui.showNotification('Apenas impressores e administradores podem marcar itens.', 'warning');
            return false;
        }
        
        // Busca o pedido atual
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            console.error('Pedido não encontrado:', orderId);
            return false;
        }
        
        const orderData = orderDoc.data();
        const items = orderData.items || [];
        
        // Verifica se o índice é válido
        if (itemIndex >= items.length || itemIndex < 0) {
            console.error('Índice de item inválido:', itemIndex);
            return false;
        }
        
        // Obtém informações do usuário atual
        const currentUser = window.auth.getCurrentUser();
        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
        
        // Atualiza o item no array
        items[itemIndex] = {
            ...items[itemIndex],
            printChecked: marcado,
            printCheckedBy: marcado ? userName : null,
            printCheckedAt: marcado ? new Date() : null
        };
        
        // Atualiza o documento no Firestore
        await orderRef.update({
            items: items,
            lastUpdate: new Date()
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status de marcação:', error);
        return false;
    }
}

/**
 * Atualiza o status de marcação de impressão de um item de pedido
 * 
 * @param {string} orderId - ID do pedido
 * @param {number} itemIndex - Índice do item no array de itens do pedido
 * @param {boolean} marcado - Novo status de marcação
 * @returns {Promise<boolean>} Promessa que resolve para verdadeiro se a atualização for bem-sucedida
 */
async function atualizarStatusMarcacaoImpressao(orderId, itemIndex, marcado) {
    try {
        // Verifica permissão
        if (!verificarPermissaoMarcacaoImpressao()) {
            ui.showNotification('Apenas impressores e administradores podem marcar itens.', 'warning');
            return false;
        }
        
        // Busca o pedido atual
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            console.error('Pedido não encontrado:', orderId);
            return false;
        }
        
        const orderData = orderDoc.data();
        const items = orderData.items || [];
        
        // Verifica se o índice é válido
        if (itemIndex >= items.length || itemIndex < 0) {
            console.error('Índice de item inválido:', itemIndex);
            return false;
        }
        
        // Obtém informações do usuário atual
        const currentUser = window.auth.getCurrentUser();
        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
        
        // Atualiza o item no array
        items[itemIndex] = {
            ...items[itemIndex],
            printChecked: marcado,
            printCheckedBy: marcado ? userName : null,
            printCheckedAt: marcado ? new Date() : null
        };
        
        // Atualiza o documento no Firestore
        await orderRef.update({
            items: items,
            lastUpdate: new Date()
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status de marcação de impressão:', error);
        return false;
    }
}

/**
 * Atualiza o status de marcação de acabamento de um item de pedido
 * 
 * @param {string} orderId - ID do pedido
 * @param {number} itemIndex - Índice do item no array de itens do pedido
 * @param {boolean} marcado - Novo status de marcação
 * @returns {Promise<boolean>} Promessa que resolve para verdadeiro se a atualização for bem-sucedida
 */
async function atualizarStatusMarcacaoAcabamento(orderId, itemIndex, marcado) {
    try {
        // Verifica permissão
        if (!verificarPermissaoMarcacaoAcabamento()) {
            ui.showNotification('Apenas funcionários do acabamento e administradores podem marcar itens.', 'warning');
            return false;
        }
        
        // Busca o pedido atual
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            console.error('Pedido não encontrado:', orderId);
            return false;
        }
        
        const orderData = orderDoc.data();
        const items = orderData.items || [];
        
        // Verifica se o índice é válido
        if (itemIndex >= items.length || itemIndex < 0) {
            console.error('Índice de item inválido:', itemIndex);
            return false;
        }
        
        // Obtém informações do usuário atual
        const currentUser = window.auth.getCurrentUser();
        const userName = currentUser ? currentUser.name || currentUser.email || 'Usuário' : 'Usuário';
        
        // Atualiza o item no array
        items[itemIndex] = {
            ...items[itemIndex],
            finishingChecked: marcado,
            finishingCheckedBy: marcado ? userName : null,
            finishingCheckedAt: marcado ? new Date() : null
        };
        
        // Atualiza o documento no Firestore
        await orderRef.update({
            items: items,
            lastUpdate: new Date()
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status de marcação de acabamento:', error);
        return false;
    }
}
