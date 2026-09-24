# 7 · El cron: el latido de cada minuto

Una sola ruta, `GET /api/cron/tick`, hace todo lo que no ocurre porque alguien tocó algo.
Cloud Scheduler la llama cada minuto con tu `CRON_SECRET` en una cabecera.

**Sin cron, estas cosas se quedan quietas:**

1. Los flujos dormidos en un nodo **Esperar** no despiertan.
2. Las preguntas con tiempo límite no salen por su rama de «sin respuesta».
3. Los tokens de Instagram **no se renuevan**: a los 60 días la cuenta se desconecta.
4. No se refrescan los seguidores (los avisos de «checkpoint») ni se poda el historial de avisos.

Casi siempre es una lectura y ya: el tick solo hace trabajo cuando hay algo pendiente.

## Crearlo

Activa la API una vez:

```bash
gcloud services enable cloudscheduler.googleapis.com --project mi-chatty
```

Y crea el job, con **tu** URL y **tu** `CRON_SECRET`:

```bash
gcloud scheduler jobs create http chatty-tick \
  --schedule="* * * * *" \
  --uri="https://TU-URL/api/cron/tick" \
  --http-method=GET \
  --headers="x-cron-secret=EL_VALOR_DE_CRON_SECRET" \
  --attempt-deadline=300s \
  --location=us-central1 \
  --project=mi-chatty
```

Si el secreto ya está en Secret Manager, puedes leerlo en vez de pegarlo:

```bash
--headers="x-cron-secret=$(gcloud secrets versions access latest --secret=CRON_SECRET --project mi-chatty)"
```

## Probarlo

```bash
gcloud scheduler jobs run chatty-tick --location=us-central1 --project=mi-chatty
```

o directo:

```bash
curl -H "x-cron-secret: EL_VALOR_DE_CRON_SECRET" https://TU-URL/api/cron/tick
```

Responde un JSON con lo que hizo (`resumed`, `timedOut`, `tokensChecked`,
`seguidoresRevisados`, `errors`). Si `errors` trae algo, ahí dice qué y de qué cuenta.

| Respuesta | Qué significa |
|---|---|
| `401 No autorizado` | La cabecera no trae el mismo valor que `CRON_SECRET` |
| `500 Falta CRON_SECRET` | El backend no tiene el secreto (revisa `apphosting.yaml` y el acceso al secreto) |
| `200` con `errors: []` | Todo bien |

## Si cambias de URL o de secreto

El job guarda la URL y la cabecera tal cual. Actualízalo:

```bash
gcloud scheduler jobs update http chatty-tick \
  --uri="https://NUEVA-URL/api/cron/tick" \
  --update-headers="x-cron-secret=NUEVO_VALOR" \
  --location=us-central1 --project=mi-chatty
```

Cloud Scheduler da 3 jobs gratis por cuenta de facturación; este es uno.

Sigue con [Primer uso](08-primer-uso.md).
