settings_schema = run_command(jq, '-r', '."settings-schema"', metadata,
    check: true).stdout().strip()

# Only installed: the image compiles every schema of /usr/share/glib-2.0/schemas.
install_data(
  files(settings_schema + '.gschema.xml'),
  install_dir: schema_dir
)
