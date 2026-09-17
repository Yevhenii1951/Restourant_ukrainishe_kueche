# Architecture Decision Record

2026-09-17 - Treat Kalyna as a fictional portfolio demo. Why: no real operator
data exists. Alternative: simulate a live restaurant without disclosure - rejected as misleading.

2026-09-17 - Use phased delivery but keep all requested modules in scope. Why:
quality gates preserve a working system. Alternative: one big implementation pass - rejected.

2026-09-17 - Use Supabase with SQL migrations and no Prisma. Why: one source of
schema truth plus first-class RLS. Alternative: Prisma and Supabase together - rejected.

2026-09-17 - Guest checkout; staff accounts only. Why: accounts add no value to
one-time food orders. Alternative: customer registration - deferred.

2026-09-17 - Reservation requests use real tables but require staff confirmation.
Why: avoids falsely promising seats. Alternative: immediate auto-confirmation - rejected.

2026-09-17 - Use typed AI tool calls without pgvector. Why: small structured
dataset and exact business answers. Alternative: embeddings/RAG - rejected.

2026-09-17 - Store AI conversations for five days, then delete them. Why: user
requested short continuity with data minimization. Alternative: indefinite history - rejected.

2026-09-17 - German is canonical and fallback locale. Why: Kassel is the target
market. Alternative: block publishing until every translation exists - rejected.

2026-09-17 - The agent pushes every completed ticket; the human opens and merges
the PR. Why: matches the requested review boundary. Alternative: agent merges - rejected.

