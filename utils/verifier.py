import time
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from models import db, Company

def get_geocoder():
    # User agent is required by Nominatim
    return Nominatim(user_agent="my_company_locator_app_v1")

def verify_locations(limit=10, sleep_time=1.1):
    geolocator = get_geocoder()
    
    # Fetch unverified companies with valid addresses
    # (Checking those where is_verified is False and geo_lat is None to avoid re-checking processed ones)
    companies = Company.query.filter(
        Company.geo_lat == None,
        Company.input_street != None
    ).limit(limit).all()
    
    if not companies:
        print("No unverified companies found.")
        return

    print(f"Verifying {len(companies)} companies...")
    
    count = 0
    for c in companies:
        # Construct search query
        # Using structured query is better for Nominatim if we have parts
        query = {
            'street': c.input_street,
            'postalcode': c.input_zip,
            'city': c.input_city,
            'country': c.input_country
        }
        
        # Fallback to full address string if parts are missing
        address_str = c.full_address
        
        try:
            print(f"Checking: {c.name} - {address_str}")
            location = geolocator.geocode(query if c.input_street else address_str, timeout=10)
            
            if location:
                c.geo_lat = location.latitude
                c.geo_lon = location.longitude
                
                # Calculate distance if we have original coords
                if c.lat and c.lon:
                    dist = geodesic((c.lat, c.lon), (c.geo_lat, c.geo_lon)).meters
                    c.distance_error = dist
                    
                    # Assume verified if within 100 meters
                    if dist < 1000:
                        c.is_verified = True
                        print(f"  -> VERIFIED! Distance: {dist:.1f}m")
                    else:
                        c.is_verified = False
                        print(f"  -> MISMATCH! Distance: {dist:.1f}m")
                else:
                    print("  -> Found coords, but no original coords to compare.")
                    c.is_verified = False # Or Null?
                    
            else:
                print("  -> Not found.")
                # Mark as processed but not found? 
                # Maybe set geo_lat to 0 or something special? 
                # For now leave None so we can retry, or add a 'last_checked' column later.
            
            db.session.commit()
            count += 1
            time.sleep(sleep_time) # Respect policy
            
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            print(f"  -> Error: {e}")
            time.sleep(2) # Backoff
            
    print(f"Verification batch complete. Processed {count}.")
