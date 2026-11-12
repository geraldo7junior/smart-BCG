# Protocolo de avaliação do SmartBCG

Documento de planejamento para validação com gestores de portfólio.

## Pergunta e contribuição

**Como explicitar a qualidade das evidências, a sensibilidade do diagnóstico e as divergências do comitê afeta a qualidade e a rastreabilidade das decisões de investimento em portfólios de PD&I?**

Use a versão anterior do SmartBCG como ponto de partida para o diagnóstico por quadrantes. Investigue como a análise de sensibilidade e a trilha de governança mudam o comportamento decisório em contextos distintos. O mecanismo a testar é se explicitar as premissas da classificação ajuda gestores a identificar lacunas, distinguir discordância justificada de inconsistência e definir o próximo passo. A unidade principal é a decisão em um caso, com observações aninhadas em participantes e casos.

| Tema da edição especial | Mecanismo no artefato | Evidência que precisa ser coletada |
| --- | --- | --- |
| Decisões orientadas por dados | Sensibilidade do quadrante e cenários sob restrições | Qualidade da decisão pela rubrica, duração e sensibilidade a evidências críticas |
| Governança e responsabilização | Decisão humana ligada à recomendação e à justificativa | Divergências com justificativa adequada, completude da trilha e registro de responsável e prazo |
| Realização de benefícios | Linha de base, meta e medições datadas | Frequência de medição, ações concluídas no prazo e distância à meta no piloto |

## Desenho empírico

1. **Calibração e teste de materiais.** Faça uma rodada com gestores de GeoInt e IA Industrial para revisar critérios, âncoras e pesos. Prepare dossiês anonimizados comparáveis em dificuldade, alguns com evidência incompleta ou conflitante. Tenha variantes equivalentes para evitar repetição do mesmo caso por participante. Congele a versão do software, do catálogo, dos dossiês e do protocolo antes da coleta principal. Defina tamanho da amostra com base no efeito mínimo relevante e na variabilidade observada no piloto.
2. **Experimento com três condições.** A condição **manual** usa o dossiê e o procedimento usual. A condição **matriz estruturada** usa o mesmo dossiê, a mesma ficha de critérios e a matriz nominal, com formulário de decisão equivalente. A condição **SmartBCG completo** expõe o diagnóstico nominal, a sensibilidade, os cenários e a trilha de decisão. Distribua os participantes entre as seis ordens possíveis com balanceamento por perfil quando viável. Rotacione casos entre condições e períodos para reduzir confundimento por ordem, aprendizagem e dificuldade.
3. **Instrumentação.** Controle a exposição aos materiais externamente. Use arquivos separados para as condições manual e matriz, ou sessões supervisionadas. A tela Pesquisa registra condição, versão do caso, período, duração, decisão, justificativa e confiança por código de participante. A ferramenta opera como ficha do pesquisador. Use um relógio externo ou o cronômetro no formulário e aplique o mesmo ponto de início e fim em todas as condições. Padronize o formato de entrega e registre interrupções em controle próprio.
4. **Qualidade e cegamento.** Antes da coleta, dois avaliadores independentes definem referências de correção por caso, com múltiplas decisões aceitáveis quando sustentadas. Colete a saída padronizada com decisão, evidências citadas, raciocínio, restrições, responsável e revisão. Distribua versões sem indicação de condição, identidade, tempo ou elementos visuais que revelem a interface. Use a mesma rubrica em todas as condições. Avalie separadamente viabilidade e qualidade da justificativa. Guarde as duas notas originais e documente a regra de resolução de divergências.
5. **Uso em contexto real.** Execute um piloto prospectivo em comitês reais com ciclos pré-definidos. Observe quem fornece e verifica evidências, quando o diagnóstico é contestado, quando a decisão é reaberta e quais indicadores são realmente medidos. Entreviste gestores e sintetize mecanismos de adoção, resistência e confiança excessiva, incluindo cenários de dados incompletos. Compare contextos conforme acesso e reporte o número de organizações e ciclos. Interprete o acompanhamento de benefícios como longitudinal e descritivo quando não houver comparação causal adequada.

## Medidas e análise

