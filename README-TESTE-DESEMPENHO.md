# Teste de Desempenho - GrafSys

Este documento contém instruções para executar o script de teste de desempenho que cria 10.000 pedidos no Firebase Firestore para avaliar o desempenho do sistema GrafSys.

## Pré-requisitos

1. Node.js instalado (versão 12 ou superior)
2. NPM ou Yarn instalado
3. Acesso administrativo ao projeto Firebase
4. Chave de serviço do Firebase Admin SDK

## Configuração

1. **Instale as dependências necessárias:**

```bash
npm install
```

2. **Obtenha a chave de serviço do Firebase:**

   - Acesse o [Console do Firebase](https://console.firebase.google.com/)
   - Selecione seu projeto
   - Vá para Configurações (engrenagem) > Contas de serviço
   - Clique em "Gerar nova chave privada"
   - Salve o arquivo JSON na pasta raiz do projeto com o nome `chave-servico-firebase.json`

## Executando os scripts

### Método 1: Usando NPM Scripts

O projeto inclui scripts NPM para facilitar a execução:

1. **Para gerar pedidos de teste:**

```bash
npm run gerar-pedidos
```

2. **Para limpar os dados de teste:**

```bash
npm run limpar-pedidos
```

### Método 2: Executando diretamente via Node

1. **Para gerar pedidos de teste:**

```bash
node script-teste-desempenho.js
```

2. **Para limpar os dados de teste:**

```bash
node script-limpeza-dados-teste.js
```

## O que o script de geração faz

O script de geração de pedidos:
- Cria 10.000 pedidos em lotes de 500 (limite do Firestore)
- Exibe o progresso no console
- Mostra o tempo total de execução ao finalizar

## Personalização do script

Você pode modificar os seguintes parâmetros no script:

- **Quantidade de pedidos**: Altere o valor da variável `quantidadePedidos` (padrão: 10.000)
- **Tamanho do lote**: Altere o valor da variável `batch_size` (padrão: 500, que é o máximo permitido pelo Firestore)
- **Dados de exemplo**: Modifique as listas de clientes, produtos e vendedores conforme necessário

## Monitoramento

Durante a execução do script, monitore:

1. **Console do Firebase**:
   - Uso de leitura/escrita no Firestore
   - Quotas e limites de uso

2. **Desempenho do aplicativo**:
   - Após a criação dos pedidos, teste o aplicativo para verificar o desempenho com grande volume de dados

## Limpeza de dados de teste

O script de limpeza fornecido facilita a remoção dos dados de teste:

1. **Funcionalidades do script de limpeza:**
   - Mostra estatísticas atuais do banco de dados antes da exclusão
   - Solicita confirmação antes de iniciar a exclusão
   - Exclui os pedidos de teste em lotes (identificados pela nota "Pedido de teste gerado automaticamente")
   - Mostra o progresso da exclusão
   - Exibe estatísticas finais após a conclusão

2. **Métodos de exclusão disponíveis:**
   - Por padrão nas notas (`excluirPedidosDeTeste`) - Ativo por padrão
   - Por prefixo no número do pedido (`excluirPedidosPorPrefixo`) - Comentado no código

3. **Personalização do script de limpeza:**
   - Edite o padrão de identificação na chamada da função `excluirPedidosDeTeste`
   - Descomente a chamada para `excluirPedidosPorPrefixo` se preferir excluir por prefixo de número
   - Ajuste o tamanho do lote (`batch_size`) conforme necessário

## Considerações importantes

- **Custos**: A criação de 10.000 documentos pode gerar custos no Firebase. Verifique seu plano de faturamento antes de executar.
- **Limites de quota**: O Firebase tem limites de operações por segundo. O script usa lotes para minimizar problemas, mas você pode encontrar erros de limite de taxa se executar o script muitas vezes em um curto período.
- **Ambiente de teste**: Recomendamos executar este script em um ambiente de teste ou desenvolvimento, nunca em produção.
- **Índices**: Pode ser necessário criar índices compostos para algumas consultas. O Firebase irá notificar sobre índices necessários no console.

## Solução de problemas

- **Erro de autenticação**: Verifique se o caminho para o arquivo de chave de serviço está correto
- **Erro de limite de taxa**: Reduza o tamanho do lote ou adicione atrasos entre os lotes
- **Erro de memória**: Se estiver criando um número muito grande de documentos, considere executar em partes menores
- **Índices ausentes**: Se encontrar erros relacionados a índices ausentes durante as consultas, crie os índices necessários no console do Firebase 