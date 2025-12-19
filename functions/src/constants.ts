export const SOIL = {
    START: 80,
    FALLOW: 0.1,
    CROPSEQUENCE: 0.03,
    PLANTATION: 0.02,
    FERTILIZE: 0.05,
    ANIMALS: 0.02,
    PESTICIDE: 0.04,
    MACHINE: 0.05,
    MONOCULTURE: 0.02,
    FLOOD: 0.05,
    DROUGHT: 0.03,
};

export const NUTRITION = {
    START: 80,
    DECLINE: 0.15,
    FERTILIZE: 0.5,
    ANIMALS: 0.3,
    FIELDBEAN: 0.1,
};

export const HARVEST_YIELD = {
    Animals: 0,
    Fallow: 0, // Brachland
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
    Fieldbean: 1.0,
    Barley: 1.2,
    Oat: 1.0,
    Potato: 1.2,
    Corn: 1.0,
    Rye: 1.0,
    Wheat: 1.2,
    Beet: 1.0,
} as const;

export const HARVEST_NUTRITION_SENSITIVITY = {
    Fieldbean: 0.8,
    Barley: 0.8,
    Oat: 1.0,
    Potato: 1.2,
    Corn: 1.0,
    Rye: 0.8,
    Wheat: 1.2,
    Beet: 1.2,
} as const;

export const CROP_SEQUENCE_MATRIX: Record<string, Record<string, 'good' | 'ok' | 'bad'>> = {
    // Mapping logic from 'CROPSEQUENCE' in Ruby
    // Using English keys: Fieldbean, Barley, Oat, Potato, Corn, Rye, Wheat, Beet, Fallow, Animals
    // Simplified for brevity, will implement full matrix in logic or here
    Fieldbean: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
    Barley: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'ok', Oat: 'bad', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'ok' },
    Oat: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'bad', Potato: 'ok', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'ok' },
    Potato: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'ok', Oat: 'ok', Potato: 'bad', Corn: 'ok', Rye: 'ok', Wheat: 'ok', Beet: 'ok' },
    Corn: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'bad', Oat: 'ok', Potato: 'good', Corn: 'good', Rye: 'bad', Wheat: 'bad', Beet: 'good' },
    Rye: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'ok', Rye: 'good', Wheat: 'ok', Beet: 'ok' },
    Wheat: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'bad', Oat: 'ok', Potato: 'good', Corn: 'good', Rye: 'bad', Wheat: 'bad', Beet: 'good' },
    Beet: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'ok', Oat: 'ok', Potato: 'good', Corn: 'ok', Rye: 'ok', Wheat: 'ok', Beet: 'bad' },
    Fallow: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
    Animals: { Animals: 'good', Fallow: 'good', Fieldbean: 'good', Barley: 'good', Oat: 'good', Potato: 'good', Corn: 'good', Rye: 'good', Wheat: 'good', Beet: 'good' },
};

// ... EXPENSES, SEEDS, etc. to be added.
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
    },
    RUNNING: {
        ORGANIC_CONTROL: 200,
        FERTILIZE: 50, // Per parcel? Ruby says: 40 * RUNNINGCOSTS_FERTILIZE (-50) ? No, Ruby: 40 * -50. So 50 per field.
        PESTICIDE: 50,
        ORGANISMS: 100,
        ANIMALS: 200, // Per animal unit? "animals * RUNNINGCOSTS_ANIMALS" where animals is count/40 * 8?
        BASE_CONVENTIONAL: 500, // Per 40 parcels
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
};