| Medida | Operacionalização |
| --- | --- |
| Qualidade da decisão, desfecho primário proposto | Soma de quatro itens de 0 a 2, avaliada às cegas. Use o contraste principal SmartBCG completo versus matriz estruturada. O contraste com manual ajuda a investigar o efeito de estruturar a avaliação. |
| Tempo de decisão | Segundos desde a abertura do material até a entrega da decisão. Reporte distribuição, efeito e intervalo de confiança. |
| Rastreabilidade | Proporção de decisões que identificam fontes críticas e ligam a evidência à ação. Trate ausência de justificativa em um artefato externo como dado observável e registre a regra de tratamento. |
| Divergência do comitê | Fração das decisões que divergem da sugestão nas situações em que ela foi apresentada. Classifique as justificativas em categorias pré-definidas, como restrição de capacidade, evidência conflitante ou prioridade institucional. |
| Confiança e excesso de confiança | Confiança declarada de 1 a 5 comparada com qualidade cega da decisão. O julgamento do especialista é uma medida de percepção e referência contextual. |
| Benefícios e execução | Ações concluídas no prazo, proporção de indicadores com medição na data prevista e progresso da linha de base até a meta por período. |

### Rubrica cega, 0 a 8

| Item | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Evidências | Sem suporte pertinente | Cita evidência pertinente com vínculo incompleto | Relaciona evidências críticas à escolha e identifica limitações |
| Coerência e restrições | Escolha incompatível com restrições ou objetivo | Coerente, com restrição relevante insuficientemente discutida | Justifica a escolha e suas alternativas respeitando restrições e objetivo |
| Tratamento da incerteza | Ignora incerteza material | Reconhece incerteza sem resposta operacional | Liga incerteza a teste, condição de revisão ou decisão reversível |
| Execução e revisão | Sem responsável e revisão identificáveis | Define responsável ou revisão | Define responsável, prazo e critério verificável de revisão |

Use `rubrica-cega.csv` como ficha de avaliação. Gere códigos cegos por resposta e guarde a chave de ligação em ambiente restrito. Calcule concordância entre avaliadores antes da adjudicação, por exemplo kappa ponderado por item. Estime efeitos com intervalos e leve em conta o pareamento por participante e a variação entre casos e períodos. Uma alternativa é modelar condição e período como efeitos fixos e participante e caso como efeitos aleatórios, se tamanho amostral e desenho permitirem. Defina contraste, exclusões, tratamento de dados ausentes e correção para múltiplas comparações antes de abrir os resultados. Com amostra exploratória, use efeitos descritivos e incerteza, com interpretação compatível com o desenho.

A comparação histórica descrita no artigo fornecido pode motivar hipóteses. Os resultados reportados ali não foram reestimados nesta implementação. Evite tratar ausência de diferença significativa como demonstração de equivalência. Escolha previamente a margem e o teste adequado se a equivalência fizer parte da pergunta. Dados de demonstração servem para verificar o software e preparar o estudo.

## Operação e material de pesquisa

- Guarde códigos de participante, organização e caso em chaves controladas. Conduza coleta com os consentimentos e procedimentos institucionais aplicáveis ao estudo.
- Use bancos separados para treinamento e coleta. Preserve o JSON versionado, o CSV de sessões, as fichas cegas, a chave de ligação, o dicionário de variáveis e os arquivos de análise sob as permissões autorizadas.
- Investigue as limitações do apoio analítico quando houver evidência textual fraca, dependências entre projetos, penalização de iniciativas exploratórias ou objetivos em conflito.
- Se o trabalho de SBES tiver sido publicado, cite a versão anterior, declare sobreposição material e identifique o novo artefato, os dados inéditos e a contribuição de gestão de projetos. Consulte a política de originalidade da Emerald e escreva o manuscrito em autoria própria.

## Referências de partida

- [Chamada da Emerald, versão integral](https://doi.org/10.1108/ijmpb-05-2026-460). Manuscritos até **31 de janeiro de 2027**. Resumo estendido e workshop são recomendados e opcionais.
- [Killen (2017), decisões de portfólio e representações visuais](https://doi.org/10.1108/IJMPB-01-2017-0003). Precedente no próprio periódico para experimento de qualidade decisória com diferentes formas de apresentar informação.
- [Martinsuo e Killen (2014), valor estratégico em portfólios](https://doi.org/10.1002/pmj.21452). Base para tratar valor e seu julgamento como multidimensionais.
- [Venable, Pries-Heje e Baskerville (2016), FEDS](https://doi.org/10.1057/ejis.2014.36). Orientação para combinar avaliação artificial controlada e avaliação naturalística do artefato.
- [Diretrizes de autores da Emerald](https://www.emerald.com/journals/author-guidance/1627/Emerald-Publishing-Author-Guidelines) e [política de ética editorial](https://www.emerald.com/publish-with-us/pages/publication-ethics).
