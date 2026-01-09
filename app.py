import os
from flask import Flask, render_template, jsonify, request
from models import db, Company

app = Flask(__name__)
# Use a local SQLite file
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'companies.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = True

db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/companies')
def get_companies():
    query = request.args.get('q', '').lower()
    name_exact = request.args.get('name_exact')
    verified_filter = request.args.get('verified') # 'true', 'false', or None
    country_filter = request.args.get('country')
    continent_filter = request.args.get('continent')
    
    q = Company.query
    
    search_mode = request.args.get('search_mode', 'fuzzy') # 'fuzzy' or 'name'

    if name_exact:
        q = q.filter(Company.name == name_exact)
    elif query:
        # Multi-Search: Split by comma (OR), then by space (AND)
        from sqlalchemy import or_, and_
        
        parts = query.split(',')
        or_conditions = []
        
        for part in parts:
            part = part.strip()
            if not part: continue
            
            terms = part.split()
            and_conditions = []
            for term in terms:
                term_clean = f'%{term}%'
                
                if search_mode == 'name':
                    # Search Name ONLY
                    and_conditions.append(Company.name.ilike(term_clean))
                else:
                    # Fuzzy: Name OR Address
                    and_conditions.append(
                        (Company.name.ilike(term_clean)) | 
                        (Company.full_address.ilike(term_clean))
                    )
            
            if and_conditions:
                or_conditions.append(and_(*and_conditions))
        
        if or_conditions:
            q = q.filter(or_(*or_conditions))
    
    if verified_filter == 'true':
        q = q.filter(Company.is_verified == True)
    elif verified_filter == 'false':
        q = q.filter(Company.is_verified == False) # Mismatches or unverified

    # Country & Continent Filters
    if country_filter and country_filter != 'all':
        q = q.filter(Company.input_country == country_filter)
        
    if continent_filter and continent_filter != 'all':
        q = q.filter(Company.continent == continent_filter)
        
    # Advanced Filters
    types = request.args.getlist('types')
    if types:
        # Case insensitive handling if possible, or just exact for now
        # We need to handle potential 'headquarter' vs 'Headquarter' mismatch normally
        # but let's assume UI sends what is in DB or we use ILIKE logic if complex
        # For efficiency, 'in_' is best if casing matches.
        # Let's normalize DB side? No, simpler to just use OR ILIKE if strictly needed, 
        # or just rely on the frontend sending correct values from a known list.
        # Let's try direct IN first. 
        # Actually, SQL Alchemy `in_` is case sensitive usually.
        # Let's use a list of ILIKEs combined with OR for robust matching
        from sqlalchemy import or_
        type_conditions = [Company.classification_type.ilike(f"%{t}%") for t in types]
        q = q.filter(or_(*type_conditions))

    relevances = request.args.getlist('relevances')
    if relevances:
        # Relevance is usually simple strings like 'low', 'high'
        # But DB might have mixed case.
        from sqlalchemy import or_
        rel_conditions = [Company.classification_relevance.ilike(t) for t in relevances]
        q = q.filter(or_(*rel_conditions))
        
    companies = q.limit(2000).all() # Increase limit when filtering by company
    return jsonify([c.to_dict() for c in companies])

@app.route('/api/locations')
def get_locations():
    # Get distinct available options
    continents = [r[0] for r in db.session.query(Company.continent).distinct().order_by(Company.continent).all() if r[0]]
    countries = [r[0] for r in db.session.query(Company.input_country).distinct().order_by(Company.input_country).all() if r[0]]
    
    return jsonify({
        'continents': continents,
        'countries': countries
    })

@app.cli.command('init-db')
def init_db():
    db.create_all()
    print("Database initialized.")

@app.cli.command('import-data')
def import_data_cmd():
    from utils.importer import import_data
    # Hardcoded filename for convenience, or argument
    file_path = 'locations_export_20251205_AJ adapted ALL 2.xlsx'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    import_data(file_path)

@app.cli.command('verify-locations')
def verify_locations_cmd():
    from utils.verifier import verify_locations
    # Limit to 5 for now to test
    verify_locations(limit=5)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', debug=False, port=8000)
