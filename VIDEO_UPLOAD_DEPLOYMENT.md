# DelinedOS large video uploads (Cloudflare R2 multipart)

## Upload limit
The application defaults to a maximum video size of **5 GB** (5,000,000,000 bytes).
The backend can override this with the Railway environment variable:

`VIDEO_MAX_UPLOAD_BYTES=5000000000`

Multipart parts default to 64 MiB. The browser uploads up to three parts concurrently.

## Cloudflare R2 bucket CORS (required)
Because the browser uploads each part directly to R2 using presigned URLs, configure CORS on the
`delined-media` bucket to allow the exact DelinedOS frontend origin(s). Example policy:

```json
[
  {
    "AllowedOrigins": [
      "https://YOUR-DELINEDOS-FRONTEND-DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace the placeholder with the real frontend origin. If the app is served from more than one
trusted domain, list each exact origin. `ETag` must be exposed so the browser can return the part
ETags to the backend for multipart completion.

## Railway
Deploy the backend and frontend changes together. Keep the existing R2 credentials and bucket
settings. Set `VIDEO_MAX_UPLOAD_BYTES=5000000000` in the Railway backend service if you want the
limit explicitly pinned in configuration. No Railway $20 upgrade is inherently required by this
code change.

## Important operational notes
- This implementation uses R2 multipart uploads and does not send large video bytes through
  Railway's FastAPI request body.
- The existing `/api/upload` endpoint remains for images and rejects videos so large videos use
  the multipart flow.
- Test with a small video first, then a 1.2 GB file, and finally a file near the configured limit.
- Confirm the frontend's production domain is in the bucket CORS allowlist before testing.
- Consider configuring an R2 lifecycle rule to abort incomplete multipart uploads after several
  days, so abandoned uploads do not linger.
