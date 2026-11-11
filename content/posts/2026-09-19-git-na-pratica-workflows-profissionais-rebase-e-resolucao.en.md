---
title: "Git in Action: Pro Workflows, Rebase, and Conflict Resolution"
date: "2026-09-19"
category: "tutorial"
tags: ["git", "workflow", "produtividade"]
excerpt: "Git in practice: Git Flow vs trunk-based, interactive rebase, cherry-pick and bisect, conflict resolution, and commit conventions."
share_hook: "Git Flow vs trunk-based, rebase, bisect, conflicts - step by step."
cover:
  image: "/covers/2026-09-19-git-na-pratica-workflows-profissionais-rebase-e-resolucao.jpg"
comments: true
translationKey: "2026-09-19-git-na-pratica-workflows-profissionais-rebase-e-resolucao"
---

## Introduction
When it comes to version control, Git is the most widely used tool in the software development world. However, many developers still underutilize Git, limiting themselves to basic commands like `git add`, `git commit`, and `git push`. But Git is much more than just committing changes. It offers a wide range of features to manage the workflow efficiently, resolve conflicts, and maintain a clean and organized history of changes.

---
## Git Flow vs Trunk-based
Two of the most popular Git workflows are Git Flow and Trunk-based. Git Flow is a workflow that uses separate branches for development, testing, and production, while Trunk-based uses a single main branch for all stages of development. Although both workflows have their pros and cons, Trunk-based is increasingly popular due to its simplicity and efficiency.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-19-git-na-pratica-workflows-profissionais-rebase-e-resolucao-1.jpg" alt="Git in Action: Pro Workflows, Rebase, and Conflict Resolution" loading="lazy">
<figcaption>Git Scheynius with the British film and stage director, producer, and screenwriter Sam Mendes who is awarded the Stockholm Visionary Award 2022 during the Stock. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AGit_Scheynius_and_Sam_Mendes_in_2022.jpg">Git Scheynius and Sam Mendes in 2022.jpg</a> por Frankie Fouganthin — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

---
## Interactive Rebase for a Clean History
One of the most powerful features of Git is the interactive rebase. It allows you to reorganize and edit previous commits, creating a clean and organized change history. With interactive rebase, you can squash commits, reorder them, and even remove unnecessary commits. This is especially useful when you're working on a project with many contributors and want to maintain a change history that's easy to follow.

---
## Cherry-pick and Bisect
Two other useful Git features are cherry-pick and bisect. The cherry-pick allows you to apply a specific commit to a different branch, while bisect is a debugging tool that helps find the commit that introduced a bug. With bisect, you can quickly identify the problematic commit and resolve the issue.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-19-git-na-pratica-workflows-profissionais-rebase-e-resolucao-2.jpg" alt="Git in Action: Pro Workflows, Rebase, and Conflict Resolution" loading="lazy">
<figcaption>A basic overview of the git branching workflow (geared towards GitLab). — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ABasic_git_branching_workflow_%28GitLab%29.png">Basic git branching workflow (GitLab).png</a> por TheresNoTime — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

---
## Conflict Resolution in Practice
When you're working on a project with many contributors, conflicts inevitably arise. However, with Git, you can resolve conflicts efficiently. One way to resolve conflicts is to use `git merge` with the `--no-commit` option. This allows you to manually resolve conflicts before committing the changes. Additionally, you can use tools like `git diff` and `git log` to identify conflicting changes and resolve the issue.

---
## Git Hooks with Husky
Git hooks are scripts that are automatically executed at different stages of the Git workflow. With Husky, you can easily configure git hooks to run tasks such as automated tests, linting, and code formatting. This helps ensure that the code is of high quality and follows the project's coding conventions.

---
## Commit Convention
A well-defined commit convention is essential for maintaining a clean and organized change history. One of the most popular conventions is the GitHub commit convention, which uses a specific commit message format to describe changes. Additionally, it is important to use tags and branches to organize changes and facilitate navigation through the project history.

---
## Conclusion
In summary, Git is a powerful tool that offers many features to manage the workflow efficiently. With interactive rebase, cherry-pick, bisect, and conflict resolution, you can maintain a clean and organized change history. Additionally, with Husky and a commit convention, you can ensure that the code is of high quality and follows the project's coding conventions. Here are some practical takeaways:
* Use interactive rebase to keep a clean and organized change history
* Use cherry-pick and bisect to apply specific changes and resolve issues
* Resolve conflicts manually before committing changes
* Use Husky to configure git hooks and ensure code quality
* Follow a well-defined commit convention to maintain a clean and organized change history

---
## Sources
- [Official Git Documentation](https://git-scm.com/docs)
- [GitHub: Commit Convention](https://github.com/github/commit-message)
- [Husky: Git Hooks](https://typicode.github.io/husky/#/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Trunk-based Development](https://trunkbaseddevelopment.com/)
## 📸 Cover image credit
- **Image:** [Git format.png](https://commons.wikimedia.org/wiki/File%3AGit_format.png)
- **Author:** Julian Kücklich
- **License:** [CC0](https://creativecommons.org/publicdomain/zero/1.0/) · via Wikimedia Commons
