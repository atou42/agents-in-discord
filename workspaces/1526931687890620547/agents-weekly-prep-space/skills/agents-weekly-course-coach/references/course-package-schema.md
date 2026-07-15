# Course Package Schema

Write valid UTF-8 JSON to `course-package.json`. Do not add comments or omit fields.

The root object contains `course`, `takeaways`, `segments`, `qa`, `recall_questions`, and `status`.

`course` contains non-empty `title`, `promise`, and `audience` strings, integer `talk_minutes` from 30 to 60, and integer `qa_minutes` from 5 to 10.

`takeaways` contains one to three objects. Each object has a non-empty `title` and a `support` object. `support.type` is `case`, `demo`, or `evidence`. `support.description` names the real supporting material. Do not write a placeholder description to make validation pass.

`segments` is a non-empty list whose minutes add up exactly to `course.talk_minutes`. Every segment has `kind`, `title`, `minutes`, and `purpose`. `kind` is `opening`, `content`, `demo`, or `summary`. The first segment is an opening of no more than three minutes. The final segment is a summary. Content and demo segments use a one-based `takeaway_index` when they support a takeaway. Every takeaway must be referenced by at least one segment.

`qa` is a non-empty list. Every item contains `question` and `answer_direction`.

`recall_questions` contains exactly three objects. Every object contains `question` and `expected_answer`. Questions test understanding or recall of the main line rather than satisfaction.

`status` is `ready` only when the speaker has supplied all evidence and the package is ready for structural validation. A draft with unresolved evidence must remain outside final validation and keep the course record in `needs_revision`.
