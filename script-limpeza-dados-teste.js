// Script para limpar dados de teste gerados pelo script de teste de desempenho
const admin = require('firebase-admin');
const serviceAccount = require('./chave-servico-firebase.json'); // Substitua pelo caminho da sua chave de serviço

// Inicializar o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const batch_size = 500; // Firestore suporta no máximo 500 operações por lote

// Função para excluir pedidos de teste em lotes
async function excluirPedidosDeTeste(padraoIdentificacao) {
  console.log(`Iniciando exclusão de pedidos de teste com padrão: ${padraoIdentificacao}`);
  
  let totalExcluidos = 0;
  let ultimoDocumento = null;
  let continuar = true;
  
  while (continuar) {
    try {
      // Consulta para encontrar pedidos de teste
      let query = db.collection('orders')
        .where('notes', '>=', padraoIdentificacao)
        .where('notes', '<=', padraoIdentificacao + '\uf8ff')
        .orderBy('notes')
        .limit(batch_size);
      
      // Se houver um último documento, inicie a consulta a partir dele
      if (ultimoDocumento) {
        query = query.startAfter(ultimoDocumento);
      }
      
      const snapshot = await query.get();
      
      // Se não houver mais documentos, encerre o loop
      if (snapshot.empty) {
        console.log('Não há mais pedidos para excluir.');
        continuar = false;
        break;
      }
      
      // Guarde o último documento para a próxima iteração
      ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
      
      // Crie um lote para excluir os documentos
      const batch = db.batch();
      let contadorLote = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        contadorLote++;
      });
      
      // Commit do lote
      await batch.commit();
      totalExcluidos += contadorLote;
      console.log(`Lote processado: ${contadorLote} pedidos excluídos. Total até agora: ${totalExcluidos}`);
      
    } catch (erro) {
      console.error('Erro ao excluir lote de pedidos:', erro);
      // Espera um pouco antes de tentar novamente para evitar problemas de taxa de limite
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Exclusão concluída. Total de pedidos excluídos: ${totalExcluidos}`);
}

// Função alternativa para excluir pedidos por prefixo de número de pedido
async function excluirPedidosPorPrefixo(prefixo) {
  console.log(`Iniciando exclusão de pedidos com prefixo: ${prefixo}`);
  
  let totalExcluidos = 0;
  let ultimoDocumento = null;
  let continuar = true;
  
  while (continuar) {
    try {
      // Consulta para encontrar pedidos pelo prefixo do número
      let query = db.collection('orders')
        .where('orderNumber', '>=', prefixo)
        .where('orderNumber', '<=', prefixo + '\uf8ff')
        .orderBy('orderNumber')
        .limit(batch_size);
      
      // Se houver um último documento, inicie a consulta a partir dele
      if (ultimoDocumento) {
        query = query.startAfter(ultimoDocumento);
      }
      
      const snapshot = await query.get();
      
      // Se não houver mais documentos, encerre o loop
      if (snapshot.empty) {
        console.log('Não há mais pedidos para excluir.');
        continuar = false;
        break;
      }
      
      // Guarde o último documento para a próxima iteração
      ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
      
      // Crie um lote para excluir os documentos
      const batch = db.batch();
      let contadorLote = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        contadorLote++;
      });
      
      // Commit do lote
      await batch.commit();
      totalExcluidos += contadorLote;
      console.log(`Lote processado: ${contadorLote} pedidos excluídos. Total até agora: ${totalExcluidos}`);
      
    } catch (erro) {
      console.error('Erro ao excluir lote de pedidos:', erro);
      // Espera um pouco antes de tentar novamente para evitar problemas de taxa de limite
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Exclusão concluída. Total de pedidos excluídos: ${totalExcluidos}`);
}

// Função para mostrar estatísticas antes da exclusão
async function mostrarEstatisticas() {
  try {
    // Contar total de pedidos
    const totalSnapshot = await db.collection('orders').count().get();
    const totalPedidos = totalSnapshot.data().count;
    
    // Contar pedidos de teste (usando a nota como identificador)
    const testesSnapshot = await db.collection('orders')
      .where('notes', '>=', 'Pedido de teste gerado automaticamente')
      .where('notes', '<=', 'Pedido de teste gerado automaticamente' + '\uf8ff')
      .count().get();
    const pedidosTeste = testesSnapshot.data().count;
    
    console.log('=== ESTATÍSTICAS ATUAIS ===');
    console.log(`Total de pedidos no banco: ${totalPedidos}`);
    console.log(`Pedidos de teste identificados: ${pedidosTeste}`);
    console.log(`Porcentagem de pedidos de teste: ${((pedidosTeste / totalPedidos) * 100).toFixed(2)}%`);
    console.log('==========================');
    
    return { totalPedidos, pedidosTeste };
  } catch (erro) {
    console.error('Erro ao obter estatísticas:', erro);
    return { totalPedidos: 'desconhecido', pedidosTeste: 'desconhecido' };
  }
}

// Função principal
async function main() {
  try {
    console.log('Iniciando processo de limpeza de dados de teste...');
    
    // Mostrar estatísticas antes da exclusão
    await mostrarEstatisticas();
    
    // Perguntar ao usuário se deseja continuar
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const resposta = await new Promise(resolve => {
      readline.question('Deseja continuar com a exclusão dos pedidos de teste? (s/n): ', resolve);
    });
    
    if (resposta.toLowerCase() !== 's') {
      console.log('Operação cancelada pelo usuário.');
      readline.close();
      process.exit(0);
    }
    
    readline.close();
    
    console.time('Tempo total');
    
    // Excluir pedidos de teste
    await excluirPedidosDeTeste('Pedido de teste gerado automaticamente');
    
    // Alternativa: excluir por prefixo de número de pedido
    // await excluirPedidosPorPrefixo('PED-');
    
    console.timeEnd('Tempo total');
    
    // Mostrar estatísticas após a exclusão
    await mostrarEstatisticas();
    
    console.log('Processo de limpeza concluído!');
    process.exit(0);
  } catch (erro) {
    console.error('Erro durante o processo de limpeza:', erro);
    process.exit(1);
  }
}

// Executar o script
main(); 