import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260703_042222_content_model from './20260703_042222_content_model';
import * as migration_20260703_145153_verspielt_design from './20260703_145153_verspielt_design';
import * as migration_20260703_153456_icon_toasts from './20260703_153456_icon_toasts';
import * as migration_20260703_184954_social_icon_media from './20260703_184954_social_icon_media';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260703_042222_content_model.up,
    down: migration_20260703_042222_content_model.down,
    name: '20260703_042222_content_model',
  },
  {
    up: migration_20260703_145153_verspielt_design.up,
    down: migration_20260703_145153_verspielt_design.down,
    name: '20260703_145153_verspielt_design',
  },
  {
    up: migration_20260703_153456_icon_toasts.up,
    down: migration_20260703_153456_icon_toasts.down,
    name: '20260703_153456_icon_toasts',
  },
  {
    up: migration_20260703_184954_social_icon_media.up,
    down: migration_20260703_184954_social_icon_media.down,
    name: '20260703_184954_social_icon_media'
  },
];
