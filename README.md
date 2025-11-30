# DK Material

Projeto React com Material Web Components e Firebase Authentication.

## Características

- ✅ Splash Screen usando Material Web Components
- ✅ Autenticação Firebase (Login/Registro)
- ✅ Roteamento baseado no estado de autenticação
- ✅ Interface com Material Web Components
- ✅ Design moderno e responsivo

## Configuração

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Vá em **Configurações do projeto** (ícone de engrenagem)
4. Na seção **Seus apps**, clique em **Web** (`</>`)
5. Copie as credenciais do Firebase
6. Abra `src/firebase/config.js` e substitua os valores:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
}
```

### 3. Habilitar Authentication no Firebase

1. No Firebase Console, vá em **Authentication**
2. Clique em **Get Started**
3. Habilite o método **Email/Password**
4. Salve as configurações

## Como usar

### Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

### Criar build de produção

```bash
npm run build
```

### Visualizar o build de produção

```bash
npm run preview
```

## Estrutura do projeto

```
DK-Material/
├── src/
│   ├── components/
│   │   ├── SplashScreen.jsx      # Tela de splash
│   │   └── SplashScreen.css
│   ├── pages/
│   │   ├── LoginPage.jsx         # Página de login/registro
│   │   ├── LoginPage.css
│   │   ├── HomePage.jsx          # Página principal (usuário logado)
│   │   └── HomePage.css
│   ├── firebase/
│   │   └── config.js             # Configuração do Firebase
│   ├── App.jsx                   # Componente principal
│   ├── App.css
│   ├── main.jsx                  # Ponto de entrada
│   └── index.css                 # Estilos globais
├── index.html                    # HTML principal
├── package.json                  # Dependências
├── vite.config.js               # Configuração do Vite
└── README.md                    # Este arquivo
```

## Fluxo da aplicação

1. **Splash Screen**: Mostra por 2 segundos enquanto verifica autenticação
2. **Verificação de Auth**: Verifica se o usuário está logado no Firebase
3. **Roteamento**:
   - Se **logado** → Redireciona para `HomePage`
   - Se **não logado** → Redireciona para `LoginPage`
4. **Login/Registro**: Usuário pode criar conta ou fazer login
5. **Home**: Página protegida com opção de logout

## Tecnologias

- React 18
- Vite 5
- Firebase 10 (Authentication)
- Material Web Components (@material/web)
- JavaScript (JSX)

## Material Web Components

Este projeto usa os seguintes componentes do Material Web:

- `md-filled-button` - Botão preenchido
- `md-outlined-button` - Botão com contorno
- `md-text-button` - Botão de texto
- `md-filled-text-field` - Campo de texto preenchido
- `md-card` - Card
- `md-circular-progress` - Indicador de progresso circular
- `md-icon` - Ícones
