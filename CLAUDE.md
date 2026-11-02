# Behavioral & Coding Rules (karpathy.md)

## Acuan kerja dan status rilis — 2 November 2026

Baca [aturan bersama](../rules.md) dan [handoff rilis](docs/release/HANDOFF_NEXT_CHAT.md) sebelum bekerja. Kandidat TestFlight 1.0 (5) sudah VALID dan tersedia di grup Internal; draft memilih build5. Ini belum membuktikan kesiapan Submit. Pemilik akan menyampaikan hasil pengujian perangkat kemudian; jangan menandai hasilnya lulus tanpa laporan. Gunakan checkpoint terbaru, pertahankan isolasi data akun dan fix OTP8digit, serta hindari sinkronisasi source atau audit berulang yang tidak diperlukan.

Setiap kali mengerjakan task, WAJIB membaca dan menerapkan prinsip-prinsip ini:

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
- The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Transform tasks into verifiable goals:
- For multi-step tasks, state a brief plan:
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  3. [Step] → verify: [check]
- Strong success criteria let you loop independently.
