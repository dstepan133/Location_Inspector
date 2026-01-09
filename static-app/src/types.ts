export interface Verification {
    verified: boolean;
    distance_error: number;
    geo_lat?: number;
    geo_lon?: number;
}

export interface Company {
    id: number;
    name: string;
    full_address: string;
    lat: number;
    lon: number;
    continent?: string;
    input_country?: string;
    ucoin_id?: string;
    elo_rating?: number;
    estimated_area?: number;
    is_verified: boolean;
    classification_type: string;
    classification_relevance: string;
    classification_description?: string;
    verification: Verification;
}
