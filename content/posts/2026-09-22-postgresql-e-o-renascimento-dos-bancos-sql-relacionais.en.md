---
title: "PostgreSQL and the Resurgence of Relational SQL Databases"
date: "2026-09-22"
category: "curiosidade"
tags: ["postgresql", "database", "tendencias"]
excerpt: "PostgreSQL and the revival of SQL databases: native JSON, extensions like pgvector and PostGIS, and why SQL beat NoSQL again."
share_hook: "Native JSON, pgvector, PostGIS - why SQL won again."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais.jpg"
comments: true
translationKey: "2026-09-22-postgresql-e-o-renascimento-dos-bancos-sql-relacionais"
---

## Introduction
Generally, the choice of the right database is crucial for any software development project. In recent years, we have seen a significant increase in the use of NoSQL databases, which promise greater flexibility and scalability compared to traditional relational databases. However, over time, many developers have begun to realize the limitations of NoSQL databases and appreciate the robustness and consistency of relational databases, such as PostgreSQL. Here, I will demonstrate the resurgence of relational SQL databases, with a focus on PostgreSQL and its functionalities that make it an attractive choice for many projects.

---
## The NoSQL Era (2010-2018)
Generally, at the beginning of the 2010s, NoSQL databases started to gain popularity due to their ability to handle large volumes of unstructured data and their horizontal scalability. Many developers and companies adopted NoSQL databases, such as MongoDB, Cassandra, and Redis, for their projects. However, over time, many began to realize the limitations of NoSQL databases, such as the lack of support for ACID transactions, the complexity in data modeling, and the difficulty in performing complex queries.

---
## The Turning Point
In the mid-2010s, a movement back to relational databases began to occur. This was due, in part, to the fact that many developers and companies started to realize the advantages of relational databases, such as data consistency, support for ACID transactions, and the ability to perform complex queries. Additionally, relational databases began to evolve and incorporate functionalities that allowed them to handle large volumes of data and scale horizontally.

---
## Native JSON in PostgreSQL
Generally, one of the features that made PostgreSQL more attractive was the addition of native JSON support. This allowed developers to store and query data in JSON format efficiently and flexibly. For example, it is possible to store a JSON object in a column of a table and perform queries on it using standard SQL syntax. This is especially useful in projects that deal with unstructured or semi-structured data.

```sql
CREATE TABLE meus_dados (
    id SERIAL PRIMARY KEY,
    dados JSONB
);

INSERT INTO meus_dados (dados) VALUES ('{"nome": "JoÃ£o", "idade": 30}');

SELECT * FROM meus_dados WHERE dados @> '{"nome": "JoÃ£o"}';
```

---
## Extensions
Generally, PostgreSQL also offers a variety of extensions that can be used to add functionalities to the database. For example, the `pgvector` extension allows developers to perform natural language processing operations on the data, while the `PostGIS` extension allows developers to perform geospatial operations on the data. Additionally, the `pg_cron` extension allows developers to schedule tasks to be executed periodically.

```sql
CREATE EXTENSION IF NOT EXISTS pgvector;

CREATE TABLE meus_dados (
    id SERIAL PRIMARY KEY,
    texto TEXT
);

INSERT INTO meus_dados (texto) VALUES ('Este Ã© um exemplo de texto');

SELECT * FROM meus_dados WHERE texto % 'exemplo';
```

---
## Supabase and PlanetScale
Recently, new solutions have emerged that allow developers to use PostgreSQL as a backend service, without the need to manage the infrastructure. For example, Supabase is a platform that offers a backend service based on PostgreSQL, with support for authentication, authorization, and RESTful APIs. Meanwhile, PlanetScale is a platform that offers a database service based on PostgreSQL, with support for horizontal scalability and data replication.

## SQL Has Won Back
Generally, with the resurgence of relational databases, SQL has become a fundamental skill for developers once again. SQL is a standard query language that allows developers to perform operations on data in an efficient and flexible manner. Additionally, SQL is a language that is widely supported by many relational databases, which makes migration between different databases easier.

---
## Conclusion
Resuming, PostgreSQL is a relational database that offers many attractive features for developers. With native JSON support, extensions, and backend solutions like Supabase and PlanetScale, PostgreSQL is an attractive choice for many projects. Additionally, SQL is a fundamental skill for developers working with relational databases. Here are some practical takeaways for developers considering using PostgreSQL:
* Use PostgreSQL as a relational database to store and query data efficiently and flexibly.
* Use native JSON support to store and query data in JSON format.
* Use extensions like `pgvector` and `PostGIS` to add functionalities to the database.
* Use backend solutions like Supabase and PlanetScale to use PostgreSQL as a backend service.
* Learn SQL to perform operations on data efficiently and flexibly.

## Sources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.io/docs)
- [PlanetScale Documentation](https://planetscale.com/docs)
- [pgvector GitHub Repository](https://github.com/pgvector/pgvector)
- [PostGIS GitHub Repository](https://github.com/postgis/postgis)
## 📸 Cover image credit
- **Image:** [Data center infrastructure in the United States.jpg](https://commons.wikimedia.org/wiki/File%3AData_center_infrastructure_in_the_United_States.jpg)
- **Author:** DOE/National Renewable Energy Laboratory
- **License:** [Public domain](https://en.wikipedia.org/wiki/Public_domain) · via Wikimedia Commons
