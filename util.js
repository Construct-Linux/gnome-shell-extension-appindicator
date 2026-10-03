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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Logger} from './logger.js';
import {BaseStatusIcon} from './indicatorStatusIcon.js';
import {BUS_ADDRESS_REGEX} from './dbusUtils.js';

export function indicatorId(service, busName, objectPath) {
    if (service !== busName && service?.match(BUS_ADDRESS_REGEX))
        return service;

    return `${busName}@${objectPath}`;
}


function connectSmart3A(src, signal, handler) {
    const id = src.connect(signal, handler);
    let destroyId = 0;

    if (src.connect && (!(src instanceof GObject.Object) || GObject.signal_lookup('destroy', src))) {
        destroyId = src.connect('destroy', () => {
            src.disconnect(id);
            src.disconnect(destroyId);
        });
    }

    return [id, destroyId];
}

function connectSmart4A(src, signal, target, method) {
    if (typeof method !== 'function')
        throw new TypeError('Unsupported function');

    method = method.bind(target);
    const signalId = src.connect(signal, method);
    const onDestroy = () => {
        src.disconnect(signalId);
        if (srcDestroyId)
            src.disconnect(srcDestroyId);
        if (tgtDestroyId)
            target.disconnect(tgtDestroyId);
    };

    // GObject classes might or might not have a destroy signal
    // JS Classes will not complain when connecting to non-existent signals
    const srcDestroyId = src.connect && (!(src instanceof GObject.Object) ||
        GObject.signal_lookup('destroy', src)) ? src.connect('destroy', onDestroy) : 0;
    const tgtDestroyId = target.connect && (!(target instanceof GObject.Object) ||
        GObject.signal_lookup('destroy', target)) ? target.connect('destroy', onDestroy) : 0;

    return [signalId, srcDestroyId, tgtDestroyId];
}

/**
 * Connect signals to slots, and remove the connection when either source or
 * target are destroyed
 *
 * Usage:
 *      Util.connectSmart(srcOb, 'signal', tgtObj, 'handler')
 * or
 *      Util.connectSmart(srcOb, 'signal', () => { ... })
 *
 * @param {...*} args Signal connection arguments.
 * @returns {number[]} Signal and destroy handler connection identifiers.
 */
export function connectSmart(...args) {
    if (arguments.length === 4)
        return connectSmart4A(...args);
    else
        return connectSmart3A(...args);
}

function disconnectSmart3A(src, signalIds) {
    const [id, destroyId] = signalIds;
    src.disconnect(id);

    if (destroyId)
        src.disconnect(destroyId);
}

function disconnectSmart4A(src, tgt, signalIds) {
    const [signalId, srcDestroyId, tgtDestroyId] = signalIds;

    disconnectSmart3A(src, [signalId, srcDestroyId]);

    if (tgtDestroyId)
        tgt.disconnect(tgtDestroyId);
}

export function disconnectSmart(...args) {
    if (arguments.length === 2)
        return disconnectSmart3A(...args);
    else if (arguments.length === 3)
        return disconnectSmart4A(...args);

    throw new TypeError('Unexpected number of arguments');
}

let _defaultTheme;
export function getDefaultTheme() {
    if (_defaultTheme)
        return _defaultTheme;

    _defaultTheme = new St.IconTheme();
    return _defaultTheme;
}

export function destroyDefaultTheme() {
    _defaultTheme = null;
}

/**
 * Helper function to wait for the system startup to be completed.
 * Adding widgets before the desktop is ready to accept them can result in errors.
 *
 * @param {Gio.Cancellable} cancellable Cancellation object for the wait.
 * @returns {Promise<void>} A promise that resolves after startup completes.
 */
export async function waitForStartupCompletion(cancellable) {
    if (Main.layoutManager._startingUp)
        await Main.layoutManager.connect_once('startup-complete', cancellable);
}

export {Logger};

export function tryCleanupOldIndicators() {
    const indicatorType = BaseStatusIcon;
    const indicators = Object.values(Main.panel.statusArea).filter(i => i instanceof indicatorType);

    try {
        const panelBoxes = [
            Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox,
        ];

        panelBoxes.forEach(box =>
            indicators.push(...box.get_children().filter(i => i instanceof indicatorType)));
    } catch (e) {
        logError(e);
    }

    new Set(indicators).forEach(i => i.destroy());
}

export const CancellableChild = GObject.registerClass({
    Properties: {
        'parent': GObject.ParamSpec.object(
            'parent', 'parent', 'parent',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Cancellable.$gtype),
    },
},
class CancellableChild extends Gio.Cancellable {
    _init(parent) {
        if (parent && !(parent instanceof Gio.Cancellable))
            throw TypeError('Not a valid cancellable');

        super._init({parent});

        if (parent) {
            if (parent.is_cancelled()) {
                this.cancel();
                return;
            }

            this._connectToParent();
        }
    }

    _connectToParent() {
        this._connectId = this.parent.connect(() => {
            this._realCancel();

            if (this._disconnectIdle)
                return;

            this._disconnectIdle = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                delete this._disconnectIdle;
                this._disconnectFromParent();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _disconnectFromParent() {
        if (this._connectId && !this._disconnectIdle) {
            this.parent.disconnect(this._connectId);
            delete this._connectId;
        }
    }

    _realCancel() {
        Gio.Cancellable.prototype.cancel.call(this);
    }

    cancel() {
        this._disconnectFromParent();
        this._realCancel();
    }

    // To be called once the operation using this child is over without being
    // cancelled: the parent's handler holds a reference to the child, so the
    // handler and the child would otherwise live as long as the parent does.
    release() {
        this._disconnectFromParent();
    }
});
