# AppIndicator/KStatusNotifierItem support for GNOME Shell (CONSTRUCT fork)

Shows AppIndicators, KStatusNotifierItems and legacy X11 tray icons in the
GNOME Shell panel. This is CONSTRUCT's fork of
[ubuntu/gnome-shell-extension-appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator),
on the `gnome-51` branch, for GNOME Shell 51 and nothing older.

## What it carries over upstream

Upstream `master` (v66 and later), plus:

- **util**: a `CancellableChild` is released from its parent once its D-Bus
  operation is over, instead of leaking a handler per operation (upstream #647).
- **dbusMenu**: `_replaceSelf()` ignores stale signals on items that were
  already replaced, instead of throwing on each one (upstream #656).
- **appIndicator**: `Get` errors returned by the application are not logged
  as errors with a stack trace on every icon update (upstream #581, #551).
- **indicatorStatusIcon**: the `tray-pos` handler is connected once per icon
  instead of doubling on every change (upstream #641).
- **statusNotifierWatcher**: items found by the bus scan on non-default
  object paths get the same id as when they register themselves, so they
  are no longer shown twice (upstream #665).
- **statusNotifierWatcher**: the bus analyzer subprocess is killed when the
  watcher is cancelled, instead of piling up on every unlock (upstream #310).
- Compatibility code for GNOME Shell before 51 and upstream's release
  tooling (GitHub workflows, ESLint setup, extensions.gnome.org zip target,
  manual test indicators) removed.

## Building

CONSTRUCT builds it with melange from `recipes/gnome-shell-extension-appindicator.yaml`
in spin-desktop, which runs:

```sh
meson setup --prefix=/usr -Dlocal_install=disabled build
meson compile -C build
DESTDIR=<destdir> meson install -C build
```

It needs meson, ninja, jq, gettext and glib's `glib-compile-schemas`. The
extension goes to `/usr/share/gnome-shell/extensions/appindicatorsupport@rgcjonas.gmail.com`,
its schema to `/usr/share/glib-2.0/schemas` and its translations to
`/usr/share/locale`. `meson test -C build` runs the menu utilities test when
gjs is installed.

## Authors and license

Written by Jonas Kümmerlin, Marco Trevisan and the contributors listed in
[AUTHORS.md](AUTHORS.md), based on patches by Giovanni Campagna. Licensed
under the GNU General Public License, version 2 or later (see
[LICENSE](LICENSE)).
