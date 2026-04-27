# Seeding Guide: Bilingual C Programming Course

This document provides a comprehensive guide on how to structure and prepare seed data for the **C Programming** course on the Stunity Enterprise platform. The course is designed to be bilingual (Khmer and English) and follows a structured "Safari Book" model.

## 1. Course Architecture
All courses follow a three-level hierarchy:
1.  **Course**: The main container (e.g., "C Programming").
2.  **Section (Chapter)**: Logical groupings of lessons (e.g., "Chapter 1: Foundations").
3.  **Lesson (Page)**: The atomic unit of learning (Article, Video, Quiz, or Assignment).

## 2. Localization Strategy
To support bilingual content, we use specific fields for each language. This allows the platform to switch content instantly based on the user's locale.

### Course Metadata
| Field | Purpose | Example (EN) | Example (KH) |
| :--- | :--- | :--- | :--- |
| `titleEn` | English Title | Master C Programming | សិក្សាភាសាសរសេរកម្មវិធី C |
| `titleKh` | Khmer Title | ការសរសេរកម្មវិធី C | សិក្សាភាសាសរសេរកម្មវិធី C |
| `descriptionEn`| English Summary | Deep dive into C... | ការសិក្សាស៊ីជម្រៅអំពី... |
| `descriptionKh`| Khmer Summary | ការសិក្សាអំពីមូលដ្ឋាន... | ... |

### Lesson Content
For `ARTICLE` type lessons, high-quality Markdown is required for both:
- `contentEn`: Technical explanations in English.
- `contentKh`: Technical explanations in Khmer.

## 3. Recommended Course Outline (C Programming)

### Chapter 1: Introduction to C (ការណែនាំអំពីភាសា C)
*   **Lesson 1.1: What is C? (តើអ្វីទៅជាភាសា C?)**
    *   *Type*: ARTICLE
    *   *Focus*: History, use cases (embedded systems, OS), and importance.
*   **Lesson 1.2: Environment Setup (ការរៀបចំបរិស្ថានការងារ)**
    *   *Type*: ARTICLE
    *   *Focus*: Installing GCC/Clang, VS Code, and running the first compiler.
*   **Lesson 1.3: Hello World (កម្មវិធីដំបូង Hello World)**
    *   *Type*: ARTICLE + EXERCISE
    *   *Focus*: Explaining `main()`, `printf()`, and headers.

### Chapter 2: Variables & Data Types (មូលដ្ឋានគ្រឹះដាទ៉ា)
*   **Lesson 2.1: Types & Declarations (ប្រភេទដាទ៉ា និងការប្រកាស)**
    *   *Type*: ARTICLE
    *   *Focus*: `int`, `char`, `float`, `double`.
*   **Lesson 2.2: Constants & Literal (ថេរ និងលីតឺរ៉ាល់)**
    *   *Type*: ARTICLE
*   **Quiz: Foundations of C (តេស្តសមត្ថភាពមូលដ្ឋាន)**
    *   *Type*: QUIZ
    *   *Focus*: 10 questions on syntax and types.

## 4. How to Seed the Data
The `learn-service` provides a `bulkCreateCourse` method that handles the creation of the course, its sections, and its lessons in a single transaction.

### Example Seed Script Snippet
```typescript
const cCourse = await bulkCreateCourse({
  titleEn: "Mastering C Programming",
  titleKh: "ការសរសេរកម្មវិធី C សម្រាប់អ្នកចាប់ផ្តើម",
  descriptionEn: "A comprehensive guide to C programming...",
  descriptionKh: "មេរៀនលម្អិតអំពីការសរសេរកម្មវិធី C...",
  category: "Programming",
  level: "BEGINNER",
  lessons: [
    {
      sectionTitleEn: "Chapter 1: Getting Started",
      sectionTitleKh: "ជំពូកទី ១៖ ការចាប់ផ្តើមដំបូង",
      titleEn: "Lesson 1.1: What is C?",
      titleKh: "មេរៀន ១.១៖ តើអ្វីទៅជាភាសា C?",
      contentEn: "# Welcome to C\nC is a powerful general-purpose language...",
      contentKh: "# ស្វាគមន៍មកកាន់ភាសា C\nភាសា C គឺជាភាសាដ៏មានឥទ្ធិពល...",
      type: "ARTICLE",
    },
    // ... more lessons
  ]
});
```

## 5. Visual Standards
*   **Images**: Use high-resolution Unsplash URLs for thumbnails (e.g., code on a screen, hardware).
*   **Markdown**: Use headers (`#`, `##`), bold text, and code blocks (````c ... ````) to make articles readable.
*   **Callouts**: Use Blockquotes for "Pro Tips" or "Important Notes".

## 6. Execution Command
Once the migration is applied and the seed script is updated, run:
```bash
npx ts-node scripts/seed-real-courses.ts
```
