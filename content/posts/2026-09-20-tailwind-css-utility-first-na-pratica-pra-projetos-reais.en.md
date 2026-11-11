---
title: "Tailwind CSS: Utility-First in Practice for Real Projects"
date: "2026-09-20"
category: "tutorial"
tags: ["tailwind", "css", "frontend"]
excerpt: "Tailwind CSS in practice: why utility-first speeds up development, from Vite setup to dark mode and production optimization."
share_hook: "Vite setup to dark mode and production optimization."
cover:
  image: "/covers/2026-09-20-tailwind-css-utility-first-na-pratica-pra-projetos-reais.jpg"
comments: true
translationKey: "2026-09-20-tailwind-css-utility-first-na-pratica-pra-projetos-reais"
---


How many times have you spent hours naming CSS classes, only to discover that your `button-primary-large-rounded` doesn't work for the button that needs to be "almost primary, but slightly smaller"? Traditional CSS forces us to think in abstractions before we even understand what we're building.

Tailwind CSS flips this logic. Instead of creating premature CSS components, you build interfaces directly in HTML using atomic utilities. It seems chaotic at first, but in practice it's much more predictable than systems based on complex CSS components.

## The real problem with traditional CSS

Component-based CSS looks elegant on paper. You create `.card`, `.button`, `.header` and reuse them throughout the application. The problem arises when the product evolves. That `.button` needs a variation with less padding. The `.card` needs to work without shadow in some places. You add modifiers: `.button--small`, `.card--flat`.

Six months later, you have a 2000-line CSS file with complex hierarchies and specificity that no one can debug. Worse: you're afraid to remove rules because you don't know where they might be being used.

With utility-first, each class does exactly one thing. `p-4` always adds `padding: 1rem`. `text-center` always centers text. No surprises, no unexpected cascade.

## Vite Setup: starting from scratch

Vite has made Tailwind setup almost trivial. In a new React project:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-20-tailwind-css-utility-first-na-pratica-pra-projetos-reais-1.jpg" alt="Tailwind CSS: Utility-First in Practice for Real Projects" loading="lazy">
<figcaption>Chataropica is a web-based instant messaging platform accessible at aedtpworld.com/chat, developed by AEDTP World. Built with PHP and Tailwind CSS, it is design. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AChataropica.png">Chataropica.png</a> por Uhvhhvjhh — <a href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

