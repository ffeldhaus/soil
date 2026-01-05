"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICES = exports.EXPENSES = exports.CROP_SEQUENCE_MATRIX = exports.HARVEST_NUTRITION_SENSITIVITY = exports.HARVEST_SOIL_SENSITIVITY = exports.HARVEST_YIELD = exports.VERMIN_EFFECTS = exports.WEATHER_EFFECTS = exports.MACHINE_FACTORS = exports.NUTRITION = exports.SOIL = void 0;
exports.SOIL = {
    START: 80,
    FALLOW_RECOVERY: 0.3,
    CROP_ROTATION_BONUS: 0.02,
    CROP_ROTATION_PENALTY: -0.02,
    PLANTATION_GAINS: {
        Fieldbean: 0.05,
        Oat: 0.015,
        Rye: 0.015,
        Beet: 0.01,
        Grass: 0.06,
    },
    PLANTATION_LOSSES: {
        Barley: -0.005,
        Potato: -0.01,
        Corn: -0.01,
        Wheat: -0.005,
        Beet: -0.005,
    },
    FERTILIZER_SYNTHETIC_IMPACT: -0.04, // Increased from -0.01 to penalize chemical dependence
    PESTICIDE_IMPACT: -0.02, // Increased from -0.01
    MACHINE_IMPACT: [0, -0.002, -0.01, -0.05, -0.1],
    ORGANISMS_SOIL_BONUS: 0.005,
    MONOCULTURE_PENALTY: -0.06, // Increased from -0.04
    NUTRITION_OVER_PENALTY_START: 110,
    NUTRITION_OVER_PENALTY_FACTOR: -0.002, // Increased from -0.001
    SYNTHETIC_BURN_THRESHOLD: 100,
    SYNTHETIC_BURN_PENALTY: -0.05, // Increased from -0.03
};
exports.NUTRITION = {
    START: 80,
    MAX: 150,
    BASE_DECLINE: 0.12, // Increased decline per harvest
    FERTILIZER_SYNTHETIC: 40, // Reduced from 50
    FERTILIZER_ORGANIC: 35,
    FIELDBEAN_BONUS: 20,
    ANIMALS_REQUIRED_RATIO: 0.2,
};
exports.MACHINE_FACTORS = {
    YIELD_BONUS: [0, 0.12, 0.3, 0.55, 0.85], // Increased yield boost for higher tech
    LABOR_COST_REDUCTION: [1, 0.75, 0.5, 0.3, 0.1], // Massive labor reduction for Lv 4
    BASE_LABOR_COST: 1500, // Higher base labor cost
    INVESTMENT_COST: [0, 400, 1500, 4000, 10000], // Higher investment for Lv 2-4
};
exports.WEATHER_EFFECTS = {
    Normal: { yield: 1.0, soil: 0 },
    Drought: { yield: 0.7, soil: -0.01 },
    Flood: { yield: 0.6, soil: -0.02 },
    Storm: { yield: 0.8, soil: -0.01 },
};
exports.VERMIN_EFFECTS = {
    None: { yield: 1.0, organic_multiplier: 1.0 },
    Pests: { yield: 0.7, organic_multiplier: 1.2 },
};
exports.HARVEST_YIELD = {
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
};
exports.HARVEST_SOIL_SENSITIVITY = {
    Fieldbean: 1.2,
    Barley: 1.5,
    Oat: 1.4,
    Potato: 2.0, // Extremely sensitive
    Corn: 1.8,
    Rye: 1.2,
    Wheat: 1.8,
    Beet: 1.6,
    Grass: 0.8,
};
exports.HARVEST_NUTRITION_SENSITIVITY = {
    Fieldbean: 0.5,
    Barley: 0.8,
    Oat: 0.7,
    Potato: 1.2,
    Corn: 1.0,
    Rye: 0.7,
    Wheat: 1.1,
    Beet: 1.1,
    Grass: 0.4,
};
exports.CROP_SEQUENCE_MATRIX = {
    Fieldbean: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'bad',
        Barley: 'good',
        Oat: 'good',
        Potato: 'good',
        Corn: 'good',
        Rye: 'good',
        Wheat: 'good',
        Beet: 'good',
    },
    Barley: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'bad',
        Oat: 'bad',
        Potato: 'good',
        Corn: 'good',
        Rye: 'good',
        Wheat: 'good',
        Beet: 'ok',
    },
    Oat: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'good',
        Oat: 'bad',
        Potato: 'ok',
        Corn: 'good',
        Rye: 'good',
        Wheat: 'good',
        Beet: 'ok',
    },
    Potato: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'ok',
        Oat: 'ok',
        Potato: 'bad',
        Corn: 'ok',
        Rye: 'ok',
        Wheat: 'ok',
        Beet: 'ok',
    },
    Corn: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'bad',
        Oat: 'ok',
        Potato: 'good',
        Corn: 'bad',
        Rye: 'bad',
        Wheat: 'bad',
        Beet: 'good',
    },
    Rye: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'good',
        Oat: 'good',
        Potato: 'good',
        Corn: 'ok',
        Rye: 'bad',
        Wheat: 'ok',
        Beet: 'ok',
    },
    Wheat: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'bad',
        Oat: 'ok',
        Potato: 'good',
        Corn: 'good',
        Rye: 'bad',
        Wheat: 'bad',
        Beet: 'good',
    },
    Beet: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'ok',
        Oat: 'ok',
        Potato: 'good',
        Corn: 'ok',
        Rye: 'ok',
        Wheat: 'ok',
        Beet: 'bad',
    },
    Fallow: {
        Grass: 'good',
        Fallow: 'good',
        Fieldbean: 'ok',
        Barley: 'good',
        Oat: 'good',
        Potato: 'good',
        Corn: 'good',
        Rye: 'good',
        Wheat: 'good',
        Beet: 'good',
    },
    Grass: {
        Grass: 'bad',
        Fallow: 'good',
        Fieldbean: 'good',
        Barley: 'good',
        Oat: 'good',
        Potato: 'good',
        Corn: 'good',
        Rye: 'good',
        Wheat: 'good',
        Beet: 'good',
    },
};
exports.EXPENSES = {
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
        ORGANIC_CONTROL: 300, // Increased from 200
        FERTILIZE: 50,
        PESTICIDE: 50,
        ORGANISMS: 100,
        ANIMALS: 120, // Increased from 100
        BASE_CONVENTIONAL: 400,
        BASE_ORGANIC: 900, // Increased from 800
    },
};
exports.PRICES = {
    Fieldbean: { organic: 24, conventional: 20 },
    Barley: { organic: 16, conventional: 15 }, // +1 conv
    Oat: { organic: 16, conventional: 14 }, // +1 conv
    Potato: { organic: 6, conventional: 5.5 }, // +0.5 conv
    Corn: { organic: 18, conventional: 18 }, // Match prices for volume crops
    Rye: { organic: 16, conventional: 15 }, // +1 conv
    Wheat: { organic: 20, conventional: 20 }, // Match prices
    Beet: { organic: 3, conventional: 2.8 }, // +0.3 conv
};
//# sourceMappingURL=constants.js.map