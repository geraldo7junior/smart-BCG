# SmartBCG

SmartBCG apoia a revisão de portfólios de inovação. O fluxo liga a avaliação dos projetos à decisão do comitê, ao plano de ação e à medição de benefícios. A aplicação usa React e Vite no frontend, FastAPI no backend e SQLite para persistência.

## Abrir a demonstração

Use Python 3.11 ou superior. O pacote inclui o frontend compilado, de modo que Node.js só é necessário para desenvolver ou recompilar a interface.

Na pasta `SmartBCG`, execute:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn smartbcg.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

No Windows PowerShell, use `py -m venv .venv` e `.venv\Scripts\Activate.ps1` para os dois primeiros passos. Abra [SmartBCG](http://127.0.0.1:8000) ou a [documentação OpenAPI](http://127.0.0.1:8000/docs). A demonstração começa com oito projetos sintéticos, sete avaliações, duas decisões e um cenário comparativo.

[Prévia do painel com dados de demonstração](docs/smartbcg-demo.png).

### Roteiro de demonstração

1. Na **Visão geral**, abra um ponto da matriz ou um projeto na tabela.
2. Em **Território 360**, veja como referências pendentes ampliam as faixas dos eixos e permitem mais de um quadrante. Abra a contribuição por critério.
3. Em **Sentinela de Ativos**, compare a sugestão com a decisão divergente do comitê e sua justificativa.
4. Em **Atlas GeoAI**, consulte o plano de ação e o histórico da medição de benefício.
5. Em **Cenários**, abra a comparação pré-carregada e simule outra restrição de orçamento ou horas.
6. Em **Pesquisa**, registre uma sessão de teste e confira as exportações. Use uma base separada antes de iniciar a coleta real.

## Criar a base de pesquisa

A demonstração é inicializada somente em banco sem projetos. Use um arquivo de banco diferente e desative a carga de exemplo.

```bash
SMARTBCG_DEMO=0 SMARTBCG_DB=var/piloto.sqlite3 python -m uvicorn smartbcg.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

No PowerShell, configure `$env:SMARTBCG_DEMO='0'` e `$env:SMARTBCG_DB='var/piloto.sqlite3'` antes de iniciar o servidor. A configuração padrão usa `var/smartbcg.sqlite3`. A edição entregue é de operação local, em uma máquina controlada pela equipe de pesquisa. Os códigos de equipe e avaliador são campos de rastreabilidade declarados pelo operador. Para disponibilizar a aplicação em rede institucional, implemente autenticação e autorização por perfil, HTTPS, limites de requisição e procedimentos institucionais de retenção e backup antes de coletar dados identificáveis. Para cópia local consistente, pare o servidor ou utilize a API de backup do SQLite.

## Desenvolver, compilar e testar

Execute o servidor Python acima. Em outro terminal, use Node 20.19+ ou 22.12+:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run build
```

O Vite serve a interface de desenvolvimento em `http://localhost:5173` e encaminha `/api` ao Python. Depois de recompilar, reinicie o backend se a pasta `frontend/dist` ainda não existia na inicialização.

```bash
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m unittest discover -s tests -v
```

Como alternativa, execute `docker compose up --build` a partir da pasta do projeto. O serviço fica disponível em `http://127.0.0.1:8000`, com persistência em volume Docker.

## Origem e decisões de implementação

| Material recebido | Uso nesta versão |
| --- | --- |
| `app_hoshin.zip` | Protótipo Express com três dimensões e posição baseada em mercado e concorrência. O JSON pode ser importado como arquivo de origem. |
| `poc-hoshin.zip` | Amplia o questionário a dez dimensões e conserva mercado e concorrência como coordenadas do gráfico. O importador preserva os campos da versão ampliada. |
| `Hoshin_BCG.ipynb` | Oferece escala ordinal, quatro quadrantes e recomendações. O notebook combina médias de grupos para crescimento e participação e usa valor 3 como fallback de respostas fora do dicionário. A implementação usa notas numéricas validadas, registra omissões e as expõe na análise de sensibilidade. |
| Artigo SmartBCG fornecido | Fundamenta os dois eixos adaptados, médias ponderadas e ações de evolução. O catálogo, os pesos e a regra de sensibilidade são escolhas explícitas da versão `smartbcg-1.0`, sujeitas a calibração. |

A importação em **Pesquisa → Arquivo Hoshin** aceita o `data.json` dos dois protótipos, preserva os campos originais e deduplica linhas idênticas. Os registros ficam no arquivo de origem. Para trazer uma iniciativa à carteira atual, cadastre o projeto e avalie-o com os novos critérios. Os eixos e questionários têm significados diferentes entre as versões.

O backend usa transações para criar avaliações, decisões, eventos do plano e medições. Avaliações e decisões são registros com identidade própria. Alterações no cadastro não reescrevem o snapshot de uma avaliação anterior. O SQLite foi escolhido para facilitar a instalação e isolar bancos de experimentos. O artigo fornecido descreve outra implementação com MongoDB.

## Como interpretar as análises

- **Matriz.** Escala 1–5. Cada eixo usa média ponderada de cinco critérios, com pesos 3, 2, 2, 2 e 1 documentados na ficha e na API. O valor 3 é o corte de referência. Valores iguais ao corte pertencem ao lado alto.
- **Evidência e sensibilidade.** Nota ausente recebe 3 na posição nominal. Critérios sem referência textual variam de 1 a 5 no cálculo dos extremos. Critérios com referência usam a nota informada nos dois extremos. O sistema registra a presença da referência. A verificação de sua qualidade ou autenticidade é responsabilidade dos avaliadores. Os intervalos são limites determinísticos sob as premissas declaradas.
- **Recomendação.** O quadrante indica investir, validar, sustentar ou reposicionar. A distância usa a norma euclidiana do déficit até os limiares de Estrela. Até três ações priorizam referências faltantes e lacunas ponderadas. O comitê pode selecionar uma alternativa, justificar sua escolha e registrar a próxima revisão. Se usar um cenário salvo, pode vincular a decisão à simulação que empregou exatamente aquela avaliação.
- **Cenários.** Cada política combina as notas dos limites inferiores dos dois eixos, subtraindo 1 antes da ponderação. A busca exata maximiza a soma do valor conservador, respeitando orçamento e horas. Usa centavos inteiros e aceita até 18 projetos elegíveis por cenário. O desempate favorece menor custo, menos horas e, depois, ordem dos identificadores. Os limiares alteram o diagnóstico do quadrante. A carteira é influenciada pelos pesos dos eixos, pelas restrições e pela exigência de evidência completa. A versão calcula a soma de contribuições individuais, sem modelar dependências entre projetos ou reservar capacidade para projetos exploratórios. Esses casos devem ser discutidos na deliberação.
- **Benefícios.** O progresso é `(último valor − linha de base) / (meta − linha de base)`. O cálculo aceita metas de aumento ou redução e indica retrocesso ou ultrapassagem da meta. A observação mais recente segue a data de medição. O indicador documenta a trajetória, com interpretação causal dependente do desenho de pesquisa.
- **Exportação.** O JSON fornece snapshots e vínculos por identificador. Por padrão, exclui a demonstração, cenários que a utilizaram e vários campos textuais sensíveis. O CSV traz sessões do estudo e omite justificativas por padrão. Use códigos pseudonimizados e revise domínios, unidades, códigos e qualquer texto incluído antes de compartilhar. A exportação com justificativas destina-se à análise em ambiente controlado.

O [protocolo de avaliação](docs/protocolo-ijmpb.md) descreve o desenho empírico e a ligação com a chamada da Emerald. A [rubrica em CSV](docs/rubrica-cega.csv) permite coletar avaliações cegas em planilha.
