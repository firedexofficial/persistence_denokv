## Deno / OpenKV based persistence sidecar

This is a self-hostable persistence engine built on [Deno and Deno's OpenKV](https://deno.com/blog/building-deno-kv).

It supports:
 - a simple REST API (GET /key, POST /key)
 - a simple Authorization scheme with a header compared against the value of the `KVSTORE_SECRET` envvar
 - strong consistency (compliments of sqlite3)
 - asynchronous / streaming backups to S3 (via [litestream](https://github.com/benbjohnson/litestream)
 - stateless deploys (sqlite3 db restored from S3 on launch, stored in /tmp)

It's very fast, very low latency (esp when deployed as a sidecar), and has few moving parts.

It's the simplest (self-hosted) thing that could work.

Run next to Minio or change envars for S3.

### Minio

 * For development, can be launched with `docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`

### Launching

 * `docker build -t denokv .`
 * `docker run -it --net "host" denokv`

This instance can be torn down and relaunched arbitrarily without losing data, thanks to litestream backup/restore.

### Use

 * `curl --data-binary 'bar' -X POST -H "Authorization: denorocks" -vv http://localhost:8000/foo`
  * -> `{"ok":true,"versionstamp":"00000000000000100000"}`
 * `curl 'http://localhost:8000/foo'`
  * -> `bar⏎`
