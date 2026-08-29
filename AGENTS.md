# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 核心原則 (Clean Code 三原則)

1. **可讀性 (Readability)**
   - 變數、函式與類別的名稱必須清楚表達其用途，讓人「一看就懂」。
2. **簡單性 (Simplicity)**
   - 一個函式應該只負責做好一件事情，且在同一個抽象層次上，函式行數越少越好，參數數量也應盡量精簡。
3. **可維護性 (Maintainability)**
   - 如果程式碼中出現重複的邏輯，應該將其抽離共用，降低日後修改時漏掉某處的風險。

---

## 嚴格限制與規範

1. **禁止自行選擇函式庫**：未經明確指示，不得擅自引進、新增或更換第三方 Library 或套件。
2. **文件規範**：所有產出的文件皆必須存放於 `docs/` 目錄下。
3. **測試規範**：任何功能開發與修改皆必須編寫對應測試，並存放於 `tests/` 目錄下（Rust 慣例，各 crate 的 `src/` 旁）。

---

## 執行步驟 (Execution Guidelines)

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals (e.g., write/run tests for fixes and refactoring).
- For multi-step tasks, state a brief plan:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  3. [Step] → verify: [check]
