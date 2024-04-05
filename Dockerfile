FROM litestream/litestream:latest as litestream

FROM denoland/deno:ubuntu

COPY --from=litestream /usr/local/bin/litestream /usr/bin

WORKDIR /app

USER deno

env LITESTREAM_ACCESS_KEY_ID=minioadmin
env LITESTREAM_SECRET_ACCESS_KEY=minioadmin
env KVSTORE_SECRET=denorocks

COPY denokv.ts /app/
COPY litestream.yaml /app/

RUN deno cache denokv.ts

CMD ["run", "--allow-net", "--unstable-kv", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "denokv.ts"]
