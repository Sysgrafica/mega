# Configuração do Firebase para o GrafSys

Este documento explica como o Firebase está configurado para funcionar com o sistema GrafSys.

## Detalhes da Configuração

O projeto está utilizando a seguinte configuração do Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBjMzUlOw4LfIS0kTmm0z4UjEI5fcOvXbo",
  authDomain: "projetog-32446.firebaseapp.com",
  projectId: "projetog-32446",
  storageBucket: "projetog-32446.firebasestorage.app",
  messagingSenderId: "301778798043",
  appId: "1:301778798043:web:d4b46faf5ba727f572d3fe"
};
```

## Serviços Utilizados

O GrafSys utiliza os seguintes serviços do Firebase:

1. **Firebase Authentication**
   - Utilizado para autenticação de usuários através de códigos de acesso.
   - No modelo atual, os códigos de acesso são armazenados no Firestore.

2. **Firestore Database**
   - Banco de dados NoSQL utilizado para armazenar todos os dados do sistema:
     - Clientes
     - Produtos
     - Pedidos
     - Funcionários
     - Fornecedores
     - Logs de atividades

3. **Firebase Storage**
   - Utilizado para armazenar imagens de preview dos pedidos.

## Estrutura do Banco de Dados

O Firestore está organizado nas seguintes coleções:

- **employees**: Funcionários da gráfica com seus códigos de acesso e cargos
- **clients**: Cadastro de clientes (pessoa física ou jurídica)
- **products**: Cadastro de produtos e serviços oferecidos
- **orders**: Pedidos realizados, incluindo itens, pagamentos e prazos
- **suppliers**: Fornecedores de matéria-prima
- **user_logs**: Registros de atividades dos usuários (login, logout, etc.)

## Dados de Demonstração

Para facilitar os testes iniciais, o sistema gera automaticamente alguns dados de demonstração quando detecta que não há dados no Firestore:

1. **Usuários de demonstração**:
   - Administrador (código: 123456)
   - Vendedor (código: 234567)
   - Designer (código: 345678)
   - Produção (código: 456789)

2. **Clientes e Produtos**: São criados alguns clientes e produtos de exemplo.

3. **Pedidos**: São criados pedidos de demonstração com diferentes status e datas de entrega.

## Migração para Produção

Ao migrar para um ambiente de produção, é recomendado:

1. Limpar os dados de demonstração.
2. Configurar regras de segurança adequadas no Firestore e Storage.
3. Implementar um sistema mais robusto de autenticação, possivelmente utilizando e-mail/senha ou outros provedores.

## Atualização para Firebase v9+

O sistema atualmente utiliza a versão 8 do Firebase. Para atualizar para a versão 9 (modular), as mudanças necessárias seriam:

1. Atualizar as importações no index.html para a versão 9.
2. Refatorar o código para usar a sintaxe modular:

```javascript
// Exemplo de código utilizando Firebase v9
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
``` 