from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    full_address = db.Column(db.String(500))
    
    input_street = db.Column(db.String(255))
    input_zip = db.Column(db.String(20))
    input_city = db.Column(db.String(100))
    input_country = db.Column(db.String(100))
    continent = db.Column(db.String(50), nullable=True)
    
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    
    classification_type = db.Column(db.String(100))
    classification_relevance = db.Column(db.String(50))
    classification_description = db.Column(db.String(600))
    osm_link = db.Column(db.String(500))
    elo_rating = db.Column(db.Float, nullable=True)
    estimated_area = db.Column(db.Float, nullable=True)
    ucoin_id = db.Column(db.String(50), nullable=True)
    
    # Verification
    geo_lat = db.Column(db.Float, nullable=True)
    geo_lon = db.Column(db.Float, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    distance_error = db.Column(db.Float, nullable=True) # in meters
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'full_address': self.full_address,
            'lat': self.lat,
            'lon': self.lon,
            'classification_type': self.classification_type,
            'classification_relevance': self.classification_relevance,
            'classification_description': self.classification_description,
            'elo_rating': self.elo_rating,
            'estimated_area': self.estimated_area,
            'ucoin_id': self.ucoin_id,
            'continent': self.continent,
            'input_country': self.input_country,
            'verification': {
                'verified': self.is_verified,
                'distance_error': self.distance_error,
                'geo_lat': self.geo_lat,
                'geo_lon': self.geo_lon
            }
        }
