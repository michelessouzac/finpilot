# 📋 Product Requirement Document (PRD): FinPilot

| Atributo | Detalhes |
| :--- | :--- |
| **Projeto** | FinPilot — Copiloto Financeiro Inteligente de Próxima Geração |
| **Status** | Pronto para Desenvolvimento |
| **Versão** | 1.0.0 |
| **Autor(a)** | Michele |
| **Público-Alvo** | Millennials focados em organização, eficiência e previsibilidade financeira |

---

## 1. Visão Geral do Produto
O **FinPilot** é um aplicativo móvel de finanças pessoais focado em previsibilidade e inteligência preditiva. Diferente das ferramentas tradicionais de controle financeiro que apenas categorizam gastos passados, o FinPilot atua no futuro. Ele utiliza conexões automatizadas (Open Finance) e modelos avançados de IA para projetar o saldo de fim de mês, gerar alertas proativos e responder de forma contextualizada às dúvidas financeiras do usuário através de uma interface conversacional fluida.

---

## 2. Requisitos de Negócio & Objetivos
* **Retirar o Atrito do Preenchimento:** Automatizar a entrada de dados financeiros usando conexões e payloads realistas de Open Finance, eliminando o preenchimento manual de despesas.
* **Reduzir a Ansiedade Financeira:** Prover o "saldo projetado de fim de mês" com base em hábitos históricos e recorrências, ajudando o usuário a tomar decisões antes do dinheiro acabar.
* **Interface Conversacional Eficiente:** Substituir dashboards poluídos por um chat inteligente capaz de interpretar cenários hipotéticos de compra.

---

## 3. Arquitetura de Dados (Data Schema do MVP)
Para alimentar a inteligência do aplicativo, o backend seguro trabalhará com as seguintes entidades de dados simuladas/reais:

```json
{
  "User": {
    "userId": "uuid",
    "name": "string",
    "monthlyIncome": "decimal"
  },
  "Transaction": {
    "transactionId": "uuid",
    "userId": "uuid",
    "amount": "decimal",
    "type": "CREDIT | DEBIT",
    "category": "string",
    "description": "string",
    "timestamp": "ISO8601-DateTime",
    "isRecurring": "boolean"
  },
  "FixedBill": {
    "billId": "uuid",
    "userId": "uuid",
    "name": "string",
    "expectedAmount": "decimal",
    "dueDate": "integer (1-31)"
  }
}
```
## 4. Requisitos Funcionais Detalhados (As-User-Stories)

### RF-01: O Dashboard Preditivo (Tela Inicial)
* **Descrição:** A primeira tela do aplicativo deve exibir o status financeiro atual e a simulação matemática do final do mês.
* **Especificações Técnicas:**
  * **Cálculo da Projeção de Saldo ($S_p$):** 
    $$S_p = S_{atual} + \sum R_{previsto} - \sum D_{fixo} - (G_{diario} \times D_{restantes})$$
    Onde $G_{diario}$ é a média de gastos variáveis por dia do usuário nas últimas 3 semanas.
  * **UI/UX:** Um elemento visual de destaque (card ou gauge) mostrando o saldo atual, um indicador dinâmico da projeção de fim de mês, e uma listagem limpa das próximas 3 contas a vencer.

### RF-02: O Copiloto Conversacional (O Chat de IA)
* **Descrição:** Uma interface de chat onde o usuário conversa diretamente com a IA do FinPilot sobre suas finanças pessoais.
* **Comportamento e Prompt do Sistema (System Instructions):**
  > "Você é o FinPilot, um assistente de finanças pessoais altamente inteligente, empático, direto ao ponto e sutilmente bem-humorado. Você analisa os dados de extrato e de contas futuras do usuário para dar respostas extremamente precisas. Se o usuário perguntar se pode comprar algo, faça a projeção matemática de saldo e responda se aquela compra afetará suas contas essenciais."
* **Casos de Uso do Chat:**
  * **Análise de Cenário Hipotético:** 
    * *Usuário:* "Posso comprar um tênis de corrida de R$ 600 em 3x de R$ 200?"
    * *IA:* Analisa as despesas fixas dos próximos 3 meses, o padrão de gastos diários e responde se o saldo de segurança será violado em algum dos meses futuros.
  * **Resumo de Desempenho:** 
    * *Usuário:* "Onde gastei mais essa semana?"
    * *IA:* Agrupa os dados de transações do banco, identifica a maior categoria de consumo e propõe uma meta de corte baseada no histórico.

### RF-03: Alertas Proativos de IA (Engine de Notificações)
* **Descrição:** O backend monitora o comportamento de gastos do usuário de forma assíncrona e envia alertas preventivos por push.
* **Regras de Gatilho (Triggers):**
  * **Alerta de Desvio de Padrão:** Se o gasto semanal em uma categoria supérflua (ex: delivery) ultrapassar a média histórica em $1.5\sigma$ (desvios padrões).
  * **Alerta de Risco de Saldo:** Se a projeção de saldo de fim de mês ($S_p$) cair abaixo do limite de segurança definido pelo usuário (ex: R$ 500,00).

---

## 5. Casos de Borda (Edge Cases) e Tratamento de Erros

| Cenário de Falha (Edge Case) | Comportamento Esperado do App |
| :--- | :--- |
| **API do Open Finance Offline** | O app exibe os dados salvos em cache local e adiciona um indicador sutil: "Exibindo dados atualizados há X horas. Reconectando...". |
| **Usuário com Saldo Negativo** | A linguagem da IA muda de tom imediatamente. Ela deixa de lado o humor leve e adota uma abordagem prática, encorajadora e focada em contenção de danos, listando as contas prioritárias a pagar primeiro. |
| **Instabilidade na API da IA** | Se o chat não conseguir se comunicar com o provedor de IA (OpenAI/Gemini), ele exibe uma mensagem de desculpas amigável e oferece respostas baseadas em regras de lógica locais ("Não consegui analisar seu histórico detalhado agora, mas seu saldo atual ainda é de R$ X..."). |

---

## 6. Stack Tecnológica Proposta (Alinhada ao Escopo)
Para dar agilidade de desenvolvimento a uma pessoa desenvolvedora solo, a seguinte stack é sugerida:

* **Mobile (Frontend):** **React Native com Expo** (Permite programar uma vez em JavaScript/TypeScript e rodar no Android e iOS facilmente, testando direto no aparelho físico pelo app do Expo Client).
* **Backend:** **Node.js com Fastify** (Hospedado de graça na Render ou Vercel), que servirá de barreira segura para guardar as chaves de API.
* **Banco de Dados:** **Supabase** (Postgres na nuvem com plano gratuito robusto).
* **Processamento de IA:** Integração com **Google Gemini API** ou **OpenAI API** no backend (usando o SDK oficial).

---

## 7. Requisitos de Segurança & Privacidade (Não-Funcionais)
* **Proteção de Chaves (Zero Exposure):** Todas as chamadas de inferência de IA e consumo de dados financeiros devem passar estritamente pelo diretório `/backend`. Chaves de acesso jamais devem ser compiladas no bundle final do aplicativo móvel (`/mobile`).
* **Criptografia em Trânsito:** Toda comunicação entre o celular e o servidor backend deve utilizar protocolo seguro HTTPS.
* **Isolamento de Dados Sensíveis:** O prompt enviado para a IA não deve conter informações identificáveis do usuário (como CPF, dados de cartão de crédito real ou senhas bancárias). Os dados de transações devem ser anonimizados antes do envio para a API de IA.
