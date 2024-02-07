FROM litestream/litestream:latest as litestream

FROM denoland/deno:ubuntu

COPY --from=litestream /usr/local/bin/litestream /usr/bin

EXPOSE 1991

WORKDIR /app

USER deno

#COPY deps.ts .
#RUN deno cache deps.ts

env LITESTREAM_ACCESS_KEY_ID=minioadmin
env LITESTREAM_SECRET_ACCESS_KEY=minioadmin
env KVSTORE_SECRET=denorocks

COPY denokv.ts .

RUN deno cache denokv.ts

CMD ["run", "--allow-net", "--unstable-kv", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "denokv.ts"]
