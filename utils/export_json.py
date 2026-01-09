import json
import os
import sys

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Company

def export_companies_to_json(output_path='companies.json'):
    """
    Exports all companies from the SQLite database to a JSON file.
    """
    with app.app_context():
        companies = Company.query.all()
        data = [c.to_dict() for c in companies]
        
        # Ensure full output path exists or just write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully exported {len(data)} companies to {output_path}")

if __name__ == "__main__":
    # Default export to current directory for now
    export_companies_to_json('companies.json')
