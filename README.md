## Deno / OpenKV based persistence sidecar

This is a self-hostable persistence engine built on [Deno and Deno's OpenKV](https://deno.com/blog/building-deno-kv).

It supports:
 - a simple REST API (GET /key, POST /key)
 - a simple Authorization scheme with a header compared against the value of the `KVSTORE_SECRET` envvar
 - strong consistency (compliments of sqlite3)
 - asynchronous / streaming backups to S3 (via [litestream](https://github.com/benbjohnson/litestream)
 - stateless deploys (sqlite3 db restored from S3 on launch, stored in /tmp)

It's very fast, very low latency (esp when deployed as a sidecar), and has few moving parts.

It's the simplest (self-hostable) thing that could work.

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

### Why not just use...

For a detailed comparison of several possible solutions, see [this blog post on the topic](https://deno.com/blog/comparing-deno-kv).

Short story long:

 * Redis?
    * Redis rules but Litestream replication/backup is very nice. To offer similar guarentees about dataloss under load, some combination of Redis AOF (append-only File) and particularly resiliant FSYNCing + external backups would be required. Might be worth exploring in the future, but not a fractional-engineer-day undertaking.
    * Redis's Cluster, and Replication/Sentinel increase scaling and availability, respectively, but don't necessarily offer the combination of consistency and recoverability we need.
    * [Upstash hosted Redis](https://upstash.com/docs/redis/features/consistency) used to offer a "strong consistency" mode but "We decided to deprecate this feature because its effect on latency started to conflict with the performance expectations of Redis use cases."
 * Postgresql?
    * Postgres is the gold standard for consistent datastores, but it requires some attention to be paid to schema design, is big, and [is not as fast](https://www.sqlite.org/speed.html) as sqlite for the types of operations we care about.
    * An [earlier version ](https://github.com/mobilecoinofficial/forest/blob/5cc197ceb991332f54327475cdbbcf41330de60a/forest/pdict.py#L51) [of the persistence functionality](https://github.com/mobilecoinofficial/forest/blob/5cc197ceb991332f54327475cdbbcf41330de60a/forest/pdictng.py#L70) was backed with Postgresql and Postgrest. It wasn't quite fast enough.
 * Cloudflare KV?
    * It's not strongly consistent. Following a write, subsequent reads MAY return stale data.
 * Cloudflare D1? Cloudflare Durable Objects?
    * TL;DR - Too much work / not selfhostable.
    * D1 seems like it's *just* Sqlite+Litestream which is awesome, and [it's fast](https://github.com/bruceharrison1984/kv-d1-benchmark), but I didn't feel like writing a schema or porting [the postgresql schema](https://github.com/mobilecoinofficial/forest/blob/5cc197ceb991332f54327475cdbbcf41330de60a/forest/pdictng.py#L76) to sqlite, and then implementing a wrapper on top.
    * Both of these are probably great for what they are, but require a lot of overhead for simple tasks like this.
    * D1 is available on the free plan and will be free forever. Might be worth revisiting?
    * Durable Objects are super neat sounding but paid-only. And require an amount of mindbending to grapple with the semantics.
