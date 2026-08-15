# Como adicionar imagens de produtos direto no repositório

Guia rápido pra quem for alimentar o catálogo. Não precisa de link do Google
Drive, nem mexer no Apps Script — só subir o arquivo da foto no lugar certo,
com o nome certo.

## Como funciona

Cada produto tem um `id` na planilha (ex: `mesa-tijuca`). Se a coluna
`imagem_capa` estiver **em branco**, o site procura sozinho uma foto chamada
exatamente `mesa-tijuca.jpg` dentro da pasta `imagens/produtos/` do
repositório. Ou seja: **o nome do arquivo é o link.**

```
seu-repositorio/
├── index.html
├── styles.css
├── script.js
└── imagens/
    └── produtos/
        ├── mesa-tijuca.jpg
        ├── cadeira-ergonomica-tela.jpg
        └── cadeira-florenca-presidente.jpg
```

---

## Passo a passo — foto de capa

### 1. Prepare a foto
- Formato **.jpg**
- Largura recomendada: até **1200px** (maior que isso só deixa o site mais
  lento, sem ganho visual). Se a foto veio direto do celular, provavelmente
  está bem maior que o necessário — dá pra redimensionar de graça em
  [squoosh.app](https://squoosh.app) ou no próprio editor de fotos do
  computador/celular.
- Tente manter o arquivo abaixo de **300–500 KB**.

### 2. Nomeie o arquivo com o `id` do produto
O nome do arquivo precisa ser **idêntico** ao `id` da linha na planilha, mais
`.jpg` no final.

| `id` na planilha | nome do arquivo |
|---|---|
| `mesa-tijuca` | `mesa-tijuca.jpg` |
| `cadeira-ergonomica-tela` | `cadeira-ergonomica-tela.jpg` |
| `armario-alto` | `armario-alto.jpg` |

Regras do nome:
- Tudo minúsculo
- Sem espaço (use hífen: `mesa-tijuca`, não `mesa tijuca`)
- Sem acento (`armario`, não `armário`)
- Sem caractere especial (`/`, `?`, `&`, etc.)

### 3. Suba o arquivo pro repositório (GitHub)
1. Abra o repositório do site no GitHub.
2. Entre na pasta `imagens/produtos/`.
   - Se a pasta ainda não existe: clique em **Add file > Create new file**,
     e no campo de nome digite `imagens/produtos/.gitkeep` — o GitHub cria
     as duas pastas automaticamente ao digitar o caminho. Salve (Commit).
     Depois disso a pasta já aparece normalmente pra próxima etapa.
3. Clique em **Add file > Upload files**.
4. Arraste o `.jpg` (já nomeado corretamente) pra dentro da área de upload.
5. Role até o final da página e clique em **Commit changes**.

### 4. Deixe a coluna `imagem_capa` em branco na planilha
Não precisa colar nada ali — se estiver vazia, o site já sabe onde procurar.

---

## Passo a passo — fotos extras (galeria, opcional)

Nem todo produto precisa; use só quando quiser mostrar mais de um ângulo no
"Ver Fotos".

1. Nomeie as fotos extras com um número depois do `id`, ex:
   `mesa-tijuca-2.jpg`, `mesa-tijuca-3.jpg`.
2. Suba pra mesma pasta `imagens/produtos/` (passo a passo acima).
3. Na planilha, na coluna `imagem_galeria` **dessa linha**, cole os caminhos
   separados por vírgula:
   ```
   imagens/produtos/mesa-tijuca-2.jpg, imagens/produtos/mesa-tijuca-3.jpg
   ```
   (Diferente da capa, a galeria não é automática — precisa listar aqui.)

---

## Trocar ou atualizar uma foto depois

Suba o novo arquivo com o **mesmo nome** de antes e confirme o commit — o
GitHub substitui o anterior. Nada muda na planilha.

## Se a imagem não aparecer no site, confira nessa ordem

1. O nome do arquivo bate **exatamente** com o `id` da planilha? (minúsculo,
   hífen, sem acento, terminando em `.jpg`)
2. O arquivo está dentro de `imagens/produtos/` (e não solto na raiz do
   repositório, ou em outra pasta)?
3. O `Commit changes` foi mesmo confirmado no GitHub?
4. A coluna `imagem_capa` dessa linha está realmente vazia (sem espaço em
   branco "invisível" digitado nela)?
5. Se estiver usando GitHub Pages, pode levar 1–2 minutos pra publicar depois
   do commit — dá um tempo e recarrega a página.

## Quando usar link do Drive em vez de arquivo local

A coluna `imagem_capa` continua aceitando um link do Google Drive se for mais
prático em algum caso pontual (o `catalog.js` converte o link automaticamente
pro formato que funciona publicamente). Pra uso normal do catálogo, arquivo
local é mais confiável — não depende de permissão de compartilhamento nem
tem risco de limite de acesso do Google.
