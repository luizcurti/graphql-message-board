# Deployment (AWS)

Pushes to `main` deploy the app to AWS through the `deploy` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), after every other job passes. It authenticates with GitHub OIDC, so no AWS access keys are stored in GitHub. Until it is configured, the job skips the AWS steps and stays green.

## Architecture

```
browser ──HTTPS──▶ CloudFront ─┬─ /graphql* (HTTP + WebSocket) ──▶ ALB ──▶ ECS Fargate (back-end/Dockerfile, SQLite)
                               └─ everything else ──────────────▶ S3 (React build)
```

- **One HTTPS origin** for the browser: the SPA calls `https://<domain>/graphql` and subscribes on `wss://<domain>/graphql`, so there is no CORS or mixed-content issue and no certificate or custom domain to manage.
- **Network** ([`infra/network.tf`](../infra/network.tf)): a VPC with two public subnets and no NAT gateway. The ALB only admits CloudFront's origin-facing IP ranges; the task only admits the ALB and gets a public IP to pull its image from ECR.
- **Backend** ([`infra/backend.tf`](../infra/backend.tf)): one Fargate task (0.25 vCPU, 512 MiB). **SQLite lives inside the container, so data is reset on every deploy** — fine for a demo; mount EFS on `/app/data` to keep it. One task only: SQLite is a single-writer local file.
- **Frontend** ([`infra/frontend.tf`](../infra/frontend.tf)): private S3 bucket behind CloudFront (Origin Access Control); unknown paths fall back to `index.html` like `serve -s` locally.
- **No authentication:** like the local app, the API is open (`createOrLoginUser` takes only an email). Anyone with the URL can read and write messages; tear the stack down when you're done testing.

**Cost:** roughly US$35–40/month while it runs (the ALB, the Fargate task and three public IPv4 addresses); CloudFront, S3 and ECR are pennies at demo traffic. Use the Destroy workflow between tests.

## One-time setup

With admin credentials for the target AWS account and `gh` logged in:

```bash
scripts/bootstrap.sh
```

It applies [`bootstrap/`](../bootstrap) (remote-state bucket + the `message-board-github-deploy` IAM role, which only the `production` environment of this repo can assume), then creates the `production` GitHub environment with `AWS_DEPLOY_ROLE_ARN`, `TF_STATE_BUCKET` and `AWS_REGION`. Extra arguments go to `terraform apply`: `-var="aws_region=…"` (default `eu-west-2`), `-var="create_oidc_provider=true"` on an account without the GitHub OIDC provider.

## What a deploy does

1. Creates the ECR repository (a no-op after the first run), builds `back-end/Dockerfile` and pushes it tagged with the commit SHA.
2. `terraform plan` + `apply` of [`infra/`](../infra) with S3 remote state (no backend block is committed; the job writes `infra/ci_backend.tf`), then waits for the ECS service to be stable.
3. Builds the SPA with `REACT_APP_GRAPHQL_URL=https://<cloudfront domain>/graphql`, syncs it to S3 (hashed assets cached for a year, `index.html` never) and invalidates `index.html`.
4. Runs [`e2e-integration-test.sh`](../e2e-integration-test.sh) — the same full-stack checks CI runs against Docker Compose, including the WebSocket subscription — against the CloudFront URL, and prints the app URL in the job summary.

The first deploy takes ~10 minutes, mostly CloudFront propagation.

## Tear down / recreate

**Actions → Destroy → Run workflow** on `main`, type `destroy`. It deletes every resource in `infra/` (data and pushed images included); the `bootstrap/` resources are kept, so **Actions → CI → Run workflow** on `main` recreates it with no setup.

The deploy role's permissions ([`bootstrap/deploy_permissions.tf`](../bootstrap/deploy_permissions.tf)) are scoped by the `message-board` name prefix wherever AWS allows it, and to the deployment region for EC2, ELB and ECS; it can only attach the ECS task-execution managed policy to roles it creates and can't modify itself.
