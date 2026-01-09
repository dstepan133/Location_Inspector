# Company Location Inspector - Project Documentation

## Overview
The **Company Location Inspector** is a web-based tool designed to visualize, verify, and manage company location data on an interactive map. It helps analysts and logistics managers verify address accuracy, filter locations by economic relevance or type, and identify geocoding mismatches.

## Features

### 1. Interactive Map Visualization
*   **Pins:** Locations are represented by color-coded pins:
    *   🟢 **Green:** Verified (Address matches GPS within 1km).
    *   🔴 **Red:** Mismatch (GPS is >1km away from address).
    *   🔵 **Blue:** Unverified (Not yet checked).
    *   🟡 **Yellow:** Geocoded Location (Corrected location for mismatches).
*   **Icons:** Each pin contains a specific icon representing the facility type (e.g., Factory 🏭, Store 🛒, Office 💼).
*   **Clustering:** Pins cluster together when zoomed out and break apart into individual locations at zoom level 12 (City View) or when very close.
*   **Customization:** Users can toggle pin sizes (Small, Medium, Large) via the sidebar.

### 2. Sidebar Controls
*   **Search Bar:** Search for companies by name or address. Toggle "Strict Name Search" for precise matching.
*   **Filter by Verified Status:** "Show All", "Verified Only" (Green), "Issues Only/Mismatch" (Red).
*   **Filter by Metrics:** Enter a minimum value for ELO Rating or Area (m²) to filter the list.
*   **Filter by Relevance:** Select High, Medium, or Low economic relevance.

### 3. Advanced Search
*   **Multi-Term Search:** Search for multiple companies or attributes at once by separating terms with a comma (e.g., `Tesla, Gigafactory` finds results matching *either* term).
*   **Search Modes:**
    *   **Fuzzy (Default):** Searches both Company Name and Address.
    *   **Strict Name Only:** Ignores address fields to prevent false positives (e.g., preventing "A1" from matching every address with "A1" in it).

### 4. Filtering & Sorting
*   **Advanced Filters:**
    *   **Type:** Filter by facility type (Production, Office, Logistics, etc.).
    *   *Multiple selections allowed.*
*   **Sorting:** Sort the list by Name, Economic Relevance, or Type.
*   **Export:** Click **"Export to CSV"** to download the currently filtered list as a CSV file for Excel/Sheets.

### 5. Table View
*   Click **"View as Table"** to see the currently filtered dataset in a structured tabular format.
*   Columns: Name, Ucoin ID, Relevance, Type, ELO Rating, Area (m²), Address, Status.
*   **Interaction:** Clicking a row closes the table, filters the map to that company, and zooms directly to the selected location. Clicking the Ucoin ID opens the creditLab ESG page.

### 6. Data Verification
*   **Threshold:** A location is flagged as a "Mismatch" only if the distance between the provided coordinates and the geocoded address is greater than **1000 meters (1km)**.
*   **Popup Info:** Mismatch pins display the exact distance error (e.g., `⚠️ Mismatch: ~1.2km discrepancy`) in the popup.

## Technical Stack
*   **Backend:** Python (Flask), SQLAlchemy (SQLite).
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
*   **Map Engine:** Leaflet.js with OpenStreetMap tiles.
*   **Geocoding:** Nominatim (via GeoPy).
*   **Icons:** FontAwesome.

## Setup & Running

1.  **Prerequisites:** Python 3.x installed.
2.  **Install Dependencies:**
    ```bash
    pip install flask sqlalchemy pandas openpyxl geopy requests
    ```
3.  **Run the Application:**
    Navigate to the project directory and run:
    ```bash
    export FLASK_APP=app.py
    python3 -m flask run
    ```
4.  **Access:** Open your browser to `http://127.0.0.1:5000`.

## Security & Restrictions
*   The application processes all data locally (or via the local Flask server). No data is sent to external servers except for map tiles (OpenStreetMap).

## Static "AirDrop" Version
For environments where Python cannot be run, a **Static, Serverless Version** is available.
1.  **Usage:** Locate the file `static-app/dist/index.html`.
2.  **Deploy:** Simply share this single HTML file via email, USB, or AirDrop.
3.  **Run:** Open it in any modern web browser (Edge, Chrome, Safari). It contains all company data and logic embedded within itself.
4.  **Note:** This version is "Read-Only based on the export". To update data, you must run the Python export script (`utils/export_json.py`) and rebuild (`npm run build`).

## Database Schema
The `companies.db` SQLite database contains a `company` table with:
*   `id`: Primary Key
*   `name`: Company Name
*   `input_street`, `input_city`, `input_zip`, `input_country`: Address components
*   `lat`, `lon`: Original coordinates
*   `geo_lat`, `geo_lon`: Verified/Geocoded coordinates
*   `is_verified`: Boolean status
*   `classification_type`: Type (Store, Office, etc.)
*   `classification_relevance`: Economic importance (High, Medium, Low)
*   `classification_description`: Text description
*   `ucoin_id`: Internal Company ID (Linkable)
*   `elo_rating`: Reliability Score (0-1000+)
*   `estimated_area`: Facility Size (m²)
*   `verification`: JSON Object containing distance error and verification details
