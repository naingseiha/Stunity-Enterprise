# Ebooks — MoEYS Curriculum Reference Library

Official Ministry of Education, Youth and Sport (MoEYS) textbooks, kept as a
**local-only reference library** for validating/authoring Learn-path content
(mini-lessons, formula sheets, unit taxonomy, practice questions) against the
real Cambodian curriculum.

## Why these files aren't committed to git

Unlike small shipped assets (e.g. fonts under `apps/mobile/src/assets/fonts`),
these are large (10–40MB+) scanned PDFs that are **never bundled into any app**
— they only exist to be read during content-review sessions. Committing them
to git would permanently bloat every clone/CI checkout, and this library is
expected to grow to cover grades 7–12 across multiple subjects. Only this
README (the folder convention + inventory) is tracked; the PDFs themselves are
gitignored (see `.gitignore`). Claude can still read them directly from disk
regardless of git-tracking status, so this has no effect on review work.

If a second contributor ever needs this library, share it via a cloud drive
link recorded here rather than committing the files.

## Folder convention

```
Ebooks/
  Grade<N>/           # 7–12
    <Subject>/        # Math, Physics, Chemistry, Biology, Khmer, English, ...
      <Descriptive Name>.pdf
```

Subject folder names are plain/readable (not the internal `Subject.code`
format like `MATH-G9`) since the grade is already a separate directory level.
When a grade has track-specific variants (see Grade 12 note below), keep them
as separate files in the same subject folder rather than adding another
directory level.

## Current inventory

| Grade | Subject | File | Pages | Notes |
|---|---|---|---|---|
| 9 | Math | `Grade9/Math/Math Grade 9.pdf` | 229 | 2013 MoEYS edition. Scanned (image-based, no text layer) — read via page rendering, not text extraction. Real TOC has **18 official lesson units** (មេរៀន ១–១៨) — reconciled in `seed-topics-math-g9.ts`. |
| 12 | Math | `Grade12/Math/Math Grade 12 Basic.pdf` | 257 | Scanned. **Track mapping to `Subject.code` verified**: maps to `MATH-G12-SOCIAL` (Social Science track / ថ្នាក់វិទ្យាសាស្ត្រសង្គម) based on MoEYS upper secondary curriculum. |
| 12 | Math | `Grade12/Math/Math Grade 12 Advanced.pdf` | 257 | Scanned. **Track mapping to `Subject.code` verified**: maps to `MATH-G12-SCIENCE` (Science track / ថ្នាក់វិទ្យាសាស្ត្រ) based on MoEYS upper secondary curriculum. |

Update this table whenever files are added/removed.

## Planned additions

User is collecting official MoEYS textbooks for all grade levels (7–12) and
core subjects (Math, Physics, Chemistry, Biology, and likely Khmer/English) to
build out this reference library incrementally.

## Derived reference notes

Any lightweight, extracted knowledge worth keeping in git long-term (e.g. a
verified table of contents, unit/page mapping, or curriculum-alignment notes)
should go in a tracked doc under `docs/curriculum/` — not in this gitignored
folder — so it survives without re-reading the source PDF each time.
