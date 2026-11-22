# Chord & Scale Library

> **Aviso de Transparência:** Este é um **projeto pessoal desenvolvido inteiramente com Inteligência Artificial** com o objetivo de **aprendizado, experimentação técnica e estudo musical**. Não possui fins comerciais.

[![Demo Online](https://img.shields.io/badge/Demo-Vercel-000000?style=flat-square&logo=vercel)](https://chord-scale-library.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-f59e0b?style=flat-square)]()
[![PWA](https://img.shields.io/badge/PWA-Instal%C3%A1vel%20%26%20Offline-10b981?style=flat-square)]()
[![Web Audio API](https://img.shields.io/badge/%C3%81udio-Web%20Audio%20API-38bdf8?style=flat-square)]()

**Chord & Scale Library** é uma aplicação web completa em **HTML, CSS e JavaScript puro (sem frameworks)** criada para estudo, composição, improvisação e visualização de shapes no violão e na guitarra (6 e 7 cordas).

Acesse a versão publicada: **https://chord-scale-library.vercel.app**

---

## Sobre o Projeto

Este projeto nasceu como uma iniciativa pessoal para unir dois interesses — **música (violão/guitarra e teoria harmônica)** e **desenvolvimento de software assistido por IA** — explorando até onde é possível chegar utilizando apenas tecnologias nativas da web (ES Modules, SVG dinâmico, Web Audio API, LocalStorage e Service Worker) sem dependências externas de runtime.

Todo o código-fonte, motor algorítmico de teoria musical, sintetizador de áudio, interface e documentação foram desenvolvidos inteiramente com auxílio de IA para fins de aprendizado e prática pessoal.

---

## Os 10 Módulos Principais

### 1. Biblioteca de Acordes
- Motor algorítmico que gera **11.400+ posições jogáveis** (apenas na afinação padrão), recalculadas dinamicamente para todas as afinações alternativas.
- **30 tipos de acordes**: Tríades (`Maj`, `m`, `5`, `dim`, `aug`), Tétrades (`7`, `maj7`, `m7`, `m(maj7)`, `m7b5`, `dim7`), Suspensos (`sus2`, `sus4`, `7sus4`), Sextas & Add (`6`, `m6`, `add9`, `m(add9)`, `6/9`), Extensões (`9`, `maj9`, `m9`, `11`, `m11`, `13`) e Alterados (`7#5`, `7b5`, `7b9`, `7#9`, `maj7#11`).
- **Visualizações por acorde**:
  - Diagrama vertical tradicional (SVG)
  - Diagrama horizontal (SVG)
  - Tablatura interativa
  - Tabela completa de digitação (corda, casa, nota, intervalo e dedo recomendado)
  - Navegação entre todos os shapes disponíveis (Aberto, Pestana, Sistema CAGED e Inversões)
- **Filtros avançados**: Dificuldade, número de dedos, com/sem pestana, região do braço, sistema CAGED e inversão.
- **Modo Palco horizontal** e **IA Musical** integrada (escalas recomendadas para solar e substituições harmônicas).

### 2. Visualizador do Braço (24 Casas)
- Braço completo e interativo em SVG para **6 ou 7 cordas** e **24 casas**, com separação nítida por trastes metálicos 3D, marcações (inlays) reais e coluna dedicada para cordas soltas.
- **Modos de exibição**: Notas, Intervalos, Graus, Somente Tônicas e Apenas Selecionadas.
- **Zoom flexível**: Braço inteiro (`0–24`), Regiões específicas e Janela Móvel deslizante.
- **Reverse Chord Finder & Reverse Scale Finder**: clique diretamente nas notas no braço e o sistema identifica automaticamente acordes (incluindo inversões) e escalas compatíveis.
- **Heatmap do Braço**: registra e exibe visualmente as regiões mais tocadas durante seus estudos.
- Sobreposição visual do **Sistema CAGED**.

### 3. Construtor de Escalas
- **23 escalas** organizadas por categoria: Diatônicas, Menores (Natural, Harmônica, Melódica), Pentatônicas & Blues, Modos Gregos, Jazz & Simétricas (Bebop, Cromática, Whole Tone, Diminuta S-T / T-S, Alterada / Super Lócria) e Exóticas (Frígia Dominante, Lídia Dominante).
- Geração automática de notas, fórmula, passos (Tom/Semitom) e intervalos coloridos.
- **Sistemas de digitação**: Braço inteiro, 5 boxes do **Sistema CAGED**, Shapes por região e padrões de **2, 3 e 4 notas por corda (2NPS / 3NPS / 4NPS)**.
- Reprodução de áudio com destaque visual no braço, controle de BPM, cadência melódica e loop de estudo.

### 4. Explorador de Modos
- Suporte a três escalas mãe: **Escala Maior (Diatônica)**, **Menor Melódica** e **Menor Harmônica**.
- Visualização **lado a lado dos 7 modos** (Jônio, Dórico, Frígio, Lídio, Mixolídio, Eólio, Lócrio e seus equivalentes menores).
- Alternância entre modos **Paralelos** (mesma tônica) e **Relativos** (mesma armadura), destacando exatamente quais **notas e intervalos são alterados** em relação ao modo Maior, além de medidor de brilho harmônico.

### 5. Arpejos & Ligações
- Geração automática de arpejos (`Maj7`, `m7`, `7`, `dim7`, `aug`, `m7b5`, Tríade Maior e Tríade Menor).
- Visualização no braço completo, diagramas de referência e shapes CAGED.
- **Ligação entre shapes**: curvas visuais conectando notas pivô e slides entre regiões adjacentes do braço.

### 6. Comparador Musical
- Compare **Escala vs Escala**, **Escala vs Arpejo** ou **Acorde vs Escala**.
- Destaque cromático no braço e em cards analíticos para **Notas Iguais (em comum)**, **Exclusivas de A**, **Exclusivas de B** e percentual de compatibilidade (overlap).

### 7. Progressões Harmônicas, Roda de Acordes & IA Musical
- Biblioteca de progressões organizadas por gênero: **Pop, Rock, Blues, Jazz, Metal, Funk e Fusion** (`I-IV-V`, `ii-V-I`, `I-V-vi-IV`, Blues 12 compassos, Frígio Metal, Dórico Funk, Lídio Fusion etc.).
- **Roda de Acordes (Circle of Fifths) interativa** sempre visível para transposição e audição instantânea.
- **Customização individual de shapes** em cada acorde da progressão (`< Shape X/Y >`) com recálculo imediato de **Voice Leading** (condução de vozes, notas comuns e índice de fluidez).
- **Editor momentâneo de cadência por acorde** + botão **"Replicar para todos"** e ajuste de BPM.
- **IA Musical**: sugere escalas para improvisação, arpejos/superposições por acorde e substituições harmônicas (SubV7/trítono, relativos, dominantes secundárias, empréstimo modal).
- **Modo Palco horizontal** para ensaio em tela cheia.

### 8. Treinador Interativo (Quiz)
- Quatro modalidades de treino auditivo e visual (+ Modo Misto):
  - *Qual é esta nota?*
  - *Qual é este acorde?*
  - *Qual é esta escala?*
  - *Qual é este intervalo?*
- Painel com acertos, erros, precisão (%), sequência (streak), cronômetro em tempo real e **histórico de desempenho** salvo no `localStorage`.

### 9. Favoritos
- Salve **Acordes**, **Escalas**, **Progressões** e **Shapes específicos** localmente via `localStorage` para acesso rápido mesmo offline, com audição direta e atalho para reabrir no módulo original.

### 10. Compositor de Músicas
- Monte músicas completas divididas por sessões (**Verso, Pré-Refrão, Refrão, Solo, Ponte, Intro e Outro**).
- Cada acorde exibe **nome + diagrama visual completo do shape** com seletor individual de shape, **drag-and-drop** para reordenar, associação de escala recomendada por sessão e anotações de arranjo.
- **Editor momentâneo de batida/cadência por acorde** com replicação rápida e BPM.
- **Destaque sincronizado em tempo real** (acorde ativo + pulso de compasso `1 2 3 4`), **Modo Palco horizontal** e exportação de cifra completa com diagramas em **PDF**.

---

## Recursos Extras & Estúdio Integrado

- **Síntese de Áudio (Web Audio API — 100% offline)**: 4 timbres selecionáveis (*Violão Aço*, *Guitarra Clean*, *Jazz Hollow* e *Rock Crunch*) sem necessidade de arquivos MP3 externos.
- **Cadências e Batidas Customizáveis**:
  - Presets de acordes (*Para Baixo*, *Para Cima*, *Cima/Baixo Pop-Rock*, *Palm Mute*, *Dedilhado/Arpejo*, *Contratempo Funk/Reggae* e *Sincopado Bossa/Jazz*) e melódicos (*Subindo/Descendo*, *Ascendente*, *Descendente*, *Palm Mute*, *Legato* e *Terças*).
  - **Indicador Visual da Levada** de 8 tempos (`1 e 2 e 3 e 4 e`) pulsando em sincronia com o áudio.
  - Edição momentânea de cada batida por acorde em Progressões e Compositor (não persistida no `localStorage`).
- **Estúdio de Ritmo (Metrônomo + Drum Machine)**: metrônomo com Tap Tempo, LEDs de tempo e sequenciador de bateria de 16 passos (Bumbo, Caixa, Chimbal e Ride) com 6 ritmos prontos (Rock, Blues, Funk, Jazz, Metal e Pop).
- **Afinador Cromático (Microfone + Referência)**:
  - Captação via microfone (Web Audio API com autocorrelação), exibição da frequência em **Hz** da nota tocada vs frequência alvo, medidor de cents e nível de entrada.
  - Identificação automática da corda ou **seleção manual de corda**, seletor de afinação integrado e instrução clara em português (**Apertar**, **Afrouxar** ou **Corda Afinada!**).
- **7 Afinações Alternativas**: Standard (`EADGBE`), Drop D (`DADGBE`), Drop C (`CGCFAD`), `DADGAD`, Open G (`DGDGBD`), Open D (`DADF#AD`) e **7 Cordas Standard** (`BEADGBE`).
- **Modo Canhoto (Left-Handed)**: espelha instantaneamente o braço de 24 casas e todos os diagramas verticais/horizontais.
- **Busca Global Unificada (`Ctrl + K`)**: acesso rápido a qualquer acorde (`Am7`), escala (`G dorico`), progressão (`ii-V-I em Bb`), arpejo ou módulo.
- **Dark Mode & Light Mode**: paletas dedicadas de alto contraste com ícones vetoriais SVG.
- **Exportação & Compartilhamento**: exportação de diagramas em **PNG** de alta resolução, folhas de estudo/músicas em **PDF** e **compartilhamento por link** com estado codificado na URL.
- **PWA Instalável & Modo Offline**: `manifest.json` + Service Worker com estratégia *Network-First com fallback offline*.
- **Responsividade & Mobile Bottom Bar**: barra fixa inferior no celular para navegação rápida com o polegar.

---

## Arquitetura do Projeto

```text
chord-scale-library/
├── index.html                  # Shell semântico, sidebar, topbar, mobile bottom bar e dock rítmico
├── manifest.json               # Manifesto PWA
├── sw.js                       # Service Worker (Network-First + fallback offline)
├── vercel.json                 # Headers otimizados para PWA na Vercel
├── icons/
│   └── icon.svg                # Ícone vetorial do app
├── css/
│   ├── variables.css           # Tokens de design (Dark & Light Mode)
│   ├── layout.css              # Shell responsivo, sidebar, topbar, bottom bar e studio dock
│   ├── components.css          # Sistema padronizado de botões, modais, levada, afinador e busca
│   └── modules.css             # Layouts específicos dos 10 módulos e Modo Palco horizontal
├── data/
│   ├── music-theory.json       # Notas, intervalos, 7 afinações, CAGED e Circle of Fifths
│   ├── chords.json             # 30 fórmulas de acordes e templates CAGED
│   ├── scales.json             # 23 escalas, sistemas modais e arpejos
│   └── progressions.json       # Progressões por gênero musical
└── js/
    ├── app.js                  # Controlador principal, rotas, preferências, PWA e Studio Dock
    ├── core/
    │   ├── theory.js           # Motor base de teoria musical e transposições
    │   ├── chordEngine.js      # Gerador algorítmico de voicings + Reverse Chord Finder
    │   ├── scaleEngine.js      # Escalas, CAGED, 2/3/4 NPS, Modos, Arpejos e Reverse Scale Finder
    │   ├── harmonyAI.js        # IA Musical (escalas, arpejos, substituições e Voice Leading)
    │   └── storage.js          # Persistência em localStorage (Favoritos, Quiz, Músicas e Heatmap)
    ├── audio/
    │   ├── audioEngine.js      # Sintetizador de guitarra + motor de cadências de 8 passos
    │   └── rhythmEngine.js     # Metrônomo de alta precisão e Drum Machine de 16 passos
    ├── ui/
    │   ├── icons.js            # Biblioteca própria de ícones SVG (100% offline)
    │   ├── fretboard.js        # Renderizador SVG interativo do braço de 24 casas (destro/canhoto)
    │   ├── chordDiagram.js     # Diagramas verticais, horizontais, tablatura e tabela de digitação
    │   ├── circleOfFifths.js   # Roda de Acordes interativa em SVG
    │   ├── playbackBar.js      # Controle reutilizável de BPM, cadência e visualizador da levada
    │   ├── strummingEditor.js  # Editor momentâneo de batida por acorde
    │   ├── globalSearch.js     # Modal de busca global (Ctrl+K)
    │   ├── tunerModal.js       # Afinador cromático com microfone e tons de referência
    │   └── exportTools.js      # Exportação PNG, PDF e compartilhamento via URL
    └── modules/
        ├── modChords.js        # Módulo 1 — Biblioteca de Acordes
        ├── modFretboard.js     # Módulo 2 — Visualizador do Braço
        ├── modScales.js        # Módulo 3 — Construtor de Escalas
        ├── modModes.js         # Módulo 4 — Explorador de Modos
        ├── modArpeggios.js     # Módulo 5 — Arpejos
        ├── modComparator.js    # Módulo 6 — Comparador
        ├── modProgressions.js  # Módulo 7 — Progressões & IA
        ├── modTrainer.js       # Módulo 8 — Treinador Quiz
        ├── modFavorites.js     # Módulo 9 — Favoritos
        └── modComposer.js      # Módulo 10 — Compositor
```

---

## Como Executar Localmente

Como o projeto utiliza **ES Modules** e carrega arquivos `.json` via `fetch`, basta servir a pasta raiz com qualquer servidor HTTP estático:

```bash
# Clonar o repositório
git clone https://github.com/MatheusCamargoGinebro/chord-scale-library.git
cd chord-scale-library

# Opção 1: Node.js
npx serve .

# Opção 2: Python 3
python -m http.server 8080
```

Depois, abra `http://localhost:8080` (ou a porta indicada no terminal) no navegador.

> **Nota sobre o Afinador:** o acesso ao microfone via Web Audio API requer contexto seguro (`https://` ou `http://localhost`).

---

## Deploy

O projeto é 100% estático (zero etapa de build) e está publicado na **Vercel** com deploy contínuo conectado à branch `main`:

- **Produção:** https://chord-scale-library.vercel.app

---

## Finalidade & Licença

Projeto pessoal de código aberto criado **inteiramente com Inteligência Artificial** exclusivamente para **estudo, aprendizado e experimentação pessoal**. Sinta-se livre para explorar, estudar o código ou adaptar para seus próprios estudos musicais.
