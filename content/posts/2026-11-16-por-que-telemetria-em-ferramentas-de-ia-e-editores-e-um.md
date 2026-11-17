---
title: "Por que telemetria em ferramentas de IA e editores é um risco real para o seu código"
date: "2026-11-16"
category: "article"
tags: ["telemetria", "privacidade", "seguranca", "ia", "editores"]
excerpt: "Seu editor sabe o que você digita antes de você salvar. Entenda o que sai da sua máquina, o que dizem as políticas e como auditar cada conexão."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-11-16-por-que-telemetria-em-ferramentas-de-ia-e-editores-e-um.jpg"
lang: "pt"
translationKey: "2026-11-16-por-que-telemetria-em-ferramentas-de-ia-e-editores-e-um"
---

Seu editor de código sabe o que você digita antes de você salvar o arquivo. Cada tecla pode alimentar métricas de uso, telemetria de extensões e, com ferramentas de IA, o contexto completo que você colou na conversa. Na maioria das vezes você não percebe nada disso: a instalação vem com a coleta ligada por padrão, e o consentimento acontece num clique de "Aceitar tudo" que ninguém lê. O problema deixa de ser abstrato quando o código que sai da máquina é o de um cliente, de um sistema interno ou de um produto que ainda nem foi lançado.

Este texto não é sobre parar de usar IA ou de instalar extensões. É sobre entender o caminho que o seu código percorre, distinguir telemetria legítima de coleta excessiva e montar uma rotina de auditoria que funcione no dia a dia.

## O que as ferramentas coletam (e por que "telemetria" não é só métrica)

Telemetria, na definição da indústria, é a coleta automática de dados de uso: comandos executados, tempo de carregamento, erros, plugins instalados, hardware. Em tese, serve para melhorar o produto. Na prática, o escopo varia enormemente entre ferramentas - e o rótulo "telemetria" esconde categorias bem diferentes.

Vale separar em três camadas:

1. **Telemetria do editor**: eventos de uso, estabilidade, desempenho. No VS Code, por exemplo, há um controle granular (desligar tudo, ou enviar apenas dados de erro).
2. **Contexto de IA**: quando você usa um assistente, o trecho de código, o arquivo aberto, as mensagens do chat e às vezes o conteúdo do repositório inteiro podem ser enviados para inferência. Isso não é telemetria no sentido clássico - é o produto funcionando. E quase sempre é opcional.
3. **Extensões e plugins**: cada extensão é um programa de terceiros com as próprias permissões. Muitas embutem analytics próprios (Google Analytics, Segment, telemetria do fabricante) sem relação com o editor.

Quando alguém diz "desativei a telemetria", geralmente só desligou a camada 1. As camadas 2 e 3 continuam ativas - e são justamente as que carregam conteúdo, não apenas métricas.

## O ponto cego: código proprietário em contexto de IA

Ferramentas de assistência ao vivo mudaram a natureza do risco. Antes, o pior cenário de telemetria era um relatório de erro com um trecho de stack trace. Agora, uma única interação pode enviar:

- o arquivo aberto com lógica de negócio;
- funções inteiras com nomes de clientes, parâmetros internos e comentários;
- o diff de uma alteração antes do commit;
- o conteúdo de um chat com decisões de arquitetura e endpoints.

A política de cada fornecedor muda o jogo. Alguns usam os dados para treinar modelos; outros prometem não treinar, mas mantêm retenção por um período; outros processam tudo em memória e descartam. A diferença entre essas promessas raramente aparece no fluxo de instalação - ela está num documento de privacidade que quase ninguém abre.

O risco não é só jurídico. Existe o vazamento acidental (um segredo em contexto), a exposição de propriedade intelectual de terceiros e o problema de conformidade: enviar dados pessoais de usuários para fora do país sem base legal é uma violação direta de LGPD e GDPR, independentemente da intenção.

## O que dizem as políticas: VS Code, Copilot e extensões

Vale olhar os documentos oficiais em vez de confiar em configuração padrão:

- **VS Code**: a página de telemetria do projeto documenta exatamente o que é coletado, quando é enviado e como desligar (`telemetry.telemetryLevel`). É uma das documentações mais claras do mercado - use-a como referência.
- **GitHub Copilot**: a documentação oficial descreve quais dados de contexto são enviados para inferência, como sugestões são geradas e o que acontece com o código depois. Leia com atenção a seção de retenção e de uso para treinamento.
- **Extensões**: não há política única. Cada uma tem a sua. Extensões populares de lint, formatação e deploy frequentemente embutem coleta própria.

