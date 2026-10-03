project('gnome-shell-ubuntu-appindicators',
  version : '66',
  meson_version : '>= 0.59',
  license: 'GPL2',
)

i18n = import('i18n')

sh = find_program('sh')
jq = find_program('jq')
metadata = files('metadata.json')
uuid = run_command(jq, '-r', '.uuid', metadata, check: true).stdout().strip()

prefix = get_option('prefix')
extension_dir = prefix / get_option('datadir') / 'gnome-shell' / 'extensions' / uuid
locale_dir = prefix / get_option('localedir')
schema_dir = prefix / get_option('datadir') / 'glib-2.0' / 'schemas'

js_sources = run_command(sh, '-c', 'cd "$1" && ls -1 *.js', 'sh',
    meson.project_source_root(), check: true).stdout().strip().split('\n')

install_data(metadata,
    files(js_sources),
    install_dir: extension_dir)
install_data(files('tools/busAnalyzer.js'),
    install_dir: extension_dir / 'tools')
install_subdir('interfaces-xml',
    install_dir: extension_dir)
install_subdir('preferences',
    install_dir: extension_dir)
install_subdir('icons/hicolor/scalable/actions',
    install_dir: extension_dir / 'icons' / 'hicolor' / 'scalable')

subdir('schemas')
subdir('locale')


gjs = find_program('gjs', required: false)
if gjs.found()
    test('menu-utils',
        gjs,
        args: ['-m', files('tests/testMenuUtils.js')],
        protocol: 'tap')
endif

summary({
    'Extension UUID': uuid,
    'Gettext domain': gettext_domain,
    'GJS': gjs.found(),
    },
    section: 'Configuration')

summary({
    'Extension directory': extension_dir,
    'GSchema directory': schema_dir,
    'Locale directory': locale_dir,
    },
    section: 'Directories')
