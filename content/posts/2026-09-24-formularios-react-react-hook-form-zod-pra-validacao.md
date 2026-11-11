---
title: "Formulários React: React Hook Form + Zod pra validação perfeita"
date: "2026-09-24"
category: "tutorial"
tags: ["react", "forms", "zod", "react-hook-form"]
excerpt: "Formulários React: React Hook Form + Zod para validação perfeita."
share_hook: "Do setup ao multi-step: validação com Zod, mensagens de erro que fazem sentido, upload de arquivos e performance."
cover:
  image: "/covers/2026-09-24-formularios-react-react-hook-form-zod-pra-validacao.jpg"
comments: true
translationKey: "2026-09-24-formularios-react-react-hook-form-zod-pra-validacao"
---

## Formulários React: React Hook Form + Zod para validação perfeita

Criar formulários em aplicações web é uma das tarefas mais comuns e, ao mesmo tempo, desafiadoras para desenvolvedores. Um dos maiores desafios é garantir que as entradas dos usuários sejam válidas e tratadas corretamente. Aqui, vou mostrar como usar o React Hook Form em conjunto com o Zod para criar formulários robustos e com validação de dados eficaz.

## Setup básico

Para começar, precisamos configurar nosso projeto React. Se ainda não tem um projeto, você pode criar um usando o Create React App:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-24-formularios-react-react-hook-form-zod-pra-validacao-1.jpg" alt="Formulários React: React Hook Form + Zod pra validação perfeita" loading="lazy">
<figcaption>Accounting Services HTML form. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AAccounting_request_html_form.png">Accounting request html form.png</a> por Rikulpatel1 — <a href="http://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0</a> · via Wikimedia Commons</figcaption>
</figure>

<figure>
<img src="/covers/2026-09-24-formularios-react-react-hook-form-zod-pra-validacao.jpg" alt="Formulários React: React Hook Form + Zod pra validação perfeita" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

```bash
npx create-react-app meu-formulario
cd meu-formulario
```

Após criar o projeto, instale as dependências necessárias:

```bash
npm install react-hook-form zod @hookform/resolvers
```

Com as dependências instaladas, podemos começar a criar nosso formulário. Abaixo está um exemplo básico de um formulário com campos para nome e email:

```javascript
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
});

const MeuFormulario = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nome:</label>
        <input type="text" {...register('nome')} />
        {errors.nome && <span>{errors.nome.message}</span>}
      </div>
      <div>
        <label>Email:</label>
        <input type="text" {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <button type="submit">Enviar</button>
    </form>
  );
};

export default MeuFormulario;
```

Neste exemplo, criamos um schema usando o Zod que valida se o nome não está vazio e se o email é válido. A função `handleSubmit` do React Hook Form lida com a submissão do formulário e, se houver erros, eles são exibidos abaixo dos campos.

## Validação com Zod

A validação é uma parte crucial de qualquer formulário. Com o Zod, podemos definir regras de validação de maneira clara e concisa. Além de validar se os campos estão preenchidos, podemos adicionar regras mais complexas.

Por exemplo, vamos adicionar uma validação para um campo de senha:

```javascript
const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});
```

Com essa adição, agora o formulário também irá exigir que o usuário crie uma senha com pelo menos 6 caracteres. O gerenciamento de erros continua o mesmo, e os erros de validação serão exibidos da mesma forma.

## Erros bonitos

A experiência do usuário é fundamental. Ao exibir mensagens de erro, precisamos garantir que elas sejam visíveis e intuitivas. Podemos estilizar as mensagens de erro para que se destaquem:


```css
span {
  color: red;
  font-size: 0.8em;
}
```

Com essa adição simples, as mensagens de erro agora aparecem em vermelho, facilitando a identificação dos problemas para o usuário.

## Multi-step forms

Formulários de múltiplas etapas são comuns em muitas aplicações. O React Hook Form facilita a implementação de formulários que são divididos em várias etapas. Vamos considerar um exemplo simples onde o usuário preenche informações básicas em uma etapa e detalhes adicionais em outra.

