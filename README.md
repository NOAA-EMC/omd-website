# OMD Website

Drupal website for the NOAA Office of Modeling and Development.

See [LICENSE](./LICENSE) and [DISCLAIMER](./DISCLAIMER).

## cloud.gov

The application uses the PHP buildpack with `web/` as its public document
root. Cloud.gov provides the `omd-drupal-db` MySQL service and the
`omd-drupal-s3` object-storage service. Drupal reads their credentials from
`VCAP_SERVICES`.

The deployment uses PHP 8.3, PDO MySQL, and Apache HTTPD for Drupal clean URLs.

### Deploy code

```shell
cf push -f manifest.yml
```

### Back up and refresh the database

Create a portable source backup:

```shell
lando db-export
```

This creates a compressed file such as
`drupal11.2026-10-28-1793220167.sql.gz`.

Check the managed database service:

```shell
cf service omd-drupal-db
```

Cloud.gov RDS creates automated daily snapshots with a default 14-day
retention. The `cf` CLI cannot create or download on-demand snapshots for this
managed service. Keep the Lando export until the refresh is verified. For
point-in-time restoration of the cloud database, use the organization’s
cloud.gov support process.

After confirming the export and service status, refresh the database:

```shell
DUMP="$(ls -t drupal11.*.sql.gz | head -n1)" \
CONFIRM_DB_REPLACE=YES scripts/cloud-gov-db-refresh.sh
```

The helper enables maintenance mode, imports the dump, verifies Drupal,
rebuilds caches, and disables maintenance mode. The import replaces matching
tables. Uploaded files are stored separately in S3.

### Deployment files

- [`manifest.yml`](./manifest.yml): cloud.gov app, buildpack, memory, and
  service bindings.
- [`.bp-config/options.json`](./.bp-config/options.json): PHP 8.3, PDO MySQL,
  Apache HTTPD, and the `web/` document root.
- [`web/sites/default/settings.php`](./web/sites/default/settings.php):
  reads cloud.gov `VCAP_SERVICES` and configures MySQL and S3.
- [`scripts/cloud-gov-db-refresh.sh`](./scripts/cloud-gov-db-refresh.sh):
  guarded database refresh, cache rebuild, and maintenance-mode workflow.
- [`.cfignore`](./.cfignore): excludes local/generated files from the push.
