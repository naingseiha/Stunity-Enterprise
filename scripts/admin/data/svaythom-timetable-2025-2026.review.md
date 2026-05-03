# Svaythom timetable PDF extraction review

Source PDF: /Users/naingseiha/Desktop/កាលវិភាគថ្មីគ្រូពេញមួយថ្ងៃ.pdf
School: Svaythom High School
Academic year: 2025-2026

## Summary
- PDF pages processed: 72
- Prepared entries: 1147
- Classes covered: 33
- Teachers matched: 72
- Entries without subjectId before subject creation: 164
- Subject rows created during import: 5
- Remaining entries without subjectId after import: 95
- Class-slot conflicts: 0
- Teacher-slot conflicts needing review: 3
- Pages where extracted expanded hours differ from PDF total: 30

## Confirmed Subject Codes
- `K` means Khmer Literature / Khmer. Existing grades 10-12 Khmer subjects resolved in the database; grades 7-9 were created during import.
- `LS` means Life Skill / `បំណិនជីវិត`.
- `LE` is treated as OCR/spec confusion and normalized to `LS`; it is not kept as a separate subject.

## Subject Rows Created

| Code | Khmer name | English name | Grade | Matched entries | Classes | Pages |
| --- | --- | --- | --- | ---: | --- | --- |
| KHM-G7 | អក្សរសាស្ត្រខ្មែរ | Khmer Literature | 7 | 15 | 7A 7B 7C 7D 7E | 16 44 51 52 54 |
| LS-G7 | បំណិនជីវិត | Life Skill | 7 | 2 | 7B 7D | 55 58 |
| KHM-G8 | អក្សរសាស្ត្រខ្មែរ | Khmer Literature | 8 | 22 | 8A 8B 8C 8D | 44 52 53 |
| LS-G8 | បំណិនជីវិត | Life Skill | 8 | 4 | 8A 8B 8C 8D | 2 4 25 47 |
| KHM-G9 | អក្សរសាស្ត្រខ្មែរ | Khmer Literature | 9 | 26 | 9A 9B 9C 9D | 51 53 |

## Subject Items Still Needing Review

- `K`: 16 source pattern(s), 63 expanded entries. Meaning is confirmed and was resolved during import by creating `KHM-G7`, `KHM-G8`, and `KHM-G9`.
- `Ls`: 6 source pattern(s), 6 expanded entries. Meaning is confirmed and was resolved during import by creating `LS-G7` and `LS-G8`.
- `NULL`: 35 source pattern(s), 95 expanded entries. The PDF cell marker was not reliably extracted and needs manual review.

## Page Hour Mismatches
- Page 3: លសី វ៉ោរី PDF total=17, extracted=16
- Page 4: ឈុន ល ីនដា PDF total=16, extracted=19
- Page 8: ស្វទ រ ង្់ PDF total=14, extracted=13
- Page 14: រ ឺ រ ុណ PDF total=20, extracted=18
- Page 16: លួង្ វសនា PDF total=23, extracted=15
- Page 22: សុខ អ៊ាវឃីម PDF total=14, extracted=12
- Page 24: សូវ ស្វន់លេ PDF total=15, extracted=17
- Page 32: ចាន់ អ្ុី PDF total=14, extracted=13
- Page 34: ខុន សុហុន PDF total=14, extracted=15
- Page 35: លឈឿង្ គ្សីរុាំ PDF total=14, extracted=15
- Page 36: គ្បន វិចឆិកា PDF total=16, extracted=18
- Page 38: ជ្ជ ឈលូស PDF total=13, extracted=12
- Page 39: សន សុ ៉ោណ PDF total=16, extracted=18
- Page 40: ឃិន ល ឹមន្ែម PDF total=14, extracted=13
- Page 43: ណុ ប ផល លឹក PDF total=17, extracted=15
- Page 45: ន្វ៉ោន សុភា PDF total=14, extracted=12
- Page 46: អ៊ាប ត្ថរា PDF total=8, extracted=7
- Page 51: រ ុន សុរ ីម PDF total=22, extracted=20
- Page 53: ន្សម សុភាព PDF total=22, extracted=24
- Page 54: សុិន ស្វវេដី PDF total=18, extracted=15
- Page 55: អ្៊ាូ សុលឃឿន PDF total=14, extracted=13
- Page 57: លលឿម ស្វលរៀ PDF total=16, extracted=11
- Page 58: ន់ សាំ PDF total=26, extracted=25
- Page 59: អ្ុឹម សុខា PDF total=16, extracted=14
- Page 61: ថ្នន សាំលភាត PDF total=18, extracted=17
- Page 62: អ្៊ាុ៊ុំ សុរនាធ PDF total=18, extracted=16
- Page 64: យួន លែង្ PDF total=26, extracted=24
- Page 65: ស្វ ៊ា ន ហាច PDF total=30, extracted=29
- Page 66: មុឺន រដាា PDF total=19, extracted=18
- Page 69: សុីវ សុខា PDF total=16, extracted=17

## Teacher Conflicts
- Conflict 1: page 70 ឆាត ម៉ារីណា P9 11D | page 70 ឆាត ម៉ារីណា P9 11G
- Conflict 2: page 71 អ៊ុន រីវុធ P8 10A | page 71 អ៊ុន រីវុធ P8 11G
- Conflict 3: page 72 ឡាញ់ ប៉េងងីន P9 11E | page 72 ឡាញ់ ប៉េងងីន P9 10E

## Import Completed
The import was applied on 2026-05-03. It replaced 6 existing timetable entries, created/updated 5 confirmed subject rows, changed periods to the official 10 one-hour slots, and inserted 1147 timetable entries. 95 entries remain without subjectId because their PDF marker was not reliably extracted; there are no class-slot duplicates.
