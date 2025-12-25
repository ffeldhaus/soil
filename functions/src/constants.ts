export const SOIL = {
    START: 80,
    FALLOW_RECOVERY: 0.05, // How much soil recovers if fallow
    CROP_ROTATION_BONUS: 0.04,
    CROP_ROTATION_PENALTY: -0.05,
    PLANTATION_GAINS: {
        Fieldbean: 0.02,
        Oat: 0.01,
        Rye: 0.01,
        Beet: 0.01,
        Grass: 0.03,
    } as Record<string, number>,
    PLANTATION_LOSSES: {
        Barley: -0.01,
        Potato: -0.02,
        Corn: -0.02,
        Wheat: -0.01,
        Beet: -0.01,
    } as Record<string, number>,
    FERTILIZER_SYNTHETIC_IMPACT: -0.06, // Long term negative impact of synthetic fertilizer
    PESTICIDE_IMPACT: -0.04,
    MACHINE_IMPACT: [0, -0.01, -0.03, -0.06, -0.10], // Impact per machine level 0-4
    MONOCULTURE_PENALTY: -0.04,
    WEATHER_IMPACT: {
        Normal: 0,
        Drought: -0.03,
        Flood: -0.05,
    } as Record<string, number>,
};

export const NUTRITION = {
    START: 80,
    MAX: 200,
    BASE_DECLINE: 0.1,
    FERTILIZER_SYNTHETIC: 60, // Flat gain
    FERTILIZER_ORGANIC: 40,    // Gain from animals/manure
    FIELDBEAN_BONUS: 20,       // Nitrogen fixation
    ANIMALS_REQUIRED_RATIO: 0.2, // 20% of parcels should be animals for organic nutrition
};

export const MACHINE_FACTORS = {
    YIELD_BONUS: [0, 0.05, 0.12, 0.20, 0.30], // More machines = more yield
    LABOR_COST_REDUCTION: [1, 0.9, 0.75, 0.6, 0.5], // More machines = less labor cost
    BASE_LABOR_COST: 1000,
    INVESTMENT_COST: [0, 500, 1500, 4000, 10000],
};

export const WEATHER_EFFECTS: Record<string, { yield: number, soil: number }> = {
    'Normal': { yield: 1.0, soil: 0 },
    'Drought': { yield: 0.7, soil: -0.03 },
    'Flood': { yield: 0.6, soil: -0.05 },
    'Storm': { yield: 0.8, soil: -0.02 },
};

export const VERMIN_EFFECTS: Record<string, { yield: number, organic_multiplier: number }> = {
    'None': { yield: 1.0, organic_multiplier: 1.0 },
    'Pests': { yield: 0.7, organic_multiplier: 1.2 }, // Pests hit conventional harder if no pesticide? 
    // Wait, organic beneficial organisms are 100 costs.
};

export const HARVEST_YIELD = {
    Animals: 0,
    Grass: 0,
    Fallow: 0,
    Fieldbean: 60,
    Barley: 95,
    Oat: 70,
    Potato: 370,
    Corn: 110,
    Rye: 100,
    Wheat: 115,
    Beet: 570,
} as const;

export const HARVEST_SOIL_SENSITIVITY = {
    Fieldbean: 0.8,
    Barley: 1.1,
    Oat: 0.9,
    Potato: 1.3,
    Corn: 1.2,
    Rye: 0.9,
    Wheat: 1.2,
    Beet: 1.1,
    Grass: 0.5,
} as const;

export const HARVEST_NUTRITION_SENSITIVITY = {
    Fieldbean: 0.5,
    Barley: 0.9,
    Oat: 0.8,
    Potato: 1.4,
    Corn: 1.2,
    Rye: 0.8,
    Wheat: 1.3,
    Beet: 1.3,
    Grass: 0.4,
} as const;

export const CROP_SEQUENCE_MATRIX: Record<string, Record<string, 'good' | 'ok' | 'bad'>> = {
    Fieldbean: { Grass: 'good', Fallow: 'good', Fieldbean: 'bad', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
    Barley: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'bad', Oat: 'bad', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'ok' },
    Oat: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'bad', Potato: 'ok', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'ok' },
    Potato: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'ok', Oat: 'ok', Potato: 'bad', Corn: 'ok', Rye: 'ok', Wheat: 'ok', Beet: 'ok' },
    Corn: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'bad', Oat: 'ok', Potato: 'good', Corn: 'bad', Rye: 'bad', Wheat: 'bad', Beet: 'good' },
    Rye: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'ok', Rye: 'bad', Wheat: 'ok', Beet: 'ok' },
    Wheat: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'bad', Oat: 'ok', Potato: 'good', Corn: 'good', Rye: 'bad', Wheat: 'bad', Beet: 'good' },
    Beet: { Grass: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'ok', Oat: 'ok', Potato: 'good', Corn: 'ok', Rye: 'ok', Wheat: 'ok', Beet: 'bad' },
    Fallow: { Grass: 'good', Fallow: 'good', Fieldbean: 'ok', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
    Grass: { Grass: 'bad', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
};

export const EXPENSES = {
    SEEDS: {
        Fieldbean: { organic: 144, conventional: 120 },
        Barley: { organic: 85, conventional: 68 },
        Oat: { organic: 75, conventional: 60 },
        Potato: { organic: 133, conventional: 110 },
        Corn: { organic: 84, conventional: 70 },
        Rye: { organic: 95, conventional: 76 },
        Wheat: { organic: 90, conventional: 72 },
        Beet: { organic: 144, conventional: 120 },
    } as Record<string, { organic: number, conventional: number }>,
    RUNNING: {
        ORGANIC_CONTROL: 200,
        FERTILIZE: 50,
        PESTICIDE: 50,
        ORGANISMS: 100,
        ANIMALS: 150,
        BASE_CONVENTIONAL: 500,
        BASE_ORGANIC: 700,
    }
};

export const PRICES = {
    Fieldbean: { organic: 21, conventional: 18 },
    Barley: { organic: 14.5, conventional: 13 },
    Oat: { organic: 14, conventional: 12 },
    Potato: { organic: 5, conventional: 4 },
    Corn: { organic: 17, conventional: 15 },
    Rye: { organic: 14.5, conventional: 13 },
    Wheat: { organic: 17, conventional: 15 },
    Beet: { organic: 2.5, conventional: 2 },
} as Record<string, { organic: number, conventional: number }>;
