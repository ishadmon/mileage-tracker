# 🚗 MilesLog — Business Mileage Tracker

A clean, fast, fully client-side web app to track daily business mileage, gas expenses, and generate IRS-ready reports for tax deductions.

**No server. No account. No data ever leaves your browser.**
All data is stored locally in your browser using `localStorage`.

---

## Features

- **Daily Mileage Entry** — Log trips via trip miles _or_ start/end odometer readings
- **Gas Fill-Up Tracking** — Record gallons, price per gallon, station, and auto-calculate MPG
- **Business vs. Personal Tagging** — Tag every trip as business or personal
- **Business Projects** — Create projects with names, client names, and descriptions; tag trips to projects
- **Dashboard** — Running totals: business miles this month, YTD, estimated IRS deduction, fuel cost
- **Monthly & Annual Reports** — Breakdown by month and by project
- **History & Filters** — Search, filter by purpose/project/date range, paginated trip log
- **IRS Deduction Estimate** — Auto-calculates at the 2026 standard rate ($0.70/mile, configurable)
- **Export Options:**
  - 📄 CSV — Opens in Excel, Google Sheets, Numbers
  - 📊 Excel (`.xls`) — Tab-delimited, opens directly in Microsoft Excel
  - 📚 QuickBooks IIF — Import business mileage expenses into QuickBooks Desktop
  - 💾 JSON Backup / Restore — Full data backup and restore

---

## Getting Started

### Option 1 — Open directly in browser
Just open `index.html` in any modern browser. No build step, no dependencies.

> **Note:** The app uses ES Modules (`type="module"`), so it must be served over HTTP — not opened as a `file://` URL in most browsers.

### Option 2 — GitHub Pages (recommended)
If deployed to GitHub Pages, just visit your Pages URL.

### Option 3 — Local server (quick)
```bash
# Python 3
python3 -m http.server 8080

# Then open: http://localhost:8080
```

---

## IRS Mileage Rate

The 2026 standard mileage rate is **$0.70 per mile** (subject to IRS confirmation).
You can update this in **Settings** if the rate changes.

> Always verify the current rate at [irs.gov](https://www.irs.gov).

---

## Data & Privacy

- All data lives in your browser's `localStorage` — nothing is sent anywhere
- Use **Reports → Download Backup** to export a `.json` file for safekeeping
- Use **Reports → Import Backup** to restore data on another device or browser

---

## QuickBooks Export

The **QuickBooks IIF** export creates an importable file for QuickBooks Desktop:
- Only business trips are included
- Each trip is logged as a `Mileage Expense` with the IRS deduction amount
- The project name maps to the QuickBooks Class field
- Update **Settings → Vehicle Name** to appear in the Name field

---

## Tech Stack

- Vanilla HTML, CSS, JavaScript (ES Modules)
- No build tools, no frameworks, no dependencies
- `localStorage` for data persistence

---

## License

Personal use. All rights reserved.
