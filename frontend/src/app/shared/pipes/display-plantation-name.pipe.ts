import { Pipe, PipeTransform } from '@angular/core';
import { PlantationType } from '../../core/models/parcel.model'; // Adjust path

@Pipe({
  name: 'displayPlantationName',
  standalone: true,
})
export class DisplayPlantationNamePipe implements PipeTransform {
  private nameMap: Record<string, string> = {
    [PlantationType.FALLOW.valueOf()]: 'Brachland',
    [PlantationType.FIELD_BEAN.valueOf()]: 'Ackerbohne',
    [PlantationType.BARLEY.valueOf()]: 'Gerste',
    [PlantationType.OAT.valueOf()]: 'Hafer',
    [PlantationType.POTATO.valueOf()]: 'Kartoffel',
    [PlantationType.CORN.valueOf()]: 'Mais',
    [PlantationType.RYE.valueOf()]: 'Roggen',
    [PlantationType.ANIMAL_HUSBANDRY.valueOf()]: 'Tiere',
    [PlantationType.WHEAT.valueOf()]: 'Weizen',
    [PlantationType.SUGAR_BEET.valueOf()]: 'Zuckerrübe',
  };

  transform(value: PlantationType | string | undefined | null): string {
    if (!value) return 'N/A';
    const key = typeof value === 'string' ? value : value.valueOf();
    return this.nameMap[key] || key;
  }
}
