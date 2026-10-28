#!/bin/bash
set -euo pipefail

readonly APP_NAME="${CF_APP_NAME:-omd-drupal}"

main() {
  local dump_path="${DUMP:-}"
  local confirm="${CONFIRM_DB_REPLACE:-}"

  if [[ -z "${dump_path}" || ! -f "${dump_path}" ]]; then
    printf 'FATAL ERROR: Set DUMP to an existing SQL export.\n' >&2
    exit 1
  fi

  if [[ "${confirm}" != "YES" ]]; then
    printf 'FATAL ERROR: Set CONFIRM_DB_REPLACE=YES to replace the database.\n' >&2
    exit 1
  fi

  cf ssh "${APP_NAME}" -c '
    export PATH=/home/vcap/deps/0/php/bin:$PATH
    export PHPRC=/home/vcap/deps/0/php/etc/php.ini
    cd /home/vcap/app
    php lib/vendor/drush/drush/drush.php state:set system.maintenance_mode 1
    php lib/vendor/drush/drush/drush.php cache:rebuild
  '

  local remote_command
  remote_command=$(cat <<'EOF'
export PATH=/home/vcap/deps/0/php/bin:$PATH
export PHPRC=/home/vcap/deps/0/php/etc/php.ini

php -r '
$services = json_decode(getenv("VCAP_SERVICES"), true, 512, JSON_THROW_ON_ERROR);
$db = $services["aws-rds"][0]["credentials"];
$pdo = new PDO(
    sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4",
        $db["host"],
        $db["port"],
        $db["db_name"]
    ),
    $db["username"],
    $db["password"],
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
    ]
);
$sql = stream_get_contents(STDIN);
if ($sql === false || $sql === "") {
    throw new RuntimeException("No SQL input was received.");
}
$pdo->exec($sql);
echo "Database import completed.\n";
'
EOF
  )

  if [[ "${dump_path}" == *.gz ]]; then
    gzip -dc "${dump_path}" | cf ssh "${APP_NAME}" -c "${remote_command}"
  else
    cf ssh "${APP_NAME}" -c "${remote_command}" < "${dump_path}"
  fi

  cf ssh "${APP_NAME}" -c '
    export PATH=/home/vcap/deps/0/php/bin:$PATH
    export PHPRC=/home/vcap/deps/0/php/etc/php.ini
    cd /home/vcap/app
    php lib/vendor/drush/drush/drush.php status
    php lib/vendor/drush/drush/drush.php cache:rebuild
    php lib/vendor/drush/drush/drush.php state:set system.maintenance_mode 0
    php lib/vendor/drush/drush/drush.php cache:rebuild
  '
}

main "$@"
