// This file is part of the AppIndicator/KStatusNotifierItem GNOME Shell extension
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

import * as Extension from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as StatusNotifierWatcher from './statusNotifierWatcher.js';
import * as IndicatorStatusIcon from './indicatorStatusIcon.js';
import * as Interfaces from './interfaces.js';
import * as TrayIconsManager from './trayIconsManager.js';
import * as Util from './util.js';
import {Logger} from './logger.js';
import {SettingsManager} from './settingsManager.js';

export default class AppIndicatorExtension extends Extension.Extension {
    constructor(...args) {
        super(...args);

        Logger.init(this);
        Interfaces.initialize(this);
    }

    // The extension stays enabled on the lock screen (session-modes in
    // metadata.json): tearing the watcher down there would drop the bus
    // name, so every application would re-register and every icon would be
    // rebuilt on each unlock. While locked the icons are hidden instead.
    enable() {
        SettingsManager.initialize(this);
        Util.tryCleanupOldIndicators();
        this._statusNotifierWatcher =
            new StatusNotifierWatcher.StatusNotifierWatcher(this);
        TrayIconsManager.TrayIconsManager.initialize();

        this._sessionUpdatedId = Main.sessionMode.connect('updated',
            () => IndicatorStatusIcon.syncLockedState());
    }

    disable() {
        Main.sessionMode.disconnect(this._sessionUpdatedId);
        this._sessionUpdatedId = 0;

        TrayIconsManager.TrayIconsManager.destroy();

        this._statusNotifierWatcher.destroy();
        this._statusNotifierWatcher = null;

        SettingsManager.destroy();
    }
}
