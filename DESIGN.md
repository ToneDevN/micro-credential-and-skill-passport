# Stitch & HeroUI v3 Design System Specification
**Project:** Micro-Credential and Skill Passport System (MVP v1)  
**Parent Epic:** [TON-179](https://linear.app/tonedev-project/issue/TON-179)  
**Foundation Issue:** [TON-180](https://linear.app/tonedev-project/issue/TON-180)  
**Version:** 1.0.0  
**Stack:** React 19 + Tailwind CSS v4 + HeroUI v3 (`@heroui/react` & `@heroui/toast`)

---

## 1. Design Philosophy & Migration Overview

This design system replaces the legacy Bootstrap 5 layout (`#0F2042` / `#B8860B` flat theme) with a unified, high-aesthetic **HeroUI v3** architecture powered by **Tailwind CSS v4**.

### Key Principles
1. **Design ↔ Code 1:1 Parity**: Every component represented in Stitch screens directly maps to official `@heroui/react` primitives.
2. **Compound Component Hierarchy**: Cards, modals, tables, and tabs follow strict semantic nesting (`Card.Header`, `Card.Content`, `Card.Footer`).
3. **Harmonious Color Dynamics**: Preserve institution brand identity (Navy `#0F2042`, Royal Blue `#1E5AA8`, Accent Gold `#B8860B`) while leveraging HeroUI's OKLCH color engine and surface elevation tokens.
4. **Adaptive Responsiveness**: All layouts provide dedicated specs for Desktop (≥1280px), Tablet (768px–1024px), and Mobile (375px).

---

## 2. Core Tokens & Variable Mapping

Derived from HeroUI v3 theme tokens (`get_theme_variables`):

### 2.1 Colors & Status Semantics

| Token | CSS Variable | Hex / OKLCH Reference | Usage in App |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `--brand-primary` / `--accent` | `#0F2042` / `oklch(0.24 0.08 260)` | Primary buttons, active navbar, brand headers |
| **Brand Interactive**| `--brand-interactive` | `#1E5AA8` / `oklch(0.48 0.16 255)` | Links, active tab indicator, focus ring, hover states |
| **Brand Gold Accent**| `--brand-gold` | `#B8860B` / `oklch(0.68 0.16 85)` | Badges, distinction stars, micro-credential highlights |
| **Surface Base** | `--background` | `#F8FAFC` / `oklch(98% 0.005 240)` | Page body background |
| **Surface Card** | `--surface` | `#FFFFFF` / `oklch(100% 0 0)` | Card containers, modal sheets |
| **Surface Secondary**| `--surface-secondary` | `#F1F5F9` / `oklch(96% 0.005 240)` | Table headers, chip backgrounds, inner wells |
| **Text Primary** | `--foreground` | `#0F172A` / `oklch(15% 0.01 260)` | Main body text, headings |
| **Text Muted** | `--muted` | `#64748B` / `oklch(55% 0.015 260)` | Secondary labels, timestamps, placeholders |
| **Success** | `--success` | `#10B981` / `oklch(0.73 0.19 150)` | Verified badge, Approved status, Pass notifications |
| **Warning** | `--warning` | `#F59E0B` / `oklch(0.82 0.14 76)` | Pending review, Draft request, action needed |
| **Danger** | `--danger` | `#EF4444` / `oklch(0.59 0.20 25)` | Rejected request, Delete confirmation, Errors |

### 2.2 Typography

* **Body & UI Font (`--sans`):** `'Inter', system-ui, sans-serif`
  * Weight scale: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
* **Headings & Displays (`--heading`):** `'Space Grotesk', system-ui, sans-serif`
  * Applied to page titles, hero headers, credential certificate headers
* **Iconography:** `Material Symbols Outlined` (variable weight font, fill 0 or 1)

### 2.3 Geometry & Elevation

* **Base Radius (`--radius`):** `0.5rem` (`8px` — Stitch `ROUND_EIGHT`)
* **Card & Container Radius:** `1rem` to `1.5rem` (`rounded-2xl` to `rounded-3xl`)
* **Elevation Shadows:**
  * Card: `shadow-sm` on neutral, `shadow-md` on hover
  * Modal & Dropdowns: `shadow-xl` with backdrop blur `backdrop-blur-md`

---

## 3. HeroUI Component Specification & Pattern Matrix

| Component | HeroUI Import | Application Pattern |
| :--- | :--- | :--- |
| **Button** | `@heroui/react` | `color="primary"` (Navy), `color="default"` (Muted outline), `variant="flat"` |
| **Card** | `@heroui/react` | `Card`, `CardHeader`, `CardContent`, `CardFooter` with clean borders |
| **Input & Form** | `@heroui/react` | `Input`, `Form` with native floating label and helper validation |
| **Chip / Badge** | `@heroui/react` | `variant="flat"`, color-coded status chips (`success`, `warning`, `danger`) |
| **Table** | `@heroui/react` | `Table`, `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` |
| **Tabs** | `@heroui/react` | Horizontal pill/underline tab switching for views and filters |
| **Modal / Dialog**| `@heroui/react` | Centered modal sheets with smooth entrance transitions |
| **Avatar** | `@heroui/react` | User avatars with initials fallback and status indicators |
| **ProgressBar** | `@heroui/react` | Course completion meter and level bars |
| **Toast** | `@heroui/toast` | Global top-right notifications for all user mutation actions |

---

## 4. Screen Groups & Architecture Specification

### 4.1 Auth Screens Group ([TON-181](https://linear.app/tonedev-project/issue/TON-181))
* **Login (`/login`) & Register (`/register`):**
  * Modern split layout (45% brand illustration panel + 55% form sheet on desktop).
  * Collapses gracefully into a single clean column on mobile (375px).
  * Quick-demo account switcher buttons for rapid instructor/student role testing.
  * Inputs: `email`, `password` with toggle visibility, role selector (`student` / `instructor`).
* **Forgot & Reset Password (`/forgot-password`, `/reset-password`):**
  * Clean focused card container with feedback alerts and instant validation.

### 4.2 Student Screens Group ([TON-182](https://linear.app/tonedev-project/issue/TON-182))
* **Skill Passport Dashboard (`/student/passport`):**
  * Profile overview card with certified badge count, course progress meters, and Level indicator.
  * Share Modal: QR code, shareable link with one-click copy, and social badges.
  * Skill Map: Visual card grid displaying earned micro-badges with issuance date and instructor.
* **Explore Skills (`/student/explore`):**
  * Course-based tabs and search bar.
  * Skill Cards with dynamic status chip (`Certified` green, `Pending` yellow, `Not Started` gray).
  * One-click "Submit Verification" shortcut directly from eligible skill cards.
* **Submit Verification Request (`/student/submit-verification`):**
  * Structured evidence form: GitHub repository selector modal (via GitHub OAuth API), project link, reflection notes.
* **My Verification Requests (`/student/requests`):**
  * Tabbed status filter (`All`, `Pending`, `Approved`, `Rejected`).
  * Re-submit action flow with pre-filled previous evidence and reviewer feedback banner.
* **Public Passport View (`/passport/:shareToken`):**
  * Publicly verifiable credential page with student name, verified skills list, and cryptographic authenticity watermark.

### 4.3 Instructor Screens Group ([TON-183](https://linear.app/tonedev-project/issue/TON-183))
* **Course & Micro-Skill Management (`/instructor/courses`, `/instructor/skills`):**
  * Table-based management with add/edit inline modals and search filtering.
* **Verification Review Queue (`/instructor/reviews`):**
  * Side-by-side or stacked review pane showing student submitted evidence + GitHub repository preview.
  * Instant Action buttons: `Approve` (green) and `Reject` (red) with required reason modal.
* **Analytics Dashboard (`/instructor/analytics`):**
  * Metric cards: Total enrolled, Verified skills, Pass rate %, Review queue turnaround.
  * Skill distribution table and course completion leaderboard.
* **Enrolled Students (`/instructor/enrolled`):**
  * Student enrollment roster with individual skill progress bars.

### 4.4 Settings & Notifications Group ([TON-184](https://linear.app/tonedev-project/issue/TON-184))
* **Settings Page (`/settings`):**
  * Tabbed navigation: Profile Information, Security (Change Password), Connected Accounts (GitHub OAuth link/unlink).
* **Notifications Center (`/notifications`):**
  * Real-time list of badge approvals, review rejections, and course completion alerts.
  * Top navigation bell menu with unread badge counter.

---

## 5. Frontend Handoff & QA Checklist ([TON-185](https://linear.app/tonedev-project/issue/TON-185))

* [x] **Zero Bootstrap Artifacts**: All Bootstrap classes and stylesheets purged.
* [x] **HeroUI Compound Components**: Proper semantics (`Card`, `Input`, `Button`, `Chip`, `Alert`, `Toast`).
* [x] **Full Responsiveness**: Verified layouts on 1440px desktop, 768px tablet, and 375px mobile viewport.
* [x] **Accessibility (A11y)**: Accessible ARIA labels, contrast ratio compliant with WCAG AA.
* [x] **Build Verification**: Clean production build with Vite (`npm run build`).
* [x] **Code Quality**: Passes linter checks (`oxlint`) with 0 errors.
