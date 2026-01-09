# Company Location Inspector 🌍📍

A powerful interactive tool for visualizing, verifying, and analyzing company facility locations. This application helps logistics managers and analysts verify address accuracy (`is_verified` status), filter by economic data (ELO, Area), and identify geocoding discrepancies on a global scale.

![Map Preview](./uploaded_image_1767907855445.png)

## ✨ Features

### 🗺️ Interactive Visualization
*   **Smart Pins:** Color-coded markers indicate status immediately:
    *   🟢 **Green:** Verified (<1km error)
    *   🔴 **Red:** Mismatch (>1km error)
    *   🔵 **Blue:** Unverified
*   **Clustering:** Dynamic clustering handles high-density areas (zoom to disperse).
*   **Rich Details:** Popups display Address, Type, ELO Rating, Area size, and exact distance error.

### 🔍 Advanced Filtering
*   **Location:** Filter by **Continent** (Europe, Asia, etc.) and **Country**.
*   **Type:** Toggle visibility for specific facility types (Factory 🏭, Office 💼, Store 🛒).
*   **Metrics:** Filter by minimum **ELO Rating** (Data Reliability) or **Estimated Area** (m²).
*   **Text Search:** Supports fuzzy matching and strict "Name Only" mode.

### 📊 Data Analysis
*   **Table View:** Switch to a spreadsheet-like view to sort by ELO, Area, or Name.
*   **Export:** Download the currently filtered dataset as a **CSV** file.
*   **Deep Linking:** Jump directly to external ESG reports via the Ucoin ID.

---

## 🚀 Getting Started

### Option 1: Python Web App (Recommended for Development)
The full application with a backend API (Flask) allows for dynamic data reloading and easy debugging.

1.  **Install Requirements:**
    ```bash
    pip install -r requirements.txt
    ```
    *(Requires Flask, SQLAlchemy, Pandas, GeoPy)*

2.  **Run the Server:**
    ```bash
    # Run securely on Port 8000
    python3 app.py
    ```

3.  **Access:** Open [http://127.0.0.1:8000](http://127.0.0.1:8000)

### Option 2: Static "AirDrop" App (Offline)
A single-file HTML version that requires **no server**. Perfect for sharing via email or USB.

*   **Location:** `static-app/dist/index.html`
*   **Usage:** Double-click the file to open it in any browser (Chrome/Edge/Safari).
*   **Note:** This file contains the snapshot of database data embedded within it (~17MB).

---

## 🛠️ Data Management

### Importing Data
To load new company data from an Excel file:
```bash
export FLASK_APP=app.py
flask import-data
```
*Reads from `locations_export_adapted.xlsx` by default.*

### Updating the Static App
If you update the database and want to generate a new Offline HTML file:
```bash
# 1. Export DB to JSON
python3 utils/export_json.py

# 2. Copy to Static App
cp companies.json static-app/src/companies.json

# 3. Build
cd static-app
npm install
npm run build
```

---

## 🏗️ Tech Stack
*   **Backend:** Python 3.12 (Flask, SQLAlchemy)
*   **Frontend:** TypeScript (Vite), Vanilla HTML/CSS
*   **Map:** Leaflet.js + OpenStreetMap
*   **Database:** SQLite

---

## 🔒 Security
*   **Local Execution:** This tool is designed to run locally. No data is sent to external cloud servers (except for standard OSM map tiles).
*   **Port Binding:** The Python app binds to `0.0.0.0` to allow access from local network devices (e.g., viewing on an iPad via LAN IP).
