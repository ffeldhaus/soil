"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRICES = exports.EXPENSES = exports.CROP_SEQUENCE_MATRIX = exports.HARVEST_NUTRITION_SENSITIVITY = exports.HARVEST_SOIL_SENSITIVITY = exports.HARVEST_YIELD = exports.NUTRITION = exports.SOIL = void 0;
exports.SOIL = {
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
exports.NUTRITION = {
    START: 80,
    DECLINE: 0.15,
    FERTILIZE: 0.5,
    ANIMALS: 0.3,
    FIELDBEAN: 0.1,
};
exports.HARVEST_YIELD = {
    Animals: 0,
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
    Fieldbean: 1.0,
    Barley: 1.2,
    Oat: 1.0,
    Potato: 1.2,
    Corn: 1.0,
    Rye: 1.0,
    Wheat: 1.2,
    Beet: 1.0,
};
exports.HARVEST_NUTRITION_SENSITIVITY = {
    Fieldbean: 0.8,
    Barley: 0.8,
    Oat: 1.0,
    Potato: 1.2,
    Corn: 1.0,
    Rye: 0.8,
    Wheat: 1.2,
    Beet: 1.2,
};
exports.CROP_SEQUENCE_MATRIX = {
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
        ORGANIC_CONTROL: 200,
        FERTILIZE: 50,
        PESTICIDE: 50,
        ORGANISMS: 100,
        ANIMALS: 200,
        BASE_CONVENTIONAL: 500,
        BASE_ORGANIC: 700,
    }
};
exports.PRICES = {
    Fieldbean: { organic: 21, conventional: 18 },
    Barley: { organic: 14.5, conventional: 13 },
    Oat: { organic: 14, conventional: 12 },
    Potato: { organic: 5, conventional: 4 },
    Corn: { organic: 17, conventional: 15 },
    Rye: { organic: 14.5, conventional: 13 },
    Wheat: { organic: 17, conventional: 15 },
    Beet: { organic: 2.5, conventional: 2 },
};
//# sourceMappingURL=constants.js.map