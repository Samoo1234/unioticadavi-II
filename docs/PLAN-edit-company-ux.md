# Plan: Edit Company UX Improvement

## 1. Context Analysis
- **Issue**: User cannot find the "Save" button when editing a company.
- **Current State**: The "SALVAR ALTERAÇÕES" and "CANCELAR" buttons are located inside the "CONFIGURAÇÕES FISCAIS" panel at the very bottom of the page.
- **Problem**: Users editing basic info or address might not scroll down to the fiscal section, or might not associate fiscal settings with saving the general company data.

## 2. Proposed Changes
We will improve the layout to make the actions always visible or logically placed at the form level, not the sub-panel level.

### Feature: Relocate Action Buttons
- **Goal**: Move Save/Cancel buttons out of the "Configurações Fiscais" panel.
- **Location**: Place them in a dedicated action bar at the bottom of the form (outside the grid), or make them sticky.

### Files to Modify
- `src/app/empresas/page.tsx`

## 3. Implementation Steps

### Step 1: Extract Buttons
- Remove the button block from the `Panel` "CONFIGURAÇÕES FISCAIS".

### Step 2: Create Action Bar
- Create a new `div` container after the `grid` (line 633).
- Style it to be full-width, perhaps with a top border or background to separate it.
- Add "SALVAR" and "CANCELAR" buttons there.

### Step 3: Visual Polish
- Ensure the buttons align with the design system (green for save, gray for cancel).

## 4. Verification Plan
- **Manual Test**:
    1. Open "EMPRESAS" page.
    2. Click "EDITAR" on a company.
    3. Verify "SALVAR ALTERAÇÕES" is visible immediately or logically at the bottom of the page structure, not inside a specific sub-panel.
    4. Test functionality (Save works, Cancel works).

## 5. Agent Assignments
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `react-best-practices`
