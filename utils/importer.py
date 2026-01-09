import pandas as pd
import math
from models import db, Company
from utils.geo_mapping import get_continent

def safe_float(val):
    if pd.isna(val):
        return None
    try:
        return float(val)
    except:
        return None

def safe_str(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def import_data(file_path):
    print(f"Importing from {file_path}...")
    try:
        # Force company_id to be string to preserve leading zeros
        df = pd.read_excel(file_path, dtype={'company_id': str})
    except Exception as e:
        print(f"Error reading excel: {e}")
        return

    # Clear existing data? Or upsert? For now, clear to be safe/simple
    # In production, we might want to be smarter.
    # db.session.query(Company).delete()
    # db.session.commit()
    # Actually, let's just append and let user clear if they want, 
    # but for this first iteration, maybe just checking if DB is empty is enough.
    
    count = 0
    for _, row in df.iterrows():
        # Map columns
        company = Company(
            name=safe_str(row.get('company_name')),
            full_address=safe_str(row.get('geocoding_address')),
            input_street=safe_str(row.get('Street address')),
            input_zip=safe_str(row.get('zipcode')),
            input_city=safe_str(row.get('City Name')),
            input_country=safe_str(row.get('country name')),
            lat=safe_float(row.get('geocoding_lat')),
            lon=safe_float(row.get('geocoding_lon')),
            classification_type=safe_str(row.get('classification_location_type')),
            classification_relevance=safe_str(row.get('classification_economic_relevance')),
            classification_description=safe_str(row.get('classification_description')),
            elo_rating=safe_float(row.get('elo_rating')),
            estimated_area=safe_float(row.get('estimated_area')),
            ucoin_id=safe_str(row.get('company_id')),
            osm_link=safe_str(row.get('osm_link')),
            continent=get_continent(safe_str(row.get('country name')))
        )
        db.session.add(company)
        count += 1
        
        if count % 100 == 0:
            print(f"Processed {count} rows...")
            db.session.commit()
    
    db.session.commit()
    print(f"Successfully imported {count} companies.")
