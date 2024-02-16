import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { exec } from "https://deno.land/x/exec/mod.ts";

const app = new Hono();

// use default KV settings if using Deno Deploy, otherwise use a persistent sqlite database
const deployed = Deno.env.has("DENO_DEPLOYMENT_ID");
// use 7070 as default, support override as PORT envvar
const PORT = Deno.env.has("PORT") ? Deno.env.get("PORT") : "7070";

// restore if not using Deno Deploy
const restore = deployed ? null : new Deno.Command("litestream", {args: "restore -o /tmp/denokv.sqlite3 s3://denokv.localhost:9000/denokv.sqlite3".split(" ")}).outputSync();

// use sqlite if not using Deno Deploy
const kv = deployed ?  await Deno.openKv() : await Deno.openKv("/tmp/denokv.sqlite3");

// enable streaming replication if not using Deno Deploy
const backup = deployed ? null : new Deno.Command("litestream", {args: "replicate /tmp/denokv.sqlite3 s3://denokv.localhost:9000/denokv.sqlite3".split(" ")}).spawn();

async function getCount() {
    const all_known_keys = kv.list({prefix: []});
    const output = [];
    for await (const res of all_known_keys) {
        output.push(res.value);
    };
    console.log("We have restored: " + output.length + " keys.");
    return output.length
}

getCount();

const checkAuth = (c: Context) =>
    c.req.headers.get('Authorization') === Deno.env.get("KVSTORE_SECRET");

const unauthorized = (c: Context) =>
    c.json({ code: '401 Unauthorized', message: 'Unauthorized' }, 401)

app.use('*', async (c, next) => {
    c.res.headers.set('Vary', 'Authorization')
    if (!['GET', 'HEAD'].includes(c.req.method) && !checkAuth(c)) {
        return unauthorized(c)
    }
    await next()
})

app.get("/headers", async (c) => {
  return c.json(c.req.headers.entries().toArray())
  });

app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const result = await kv.get([key], { consistency: "strong" });
  return c.text(result.value);
});

app.get("/count", async (c) => {
  return c.text(await getCount());
});

// TODO: disable the next few methods in Prod
app.post("/eval", async (c) => {
  const blurb = await c.req.text();
  const result = eval(blurb);
  return c.json(result);
});

async function executeAsyncEval(code) {
  const func = eval('(async () => {' + code + '})');
  return await func();
}

app.post("/eval_async", async (c) => {
  const blurb = await c.req.text();
  const result = await executeAsyncEval(blurb);
  return c.json(result);
});

app.post("/exec", async (c) => {
  const blurb = await c.req.text();
  const result = await exec(blurb);
  return c.json(result);
});

app.post("/:key", async (c) => {
  const key = c.req.param("key");
  const result = await kv.set([key], await c.req.text());
  return c.json(result);
});

Deno.serve({ port: parseInt(PORT), hostname: "0.0.0.0"}, app.fetch);

