# Deployment Skill

## GAS Deployment

1. Merge PR to master
2. Pull latest master: `git checkout master && git pull origin master`
3. Push to GAS: `npx clasp push --force`
4. Deploy new version: `npx clasp deploy -i AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q -d "description"`
5. Version auto-increments (e.g. @77 -> @78)

## CI/CD
- CI auto-merge is configured via GitHub Actions
- `CLASP_TOKEN` secret in GitHub Actions handles automated deploys on master push
- If CI deploy fails silently, manually deploy via clasp CLI

## Production URLs
- App: https://nippou.up.railway.app (redirects to GAS)
- GAS endpoint: https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec
