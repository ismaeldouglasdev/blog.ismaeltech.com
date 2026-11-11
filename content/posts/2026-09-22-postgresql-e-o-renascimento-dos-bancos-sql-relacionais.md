---
title: "PostgreSQL e o renascimento dos bancos SQL relacionais"
date: "2026-09-22"
category: "curiosidade"
tags: ["postgresql", "database", "tendencias"]
excerpt: "PostgreSQL e o renascimento dos bancos SQL: JSON nativo, extensions como pgvector e PostGIS, e por que o SQL voltou a vencer o NoSQL."
share_hook: "De NoSQL de volta a SQL: JSON nativo, extensões como pgvector e PostGIS, e por que o PostgreSQL ganhou de novo."
cover:
  image: "/covers/2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais.jpg"
comments: true
translationKey: "2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais"
---

## Introdução
A escolha do banco de dados certo é crucial para qualquer projeto de desenvolvimento de software. Nos últimos anos, temos visto um aumento significativo no uso de bancos de dados NoSQL, que prometem maior flexibilidade e escalabilidade em comparação com os tradicionais bancos de dados relacionais. No entanto, com o passar do tempo, muitos desenvolvedores começaram a perceber as limitações dos bancos de dados NoSQL e a valorizar a robustez e a consistência dos bancos de dados relacionais, como o PostgreSQL. Aqui, vou mostrar o renascimento dos bancos de dados SQL relacionais, com foco no PostgreSQL e suas funcionalidades que o tornam uma escolha atraente para muitos projetos.

## A Era NoSQL (2010-2018)
No início dos anos 2010, os bancos de dados NoSQL começaram a ganhar popularidade devido à sua capacidade de lidar com grandes volumes de dados não estruturados e à sua escalabilidade horizontal. Muitos desenvolvedores e empresas adotaram bancos de dados NoSQL, como MongoDB, Cassandra e Redis, para seus projetos. No entanto, com o tempo, muitos começaram a perceber as limitações dos bancos de dados NoSQL, como a falta de suporte a transações ACID, a complexidade na modelagem de dados e a dificuldade em realizar consultas complexas.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais-1.jpg" alt="PostgreSQL e o renascimento dos bancos SQL relacionais" loading="lazy">
<figcaption>Recurcive CTEs (Common Table Expressions) are a powerful construct within PostgreSQL, it defined in the WITH clause. CTEs allows to work with temporary set of d. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ARECURSIVE_%2843321721355%29.jpg">RECURSIVE (43321721355).jpg</a> por Exey Panteleev from Moscow, Russia — <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a> · via Wikimedia Commons</figcaption>
</figure>

## O Virar de Chave
Em meados dos anos2010, começou a ocorrer um movimento de volta aos bancos de dados relacionais. Isso se deveu, em parte, ao fato de que muitos desenvolvedores e empresas começaram a perceber as vantagens dos bancos de dados relacionais, como a consistência dos dados, a suporte a transações ACID e a capacidade de realizar consultas complexas. Além disso, os bancos de dados relacionais começaram a evoluir e a incorporar funcionalidades que permitiam lidar com grandes volumes de dados e escalar horizontalmente.

## JSON Nativo no PostgreSQL
Uma das funcionalidades que tornou o PostgreSQL mais atraente foi a adição do suporte a JSON nativo. Isso permitiu que os desenvolvedores armazenem e consultem dados em formato JSON de forma eficiente e flexível. Por exemplo, é possível armazenar um objeto JSON em uma coluna de uma tabela e realizar consultas sobre ele usando a sintaxe SQL padrão. Isso é especialmente útil em projetos que lidam com dados não estruturados ou semi-estruturados.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais-2.jpg" alt="PostgreSQL e o renascimento dos bancos SQL relacionais" loading="lazy">
<figcaption>db postgresql perf. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ADb_postgresql.png">Db postgresql.png</a> por Vk2410 — <a href="http://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0</a> · via Wikimedia Commons</figcaption>
</figure>
```sql
CREATE TABLE meus_dados (
    id SERIAL PRIMARY KEY,
    dados JSONB
);

INSERT INTO meus_dados (dados) VALUES ('{"nome": "João", "idade": 30}');

SELECT * FROM meus_dados WHERE dados @> '{"nome": "João"}';
```

## Extensions
O PostgreSQL também oferece uma variedade de extensions que podem ser usadas para adicionar funcionalidades ao banco de dados. Por exemplo, a extension `pgvector` permite que os desenvolvedores realizem operações de processamento de linguagem natural sobre os dados, enquanto a extension `PostGIS` permite que os desenvolvedores realizem operações geoespaciais sobre os dados. Além disso, a extension `pg_cron` permite que os desenvolvedores agendem tarefas para serem executadas periodicamente.

```sql
CREATE EXTENSION IF NOT EXISTS pgvector;

CREATE TABLE meus_dados (
    id SERIAL PRIMARY KEY,
    texto TEXT
);

INSERT INTO meus_dados (texto) VALUES ('Este é um exemplo de texto');

SELECT * FROM meus_dados WHERE texto % 'exemplo';
```

## Supabase e PlanetScale
Recentemente, surgiram novas soluções que permitem que os desenvolvedores usem o PostgreSQL como um serviço de backend, sem a necessidade de gerenciar a infraestrutura. Por exemplo, o Supabase é uma plataforma que oferece um serviço de backend baseado em PostgreSQL, com suporte a autenticação, autorização e APIs RESTful. Já o PlanetScale é uma plataforma que oferece um serviço de banco de dados baseado em PostgreSQL, com suporte a escalabilidade horizontal e replicação de dados.

## SQL Ganhou de Volta
Com o renascimento dos bancos de dados relacionais, o SQL voltou a ser uma habilidade fundamental para os desenvolvedores. O SQL é uma linguagem de consulta padrão que permite que os desenvolvedores realizem operações sobre os dados de forma eficiente e flexível. Além disso, o SQL é uma linguagem que é amplamente suportada por muitos bancos de dados relacionais, o que torna mais fácil a migração entre diferentes bancos de dados.

## Conclusão
Resumindo, o PostgreSQL é um banco de dados relacional que oferece muitas funcionalidades atraentes para os desenvolvedores. Com o suporte a JSON nativo, extensions e soluções de backend como o Supabase e o PlanetScale, o PostgreSQL é uma escolha atraente para muitos projetos. Além disso, o SQL é uma habilidade fundamental para os desenvolvedores que trabalham com bancos de dados relacionais. Aqui estão alguns takeaways práticos para os desenvolvedores que estão considerando usar o PostgreSQL:

* Use o PostgreSQL como um banco de dados relacional para armazenar e consultar dados de forma eficiente e flexível.
* Use o suporte a JSON nativo para armazenar e consultar dados em formato JSON.
* Use extensions como `pgvector` e `PostGIS` para adicionar funcionalidades ao banco de dados.
* Use soluções de backend como o Supabase e o PlanetScale para usar o PostgreSQL como um serviço de backend.
* Aprenda SQL para realizar operações sobre os dados de forma eficiente e flexível.

## Fontes
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.io/docs)
- [PlanetScale Documentation](https://planetscale.com/docs)
- [pgvector GitHub Repository](https://github.com/pgvector/pgvector)
- [PostGIS GitHub Repository](https://github.com/postgis/postgis)

## 📸 Crédito da imagem de capa
- **Imagem:** [Data center infrastructure in the United States.jpg](https://commons.wikimedia.org/wiki/File%3AData_center_infrastructure_in_the_United_States.jpg)
- **Autor(a):** DOE/National Renewable Energy Laboratory
- **Licença:** [Public domain](https://en.wikipedia.org/wiki/Public_domain) · via Wikimedia Commons