```bash
npm create vite@latest meu-projeto -- --template react-ts
cd meu-projeto
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

In `tailwind.config.js`, configure the content to purge unused classes:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

In `src/index.css`, import the Tailwind layers:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Done. You have access to hundreds of utility classes without additional configuration.

## Responsive design: mobile-first that works

Tailwind uses mobile-first breakpoints. Classes without prefixes apply to all sizes. Prefixes like `md:` and `lg:` override for larger screens.

```jsx
function ProductCard({ product }) {
  return (
    <div className="
      p-4 
      bg-white 
      rounded-lg 
      shadow-sm
      md:p-6 
      lg:flex 
      lg:items-center 
      lg:gap-6
    ">
      <img 
        src={product.image} 
        className="
          w-full 
          h-48 
          object-cover 
          rounded
          lg:w-48 
          lg:h-48 
          lg:flex-shrink-0
        " 
      />
      <div className="mt-4 lg:mt-0">
        <h3 className="text-lg font-semibold lg:text-xl">
          {product.name}
        </h3>
        <p className="text-gray-600 mt-2">
          {product.description}
        </p>
        <div className="
          mt-4 
          flex 
          flex-col 
          gap-2
          sm:flex-row 
          sm:items-center 
          sm:justify-between
        ">
          <span className="text-2xl font-bold text-green-600">
            R$ {product.price}
          </span>
          <button className="
            px-4 
            py-2 
            bg-blue-600 
            text-white 
            rounded 
            hover:bg-blue-700
            sm:px-6
          ">
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
```

On mobile, the card is vertical with the image on top. On desktop (`lg:`), it becomes horizontal with flexbox. Each breakpoint is explicit and predictable.

## Customization: custom theme

Tailwind's default design system is good, but real projects need specific colors and spacing. Extend the theme without losing the defaults:

```js
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}
```

Now you can use `bg-brand-500`, `text-brand-700`, `p-18`, or any combination. The extended palette integrates seamlessly with existing classes.

## Reusable components with clsx

For conditional class logic, `clsx` is indispensable:

```bash
npm install clsx
```

```jsx
import clsx from 'clsx';

function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <button
      className={clsx(
        // Base styles
        'font-medium rounded-lg transition-colors duration-200',
        
        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        
        // Color variants
        {
          'bg-blue-600 hover:bg-blue-700 text-white': variant === 'primary',
          'bg-gray-200 hover:bg-gray-300 text-gray-900': variant === 'secondary',
          'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300': variant === 'outline',
        },
        
        // States
        {
          'opacity-50 cursor-not-allowed': disabled,
          'shadow-sm hover:shadow-md': !disabled,
        },
        
        // Custom className override
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

Use it like this:

```jsx
<Button variant="primary" size="lg">
  Save
</Button>

<Button variant="outline" disabled>
  Loading...
</Button>

<Button className="w-full mt-4">
  Custom button
</Button>
```

The combination of Tailwind + `clsx` gives you complete flexibility without losing the predictability of atomic classes.

## Dark mode: automatic toggle

Tailwind makes dark mode implementation easy. Configure in `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // or 'media' to follow system preference
  theme: {
    extend: {
      colors: {
        // Colors that work well in dark mode
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
```

In CSS, use the `dark:` prefix:

```jsx
function Header() {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  return (
    <header className="
      bg-white 
      dark:bg-gray-900 
      border-b 
      border-gray-200 
      dark:border-gray-700
      px-6 
      py-4
    ">
      <div className="flex items-center justify-between">
        <h1 className="
          text-xl 
          font-bold 
          text-gray-900 
          dark:text-white
        ">
          Meu App
        </h1>
        
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="
            p-2 
            rounded-md 
            text-gray-500 
            dark:text-gray-400
            hover:bg-gray-100 
            dark:hover:bg-gray-800
          "
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
```

Each element explicitly defines its appearance in both modes. No complex JavaScript, no confusing CSS variables.

## Production: automatic optimization

The Vite build with Tailwind already removes unused classes automatically. To check the result:

```bash
npm run build
npm run preview
```

The final bundle includes only the CSS that your application actually uses. A medium-sized React + Tailwind project typically generates 8-15kb of final CSS, even when using hundreds of utility classes.

If you need fine-grained control over the purge, configure it in `tailwind.config.js`:

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Forces inclusion of specific classes
  safelist: [
    'bg-red-500',
    'text-3xl',
    {
      pattern: /bg-(red|green|blue)-(100|200|300)/,
    },
  ]
}
```

## Performance and developer experience

When I implemented POS systems with web interfaces, development speed was critical. Layout changes needed to be fast and predictable. Tailwind excels exactly here.

There's no context switching between HTML and CSS. You see a 16px margin and write `m-4` directly in JSX. No need to name, organize, or remember where you defined `.spacing-medium`.

For debugging, browser tools show exactly which class is applying which property. There's no mysterious cascade or confusing specificity.

Autocompletion in VS Code with the official extension is exceptional. Type `bg-` and see all available background options, with color previews.

## Third-party components

Tailwind integrates well with component libraries. For Headless UI:

```jsx
import { Dialog } from '@headlessui/react';

function Modal({ isOpen, onClose, title, children }) {
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="
        fixed 
        inset-0 
        flex 
        items-center 
        justify-center 
        p-4
      ">
        <Dialog.Panel className="
          w-full 
          max-w-md 
          bg-white 
          rounded-lg 
          shadow-xl 
          p-6
          dark:bg-gray-800
        ">
          <Dialog.Title className="
            text-lg 
            font-medium 
            text-gray-900 
            dark:text-white
            mb-4
          ">
            {title}
          </Dialog.Title>
          
          <div className="text-gray-700 dark:text-gray-300">
            {children}
          </div>
          
          <button
            onClick={onClose}
            className="
              mt-6 
              w-full 
              px-4 
              py-2 
              bg-blue-600 
              text-white 
              rounded-md 
              hover:bg-blue-700
              transition-colors
            "
          >
            Close
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

The library handles accessibility logic and state. You only handle the visuals with Tailwind.

## Myths and Realities

**"HTML becomes too messy"**  
Utility classes are verbose, but predictable. I'd rather see `p-4 bg-white rounded shadow` in JSX than search for where `.card-container` was defined in scattered CSS files.

**"It's not semantic"**  
Semantics are in HTML, not CSS. `<article className="p-6 bg-white">` is just as semantic as `<article className="blog-post">`. The difference is that utility classes are self-descriptive.

**"It's hard to maintain consistency"**  
Tailwind's design system enforces consistency. You can't use `padding: 13px` because there's no `p-13`. You have to choose between `p-3` (12px) or `p-4` (16px), maintaining the grid.

**"Poor performance due to CSS size"**  
The opposite is true. Tailwind purge removes unused classes. Component-based CSS grows linearly with new components. Tailwind has a fixed size based on what you actually use.

## When not to use Tailwind

Tailwind is not a silver bullet. Avoid it in:

- **Projects with designers who work directly with CSS**: if the workflow is design → CSS → development, utility classes create friction.
- **Sites with lots of editorial content**: blogs and institutional sites benefit more from traditional semantic CSS.
- **Teams with strong CSS-in-JS culture**: if the team already masters styled-components or emotion, migrating may not be worth the effort.
- **Applications with very specific interfaces**: games, visual editors, or apps with unique UI may need completely custom CSS.

The right tool depends on context, not trends.

## Alternatives and ecosystem

**UnoCSS** offers similar API with better performance and more configuration flexibility. Worth evaluating for projects that need deep customization.

**Windi CSS** was a faster fork of Tailwind, but was discontinued when Tailwind 3.0 incorporated its performance improvements.

**Twind** compiles Tailwind to runtime, useful for micro-frontends or applications with dynamic CSS.

For ready-made components, **Tailwind UI**, **Headless UI** and **Radix UI** integrate perfectly. **Shadcn/ui** offers copy-paste components with Tailwind.

## Gradual migration

If you have an existing application, migrate gradually:

1. **Install Tailwind** without removing existing CSS
2. **Use utilities for new components** only
3. **Replace specific CSS** with equivalent classes when doing maintenance
4. **Remove unused CSS** after ensuring it has been replaced

Don't rewrite everything at once. Tailwind coexists well with traditional CSS during the transition.

## Conclusion

Tailwind CSS changes how you think about styling. Instead of abstracting CSS prematurely, you compose interfaces using atomic blocks. It's more verbose in markup, but infinitely more predictable in maintenance.

For projects that prioritize development speed and visual consistency, utility-first is a superior approach to traditional component-based CSS. The initial learning curve quickly pays off when you realize you no longer need to switch between files or debug CSS cascade.

### Practical Takeaways:

- Install with Vite for zero-config setup
- Use `clsx` for conditional class logic
- Configure custom theme while maintaining defaults
- Implement dark mode with `dark:` prefix
- Compose interfaces directly in JSX without context switching
- Production build automatically removes unused classes
- Migrate gradually in existing projects
- Evaluate alternatives like UnoCSS for specific cases

## Sources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Guide - CSS Preprocessors](https://vitejs.dev/guide/features.html#css-pre-processors)
- [clsx - GitHub Repository](https://github.com/lukeed/clsx)
- [Headless UI Documentation](https://headlessui.com/)
- [Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business](https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/)
- [The Case for Atomic CSS](https://johnpolacek.github.io/the-case-for-atomic-css/)
## 📸 Cover image credit
- **Image:** [Chataropica.png](https://commons.wikimedia.org/wiki/File%3AChataropica.png)
- **Author:** Uhvhhvjhh
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · via Wikimedia Commons
