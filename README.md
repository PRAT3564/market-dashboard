# 📊 Real-Time Finance Market Dashboard

A lightweight, serverless market intelligence dashboard that provides a real-time overview of global macro assets, including US equity indices, Indian equity benchmarks, and precious metals prices denominated in both USD and INR.

Live Production URL: **https://prat3564.github.io/market-dashboard/**

---

## ⚡ Key Features

* **Dual-Currency Precious Metals Engine:** Dynamically calculates Gold and Silver rates in USD (per troy oz) and converts them to live INR valuations via an integrated exchange-rate pipeline.
* **Global Indices Tracking:** Displays market movements for major US markets (S&P 500, NASDAQ 100) alongside Indian indices (Nifty 50, BSE Sensex).
* **Automated Cloud Architecture:** Eliminates fragile local scheduling dependencies (like Windows Task Scheduler) by using cloud orchestration to scrape and sync data 24/7.
* **Modern UI Performance:** Using semantic HTML5, dark-mode CSS variables for structural panels, and modular vanilla JavaScript.

---

## 🏗️ System Architecture

The project leverages a fully decoupled, serverless system architecture designed to stay 100% operational regardless of your local machine's status:

```text
  ┌─────────────────────────────────────────────────────────────┐
  │ 🕒 1. THE AUTOMATION TRIGGER                                │
  │    GitHub Actions automatically wakes up every 3 hours.     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 🐍 2. THE PYTHON SCRAPER                                    │
  │    Runs scraper.py inside a cloud computer to fetch:        │
  │    - Indian Market Data from LiveMint                       │
  │    - US Market Data from MintGenie APIs                     │
  │    Then saves the fresh numbers into JSON files.            │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ ☁️ 3. THE STORAGE CLOUD (GitHub Repository)                 │
  │    The scraper saves the fresh JSON files back to your      │
  │    online code folder, instantly updating the database.     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 🖥️ 4. THE LIVE DASHBOARD (GitHub Pages)                     │
  │    Whenever your client opens the website link:            │
  │    - It instantly displays the webpage UI.                  │
  │    - market.js pulls the fresh numbers from the JSON files. │
  │    - It fetches live Gold/Silver prices directly to screen. │
  └─────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Directory Structure

```text
├── .github/workflows/
│   └── cron_scraper.yml    # GitHub Actions workflow running the 3-hour cron loop
├── index.html              # Core application user interface
├── market.css              # Frontend layout styling mapped via pure CSS custom tokens
├── market.js               # Application runtime controller handling layout rendering
├── scraper.py              # Python data extraction pipeline
├── requirements.txt        # Isolated environment package dependencies
├── indian_indices.json     # Live automated dataset for Indian market assets
└── us_indices.json         # Live automated dataset for US market assets
```

---

## 🚀 Local Development and Execution

To run or audit this project locally on your workstation:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PRAT3564/market-dashboard.git
   cd market-dashboard
   ```

2. **Initialize dependencies:**
   Make sure you have Python 3.9+ running. Install the pipeline library requirements:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the standalone extraction script:**
   ```bash
   python scraper.py
   ```
   *This will fresh-scrape the data targets and update `indian_indices.json` and `us_indices.json` locally.*

4. **Launch the Dashboard:**
   Simply open `index.html` directly in any web browser to view the operational dashboard rendering your data feeds.

---

## ⚙️ CI/CD Pipeline Automation (`cron_scraper.yml`)

The automated workflow engine runs inside a GitHub-hosted Linux container (`ubuntu-latest`) to manage structural performance. It implements the following logic:

* **Frequency Matrix:** Scheduled via cron syntax (`0 */3 * * *`) to fire precisely every three hours.
* **State Verification:** Before committing changes back to the root branch tree, the runner runs a delta check (`git diff-index --quiet HEAD`). If market values are unchanged (e.g., during weekend market closures), it safely exits without building a duplicate workflow loop.

---

## 🛡️ License and Disclaimers
* **Data Disclaimers:** All market asset prices are pulled through public endpoints and scraping mechanics. Data is provided for informational and educational purposes only and may lag behind live exchange values.
