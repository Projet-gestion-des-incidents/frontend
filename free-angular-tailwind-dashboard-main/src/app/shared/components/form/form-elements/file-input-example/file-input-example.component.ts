import { Component, EventEmitter, Output } from '@angular/core';
import { ComponentCardComponent } from '../../../common/component-card/component-card.component';
import { LabelComponent } from '../../label/label.component';
import { FileInputComponent } from '../../input/file-input.component';

@Component({
  selector: 'app-file-input-example',
  imports: [
    ComponentCardComponent,
    LabelComponent,
    FileInputComponent
],
  template: `
   <app-component-card title="File Input">
    <div>
      <app-label>Upload file</app-label>
      <app-file-input (change)="handleFileChange($event)" className="custom-class"></app-file-input>
    </div>
  </app-component-card>
  `,
})
export class FileInputExampleComponent {

  @Output() filesSelected = new EventEmitter<File[]>();

  handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);

      // 🔥 envoyer au parent
      this.filesSelected.emit(filesArray);
    }
  }
}