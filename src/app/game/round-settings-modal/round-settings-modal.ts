import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RoundSettings {
  machines: number;
  organic: boolean;
  fertilizer: boolean;
  pesticide: boolean;
  organisms: boolean;
}

@Component({
  selector: 'app-round-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './round-settings-modal.html',
})
export class RoundSettingsModal {
  @Input() settings: RoundSettings = {
    machines: 0,
    organic: false,
    fertilizer: false,
    pesticide: false,
    organisms: false,
  };

  @Output() save = new EventEmitter<RoundSettings>();
  @Output() settingsCancelled = new EventEmitter<void>();

  submit() {
    this.save.emit(this.settings);
  }
}
