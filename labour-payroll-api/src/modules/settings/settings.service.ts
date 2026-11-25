import { AppError } from '../../utils/AppError';
import { Settings } from './settings.model';

export async function getSettingsOrThrow() {
  const s = await Settings.findOne({ key: 'company' });
  if (!s) throw new AppError(409, 'SETTINGS_NOT_CONFIGURED', 'Set the house rate and position shares first');
  return s;
}