import { DisplayPlantationNamePipe } from './display-plantation-name.pipe';
import { PlantationType } from '../../core/models/parcel.model';

describe('DisplayPlantationNamePipe', () => {
  let pipe: DisplayPlantationNamePipe;

  beforeEach(() => {
    pipe = new DisplayPlantationNamePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "N/A" for null input', () => {
    expect(pipe.transform(null)).toBe('N/A');
  });

  it('should return "N/A" for undefined input', () => {
    expect(pipe.transform(undefined)).toBe('N/A');
  });

  it('should return the correct name for PlantationType.FALLOW', () => {
    expect(pipe.transform(PlantationType.FALLOW)).toBe('Brachland');
  });

  it('should return the correct name for PlantationType.FIELD_BEAN', () => {
    expect(pipe.transform(PlantationType.FIELD_BEAN)).toBe('Ackerbohne');
  });

  it('should return the correct name for PlantationType.BARLEY', () => {
    expect(pipe.transform(PlantationType.BARLEY)).toBe('Gerste');
  });
  
  it('should return the correct name for PlantationType.OAT', () => {
    expect(pipe.transform(PlantationType.OAT)).toBe('Hafer');
  });

  it('should return the correct name for PlantationType.POTATO', () => {
    expect(pipe.transform(PlantationType.POTATO)).toBe('Kartoffel');
  });

  it('should return the correct name for PlantationType.CORN', () => {
    expect(pipe.transform(PlantationType.CORN)).toBe('Mais');
  });

  it('should return the correct name for PlantationType.RYE', () => {
    expect(pipe.transform(PlantationType.RYE)).toBe('Roggen');
  });

  it('should return the correct name for PlantationType.ANIMAL_HUSBANDRY', () => {
    expect(pipe.transform(PlantationType.ANIMAL_HUSBANDRY)).toBe('Tiere');
  });

  it('should return the correct name for PlantationType.WHEAT', () => {
    expect(pipe.transform(PlantationType.WHEAT)).toBe('Weizen');
  });

  it('should return the correct name for PlantationType.SUGAR_BEET', () => {
    // Note: The enum value is "Zuckerruebe", the map key is "Zuckerruebe", the map value is "Zuckerrübe"
    expect(pipe.transform(PlantationType.SUGAR_BEET)).toBe('Zuckerrübe');
  });

  it('should return the input string if it is not a known PlantationType string value', () => {
    expect(pipe.transform('UNKNOWN_PLANTATION_VALUE')).toBe('UNKNOWN_PLANTATION_VALUE');
  });
  
  it('should return the input string if it is an enum member name like "BARLEY" but not its value', () => {
    // This tests if providing the *name* of an enum member as a string (which is not its value)
    // correctly falls back to returning the input string itself.
    // PlantationType.BARLEY has the value "Gerste".
    // The key in nameMap for Barley is "Gerste".
    // So, inputting "BARLEY" (the enum member name) should not find a map entry.
    expect(pipe.transform("BARLEY")).toBe("BARLEY");
  });

  // This test remains valid as PlantationType.CORN.valueOf() will give the actual enum string value
  it('should handle string versions of enum values (from valueOf)', () => {
    // PlantationType.CORN has the value "Mais". PlantationType.CORN.valueOf() is "Mais".
    // The key in nameMap for Corn is "Mais".
    expect(pipe.transform(PlantationType.CORN.valueOf())).toBe('Mais');
  });
});
