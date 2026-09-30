# PIW — Better Capture Log

Userscript para **Poké Idle World** que adiciona um botão 📜 à sidebar do **PIW-QOL**, permitindo visualizar e gerenciar o histórico de capturas de Pokémon.

## ✨ Funcionalidades

* 📜 Acesso rápido ao **Log de Capturas**
* 🔎 Busca por nome do Pokémon
* ✨ Filtro de Pokémon **Shiny**
* 📊 Filtro por **IV mínimo/máximo**
* 📈 Ordenação por:

  * Mais recentes
  * Mais antigos
  * Qualidade
  * IV
  * Nome
* 🏆 Exibição da qualidade da captura
* 🖼️ Ícones dos Pokémon
* 📋 Paginação para grandes históricos
* 🗑️ Opção para limpar todo o histórico
* 🖱️ Janela arrastável
* 💾 Posição da janela salva automaticamente
* 🔄 Atualização manual do histórico

## 🚀 Instalação

Instale o script através do **Tampermonkey** ou **Violentmonkey**:

[PIW Better Log — GitHub](https://github.com/mateuspedro/PIW-Better-log?utm_source=chatgpt.com)

Depois, acesse:

`https://poke.idleworld.online/play`

O botão 📜 será adicionado automaticamente à sidebar do PIW-QOL.

## 📊 Informações exibidas

Cada captura pode apresentar:

* Nome do Pokémon
* ✨ Status Shiny
* Data e hora da captura
* Poké Ball utilizada
* Qualidade da captura
* Multiplicador de qualidade
* IV total `/192`
* Nível

### Qualidade

O multiplicador é convertido em categorias:

| Multiplicador | Qualidade |
| ------------: | --------- |
|        < 1.00 | Fraca     |
|     1.00–1.09 | Comum     |
|     1.10–1.29 | Incomum   |
|     1.30–1.49 | Rara      |
|     1.50–1.69 | Épica     |
|     1.70–1.99 | Lendária  |
|     2.00–2.99 | Mítica    |
|     3.00–3.99 | Anciã     |
|        ≥ 4.00 | Divina    |

## 🔧 Funcionamento

O script utiliza a API interna do jogo para consultar:

```text
/api/game/capture-log
```

E, quando solicitado, pode limpar o histórico através de:

```text
/api/game/capture-log/clear
```

O token de autenticação da sessão do jogo é utilizado para realizar as requisições.

## ⚠️ Observação

Este projeto depende de APIs e estruturas internas do **Poké Idle World**. Alterações no jogo podem fazer com que algumas funcionalidades deixem de funcionar.

## 👤 Autor

**KizaniN**

Repositório:

[github.com/mateuspedro/PIW-Better-log](https://github.com/mateuspedro/PIW-Better-log?utm_source=chatgpt.com)
