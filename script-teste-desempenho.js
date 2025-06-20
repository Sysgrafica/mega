// Script para teste de desempenho - Geração de 10 mil pedidos
const admin = require('firebase-admin');
const serviceAccount = require('./chave-servico-firebase.json'); // Substitua pelo caminho da sua chave de serviço

// Inicializar o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const batch_size = 500; // Firestore suporta no máximo 500 operações por lote

// Função para gerar dados aleatórios de pedido
function gerarPedidoAleatorio(index) {
  // Lista de clientes para selecionar aleatoriamente
  const clientes = [
    { id: 'cliente1', name: 'Cliente Teste 1', category: 'varejo' },
    { id: 'cliente2', name: 'Cliente Teste 2', category: 'atacado' },
    { id: 'cliente3', name: 'Cliente Teste 3', category: 'varejo' },
    { id: 'cliente4', name: 'Cliente Teste 4', category: 'corporativo' },
    { id: 'cliente5', name: 'Cliente Teste 5', category: 'varejo' }
  ];
  
  // Lista de produtos para selecionar aleatoriamente
  const produtos = [
    { id: 'prod1', name: 'Cartão de Visita', price: 50, category: 'impressos' },
    { id: 'prod2', name: 'Banner', price: 120, category: 'grandes_formatos' },
    { id: 'prod3', name: 'Flyer', price: 80, category: 'impressos' },
    { id: 'prod4', name: 'Adesivo', price: 30, category: 'adesivos' },
    { id: 'prod5', name: 'Folder', price: 100, category: 'impressos' }
  ];
  
  // Lista de vendedores para selecionar aleatoriamente
  const vendedores = [
    { id: 'vend1', name: 'Vendedor 1' },
    { id: 'vend2', name: 'Vendedor 2' },
    { id: 'vend3', name: 'Vendedor 3' }
  ];
  
  // Seleciona um cliente aleatório
  const cliente = clientes[Math.floor(Math.random() * clientes.length)];
  
  // Seleciona um vendedor aleatório
  const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
  
  // Gera um número aleatório de itens (1 a 5)
  const numItens = Math.floor(Math.random() * 5) + 1;
  const itens = [];
  let valorTotal = 0;
  
  // Gera os itens do pedido
  for (let i = 0; i < numItens; i++) {
    const produto = produtos[Math.floor(Math.random() * produtos.length)];
    const quantidade = Math.floor(Math.random() * 10) + 1;
    const valorUnitario = produto.price;
    const valorItem = valorUnitario * quantidade;
    valorTotal += valorItem;
    
    // Dimensões aleatórias para o item
    const largura = Math.floor(Math.random() * 100) + 10;
    const altura = Math.floor(Math.random() * 100) + 10;
    const area = (largura * altura) / 10000; // em m²
    
    itens.push({
      produtoId: produto.id,
      produtoNome: produto.name,
      quantidade: quantidade,
      valorUnitario: valorUnitario,
      valorTotal: valorItem,
      largura: largura,
      altura: altura,
      area: area,
      categoria: produto.category
    });
  }
  
  // Gera pagamentos aleatórios
  const pagamentos = [];
  const metodoPagamento = ['cash', 'credit', 'debit', 'pix', 'transfer'][Math.floor(Math.random() * 5)];
  pagamentos.push({
    method: metodoPagamento,
    value: valorTotal,
    date: admin.firestore.Timestamp.fromDate(new Date())
  });
  
  // Data aleatória nos últimos 30 dias
  const dataAtual = new Date();
  const diasAleatorios = Math.floor(Math.random() * 30);
  const dataPedido = new Date(dataAtual);
  dataPedido.setDate(dataAtual.getDate() - diasAleatorios);
  
  // Data de entrega (entre 1 e 7 dias após a data do pedido)
  const dataEntrega = new Date(dataPedido);
  dataEntrega.setDate(dataPedido.getDate() + Math.floor(Math.random() * 7) + 1);
  
  // Status aleatório do pedido
  const statusPossiveis = ['budget', 'pending', 'printing', 'cutting', 'finishing', 'application', 'ready', 'delivered', 'cancelled'];
  const status = statusPossiveis[Math.floor(Math.random() * statusPossiveis.length)];
  
  // Tipo de entrega aleatório
  const tipoEntrega = Math.random() > 0.5 ? 'retirada' : 'entrega';
  
  // Gera o número do pedido
  const numeroPedido = `PED-${(index + 1).toString().padStart(5, '0')}`;
  
  return {
    clientId: cliente.id,
    clientName: cliente.name,
    clientCategory: cliente.category,
    sellerId: vendedor.id,
    sellerName: vendedor.name,
    items: itens,
    payments: pagamentos,
    valorTotal: valorTotal,
    status: status,
    createdAt: admin.firestore.Timestamp.fromDate(dataPedido),
    updatedAt: admin.firestore.Timestamp.fromDate(dataPedido),
    deliveryDate: admin.firestore.Timestamp.fromDate(dataEntrega),
    deliveryType: tipoEntrega,
    deliveryAddress: tipoEntrega === 'entrega' ? 'Rua Exemplo, 123 - Cidade' : '',
    notes: `Pedido de teste gerado automaticamente #${index + 1}`,
    title: `Pedido ${numeroPedido}`,
    orderNumber: numeroPedido,
    discount: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : 0,
    deliveryCost: tipoEntrega === 'entrega' ? Math.floor(Math.random() * 50) + 10 : 0,
    extraServices: Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0
  };
}

// Função principal para criar pedidos em lotes
async function criarPedidosEmMassa(quantidade) {
  console.log(`Iniciando criação de ${quantidade} pedidos...`);
  
  const totalBatches = Math.ceil(quantidade / batch_size);
  let totalCriados = 0;
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batch = db.batch();
    const startIdx = batchNum * batch_size;
    const endIdx = Math.min(startIdx + batch_size, quantidade);
    
    console.log(`Processando lote ${batchNum + 1}/${totalBatches} (${startIdx + 1} até ${endIdx})`);
    
    for (let i = startIdx; i < endIdx; i++) {
      const pedidoRef = db.collection('orders').doc();
      const pedidoData = gerarPedidoAleatorio(i);
      batch.set(pedidoRef, pedidoData);
    }
    
    try {
      await batch.commit();
      totalCriados += (endIdx - startIdx);
      console.log(`Lote ${batchNum + 1} concluído! Total criado até agora: ${totalCriados}`);
    } catch (erro) {
      console.error(`Erro ao processar lote ${batchNum + 1}:`, erro);
    }
  }
  
  console.log(`Criação de ${totalCriados} pedidos finalizada com sucesso!`);
}

// Executar o script
const quantidadePedidos = 10000;
console.time('Tempo total');
criarPedidosEmMassa(quantidadePedidos)
  .then(() => {
    console.timeEnd('Tempo total');
    console.log('Processo concluído!');
    process.exit(0);
  })
  .catch(erro => {
    console.error('Erro ao criar pedidos:', erro);
    process.exit(1);
  }); 