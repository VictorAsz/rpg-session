🧭 I. VISÃO GERAL DO SISTEMA
Qual o nome do sistema/projeto?
Esse sistema é: Autoral
apenas para sua mesa? 
ou você quer algo reutilizável por outros mestres futuramente? Apenas para minha mesa
Haverá múltiplas mesas simultâneas ou apenas uma sessão ativa? Apenas uma sessão ativa
Você quer sistema de login?
email/senha?
login social? social, apenas usuario e senha(não precisa de segurança)
ou algo simples tipo código da sala?
🎭 II. USUÁRIOS E PAPÉIS
Quais papéis existem?
Mestre (GM)
Jogador
Outros? Apenas mestre e jogador
O mestre pode:
editar QUALQUER ficha? Sim
controlar inventário dos jogadores? Sim
controlar atributos em tempo real? Sim
Jogadores podem:
editar própria ficha? 
ou só visualizar? Apenas as informações pessoais o resto visualizar
Um usuário pode ter múltiplos personagens? Sim
📜 III. FICHAS DE PERSONAGEM
A ficha será:
fixa (campos definidos)
ou dinâmica (customizável pelo mestre)? Fixa
Quais atributos principais existem?
Vida, Magia, Mana, XP, Força, Destreza, Constituição, Inteligencia, Sabedoria, pontos de inspiração 
também há os campos de 
Raça, Nome, Pericias(toogle), Biografia, Foto, Lista de Itens, Equipamentos equipados(mao esquerda/direita, cabeca, corpo, pernas, botas, luvas, acessorio 1, acessorio 2), Notas, Lista de habilidades
Existem:
buffs/debuffs? Sim 
status temporários? Sim 
Inventário:
tem limite de itens? Não
itens empilháveis? Sim 
🎲 IV. SISTEMA DE DADOS (ROLAGENS)
Tipos de rolagem:
apenas NdX (ex: 1d20)?
ou fórmulas complexas (ex: 2d10 + STR + bônus)? Formulas complexas(unicas para cada itens,habilidade ou pericia) 
As rolagens precisam:
aparecer para TODOS em tempo real? Sim 
ficar salvas em histórico? Sim 
Existe:
rolagem secreta (só mestre vê)?
ou tudo público? Tudo publico 
🧠 V. TEMPO REAL (CRÍTICO)
O que precisa ser em tempo real?
rolagens SIM 
chat SIM 
movimentação no canvas SIM 
alteração de ficha SIM 
uso de item/magia SIM 
Atualização deve ser:
instantânea (websocket/realtime) 
ou pode tolerar pequeno delay? pode tolerar delay minimo, de prefrencia realtime.
🗺️ VI. CANVAS (TABULEIRO)
O canvas terá:

As funcionalidades do canvas podem vir futuramente.
de começo ele pode apenas permitir desenho livre e apagar.




🧰 VII. ITENS, MAGIAS E DOCUMENTOS
Itens possuem:
efeito mecânico?  
ou apenas descrição? Efeito mecanico, eles podem gastar ou não, e executaram ações dentro do sistema 
Magias:
possuem custo (mana, cooldown)? Possuem custo de mana, Sem cooldown 
aplicam efeitos automáticos? Sim (também existem passivas mas ficam na lista de buffs) 
Documentos:
são tipo lore/handouts? sim 
podem ser privados? sim 
💬 VIII. CHAT
Chat terá:
mensagens públicas sim 
mensagens privadas (whisper) sim 
mensagens do sistema (rolagens, ações) sim 
Chat deve:
suportar comandos? (ex: /roll 1d20)
ou apenas UI separada? UI separada 
🎨 IX. INTERFACE
Layout:
fixo (desktop only)
ou responsivo? Desktop only 
Canvas central + menus embaixo é fixo? sim 
Quer animações?  
(ex: dado rolando, dano aparecendo) sim 
⚙️ X. BACKEND / ARQUITETURA
Você pretende usar:
Supabase Realtime (WebSockets)
ou polling? Supabase realtime 
Quer separar:
frontend (Vercel)
backend (Supabase functions / edge functions)? supbase é apenas o database e responsavel por enviar os sinais para a pagina no navegador quando houver alteracoes, a logica de rolagens, uso dos itens,habilidades é tudo no angular com uso de interfaces para poder migrar futuramente para backend proprio. 
Precisa de:
versionamento de dados? nao 
histórico de sessão? nao 
🔐 XI. SEGURANÇA E REGRAS
Jogadores podem ver dados uns dos outros? sim 
O mestre pode “forçar” ações (ex: alterar HP)? sim 
Existe necessidade de logs/auditoria? não 
🧪 XII. ESCOPO INICIAL (MVP)
O que é ESSENCIAL na primeira versão?
(se tiver que cortar 70% das features) realtime, forms de fichas, login dos usuarios e controle dos personagens respectivos. forms para adicionar magias, itens, pericias, etc..., interface 
O que pode ficar para depois?

Canvas, chat, animacoes.



🎼 XIII. VISÃO DE FUTURO
Você pretende evoluir para:
sistema genérico estilo Roll20?
ou algo focado no seu RPG? é apenas focado no meu rpg pessoal mas vou adicionando features  
Pretende monetizar ou open source?	 open source e não pretendo monetizar

Escreva um ou mais prompts(diga a ordem a ser dada) para o claude code como se fosse um dev senior.