---
title: "React Forms: Perfect Validation with React Hook Form + Zod"
date: "2026-09-24"
category: "tutorial"
tags: ["react", "forms", "zod", "react-hook-form"]
excerpt: "React Forms: React Hook Form + Zod for Effortless Validation."
share_hook: "Validation, error messages, multi-step forms and performance."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-24-formularios-react-react-hook-form-zod-pra-validacao.jpg"
comments: true
translationKey: "2026-09-24-formularios-react-react-hook-form-zod-pra-validacao"
---

## React Forms: React Hook Form + Zod for Seamless Validation

Building forms in web applications is one of the most common and, at the same time, challenging tasks for developers. One of the biggest challenges is ensuring that user inputs are valid and handled correctly. Here, I will show you how to use React Hook Form alongside Zod to build robust forms with effective data validation.

## Basic setup

To get started, we need to set up our React project. If you do not have a project yet, you can create one using Create React App:

```bash
npx create-react-app meu-formulario
cd meu-formulario
```

After creating the project, install the required dependencies:

```bash
npm install react-hook-form zod @hookform/resolvers
```

With the dependencies installed, we can start building our form. Below is a basic example of a form with fields for name and email:

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

In this example, we create a schema using Zod that checks whether the name is not empty and whether the email is valid. The `handleSubmit` function from React Hook Form handles form submission and, if there are errors, they are displayed below the fields.

## Validation with Zod

Validation is a crucial part of any form. With Zod, we can define validation rules in a clear and concise way. In addition to validating whether fields are filled out, we can add more complex rules.

For example, let's add validation for a password field:

```javascript
const schema = z.object({
  nome: z.string().min(1, 'Nome Ã© obrigatÃ³rio.'),
  email: z.string().email('Email invÃ¡lido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});
```

With this addition, the form will now also require the user to create a password with at least 6 characters. Error management remains the same, and validation errors will be displayed in the same way.

## Pretty errors

User experience is essential. When displaying error messages, we need to ensure that they are visible and intuitive. We can style error messages so that they stand out:

```css
span {
  color: red;
  font-size: 0.8em;
}
```

With this simple addition, error messages now appear in red, making it easier for users to identify issues.

## Multi-step forms

Multi-step forms are common in many applications. React Hook Form makes it easy to implement forms that are divided into multiple steps. Let's consider a simple example where the user fills in basic information in one step and additional details in another.

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

In this example, we use state to keep track of the current step. When the user clicks "Next", we advance to the next step and, at the end, submit the form data.

## File uploads

Handling file uploads is a feature that may be required in many forms. With React Hook Form, this is also simple. To add a file upload field, we can do the following:

```javascript
const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  arquivo: z.instanceof(File).refine(file => file.size < 5000000, 'O arquivo deve ter menos de 5MB.'),
});
```

In this example, we add a field for files and validate that the file does not exceed 5MB. The upload field can be added to the form as follows:

```javascript
<div>
  <label>Arquivo:</label>
  <input type="file" {...register('arquivo')} />
  {errors.arquivo && <span>{errors.arquivo.message}</span>}
</div>
```

Do not forget to add the `enctype="multipart/form-data"` attribute to your form if you are handling file uploads.

## Performance

When dealing with complex and extensive forms, performance can become a concern. React Hook Form is optimized to handle large forms, ensuring that only the fields that change are re-rendered. This provides a smoother user experience.

Additionally, you can use the `shouldUnregister` option in the `useForm` configuration to ensure that unused fields are not kept in memory, which can help with performance:

```javascript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  shouldUnregister: true,
});
```

## Conclusion

Here, we explored how to build efficient and robust forms in React using React Hook Form combined with Zod for data validation. We covered how to set up a basic form, implement validation, handle errors in a user-friendly way, create multi-step forms, manage file uploads, and optimize performance.

### Key Takeaways

- React Hook Form is an excellent tool for form management.
- Zod makes data validation easy, clear, and concise.
- Styling error messages improves the user experience.
- Multi-step forms can be easily implemented with state management.
- Form performance can be optimized using best practices.

## Sources

- [React Hook Form Documentation](https://react-hook-form.com/get-started)
- [Zod Documentation](https://zod.dev/)
- [React Docs: Forms](https://react.dev/learn/forms)
- [MDN Web Docs: Form data](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [React Hook Form GitHub](https://github.com/react-hook-form/react-hook-form)
## 📸 Cover image credit
- **Image:** [111031-F-ZZ999-102 (6349579508).jpg](https://commons.wikimedia.org/wiki/File%3A111031-F-ZZ999-102_%286349579508%29.jpg)
- **Author:** NATO Training Mission-Afghanistan
- **License:** [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) · via Wikimedia Commons
