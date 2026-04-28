/* istanbul ignore file */
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import { BackgroundCommand } from 'src/reference-data/background-message-key.enum';

export interface BackgroundMessage {
  command: BackgroundCommand;
  value?: any;
  key?: string;
}

export interface DialogMessage {
  command: DialogCommand;
  value?: any;
}