```javascript
import React, { useState } from 'react';

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    if (step === 1) {
      setStep(2);
    } else {
      console.log(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {step === 1 && (
        <>
          <div>
            <label>Nome:</label>
            <input type="text" {...register('nome')} />
            {errors.nome && <span>{errors.nome.message}</span>}
          </div>
          <div>
            <label>Email:</label>
            <input type="text" {...register('email')} />
            {errors.email && <span>{errors.email.message}</span>}
          </div>
          <button type="submit">Próximo</button>
        </>
      )}
      {step === 2 && (
        <>
          <div>
            <label>Senha:</label>
            <input type="password" {...register('senha')} />
            {errors.senha && <span>{errors.senha.message}</span>}
          </div>
          <button type="submit">Enviar</button>
        </>
      )}
    </form>
  );
};
```

Neste exemplo, usamos um estado para manter o controle da etapa atual. Quando o usuário clica em "Próximo", mudamos para a próxima etapa e, ao final, enviamos os dados do formulário.

## File uploads

Lidar com upload de arquivos é uma funcionalidade que pode ser necessária em muitos formulários. Com o React Hook Form, isso também é simples. Para adicionar um campo de upload de arquivos, podemos fazer o seguinte:

```javascript
const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  arquivo: z.instanceof(File).refine(file => file.size < 5000000, 'O arquivo deve ter menos de 5MB.'),
});
```

Nesse exemplo, adicionamos um campo para arquivos e validamos se o arquivo não excede 5MB. O campo de upload pode ser adicionado ao formulário da seguinte maneira:

```javascript
<div>
  <label>Arquivo:</label>
  <input type="file" {...register('arquivo')} />
  {errors.arquivo && <span>{errors.arquivo.message}</span>}
</div>
```

Não se esqueça de adicionar o atributo `enctype="multipart/form-data"` ao seu formulário, caso esteja lidando com uploads de arquivos.

## Performance

Quando estamos lidando com formulários complexos e extensos, a performance pode se tornar uma preocupação. O React Hook Form é otimizado para lidar com grandes formulários, garantindo que apenas os campos que mudam sejam re-renderizados. Isso proporciona uma experiência mais suave para o usuário.

Além disso, você pode usar a opção `shouldUnregister` na configuração do `useForm` para garantir que os campos não utilizados não sejam mantidos na memória, o que pode ajudar na performance:

```javascript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  shouldUnregister: true,
});
```

## Conclusão

Aqui, exploramos como criar formulários eficientes e robustos em React usando o React Hook Form em combinação com o Zod para validação de dados. Vimos como configurar um formulário básico, implementar validação, tratar erros de forma amigável, criar formulários de múltiplas etapas, gerenciar uploads de arquivos e otimizar a performance.

### Takeaways práticos

- O React Hook Form é uma excelente ferramenta para gerenciamento de formulários.
- O Zod facilita a validação de dados de forma clara e concisa.
- Estilizar mensagens de erro melhora a experiência do usuário.
- Formulários de múltiplas etapas podem ser implementados facilmente com controle de estado.
- A performance do formulário pode ser otimizada com boas práticas.

## Fontes

- [React Hook Form Documentation](https://react-hook-form.com/get-started)
- [Zod Documentation](https://zod.dev/)
- [React Docs: Forms](https://react.dev/learn/forms)
- [MDN Web Docs: Form data](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [React Hook Form GitHub](https://github.com/react-hook-form/react-hook-form)
## 📸 Crédito da imagem de capa
- **Imagem:** [111031-F-ZZ999-102 (6349579508).jpg](https://commons.wikimedia.org/wiki/File%3A111031-F-ZZ999-102_%286349579508%29.jpg)
- **Autor(a):** NATO Training Mission-Afghanistan
- **Licença:** [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) · via Wikimedia Commons
