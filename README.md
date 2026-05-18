# Elf Destiny Wiki

Source for the [Elf Destiny Wiki](https://galacticliaison.github.io/elf-destiny-wiki/) —
a community wiki for the Elf Destiny mods for Crusader Kings III and Europa
Universalis V.

Built with [MkDocs](https://www.mkdocs.org/) and the
[Material theme](https://squidfunk.github.io/mkdocs-material/). Pages are plain
Markdown in `docs/`. Every push to `main` rebuilds and publishes the site via GitHub
Pages.

## Structure

- `docs/lore/` — shared world lore.
- `docs/ck3/` — Crusader Kings III mod gameplay mechanics.
- `docs/eu5/` — Europa Universalis V mod gameplay mechanics.
- `mkdocs.yml` — site config and navigation.

## Editing

- **Lore pages** are authored and polished in the `Public Facing Lore` folder of the
  `elf-destiny-lore-master` repo, then copied into `docs/lore/`.
- **Mechanics pages** are written directly under `docs/ck3/` and `docs/eu5/`.

## Building locally

```
pip install -r requirements.txt
mkdocs serve
```

Then open <http://127.0.0.1:8000>. Run `mkdocs build --strict` to catch broken links
before pushing.