O ponto que costuma passar despercebido: desligar a telemetria do editor não desliga a coleta das extensões nem o envio de contexto para a IA. São três decisões independentes, e você precisa tomar as três.

## Riscos concretos: do vazamento à conformidade

Para sair do abstrato, três cenários reais:

**Vazamento de segredos.** Um assistente com contexto amplo pode capturar uma chave de API num arquivo `.env` que você abriu para "entender aquele erro". Alguns produtos filtram segredos conhecidos; a maioria não garante nada. A defesa é comportamental: nunca abrir arquivos de credenciais com assistente ativo, e manter segredos fora do repositório.

**Conformidade.** Se o seu produto processa dados pessoais de usuários da União Europeia ou do Brasil, enviar trechos com esses dados para um serviço sediado fora do país exige base legal (consentimento, execução de contrato, legítimo interesse com avaliação de impacto). Um assistente que envia contexto "só para sugerir código" não tem exceção embutida.

**Propriedade intelectual.** Código de cliente ou de empregador enviado para inferência de terceiros pode violar contrato de confidencialidade mesmo que o fornecedor jure não treinar com seus dados. A retenção temporária e os logs de auditoria do próprio fornecedor já são exposição suficiente para muitos contratos.

## Como auditar o que sai da sua máquina

A boa notícia: auditar é mais simples do que parece. Você não precisa ser especialista em redes para ver o tráfego do seu editor.

**1. Escolha o nível de telemetria explicitamente.** No VS Code, o caminho é `settings.json`:

```json
{
  "telemetry.telemetryLevel": "off"
}
```

Faça o mesmo nas configurações de cada extensão que ofereça opção própria. "Off" no editor com extensão que coleta não resolve nada.

**2. Veja o tráfego real.** Um proxy local mostra cada requisição:

```bash
# instala uma vez
pip install mitmproxy

# captura o tráfego do editor (ex.: VS Code aceita proxy via variável)
mitmdump --listen-port 8080 -w editor.flows
```

Com o proxy ativo, abra o editor, use o assistente, salve arquivos e observe os domínios que recebem dados. surpresa garantida: há sempre mais conexões do que o esperado.

**3. Isole o que não pode sair.** Se o ambiente permitir, configure firewall ou DNS para bloquear domínios de telemetria conhecidos e mantenha o assistente de IA em outro perfil/rede quando o projeto for sensível.

**4. Trate repositório como perímetro.** Antes de enviar contexto, revise o que está no repositório: `.env`, chaves, dados de produção em arquivos de teste. O melhor filtro é o que não existe no diretório.

## Checklist: reduzindo a superfície de exposição

- Telemetria do editor em `off` (ou no nível mínimo que você aceita conscientemente).
- Extensões auditadas: desinstale o que não usa; para o que fica, procure a opção de telemetria nas configurações.
- Assistente de IA com contexto restrito ao arquivo aberto, não ao workspace inteiro, em projetos de cliente.
- Repositório limpo: nenhum segredo, nenhum dado real de produção em arquivos de teste.
- Rede monitorada pelo menos uma vez: rode o proxy por um dia de trabalho e anote o que viu.
- Documento interno: qual ferramenta, qual política, qual base legal. Se a resposta for "não sei", o problema é maior que a telemetria.

## Conclusão

Telemetria e assistentes de IA não são vilões por natureza - são ferramentas com custo de privacidade embutido, e esse custo raramente aparece no preço. A diferença entre uso consciente e exposição acidental está em três hábitos: configurar explicitamente em vez de aceitar defaults, auditar o tráfego pelo menos uma vez e tratar o repositório como perímetro de segurança. Nenhum fornecedor vai fazer esse trabalho por você, porque nenhum fornecedor conhece o seu contrato, o seu cliente e o seu risco.

O código que você escreve hoje carrega decisões que vão além do commit. Vale saber para onde ele vai antes de apertar "aceitar".

## Fontes

- [VS Code Docs: Telemetria](https://code.visualstudio.com/docs/configure/telemetry) - O que é coletado, por evento, e como configurar `telemetry.telemetryLevel`.
- [Microsoft: Privacy Statement](https://privacy.microsoft.com/privacystatement) - Política de privacidade dos produtos, incluindo dados de diagnóstico do VS Code.
- [GitHub Docs: About GitHub Copilot](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot) - Contexto enviado, retenção e uso dos dados de inferência.
- [Lei nº 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) - Tratamento de dados pessoais e transferência internacional.
- [GDPR Info](https://gdpr-info.eu/) - Texto consolidado do regulamento europeu para comparação.
- [mitmproxy](https://mitmproxy.org/) - Proxy para inspecionar o tráfego HTTPS das ferramentas.